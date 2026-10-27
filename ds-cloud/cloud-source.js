import {initializeApp} from 'firebase/app';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,signOut} from 'firebase/auth';
import {initializeFirestore,collection,query,where,doc,getDoc,getDocsFromServer,onSnapshot,runTransaction,serverTimestamp} from 'firebase/firestore';
import {firebaseConfig,OWNER_UID} from '../public/ds-study/config.js';
import {DS_APP_ID,isDSRecord,isLocalDSValue,projectRecord,mergeOperation} from './sync-model.js';
import {recoveryCandidates} from './sync-recovery.js';

const app=initializeApp(firebaseConfig),auth=getAuth(app);
const cloud=initializeFirestore(app,{});
const el=id=>document.getElementById(id),frame=el('study');
let user=null,journal=null,bridge=null,unsubscribe=null,flushing=false,failed=false,privateUrl=null;
let readError=null,writeError=null,lastPull=0,pendingCount=0,refreshing=null,nextRetry=0,backupDb=null;
const APP_ID=DS_APP_ID;
const deviceId=localStorage.getItem('ds-cloud-device')||crypto.randomUUID();localStorage.setItem('ds-cloud-device',deviceId);
const message=text=>{el('message').textContent=text;};
const status=text=>{el('sync').textContent=text;};
function syncStatus(){
 if(!bridge)return;
 if(!navigator.onLine){status('オフライン・端末に保存済み');return;}
 const error=readError||writeError;
 if(error){const code=error.code||'local-error';status(code==='resource-exhausted'?'同期保留：Firebaseの利用上限（端末保存済み）':`同期未完了・端末に保存済み（${code}）`);return;}
 if(pendingCount||flushing){status(`送信中・未同期 ${pendingCount}件`);return;}
 status(lastPull?'同期済み '+new Date(lastPull).toLocaleTimeString('ja-JP'):'クラウドへの接続を確認しています…');
}
function retryLater(error){nextRetry=Date.now()+(error?.code==='resource-exhausted'?30*60*1000:30000);}
const errorText=e=> e.code==='auth/popup-closed-by-user'?'ログイン画面が閉じられました。もう一度ログインしてください。':e.code==='auth/unauthorized-domain'?'このサイトのログイン設定を確認する必要があります。':e.code==='permission-denied'?'このアカウントには学習データの閲覧権限がありません。':'通信できませんでした。接続を確認して再読み込みしてください。';

