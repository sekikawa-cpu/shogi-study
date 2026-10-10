import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const source = readFileSync(new URL('../public/admin/admin.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
function setup() {
  const nodes = Object.fromEntries(['gate', 'menu', 'login', 'redirect', 'logout', 'status', 'message'].map(id => [id, {hidden: id === 'menu' || id === 'logout', disabled: true, textContent: ''}]));
  let callback, popupCalls = 0, signouts = 0, popupResult = () => Promise.resolve(), redirectResult = () => Promise.resolve();
  const context = {
    document: {getElementById: id => nodes[id]}, firebaseConfig: {}, OWNER_UID: 'owner',
    initializeApp: () => ({}), getAuth: () => ({}),
    GoogleAuthProvider: class {setCustomParameters() {}},
    onAuthStateChanged: (_auth, fn) => {callback = fn;},
    getRedirectResult: () => Promise.resolve(),
    signInWithPopup: () => {popupCalls++; return popupResult();},
    signInWithRedirect: () => redirectResult(),
    signOut: async () => {signouts++; await callback(null);}
  };
  runInNewContext(source, context);
  return {nodes, auth: user => callback(user), get popupCalls() {return popupCalls;}, get signouts() {return signouts;}, popup: fn => {popupResult = fn;}, redirect: fn => {redirectResult = fn;}};
}

test('launcher remains hidden until a verified owner signs in, and hides on sign-out', async () => {
  const app = setup();
  assert.equal(app.nodes.menu.hidden, true);
  await app.nodes.login.onclick();
  assert.equal(app.popupCalls, 0, 'login should wait for initialization');
  await app.auth(null);
  assert.equal(app.nodes.gate.hidden, false);
  assert.equal(app.nodes.login.disabled, false);
  await app.auth({uid: 'owner', emailVerified: true});
  assert.equal(app.nodes.menu.hidden, false);
  assert.equal(app.nodes.gate.hidden, true);
  await app.nodes.logout.onclick();
  assert.equal(app.nodes.menu.hidden, true);
  assert.equal(app.nodes.logout.hidden, true);
});

test('wrong account and unverified owner cannot see the app menu', async () => {
  for (const user of [{uid: 'outsider', emailVerified: true}, {uid: 'owner', emailVerified: false}]) {
    const app = setup();
    await app.auth(user);
    assert.equal(app.nodes.menu.hidden, true);
    assert.equal(app.nodes.gate.hidden, false);
    assert.equal(app.signouts, 1);
    assert.match(app.nodes.message.textContent, /利用権限がありません/);
  }
});

test('blocked popup and failed redirect allow a retry without exposing the menu', async () => {
  const app = setup();
  await app.auth(null);
  app.popup(() => Promise.reject({code: 'auth/popup-blocked'}));
  await app.nodes.login.onclick();
  assert.match(app.nodes.message.textContent, /同じタブでログイン/);
  assert.equal(app.nodes.redirect.disabled, false);
  app.redirect(() => Promise.reject({code: 'auth/network-request-failed'}));
  await app.nodes.redirect.onclick();
  assert.match(app.nodes.message.textContent, /通信できません/);
  assert.equal(app.nodes.menu.hidden, true);
  assert.equal(app.nodes.login.disabled, false);
});

test('duplicate login clicks do not open multiple popups', async () => {
  const app = setup();
  await app.auth(null);
  let finish;
  app.popup(() => new Promise(resolve => {finish = resolve;}));
  const first = app.nodes.login.onclick();
  await app.nodes.login.onclick();
  assert.equal(app.popupCalls, 1);
  finish(); await first;
});
