import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const OWNER_UID="OFo1aUOLQedxLsCDspCHqnDrUSw2";
const firebaseConfig={apiKey:"AIzaSyCLUzsM9MtQMm72SNHwdcSMLxMosiHsqp4",authDomain:"shogi-study.com",projectId:"ds-study-705f8",messagingSenderId:"992364001386",appId:"1:992364001386:web:34d9ba4baf27cc16e2b213"};
const app=initializeApp(firebaseConfig);
const auth=getAuth(app); const provider=new GoogleAuthProvider(); provider.setCustomParameters({prompt:"select_account"});
const gate=document.querySelector("#gate"), frame=document.querySelector("#books"), status=document.querySelector("#status"), message=document.querySelector("#message"), login=document.querySelector("#login"), redirect=document.querySelector("#login-redirect"), logout=document.querySelector("#logout");
const APP_BASE=new URL(".",location.href).pathname; const CACHE_NAME="books-private-v3";
const mime={html:"text/html;charset=utf-8",css:"text/css;charset=utf-8",js:"text/javascript;charset=utf-8",json:"application/json;charset=utf-8",jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",gif:"image/gif",svg:"image/svg+xml",webp:"image/webp"};
let currentUser=null;let sessionEpoch=0;let bookManifests={};const bookLoads=new Map();
let editCloud=null;
async function getEditCloud(){if(!editCloud){const {createEditCloud}=await import('./edit-cloud.js?v=1');editCloud=createEditCloud(app,()=>currentUser?.uid===OWNER_UID?currentUser:null)}return editCloud}
const bundleBase=new URL(APP_BASE.startsWith("/admin/")?"../../books-study/":"./",location.href);

function setMessage(text){message.textContent=text;status.textContent=text}
async function clearPrivate(){editCloud?.clear();sessionEpoch++;bookManifests={};bookLoads.clear();await Promise.all([caches.delete("books-private-v1"),caches.delete("books-private-v2"),caches.delete(CACHE_NAME)]); navigator.serviceWorker.controller?.postMessage({type:"CLEAR_PRIVATE_BOOKS"}); frame.hidden=true;frame.removeAttribute("src")}
async function ownerSecret(user){const material=new TextEncoder().encode(`book-app-v3:${user.uid}`);const digest=await crypto.subtle.digest("SHA-256",material);return btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll("+","-").replaceAll("/","_").replaceAll("=","")}
function bytesFromBase64(text){const raw=atob(text),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
async function decryptBundle(secret,manifestName="encrypted-manifest.json"){
  setMessage("書籍データを安全に復号しています…");
  const manifestResponse=await fetch(new URL(manifestName,bundleBase),{cache:"no-store"});
  if(!manifestResponse.ok)throw new Error("書籍データ一覧を取得できませんでした。");
  const manifest=await manifestResponse.json();
  const bytes=new Uint8Array(manifest.bytes);let offset=0;
  const chunks=await Promise.all(manifest.parts.map(async part=>{
    if(!/^encrypted-[a-f0-9]{16}-[0-9]+\.bundle$/.test(part))throw new Error("書籍データの分割名が不正です。");
    const response=await fetch(new URL(part,bundleBase),{cache:"force-cache"});if(!response.ok)throw new Error("書籍データを取得できませんでした。");
    return new Uint8Array(await response.arrayBuffer());
  }));
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  if(offset!==manifest.bytes)throw new Error("書籍データのサイズが一致しません。");
  if(new TextDecoder().decode(bytes.slice(0,8))!=="BOOKAPP1")throw new Error("書籍データの形式が不正です。");
  const salt=bytes.slice(8,24),iv=bytes.slice(24,36),tag=bytes.slice(36,52),cipher=bytes.slice(52),combined=new Uint8Array(cipher.length+tag.length);combined.set(cipher);combined.set(tag,cipher.length);
  const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),"PBKDF2",false,["deriveKey"]);
  const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:600000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["decrypt"]);
  let compressed;try{compressed=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,combined)}catch{throw new Error("パスフレーズが違います。")}
  const plain=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  const payload=JSON.parse(new TextDecoder().decode(plain));payload.bookManifests=manifest.books||{};return payload;
}
async function installFiles(payload){
  const installEpoch=sessionEpoch;
  setMessage("専用ライブラリを準備しています…"); const cache=await caches.open(CACHE_NAME); let done=0; const entries=Object.entries(payload.files);
  for(const [path,data] of entries){if(installEpoch!==sessionEpoch)throw new Error("ログイン状態が変わりました。");const ext=path.split(".").pop().toLowerCase();const url=new URL(`private/${path}`,location.href);await cache.put(url,new Response(bytesFromBase64(data),{headers:{"Content-Type":mime[ext]||"application/octet-stream","Cache-Control":"no-store"}}));done++;if(done%25===0||done===entries.length)setMessage(`専用ライブラリを準備しています… ${done}/${entries.length}`)}
}
async function openBooks(user){const payload=await decryptBundle(await ownerSecret(user));await installFiles(payload);bookManifests=payload.bookManifests;gate.hidden=true;frame.hidden=false;frame.src="private/index.html";logout.hidden=false;status.textContent="書籍ライブラリを表示しています"}
async function prepareBook(bookId){
  const manifestName=bookManifests[bookId];if(!manifestName)return;
  if(!/^encrypted-[a-f0-9]{16}-manifest\.json$/.test(manifestName))throw new Error("書籍情報が不正です。");
  const user=currentUser;if(!user||user.uid!==OWNER_UID)throw new Error("再ログインしてください。");
  const cache=await caches.open(CACHE_NAME);const marker=new URL(`private/.ready-${bookId}`,location.href);
  const ready=await cache.match(marker);if(ready&&await ready.text()===manifestName)return;
  const payload=await decryptBundle(await ownerSecret(user),manifestName);
  if(currentUser!==user)throw new Error("ログイン状態が変わりました。");
  await installFiles(payload);await cache.put(marker,new Response(manifestName));
}
window.addEventListener("message",async event=>{
  if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=="LOAD_BOOK_ASSETS")return;
  const {bookId,requestId}=event.data;if(!/^[a-zA-Z0-9_-]+$/.test(bookId)||typeof requestId!=="string")return;
  let error;
  try{
    if(!bookLoads.has(bookId))bookLoads.set(bookId,prepareBook(bookId).catch(e=>{bookLoads.delete(bookId);throw e}));
    await bookLoads.get(bookId);status.textContent="本人確認済み・書籍ライブラリ表示中";
  }catch(e){error=e.message;setMessage(error)}
  if(event.source===frame.contentWindow)event.source.postMessage({type:"BOOK_ASSETS_READY",requestId,error},location.origin);
});
login.addEventListener("click",async()=>{try{await signInWithPopup(auth,provider)}catch(e){setMessage(`ログインできませんでした: ${e.message}`)}});
redirect.addEventListener("click",()=>signInWithRedirect(auth,provider));
logout.addEventListener("click",async()=>{await clearPrivate();await signOut(auth)});
frame.addEventListener("load",()=>{if(!frame.hidden)status.textContent="本人確認済み・書籍ライブラリ表示中"});
try{const registration=await navigator.serviceWorker.register("sw.js?v=3",{scope:APP_BASE});await registration.update();await navigator.serviceWorker.ready;await getRedirectResult(auth)}catch(e){setMessage(`初期化エラー: ${e.message}`)}
onAuthStateChanged(auth,async user=>{currentUser=user;login.disabled=false;if(!user){await clearPrivate();gate.hidden=false;logout.hidden=true;login.hidden=false;redirect.hidden=false;setMessage("Googleアカウントでログインしてください。");return}if(!user.emailVerified||user.uid!==OWNER_UID){await clearPrivate();await signOut(auth);setMessage("このGoogleアカウントには利用権限がありません。");return}logout.hidden=false;login.hidden=true;redirect.hidden=true;setMessage("本人確認が完了しました。書籍を準備しています…");try{await openBooks(user)}catch(error){setMessage(`書籍を開けませんでした: ${error.message}`)}});

window.addEventListener("message",async event=>{
 if(event.origin!==location.origin||event.source!==frame.contentWindow||!["LOAD_BOOK_EDITS","SAVE_BOOK_EDIT"].includes(event.data?.type))return;
 const {bookId,requestId,value,expectedRevision}=event.data;
 if(!/^[a-zA-Z0-9_-]{1,80}$/.test(bookId)||typeof requestId!=="string")return;
 let result,error;
 try{if(!currentUser?.emailVerified||currentUser.uid!==OWNER_UID)throw Error("再ログインしてください。");
 const editor=await getEditCloud();result=event.data.type==="LOAD_BOOK_EDITS"?await editor.load(bookId):await editor.save(bookId,value,expectedRevision);
 }catch(e){error=e.message||"クラウド保存に失敗しました。"}
 if(event.source===frame.contentWindow)event.source.postMessage({type:"BOOK_EDIT_RESULT",requestId,result,error},location.origin);
});
