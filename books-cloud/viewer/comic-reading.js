/* Display-only capture layouts. Original PAGES and edit source hashes stay intact. */
(function(){'use strict';
 let fitObserver;
 function fitPages(container){fitObserver?.disconnect();const reader=document.getElementById('mainContent');const fit=()=>container.style.setProperty('--capture-page-height',Math.max(120,(reader?Math.min(reader.clientHeight,window.innerHeight-Math.max(0,reader.getBoundingClientRect().top)):window.innerHeight)-40)+'px');fit();if(reader&&typeof ResizeObserver!=='undefined'){fitObserver=new ResizeObserver(fit);fitObserver.observe(reader)}}
 function configure(bookId,nav){
  const plan=window.COMIC_LAYOUTS?.[bookId];if(!plan||nav.book?.format!=='comic')return;
  nav.captureReading=true;
  if(plan.sections?.length){nav.sections=structuredClone(plan.sections);nav.navigationMode='structured';}
 }
 function render(container,bookId,nav){
  const plan=window.COMIC_LAYOUTS?.[bookId];
  if(!plan){const captures=[...container.querySelectorAll('figure[id]')].filter(e=>/^p\d+-capture-(whole|right|left)$/.test(e.id));if(!captures.length)return;container.classList.add('comic-import-reading');fitPages(container);for(const figure of captures)figure.classList.add('comic-import-page');return}
  if(!nav.captureReading)return;
  container.classList.add('capture-reading');fitPages(container);
  const title=document.createElement('h1');title.className='capture-book-title';title.textContent=nav.book.title;container.prepend(title);
  for(const [page,item]of Object.entries(plan.pages)){
   const anchor=container.querySelector('#page-'+page);if(!anchor)continue;
   const figure=anchor.nextElementSibling;if(!figure?.matches('figure.comic-page'))continue;
   const original=figure.querySelector('img');if(!original)continue;
   // Replacement images have different geometry: show them whole until explicitly selected.
   const matching=original.getAttribute('src')===item.src;
   const mode=figure.dataset.captureLayout|| (matching?item.layout:'single');
   const split=matching?item.split:.5;
   const pieces=mode==='split'?[['right',split,1],['left',0,split]]:[['whole',0,1]];
   const fragment=document.createDocumentFragment();
   for(const [side,start,end]of pieces){
    const piece=document.createElement('div');piece.className='capture-piece capture-'+(mode==='spread'?'spread':'single');piece.id='capture-'+page+'-'+side;
    const viewport=document.createElement('div');viewport.className='capture-viewport';
    const image=original.cloneNode(true);image.removeAttribute('id');image.removeAttribute('data-be-key');image.removeAttribute('width');image.removeAttribute('height');
    if(matching){viewport.style.aspectRatio=((end-start)*item.width)+' / '+item.height;image.style.width=(100/(end-start))+'%';image.style.left=(-100*start/(end-start))+'%';image.style.height='100%';image.classList.add('capture-positioned');}
    const fitRatio=ratio=>{if(ratio>0)piece.style.maxWidth='calc(var(--capture-page-height, 70vh) * '+ratio+')'};
    if(matching)fitRatio((end-start)*item.width/item.height);else{image.addEventListener('load',()=>fitRatio(image.naturalWidth/image.naturalHeight));if(image.complete)fitRatio(image.naturalWidth/image.naturalHeight)}
    image.alt=nav.book.title+' '+page+(side==='whole'?'':side==='right'?' 右ページ':' 左ページ');
    viewport.append(image);piece.append(viewport);fragment.append(piece);
   }
   // Keep the figure itself (including its editor key and cloud patch identity).
   figure.replaceChildren(fragment);figure.dataset.captureSource=page;
  }
 }
 window.ComicReading={configure,render};
})();
