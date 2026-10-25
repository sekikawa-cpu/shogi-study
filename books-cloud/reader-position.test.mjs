import{test}from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs/promises';
import{JSDOM}from'jsdom';
const script=await fs.readFile(new URL('./viewer/reader-position.js',import.meta.url),'utf8');
function setup(){
 const d=new JSDOM('<main id="reader"><p data-y="0"></p></main>',{runScripts:'outside-only',pretendToBeVisual:true});const w=d.window,root=w.document.querySelector('main');
 Object.defineProperty(w,'innerHeight',{value:200});root.getBoundingClientRect=()=>({top:0,bottom:200,height:200});w.scrollTo=()=>{};
 w.Range.prototype.getBoundingClientRect=function(){const y=Number(this.startContainer.parentElement.dataset.y||0)-root.scrollTop;const start=Math.floor(this.startOffset/10)*20,end=Math.max(start+20,Math.ceil(this.endOffset/10)*20);return{top:y+start,bottom:y+end,height:end-start,left:0,right:300,width:300}};
 root.querySelector('p').textContent=Array.from({length:100},(_,i)=>String.fromCharCode(0x4e00+i)).join('');root.scrollTop=120;w.eval(script+";window.ReaderPosition=ReaderPosition;");return{d,w,root};
}
test('restores the visible reading line when edit controls change preceding heights',()=>{
 const{d,w,root}=setup();try{const saved=w.ReaderPosition.capturePosition(root);const controls=w.document.createElement('button');controls.textContent='この本文を編集'.repeat(30);root.prepend(controls);root.querySelector('p').dataset.y='700';w.ReaderPosition.restorePosition(root,saved);assert.equal(root.scrollTop,820)}finally{d.window.close()}
});
test('paragraph splitting does not change the anchored reading position',()=>{
 const{d,w,root}=setup();try{const saved=w.ReaderPosition.capturePosition(root),text=root.querySelector('p').textContent;root.innerHTML='<p data-y="700"></p><div class="be-item-tools">操作ボタン</div><p data-y="800"></p>';const ps=root.querySelectorAll('p');ps[0].textContent=text.slice(0,50);ps[1].textContent=text.slice(50);w.ReaderPosition.restorePosition(root,saved);assert.equal(root.scrollTop,820)}finally{d.window.close()}
});
test('later image corrections stop as soon as the user scrolls',()=>{
 const{d,w,root}=setup();try{const saved=w.ReaderPosition.capturePosition(root);const img=w.document.createElement('img');Object.defineProperty(img,'complete',{value:false});root.append(img);const cancel=w.ReaderPosition.restorePosition(root,saved);root.dispatchEvent(new w.Event('wheel'));root.scrollTop=30;img.dispatchEvent(new w.Event('load'));assert.equal(root.scrollTop,30);cancel()}finally{d.window.close()}
});

