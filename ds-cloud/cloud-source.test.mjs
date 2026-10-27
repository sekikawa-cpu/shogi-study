import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import * as model from './sync-model.js';
import {recoveryCandidates} from './sync-recovery.js';
const require=createRequire(import.meta.url);
const {IDBFactory}=require('C:/Claude/DS検定/tools/cloud-runtime/node_modules/fake-indexeddb');
const source=readFileSync(new URL('./cloud-source.js',import.meta.url),'utf8').replace(/^import[^\n]*\n/gm,'');
const copy=value=>value===undefined?undefined:structuredClone(value);

function server(){
 const records=new Map(),listeners=new Set();let transaction=Promise.resolve();
 const document=path=>({id:path.split('/').at(-1),data:()=>copy(records.get(path)),exists:()=>records.has(path)});
 const snapshot=ref=>{
  const docs=[...records].filter(([path,value])=>path.slice(0,path.lastIndexOf('/'))===ref.path&&(!ref.app||value.app===ref.app)).map(([path])=>document(path));
  return {docs,empty:!docs.length,metadata:{fromCache:false},docChanges:()=>docs.map(doc=>({doc}))};
 };
 const api={records,failRead:false,
  collection:(_,...parts)=>({path:parts.join('/')}),
  query:(ref,condition)=>({...ref,app:condition.value}),where:(_field,_op,value)=>({value}),
  doc:(_,...parts)=>parts.join('/'),serverTimestamp:()=>new Date().toISOString(),
  getDoc:async path=>document(path),
  getDocs:async ref=>{if(api.failRead)throw {code:'unavailable'};return snapshot(ref);},
  onSnapshot:(ref,_options,next,error)=>{const listener={ref,next,error};listeners.add(listener);queueMicrotask(()=>next(snapshot(ref)));return()=>listeners.delete(listener);},
  runTransaction:(_cloud,fn)=>{
   const run=transaction.then(async()=>{
    const writes=[];await fn({get:async path=>document(path),set:(path,value)=>writes.push([path,copy(value)])});
    for(const [path,value] of writes)records.set(path,value);
    for(const listener of listeners)listener.next(snapshot(listener.ref));
   });transaction=run.catch(()=>{});return run;
  },
  failListeners:()=>{for(const listener of listeners)listener.error({code:'unavailable'});}
 };return api;
}
function localApi(patch={}){
 const state={settings:{phases:[{tracks:[{s:'ds'}]}]},plan:[{id:'plan1',subjectId:'ds',done:false,doneMin:0}],quizzes:[{id:'q1',subjectId:'ds',seen:0,correct:0,flagged:false}],notes:[{id:'seed-note-1',subjectId:'ds',read:false}],cards:[{id:'seed-card-1',subjectId:'ds',reps:0}],logs:[],scores:[],units:[],...copy(patch)};
 const names=['kv','plan','quizzes','notes','cards','logs','scores','units'],data=Object.fromEntries(names.map(s=>[s,new Map()]));
 data.kv.set('settings',{k:'settings',v:copy(state.settings)});
 for(const s of names.filter(s=>s!=='kv'))for(const value of state[s])data[s].set(value.id,copy(value));
 let observer;
 const db={STORES:Object.fromEntries(names.map(s=>[s,{keyPath:s==='kv'?'k':'id'}])),
  get:async(s,key)=>copy(data[s].get(key)),kvGet:async(k,fallback)=>copy(data.kv.get(k)?.v??fallback),
  applyRemote:async(s,key,value)=>{if(value===null)data[s].delete(key);else data[s].set(key,copy(value));},
  setObserver:fn=>{observer=fn;},
  exportAll:async()=>({_meta:{app:'ds-kentei-study'},...Object.fromEntries(names.map(s=>[s,[...data[s].values()].map(copy)]))})
 };
 return {db,state,emit(){},async write(s,key,value){const old=await db.get(s,key);await db.applyRemote(s,key,value);if(s!=='kv'){const index=state[s].findIndex(x=>x.id===key);if(index>=0)state[s][index]=copy(value);else state[s].push(copy(value));}await observer(s,key,value,old);}};
}
async function client(backend,patch){
 const nodes=new Map(),storage=new Map(),events={};
 const el=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:'',contentWindow:{Event:class{},dispatchEvent(){}}});return nodes.get(id);};
 const context={...model,...backend,recoveryCandidates,console,structuredClone,Date,JSON,Promise,URL,Blob,Uint8Array,Response,DecompressionStream,TextEncoder,atob,crypto:webcrypto,indexedDB:new IDBFactory(),navigator:{onLine:true},
  initializeApp:()=>({}),getAuth:()=>({}),initializeFirestore:()=>({}),firebaseConfig:{},OWNER_UID:'owner',GoogleAuthProvider:class{},getRedirectResult:()=>Promise.resolve(),onAuthStateChanged(){},
  document:{getElementById:el,addEventListener:(type,fn)=>{events[type]=fn;},hidden:false},window:{addEventListener:(type,fn)=>{events[type]=fn;}},
  localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setInterval(){},setTimeout,clearTimeout};
 runInNewContext(source+'\nglobalThis.engine={attach,enqueue,flush,refresh,queued,backup:loadLocalBackup,queueLegacy:op=>journalTx("readwrite",s=>s.put(op)),init:async()=>{user={uid:"owner"};journal=await openJournal(user.uid);},busy:()=>flushing||!!refreshing,status:()=>el("sync").textContent};',context);
 const engine=context.engine,api=localApi(patch);await engine.init();return {engine,api,events};
}
async function settle(...clients){
 for(let i=0;i<300;i++){
  await new Promise(resolve=>setTimeout(resolve,3));
  if(clients.every(x=>!x.engine.busy())&&(await Promise.all(clients.map(x=>x.engine.queued()))).every(x=>!x.length)){
   await new Promise(resolve=>setTimeout(resolve,30));return;
  }
 }throw Error('Sync did not settle');
}

