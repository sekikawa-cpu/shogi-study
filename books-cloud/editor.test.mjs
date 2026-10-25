import {test}from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs/promises';
import{webcrypto}from'node:crypto';
import{JSDOM}from'jsdom';
import{seal,unseal}from'../public/admin/books-study/edit-crypto.js';
const script=await fs.readFile(new URL('./viewer/book-editor.js',import.meta.url),'utf8');
const initial='<h2 id="h1">見出し</h2><p id="p1">本文です。</p><figure id="f1"><img src="books/test/figure.png"></figure>';
async function environment(store=new Map(),html=initial){
 const dom=new JSDOM('<header class="topbar"></header><main><div id="pages"></div></main>',{url:'https://example.test/admin/books-study/private/text.html',runScripts:'outside-only'});
 const w=dom.window;Object.defineProperty(w,'crypto',{value:webcrypto});w.TextEncoder=TextEncoder;w.structuredClone=structuredClone;w.CSS={escape:s=>s};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
 const parent={postMessage(message){queueMicrotask(()=>{let result,error;try{if(message.type==='LOAD_BOOK_EDITS')result=Array.from(store.values());else{const previous=store.get(message.value.key);if((previous?.revision||null)!==message.expectedRevision)throw Error('別の端末で変更されています');result={...message.value,revision:webcrypto.randomUUID()};store.set(result.key,result)}}catch(e){error=e.message}w.dispatchEvent(new w.MessageEvent('message',{origin:w.location.origin,source:parent,data:{type:'BOOK_EDIT_RESULT',requestId:message.requestId,result,error}}))})}};
 Object.defineProperty(w,'parent',{value:parent});
 const NAV={totalPages:1,navigationMode:'structured',sections:[{id:'h1',anchor:'h1',title:'見出し',level:2,startFile:1,endFile:1}]},PAGES={1:{html,text:'見出し本文です。'}},container=w.document.querySelector('#pages');
 const refresh=()=>{container.innerHTML=PAGES[1].html;w.document.dispatchEvent(new w.Event('book-reader-rendered'))};refresh();w.eval(script);
 await w.installBookEditor({bookId:'test',NAV,PAGES,container,refresh});
 const button=text=>Array.from(w.document.querySelectorAll('button')).find(n=>n.textContent===text);
 return{w,NAV,PAGES,store,button,close:()=>dom.window.close()};
}
async function until(fn){for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,10))}throw Error('condition not reached')}
test('encrypted cloud payload rejects tampering and book substitution',async()=>{
 const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const value={text:'非公開の修正本文',image:'data:image/png;base64,abcd'};
 const cipher=await seal(value,key,'book:item:rev');assert.ok(!JSON.stringify(cipher).includes(value.text));assert.deepEqual(await unseal(cipher,key,'book:item:rev'),value);
 await assert.rejects(()=>unseal(cipher,key,'other:item:rev'));
 cipher.cipher=(cipher.cipher[0]==='A'?'B':'A')+cipher.cipher.slice(1);await assert.rejects(()=>unseal(cipher,key,'book:item:rev'));
});
test('heading edit updates nav and search text, persists across devices and undoes',async()=>{
 const e=await environment();try{
  e.button('本文を編集').click();e.button('この見出しを編集').click();e.w.document.querySelector('textarea').value='変更した見出し';e.button('保存して反映').click();
  await until(()=>e.NAV.sections[0]?.title==='変更した見出し');assert.ok(e.PAGES[1].text.includes('変更した見出し'));
  const second=await environment(e.store);assert.ok(second.PAGES[1].html.includes('変更した見出し'));second.close();
  e.button('直前の変更を取り消す').click();await until(()=>e.NAV.sections[0]?.title==='見出し');
 }finally{e.close()}
});
test('deleting a heading retains its body and undo restores it',async()=>{
 const e=await environment();try{e.button('本文を編集').click();e.button('この見出しを編集').click();e.button('この項目を削除').click();await until(()=>e.NAV.sections.length===0);assert.ok(e.PAGES[1].text.includes('本文です。'));e.button('直前の変更を取り消す').click();await until(()=>e.NAV.sections.length===1)}finally{e.close()}
});
test('text is escaped and concurrent edits do not overwrite unsaved input',async()=>{
 const e=await environment();try{e.button('本文を編集').click();e.button('この本文を編集').click();const area=e.w.document.querySelector('textarea');area.value='<script>bad()</script>';e.button('保存して反映').click();await until(()=>e.w.document.querySelector('.be-status').textContent.includes('クラウドに保存しました')); assert.ok(e.PAGES[1].html.includes('&lt;script&gt;'));assert.equal(e.w.document.querySelectorAll('script').length,0);
  e.button('この本文を編集').click();e.w.document.querySelector('textarea').value='未保存の変更';e.store.set('1:p1',{...e.store.get('1:p1'),revision:'other-device'});e.button('保存して反映').click();await until(()=>e.w.document.querySelector('.be-error').textContent.includes('別の端末'));assert.equal(e.w.document.querySelector('textarea').value,'未保存の変更');assert.equal(e.store.get('1:p1').text,'<script>bad()</script>');
 }finally{e.close()}
});
test('source updates invalidate earlier edits rather than replace new text',async()=>{
 const e=await environment();e.button('本文を編集').click();e.button('この本文を編集').click();e.w.document.querySelector('textarea').value='旧版への修正';e.button('保存して反映').click();await until(()=>e.store.size===1);
 const second=await environment(e.store,initial.replace('本文です。','原本の新版です。'));assert.ok(second.PAGES[1].text.includes('原本の新版です。'));assert.ok(second.w.document.querySelector('.be-status').textContent.includes('原本更新'));second.close();e.close();
});
test('cancelled image deletion leaves controls usable and image unchanged',async()=>{
 const e=await environment();try{e.button('本文を編集').click();e.button('この画像を編集').click();e.w.confirm=()=>false;e.button('この項目を削除').click();await until(()=>!e.button('この項目を削除').disabled);assert.equal(e.store.size,0);assert.ok(e.PAGES[1].html.includes('figure.png'));e.button('編集を閉じる').click();assert.equal(e.w.document.querySelector('.be-panel'),null)}finally{e.close()}
});
test('manual line breaks and paragraph indentation survive cloud reload',async()=>{
 const e=await environment();try{e.button('本文を編集').click();e.button('この本文を編集').click();e.w.document.querySelector('textarea').value='　先頭の空白\n次の行\n\n次の段落';e.w.document.querySelector('[aria-label="段落のインデント"]').value='2';e.w.document.querySelector('[aria-label="先頭行の字下げ"]').value='1';e.button('保存して反映').click();await until(()=>e.store.size===1);const second=await environment(e.store);try{const p=second.w.document.querySelector('#p1');assert.equal(p.textContent,'　先頭の空白\n次の行\n\n次の段落');assert.equal(p.style.whiteSpace,'pre-wrap');assert.equal(p.style.paddingInlineStart,'2em');assert.equal(p.style.textIndent,'1em')}finally{second.close()}}finally{e.close()}
});
