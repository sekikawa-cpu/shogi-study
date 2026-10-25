import {getFirestore,doc,collection,getDocsFromServer,runTransaction,serverTimestamp,query,where}from'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import {encode64,decode64,seal,unseal}from'./edit-crypto.js?v=1';
export function createEditCloud(app,getUser){
 const db=getFirestore(app);let remembered=null;
 const user=()=>{const value=getUser();if(!value?.emailVerified)throw Error('再ログインしてください。');return value};
 async function master(){
  const uid=user().uid;if(remembered?.uid===uid)return remembered.key;
  const ref=doc(db,'users',uid,'bookEditKeys','master');
  const fresh=encode64(crypto.getRandomValues(new Uint8Array(32)));
  const raw=await runTransaction(db,async transaction=>{const snapshot=await transaction.get(ref);if(snapshot.exists())return snapshot.data().key;transaction.set(ref,{version:1,key:fresh});return fresh});
  const key=await crypto.subtle.importKey('raw',decode64(raw),{name:'AES-GCM'},false,['encrypt','decrypt']);
  if(user().uid!==uid)throw Error('ログイン状態が変更されました。');remembered={uid,key};return key;
 }
 const items=(uid,book)=>collection(db,'users',uid,'bookEdits',book,'items');
 async function load(book){
  const uid=user().uid,key=await master(),snapshot=await getDocsFromServer(items(uid,book));
  const records=await Promise.all(snapshot.docs.map(async item=>{
   const meta=item.data();const parts=await getDocsFromServer(query(collection(item.ref,'chunks'),where('revision','==',meta.revision)));
   const chunks=parts.docs.map(d=>d.data()).filter(v=>v.revision===meta.revision).sort((a,b)=>a.index-b.index);
   if(chunks.length!==meta.chunks||chunks.some((c,i)=>c.index!==i))throw Error('編集データの一部を取得できません。再読み込みしてください。');
   const value=await unseal({iv:meta.iv,cipher:chunks.map(c=>c.cipher).join('')},key,`${book}:${item.id}:${meta.revision}`);
   return {...value,revision:meta.revision};
  }));
  if(user().uid!==uid)throw Error('ログイン状態が変更されました。');return records;
 }
 async function save(book,value,expectedRevision){
  const uid=user().uid,key=await master();
  if(typeof value?.key!=='string'||value.key.length>240)throw Error('編集項目が不正です。');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value.key));
  const id=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const revision=crypto.randomUUID(),payload={...value};delete payload.revision;
  const encrypted=await seal(payload,key,`${book}:${id}:${revision}`),chunks=[];
  for(let offset=0;offset<encrypted.cipher.length;offset+=600000)chunks.push(encrypted.cipher.slice(offset,offset+600000));
  const ref=doc(items(uid,book),id);
  await runTransaction(db,async transaction=>{
   const previous=await transaction.get(ref);
   if((previous.exists()?previous.data().revision:null)!==(expectedRevision||null))throw Error('別の端末で変更されています。「クラウドから再読込」後に編集してください。');
   chunks.forEach((cipher,index)=>transaction.set(doc(collection(ref,'chunks'),`${revision}-${index}`),{version:1,revision,index,cipher}));
   transaction.set(ref,{version:1,revision,iv:encrypted.iv,chunks:chunks.length,updatedAt:serverTimestamp()});
  });
  if(user().uid!==uid)throw Error('ログイン状態が変更されました。');return {...payload,revision};
 }
 return {load,save,clear:()=>{remembered=null}};
}