test('two isolated PCs synchronize plan checks, hours, answers and read notes',async()=>{
 const backend=server(),a=await client(backend),b=await client(backend);
 await a.engine.attach(a.api);await b.engine.attach(b.api);await settle(a,b);
 await a.api.write('plan','plan1',{id:'plan1',subjectId:'ds',done:true,doneMin:15});
 await a.api.write('logs','log1',{id:'log1',subjectId:'ds',minutes:12});
 await a.api.write('quizzes','q1',{id:'q1',subjectId:'ds',seen:1,correct:1,lastSeen:'2026-10-27T00:00:00Z'});
 await a.api.write('notes','seed-note-1',{id:'seed-note-1',subjectId:'ds',read:true,lastRead:'2026-10-27T00:00:00Z'});
 await settle(a,b);
 assert.equal(b.api.state.plan[0].done,true);assert.equal(b.api.state.logs[0].minutes,12);
 assert.equal(b.api.state.quizzes[0].correct,1);assert.equal(b.api.state.notes[0].read,true);
 assert.match(b.engine.status(),/同期済み/);
 await b.api.write('quizzes','q1',{...b.api.state.quizzes[0],seen:2,correct:1});await settle(a,b);
 assert.equal(a.api.state.quizzes[0].seen,2);
});

test('recovery uploads local-only progress and overlapping old counters are not counted twice',async()=>{
 const backend=server(),old={quizzes:[{id:'q1',subjectId:'ds',seen:7,correct:4}],logs:[{id:'old-log',subjectId:'ds',minutes:30}],notes:[{id:'seed-note-1',subjectId:'ds',read:true,lastRead:'2026-10-20'}],plan:[{id:'plan1',subjectId:'ds',done:true,doneMin:20}]};
 const a=await client(backend,old),b=await client(backend,old);
 await Promise.all([a.engine.attach(a.api),b.engine.attach(b.api)]);await settle(a,b);
 assert.equal(a.api.state.quizzes[0].seen,7);assert.equal(b.api.state.quizzes[0].correct,4);
 assert.equal(b.api.state.logs.length,1);assert.equal(b.api.state.logs[0].minutes,30);
 assert.equal(b.api.state.notes[0].read,true);assert.equal(b.api.state.plan[0].done,true);
});

test('a failed receive stays visibly unsynchronized even when writes succeed; retry receives again',async()=>{
 const backend=server();backend.failRead=true;const a=await client(backend);
 await a.engine.attach(a.api);
 assert.match(a.engine.status(),/同期未完了/);
 await a.api.write('logs','offline-log',{id:'offline-log',subjectId:'ds',minutes:15});await settle(a);
 assert.match(a.engine.status(),/同期未完了/);
 backend.failRead=false;await a.engine.refresh();await settle(a);
 assert.match(a.engine.status(),/同期済み/);assert.equal(a.api.state.logs[0].minutes,15);
 backend.failListeners();await a.engine.flush();assert.match(a.engine.status(),/同期未完了/);
 await a.engine.refresh();await settle(a);assert.match(a.engine.status(),/同期済み/);
});

test('recovery respects pending operations, cloud deletions and explicit unchecked plans',()=>{
 const state={plan:[{id:'p',subjectId:'ds',done:true}],quizzes:[{id:'q',subjectId:'ds',seen:10,correct:5}],notes:[{id:'n',subjectId:'ds',read:true,lastRead:'2026-10-01'}]};
 const records=[{app:'ds',store:'plan',key:'p',data:{subjectId:'ds',done:false}},{app:'ds',store:'notes',key:'n',data:null}];
 assert.equal(recoveryCandidates(state,records,[{store:'quizzes',key:'q'}]).length,0);
});

test('pre-namespace queued changes retain their identity and receive the DS app field',async()=>{
 const backend=server(),a=await client(backend);await a.engine.attach(a.api);await settle(a);
 await a.engine.queueLegacy({id:'old-operation',store:'logs',key:'legacy-log',data:{id:'legacy-log',subjectId:'ds',minutes:8},at:'2026-10-10T00:00:00Z',deviceId:'old-device'});
 await a.engine.flush();await settle(a);
 const record=[...backend.records.values()].find(x=>x.key==='legacy-log');assert.equal(record.app,'ds');assert.equal(record.data.minutes,8);
 const count=backend.records.size;await a.engine.flush();assert.equal(backend.records.size,count);
});

test('the local snapshot is retained before applying an intentional cloud unread flag',async()=>{
 const backend=server();backend.records.set('users/owner/records/ds%7Cnotes%7Cseed-note-1',{app:'ds',store:'notes',key:'seed-note-1',data:{read:false,lastRead:null},at:'2026-10-25T00:00:00Z',deviceId:'other'});
 const a=await client(backend,{notes:[{id:'seed-note-1',subjectId:'ds',read:true,lastRead:'2026-10-20'}]});
 await a.engine.attach(a.api);await settle(a);
 assert.equal(a.api.state.notes[0].read,false);
 assert.equal((await a.engine.backup()).notes[0].read,true);
});