// A durable, per-account journal makes transactions retryable across browser restarts.
function openJournal(uid){return new Promise((resolve,reject)=>{const r=indexedDB.open('ds-cloud-journal-'+uid,1);r.onupgradeneeded=()=>r.result.createObjectStore('outbox',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function journalTx(mode,fn){return new Promise((resolve,reject)=>{const t=journal.transaction('outbox',mode),r=fn(t.objectStore('outbox'));t.oncomplete=()=>resolve(r?.result);t.onerror=()=>reject(t.error);});}
const queued=()=>journalTx('readonly',s=>s.getAll());
const recordId=(s,key)=>encodeURIComponent(APP_ID+'|'+s+'|'+key);
async function enqueue(s,key,value,old,{recovery=false,flushNow=true}={}){
 const data=projectRecord(s,value),prior=projectRecord(s,old||{});
 if(JSON.stringify(data)===JSON.stringify(prior))return;
 const op={id:crypto.randomUUID(),app:APP_ID,store:s,key:String(key),data,at:new Date().toISOString(),deviceId,recovery};
 if(s==='quizzes'&&data){op.seenDelta=Math.max(0,data.seen-(prior.seen||0));op.correctDelta=Math.max(0,data.correct-(prior.correct||0));}
 await journalTx('readwrite',os=>os.put(op));
 pendingCount=await journalTx('readonly',os=>os.count());syncStatus();
 if(flushNow)void flush();
}
async function flush(){
 if(flushing||!user||!journal)return;flushing=true;
 try{
  for(const saved of await queued()){
   // Old releases wrote outbox entries without an app field. Firestore rejects
   // undefined fields; keep their operation IDs so retries remain idempotent.
   const op={...saved,app:saved.app||APP_ID};
   if(op.app!==APP_ID)throw Object.assign(new Error('Foreign app operation retained in local queue'),{code:'sync/foreign-app'});
   const ref=doc(cloud,'users',user.uid,'records',recordId(op.store,op.key));
   const receipt=doc(cloud,'users',user.uid,'receipts',op.id);
   await runTransaction(cloud,async tx=>{
    const done=await tx.get(receipt);if(done.exists())return;
    const existing=await tx.get(ref),remote=existing.exists()?existing.data():null;
    tx.set(ref,{...mergeOperation(op,remote),updatedAt:serverTimestamp()});
    tx.set(receipt,{app:APP_ID,store:op.store,key:op.key,at:op.at,seenDelta:op.seenDelta||0,correctDelta:op.correctDelta||0,savedAt:serverTimestamp()});
   });
   await journalTx('readwrite',os=>os.delete(op.id));
   if(bridge){const saved=await getDoc(ref);await apply({docChanges:()=>[{doc:saved}]});}
  }
  failed=false;writeError=null;
 }catch(e){failed=true;writeError=e;retryLater(e);console.warn('Progress sync',e.code||e.message);}
 finally{flushing=false;pendingCount=await journalTx('readonly',os=>os.count());syncStatus();if(!failed&&pendingCount)setTimeout(()=>void flush(),0);}
}
async function apply(snapshot){
 try{await applyRecords(snapshot);}catch(error){readError=error;retryLater(error);syncStatus();throw error;}
}
async function applyRecords(snapshot){
 if(!bridge)return;
 const pending=await queued(),blocked=new Set(pending.map(x=>recordId(x.store,x.key)));
 const changes=snapshot.docChanges();
 const preferred=new Set(changes.map(change=>change.doc.data()).filter(x=>x.app===APP_ID).map(x=>x.store+'|'+x.key));
 let remoteChanged=false;
 for(const change of changes){
  if(blocked.has(change.doc.id))continue;
  const raw=change.doc.data(),{app,store:s,key,data,deviceId:sourceDevice}=raw;
  if(!bridge.db.STORES[s]||!isDSRecord(raw)||(app!==APP_ID&&preferred.has(s+'|'+key)))continue;
  if(sourceDevice!==deviceId)remoteChanged=true;
  const current=await bridge.db.get(s,key);
  const next=data===null?null:{...(current||{}),...data,[bridge.db.STORES[s].keyPath]:key};
  await bridge.db.applyRemote(s,key,next);
  if(s==='kv'&&key==='settings'&&next)Object.assign(bridge.state.settings,next.v);
  else if(s!=='kv'){const list=bridge.state[s],i=list.findIndex(x=>String(x.id)===key);if(next===null){if(i>=0)list.splice(i,1);}else if(i>=0){Object.assign(list[i],next);}else list.push(next);}
 }
 bridge.emit();
 if(remoteChanged&&frame.contentWindow)frame.contentWindow.dispatchEvent(new frame.contentWindow.Event('ds-cloud-updated'));
}
function hideForeignLocalData(api){
 for(const store of ['plan','logs','cards','notes','quizzes','scores']){
  const list=api.state[store]||[];
  for(let i=list.length-1;i>=0;i--){
   const value=list[i];if(isLocalDSValue(store,value))continue;
   // Keep the stored record for recovery; hide foreign-app data only in memory.
   list.splice(i,1);
  }
 }
}
function appRecords(){return query(collection(cloud,'users',user.uid,'records'),where('app','==',APP_ID));}
async function openBackup(){
 if(!backupDb)backupDb=await new Promise((resolve,reject)=>{const r=indexedDB.open('ds-cloud-sync-backups-'+user.uid,1);r.onupgradeneeded=()=>r.result.createObjectStore('backups');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 return backupDb;
}
async function loadLocalBackup(){
 const db=await openBackup();return new Promise((resolve,reject)=>{const r=db.transaction('backups').objectStore('backups').get('before-recovery-v2');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
async function saveLocalBackup(api){
 await openBackup();
 const data=await api.db.exportAll();
 await new Promise((resolve,reject)=>{const t=backupDb.transaction('backups','readwrite'),s=t.objectStore('backups'),r=s.get('before-recovery-v2');r.onsuccess=()=>{if(!r.result)s.put(data,'before-recovery-v2');};t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});
}
function listen(){
 unsubscribe?.();const uid=user.uid;let chain=Promise.resolve();
 unsubscribe=onSnapshot(appRecords(),{includeMetadataChanges:true},snap=>{
  if(snap.metadata?.fromCache||user?.uid!==uid)return;
  chain=chain.then(async()=>{await apply(snap);lastPull=Date.now();readError=null;syncStatus();}).catch(e=>{readError=e;retryLater(e);syncStatus();console.warn('Remote progress',e.code||e.message);});
 },e=>{readError=e;retryLater(e);syncStatus();});
}
async function refresh(){
 if(refreshing)return refreshing;
 if(!bridge||!user||!navigator.onLine){syncStatus();return;}
 const api=bridge;
 refreshing=(async()=>{
  try{
   const recovered=await api.db.kvGet('cloudRecoveryV2',false);
   if(!recovered)await saveLocalBackup(api);
   // Only the first recovery reads legacy records. Subsequent reads and the
   // live listener are scoped to DS, reducing reads of other learning apps.
   const refs=recovered?appRecords():collection(cloud,'users',user.uid,'records');
   const snapshot=await getDocsFromServer(refs);
   if(bridge!==api)return;
   if(!recovered){
    const rows=snapshot.docs.map(x=>x.data());
    for(const item of recoveryCandidates(api.state,rows,await queued()))await enqueue(item.store,item.key,item.value,item.old,{recovery:true,flushNow:false});
    await api.db.applyRemote('kv','cloudRecoveryV2',{k:'cloudRecoveryV2',v:true});
   }
   await apply(snapshot);lastPull=Date.now();readError=null;
   const rows=snapshot.docs.map(item=>item.data()).filter(item=>item.app===APP_ID);
   if(!rows.some(item=>item.store==='kv'&&item.key==='settings'))await enqueue('kv','settings',{k:'settings',v:api.state.settings},null,{flushNow:false});
   if(!rows.some(item=>item.store==='plan'))for(const task of api.state.plan)await enqueue('plan',task.id,task,null,{flushNow:false});
   listen();await flush();
  }catch(e){readError=e;retryLater(e);syncStatus();console.warn('Cloud receive',e.code||e.message);}
  finally{refreshing=null;syncStatus();}
 })();return refreshing;
}
async function attach(api){
 bridge=api;hideForeignLocalData(api);api.db.setObserver(enqueue);
 // A failed receive must not prevent using/exporting the saved local progress.
 await refresh();
}
async function privateDoc(id){const snap=await getDoc(doc(cloud,'content',id));if(!snap.exists())throw new Error('学習データがまだ登録されていません');return snap.data();}
async function start(u){
 user=u;journal=await openJournal(u.uid);
 window.DSCloud={uid:u.uid,attach,scan:async id=>(await privateDoc(id)).data};
 el('sync-retry').hidden=false;el('sync-backup').hidden=false;
 status('教材を読み込んでいます…');message('教材を読み込んでいます…');
 const manifest=await privateDoc('manifest');
 const parts=await Promise.all(manifest.chunks.map(privateDoc));
 const bytes=Uint8Array.from(atob(parts.map(x=>x.data).join('')),c=>c.charCodeAt(0));
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
 const html=await new Response(stream).text();
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(html))),b=>b.toString(16).padStart(2,'0')).join('');
 if(digest!==manifest.sha256)throw new Error('教材の整合性確認に失敗しました');
 // A same-origin blob document keeps hash links inside the study app. srcdoc
 // resolves relative links against the public shell and would nest the login page.
 if(privateUrl)URL.revokeObjectURL(privateUrl);
 privateUrl=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));frame.src=privateUrl;frame.hidden=false;el('gate').hidden=true;el('logout').hidden=false;status('進捗を読み込んでいます…');
}
el('login').onclick=async()=>{
 el('login').disabled=true;message('Googleログイン画面を開いています…');
 try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){message(errorText(e));el('login').disabled=false;}
};
el('login-redirect').onclick=async()=>{message('Googleログイン画面へ移動します…');try{await signInWithRedirect(auth,new GoogleAuthProvider());}catch(e){message(errorText(e));}};
getRedirectResult(auth).catch(e=>message(errorText(e)));
el('logout').onclick=async()=>{
 if(flushing||(journal&&(await queued()).length)){message('未同期の記録があります。接続して同期が完了してからログアウトしてください。');status('未同期のためログアウトを保留');return;}
 await signOut(auth);location.reload();
};
el('sync-retry').onclick=async()=>{
 el('sync-retry').disabled=true;
 try{await refresh();}finally{el('sync-retry').disabled=false;}
};
el('sync-backup').onclick=async()=>{
 if(!bridge)return;
 const data=await loadLocalBackup();
 const url=URL.createObjectURL(new Blob([JSON.stringify(data||await bridge.db.exportAll(),null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='ds-kentei-sync-backup-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
onAuthStateChanged(auth,async u=>{
 if(!u||u.uid!==OWNER_UID||!u.emailVerified){
  user=null;bridge=null;unsubscribe?.();readError=null;writeError=null;lastPull=0;backupDb?.close();backupDb=null;
  frame.src='about:blank';if(privateUrl)URL.revokeObjectURL(privateUrl);privateUrl=null;frame.hidden=true;el('gate').hidden=false;el('sync-retry').hidden=true;el('sync-backup').hidden=true;el('logout').hidden=!u;el('login').disabled=false;
  message(u?'このアプリは所有者専用です。所有者のアカウントでログインしてください。':'本人のGoogleアカウントでログインしてください。');status(u?'閲覧権限がありません':'ログインしていません');return;
 }
 try{await start(u);}catch(e){message(e.message==='学習データがまだ登録されていません'?e.message:errorText(e));status('読み込みできませんでした');el('logout').hidden=false;}
});
window.addEventListener('online',()=>void refresh());
window.addEventListener('offline',syncStatus);
setInterval(()=>{if(Date.now()>=nextRetry){if(readError)void refresh();else if(failed)void flush();}},15000);
function resumeSync(){if(!document.hidden){if(Date.now()>=nextRetry&&(readError||Date.now()-lastPull>5*60*1000))void refresh();else void flush();}}
window.addEventListener('focus',resumeSync);
document.addEventListener('visibilitychange',resumeSync);
