import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const OWNER_EMAIL="sekikawa0301@gmail.com";
const firebaseConfig={apiKey:"AIzaSyCLUzsM9MtQMm72SNHwdcSMLxMosiHsqp4",authDomain:"shogi-study.com",projectId:"ds-study-705f8",messagingSenderId:"992364001386",appId:"1:992364001386:web:34d9ba4baf27cc16e2b213"};
const app=initializeApp(firebaseConfig,"books-private-app");
const auth=getAuth(app); const provider=new GoogleAuthProvider(); provider.setCustomParameters({prompt:"select_account"});
const gate=document.querySelector("#gate"), frame=document.querySelector("#books"), status=document.querySelector("#status"), message=document.querySelector("#message"), login=document.querySelector("#login"), redirect=document.querySelector("#login-redirect"), logout=document.querySelector("#logout"), unlock=document.querySelector("#unlock"), passphrase=document.querySelector("#passphrase");
const CACHE_NAME="books-private-v2";
const mime={html:"text/html;charset=utf-8",css:"text/css;charset=utf-8",js:"text/javascript;charset=utf-8",json:"application/json;charset=utf-8",jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",gif:"image/gif",svg:"image/svg+xml",webp:"image/webp"};
let currentUser=null;

function setMessage(text){message.textContent=text;status.textContent=text}
async function clearPrivate(){await Promise.all([caches.delete("books-private-v1"),caches.delete(CACHE_NAME)]); navigator.serviceWorker.controller?.postMessage({type:"CLEAR_PRIVATE_BOOKS"}); frame.hidden=true;frame.removeAttribute("src")}
function bytesFromBase64(text){const raw=atob(text),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
async function decryptBundle(secret){
  setMessage("書籍データを安全に復号しています…");
  const bytes=new Uint8Array(await (await fetch("encrypted.bundle",{cache:"no-store"})).arrayBuffer());
  if(new TextDecoder().decode(bytes.slice(0,8))!=="BOOKAPP1")throw new Error("書籍データの形式が不正です。");
  const salt=bytes.slice(8,24),iv=bytes.slice(24,36),tag=bytes.slice(36,52),cipher=bytes.slice(52),combined=new Uint8Array(cipher.length+tag.length);combined.set(cipher);combined.set(tag,cipher.length);
  const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),"PBKDF2",false,["deriveKey"]);
  const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:600000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["decrypt"]);
  let compressed;try{compressed=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,combined)}catch{throw new Error("パスフレーズが違います。")}
  const plain=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  return JSON.parse(new TextDecoder().decode(plain));
}
async function installFiles(payload){
  setMessage("専用ライブラリを準備しています…"); const cache=await caches.open(CACHE_NAME); let done=0; const entries=Object.entries(payload.files);
  for(const [path,data] of entries){const ext=path.split(".").pop().toLowerCase();const url=new URL(`private/${path}`,location.href);await cache.put(url,new Response(bytesFromBase64(data),{headers:{"Content-Type":mime[ext]||"application/octet-stream","Cache-Control":"no-store"}}));done++;if(done%25===0||done===entries.length)setMessage(`専用ライブラリを準備しています… ${done}/${entries.length}`)}
}
async function openBooks(secret){const payload=await decryptBundle(secret);await installFiles(payload);sessionStorage.setItem("books-unlocked","1");gate.hidden=true;frame.hidden=false;frame.src="private/index.html";logout.hidden=false;status.textContent="書籍ライブラリを表示しています"}
login.addEventListener("click",async()=>{try{await signInWithPopup(auth,provider)}catch(e){setMessage(`ログインできませんでした: ${e.message}`)}});
redirect.addEventListener("click",()=>signInWithRedirect(auth,provider));
logout.addEventListener("click",async()=>{await clearPrivate();sessionStorage.removeItem("books-unlocked");await signOut(auth)});
unlock.addEventListener("submit",async e=>{e.preventDefault();try{await openBooks(passphrase.value)}catch(err){setMessage(err.message)}});
frame.addEventListener("load",()=>{if(!frame.hidden)status.textContent="本人確認済み・書籍ライブラリ表示中"});
try{const registration=await navigator.serviceWorker.register("sw.js?v=2",{scope:"/books-study/"});await registration.update();await navigator.serviceWorker.ready;await getRedirectResult(auth)}catch(e){setMessage(`初期化エラー: ${e.message}`)}
onAuthStateChanged(auth,async user=>{currentUser=user;login.disabled=false;if(!user){await clearPrivate();gate.hidden=false;unlock.hidden=true;logout.hidden=true;setMessage("Googleアカウントでログインしてください。");return}if(!user.emailVerified||user.email?.toLowerCase()!==OWNER_EMAIL){await clearPrivate();await signOut(auth);setMessage("このGoogleアカウントには利用権限がありません。");return}logout.hidden=false;unlock.hidden=false;login.hidden=true;redirect.hidden=true;setMessage("本人確認が完了しました。パスフレーズを入力してください。");passphrase.focus()});
