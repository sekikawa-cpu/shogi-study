import {initializeApp} from 'firebase/app';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,signOut} from 'firebase/auth';
import {initializeFirestore,collection,doc,getDoc,getDocs,onSnapshot,runTransaction,serverTimestamp} from 'firebase/firestore';
import {firebaseConfig,OWNER_UID} from '../public/ds-study/config.js';
import {DS_APP_ID,isDSRecord,isLocalDSValue,projectRecord,mergeOperation} from './sync-model.js';

const app=initializeApp(firebaseConfig),auth=getAuth(app);
const cloud=initializeFirestore(app,{});
const el=id=>document.getElementById(id),frame=el('study');
let user=null,journal=null,bridge=null,unsubscribe=null,flushing=false,failed=false,privateUrl=null;
const APP_ID=DS_APP_ID;
const deviceId=localStorage.getItem('ds-cloud-device')||crypto.randomUUID();localStorage.setItem('ds-cloud-device',deviceId);
const message=text=>{el('message').textContent=text;};
const status=text=>{el('sync').textContent=text;};
const errorText=e=> e.code==='auth/popup-closed-by-user'?'ログイン画面が閉じられました。もう一度ログインしてください。':e.code==='auth/unauthorized-domain'?'このサイトのログイン設定を確認する必要があります。':e.code==='permission-denied'?'このアカウントには学習データの閲覧権限がありません。':'通信できませんでした。接続を確認して再読み込みしてください。';

// A durable, per-account journal makes transactions retryable across browser restarts.
function openJournal(uid){return new Promise((resolve,reject)=>{const r=indexedDB.open('ds-cloud-journal-'+uid,1);r.onupgradeneeded=()=>r.result.createObjectStore('outbox',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function journalTx(mode,fn){return new Promise((resolve,reject)=>{const t=journal.transaction('outbox',mode),r=fn(t.objectStore('outbox'));t.oncomplete=()=>resolve(r?.result);t.onerror=()=>reject(t.error);});}
const queued=()=>journalTx('readonly',s=>s.getAll());
const recordId=(s,key)=>encodeURIComponent(APP_ID+'|'+s+'|'+key);
async function enqueue(s,key,value,old){
 const data=projectRecord(s,value),prior=projectRecord(s,old||{});
 if(JSON.stringify(data)===JSON.stringify(prior))return;
 const op={id:crypto.randomUUID(),app:APP_ID,store:s,key:String(key),data,at:new Date().toISOString(),deviceId};
 if(s==='quizzes'&&data){op.seenDelta=Math.max(0,data.seen-(prior.seen||0));op.correctDelta=Math.max(0,data.correct-(prior.correct||0));}
 await journalTx('readwrite',os=>os.put(op));
 status(navigator.onLine?'保存しています…':'オフライン・端末に保存済み');
 void flush();
}
async function flush(){
 if(flushing||!user||!journal)return;flushing=true;
 try{
  for(const op of await queued()){
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
  failed=false;status('同期済み');
 }catch(e){failed=true;status(navigator.onLine?'端末に保存済み・同期を再試行します':'オフライン・端末に保存済み');console.warn('Progress sync',e.code||e.message);}
 finally{flushing=false;if(!failed&&(await queued()).length)setTimeout(()=>void flush(),0);}
}
async function apply(snapshot){
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
async function pruneForeignLocalData(api){
 for(const store of ['plan','logs','cards','notes','quizzes','scores']){
  const list=api.state[store]||[];
  for(let i=list.length-1;i>=0;i--){
   const value=list[i];if(isLocalDSValue(store,value))continue;
   await api.db.applyRemote(store,String(value.id),null);list.splice(i,1);
  }
 }
}
async function attach(api){
 bridge=api;
 await pruneForeignLocalData(api);
 const refs=collection(cloud,'users',user.uid,'records');
 const snapshot=await getDocs(refs);await apply(snapshot);
 api.db.setObserver(enqueue);
 // The initial preferences and plan also need to be available on the second PC.
 const hasAppRecords=snapshot.docs.some(item=>item.data().app===APP_ID);
 if(!hasAppRecords){await enqueue('kv','settings',{k:'settings',v:api.state.settings},null);for(const task of api.state.plan)await enqueue('plan',task.id,task,null);}
 let chain=Promise.resolve();
 unsubscribe=onSnapshot(refs,snap=>{chain=chain.then(()=>apply(snap)).catch(e=>console.warn('Remote progress',e));},e=>status(errorText(e)));
 await journalTx('readonly',os=>os.count());void flush();
}
async function privateDoc(id){const snap=await getDoc(doc(cloud,'content',id));if(!snap.exists())throw new Error('学習データがまだ登録されていません');return snap.data();}
async function start(u){
 user=u;journal=await openJournal(u.uid);
 window.DSCloud={uid:u.uid,attach,scan:async id=>(await privateDoc(id)).data};
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
onAuthStateChanged(auth,async u=>{
 if(!u){user=null;bridge=null;unsubscribe?.();frame.src='about:blank';if(privateUrl)URL.revokeObjectURL(privateUrl);privateUrl=null;frame.hidden=true;el('gate').hidden=false;el('logout').hidden=true;el('login').disabled=false;message('本人のGoogleアカウントでログインしてください。');status('ログインしていません');return;}
 if(u.uid!==OWNER_UID||!u.emailVerified){message('このアプリは所有者専用です。所有者のアカウントでログインしてください。');status('閲覧権限がありません');el('logout').hidden=false;return;}
 try{await start(u);}catch(e){message(e.message==='学習データがまだ登録されていません'?e.message:errorText(e));status('読み込みできませんでした');el('logout').hidden=false;}
});
window.addEventListener('online',()=>void flush());
window.addEventListener('offline',()=>status('オフライン・端末に保存します'));
setInterval(()=>{if(failed)void flush();},15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void flush();});
