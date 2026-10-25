import{test}from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs/promises';
import{JSDOM}from'jsdom';
const script=await fs.readFile(new URL('./viewer/library.js',import.meta.url),'utf8');
function library(){
 const d=new JSDOM('<nav id="libraryNav"></nav><input id="librarySearch"><div id="libraryGrid"></div><div id="readNext"></div><p id="libraryStatus"></p><div id="libraryEmpty"></div><span id="bookCount"></span><span id="nextCount"></span><h2 id="categoryTitle"></h2><button id="resetOrder"></button>',{url:'https://example.test',runScripts:'outside-only'});
 d.window.BOOKS=[{id:'claude-story',title:'開発書籍',cover:'a.jpg'},{id:'comic',title:'漫画書籍',cover:'b.jpg',category:'manga'}];d.window.eval(script);return d;
}
test('read flag hides books without changing genre; unread restores them after reload',async()=>{
 const d=library();try{const doc=d.window.document;doc.querySelector('[data-read-id="claude-story"]').click();await new Promise(r=>setTimeout(r,0));assert.equal(doc.querySelectorAll('#libraryGrid .book-item').length,1);doc.querySelector('[data-filter="read"]').click();assert.match(doc.querySelector('.book-category').textContent,/AI/);assert.equal(doc.querySelector('#libraryGrid .book-item').dataset.id,'claude-story');const cached=d.window.localStorage.getItem('books-library-layout-v1');const second=library();second.window.localStorage.setItem('books-library-layout-v1',cached);second.window.dispatchEvent(new second.window.StorageEvent('storage',{key:'books-library-layout-v1',newValue:cached}));assert.equal(second.window.document.querySelectorAll('#libraryGrid .book-item').length,1);second.window.close();doc.querySelector('[data-read-id="claude-story"]').click();await new Promise(r=>setTimeout(r,0));doc.querySelector('[data-filter="ai"]').click();assert.equal(doc.querySelectorAll('#libraryGrid .book-item').length,1)}finally{d.window.close()}
});
test('dragging a book onto read category hides it and leaves original order intact',async()=>{
 const d=library();try{const doc=d.window.document;const transfer={setData(){},effectAllowed:'',dropEffect:''};const start=new d.window.Event('dragstart',{bubbles:true,cancelable:true});Object.defineProperty(start,'dataTransfer',{value:transfer});doc.querySelector('#libraryGrid .book-item').dispatchEvent(start);const drop=new d.window.Event('drop',{bubbles:true,cancelable:true});Object.defineProperty(drop,'dataTransfer',{value:transfer});doc.querySelector('[data-filter="read"]').dispatchEvent(drop);await new Promise(r=>setTimeout(r,0));const state=JSON.parse(d.window.localStorage.getItem('books-library-layout-v1'));assert.deepEqual(state.read,['claude-story']);assert.deepEqual(state.order,['claude-story','comic'])}finally{d.window.close()}
});
