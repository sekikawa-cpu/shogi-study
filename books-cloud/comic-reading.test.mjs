import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const script=await fs.readFile(new URL('./viewer/comic-reading.js',import.meta.url),'utf8');
function setup(layout='split',src='books/test/page.jpg'){
 const dom=new JSDOM('<article><span id="page-1"></span><figure class="comic-page" data-be-key="original"><img src="'+src+'" width="2400" height="1800"></figure></article>',{runScripts:'outside-only'}),w=dom.window;
 w.structuredClone=structuredClone;w.COMIC_LAYOUTS={test:{pages:{1:{src:'books/test/page.jpg',width:2400,height:1800,split:.63,layout}},sections:[{title:'第1話',startFile:1}]}};w.eval(script);
 const nav={book:{title:'漫画',format:'comic'},sections:[]};w.ComicReading.configure('test',nav);w.ComicReading.render(w.document.querySelector('article'),'test',nav);return{dom,w,nav};
}
test('asymmetric original capture divides at the source boundary, right before left',()=>{
 const{dom,w,nav}=setup();try{const pieces=[...w.document.querySelectorAll('.capture-piece')];assert.deepEqual(pieces.map(x=>x.id),['capture-1-right','capture-1-left']);assert.equal(pieces[0].querySelector('img').style.width,100/.37+'%');assert.equal(pieces[1].querySelector('img').style.width,100/.63+'%');assert.equal(w.document.querySelector('figure').dataset.beKey,'original');assert.equal(w.document.querySelectorAll('h1').length,1);assert.equal(nav.sections[0].title,'第1話');assert.equal(nav.navigationMode,'structured')}finally{dom.window.close()}
});
test('crossing spreads remain whole and replacement images never inherit stale geometry',()=>{
 for(const [layout,src]of [['spread','books/test/page.jpg'],['split','data:image/png;base64,abcd']]){const{dom,w}=setup(layout,src);try{assert.equal(w.document.querySelectorAll('.capture-piece').length,1);assert.equal(w.document.querySelector('img').getAttribute('src'),src);if(src.startsWith('data:'))assert.equal(w.document.querySelector('.capture-viewport').style.aspectRatio,'')}finally{dom.window.close()}}
});
test('manual layout overrides survive display rendering',()=>{
 const{dom,w,nav}=setup('spread');try{const root=w.document.querySelector('article');root.innerHTML='<span id="page-1"></span><figure class="comic-page" data-capture-layout="split"><img src="books/test/page.jpg"></figure>';w.ComicReading.render(root,'test',nav);assert.equal(root.querySelectorAll('.capture-piece').length,2)}finally{dom.window.close()}
});
test('ordinary books and deleted figures are unchanged',()=>{
 const{dom,w}=setup();try{const root=w.document.querySelector('article');root.innerHTML='<span id="page-1"></span><span data-be-removed="true"></span>';w.ComicReading.render(root,'test',{book:{title:'漫画'},captureReading:true});assert.equal(root.querySelectorAll('figure').length,0);root.innerHTML='<p>本文</p>';const original=root.innerHTML;const nav={book:{format:'text'}};w.ComicReading.configure('test',nav);w.ComicReading.render(root,'test',nav);assert.equal(root.innerHTML,original)}finally{dom.window.close()}
});

test('comic pieces use their own aspect ratio to fit height without altering crop geometry',()=>{
 const{dom,w}=setup();try{const pieces=[...w.document.querySelectorAll('.capture-piece')];assert.match(pieces[0].style.maxWidth,/--capture-page-height/);assert.ok(pieces[0].style.maxWidth.includes(String(.37*2400/1800)));assert.ok(pieces[1].style.maxWidth.includes(String(.63*2400/1800)));assert.equal(w.document.querySelector('article').style.getPropertyValue('--capture-page-height'),(w.innerHeight-40)+'px')}finally{dom.window.close()}
});
