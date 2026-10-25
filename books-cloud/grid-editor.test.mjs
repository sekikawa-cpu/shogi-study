import{test}from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs/promises';
import{JSDOM}from'jsdom';
const script=await fs.readFile(new URL('./viewer/grid-editor.js',import.meta.url),'utf8');
function setup(onSave){const dom=new JSDOM('<button id="open">編集</button>',{runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.eval(script+';window.ReadingGrid=ReadingGrid;');
 const items=Array.from({length:55},(_,i)=>({id:'id'+i,page:i+1,text:'本文'+i,type:'paragraph',indent:0}));items[2]={...items[2],type:'figure',image:'data:image/png;base64,aA=='};
 w.ReadingGrid.openGridEditor({items,onSave});const button=text=>[...w.document.querySelectorAll('button')].find(b=>b.textContent===text);return{w,dom,button};}
const until=async fn=>{for(let i=0;i<80;i++){if(fn())return;await new Promise(r=>setTimeout(r,5))}throw Error('timeout')};
test('grid retains edits and selections across pages, and saves changed rows together',async()=>{let saved;const e=setup(async rows=>saved=rows);try{
 const a=e.w.document.querySelector('textarea');a.value='修正\n\n改行';a.dispatchEvent(new e.w.Event('input'));e.button('次の50項目').click();const b=e.w.document.querySelector('textarea');b.value='別の項目';b.dispatchEvent(new e.w.Event('input'));e.button('前の50項目').click();assert.equal(e.w.document.querySelector('textarea').value,'修正\n\n改行');e.button('変更を保存').click();await until(()=>saved&&!e.w.document.querySelector('.reading-grid'));assert.equal(saved.length,2);assert.equal(saved[0].text,'修正\n\n改行');assert.equal(e.w.document.querySelector('.reading-grid'),null);
 }finally{e.dom.window.close()}});
test('deletion is staged with central confirmation, cancellable and includes image rows',async()=>{let saved;const e=setup(async rows=>saved=rows);try{
 e.button('表示中を選択').click();e.button('選択項目を削除').click();assert.equal(e.w.document.querySelectorAll('dialog[open]').length,2);e.button('キャンセル').click();assert.equal(e.w.document.querySelectorAll('.is-deleted').length,0);
 e.button('選択項目を削除').click();e.button('実行する').click();assert.equal(e.w.document.querySelectorAll('.is-deleted').length,50);assert.equal(saved,undefined);e.button('変更を保存').click();e.button('実行する').click();await until(()=>saved&&!e.w.document.querySelector('.reading-grid'));assert.equal(saved.length,50);assert.ok(saved.find(r=>r.id==='id2').deleted);
 }finally{e.dom.window.close()}});
test('failed batch preserves every unsaved input',async()=>{const e=setup(async()=>{throw Error('競合しました')});try{const a=e.w.document.querySelector('textarea');a.value='消さない入力';a.dispatchEvent(new e.w.Event('input'));e.button('変更を保存').click();await until(()=>e.w.document.querySelector('[role=alert]').textContent.includes('競合'));assert.equal(e.w.document.querySelector('textarea').value,'消さない入力');assert.ok(e.button('変更を保存').disabled===false)}finally{e.dom.window.close()}});
