import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { firebaseConfig, OWNER_UID } from '/ds-study/config.js';

// Keep the same default Firebase app and persistent session as both study apps.
const auth = getAuth(initializeApp(firebaseConfig));
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
const el = id => document.getElementById(id);
let busy = true;
function setBusy(value) {
  busy = value;
  for (const id of ['login', 'redirect', 'logout']) el(id).disabled = value;
}
function loginError(error) {
  if (error.code === 'auth/popup-closed-by-user') return 'ログイン画面が閉じられました。もう一度ログインしてください。';
  if (error.code === 'auth/popup-blocked') return 'ログイン画面を開けませんでした。「同じタブでログイン」をお使いください。';
  if (error.code === 'auth/network-request-failed') return '通信できませんでした。接続を確認してもう一度お試しください。';
  return 'ログインできませんでした。もう一度お試しください。';
}
async function login(redirect) {
  if (busy) return;
  setBusy(true);
  el('message').textContent = redirect ? 'Googleログイン画面へ移動します…' : 'Googleログイン画面を開いています…';
  try {
    if (redirect) await signInWithRedirect(auth, provider);
    else await signInWithPopup(auth, provider);
  } catch (error) { el('message').textContent = loginError(error); }
  finally { setBusy(false); }
}
el('login').onclick = () => login(false);
el('redirect').onclick = () => login(true);
el('logout').onclick = async () => {
  if (busy) return;
  setBusy(true);
  try { await signOut(auth); }
  catch { el('status').textContent = 'ログアウトできませんでした。もう一度お試しください。'; }
  finally { setBusy(false); }
};
onAuthStateChanged(auth, async user => {
  // Permission is checked before exposing the app selection, including session changes.
  el('menu').hidden = true;
  el('gate').hidden = false;
  el('logout').hidden = true;
  if (!user) {
    el('status').textContent = '未ログイン';
    el('message').textContent = '登録済みのGoogleアカウントでログインしてください。';
    setBusy(false);
    return;
  }
  if (!user.emailVerified || user.uid !== OWNER_UID) {
    el('status').textContent = '利用権限がありません';
    setBusy(true);
    try { await signOut(auth); }
    finally {
      el('message').textContent = 'このアカウントには利用権限がありません。管理者のアカウントを選んでください。';
      setBusy(false);
    }
    return;
  }
  el('gate').hidden = true;
  el('menu').hidden = false;
  el('logout').hidden = false;
  el('status').textContent = '管理者ログイン済み';
  setBusy(false);
}, () => {
  el('status').textContent = '認証を確認できませんでした';
  el('message').textContent = '接続を確認してページを再読み込みしてください。';
  setBusy(false);
});
getRedirectResult(auth).catch(error => {
  el('message').textContent = loginError(error);
  setBusy(false);
});
