'use strict';
window.installBookEditor=async function({bookId,NAV,PAGES,container,refresh}){
 if(window.__bookEditorInstalled)return;window.__bookEditorInstalled=true;
 const toolbar=document.createElement('div');toolbar.className='be-toolbar';toolbar.innerHTML='<span class="be-status" role="status">クラウドの編集内容を確認しています…</span><button class="be-reload">クラウドから再読込</button><button class="be-undo" disabled>直前の変更を取り消す</button>';
 const header=document.querySelector('.topbar');header.classList.add('be-header');const status=toolbar.querySelector('.be-status'),undoButton=toolbar.querySelector('.be-undo');
 const toggle=document.createElement('button');toggle.className='be-toggle';toggle.textContent='本文を編集';toggle.disabled=true;header.append(toggle,toolbar);
 // Keep the reading area below the fixed header, including wrapped mobile rows.
 const fitHeader=()=>document.documentElement.style.setProperty('--topbar-h',Math.ceil(header.getBoundingClientRect().height)+'px');
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(fitHeader).observe(header);
 window.addEventListener('resize',fitHeader);fitHeader();
 let enabled=false,loading=false,saving=false,editing=null;const patches=new Map(),originals=new Map(),templates=new Map(),undo=[];
 const gridButton=document.createElement('button');gridButton.textContent='一覧でまとめて編集';gridButton.hidden=true;header.insertBefore(gridButton,toolbar);
 const baseNav=structuredClone(NAV.sections),baseMode=NAV.navigationMode;
 const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node};
 const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');
 function rpc(type,data={}){return new Promise((resolve,reject)=>{
  if(parent===window)return reject(Error('編集は本人確認後の書籍アプリで利用できます。'));
  const requestId=crypto.randomUUID();const timer=setTimeout(()=>{window.removeEventListener('message',receive);reject(Error('クラウドへの接続がタイムアウトしました。再読込してください。'))},90000);
  function receive(event){if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='BOOK_EDIT_RESULT'||event.data.requestId!==requestId)return;clearTimeout(timer);window.removeEventListener('message',receive);event.data.error?reject(Error(event.data.error)):resolve(event.data.result)}
  window.addEventListener('message',receive);parent.postMessage({type,bookId,requestId,...data},location.origin);
 })}
 for(const [page,data]of Object.entries(PAGES)){
  const root=el('div');root.innerHTML=data.html||'';let index=0;
  for(const node of root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,figure,pre,blockquote,aside,li,img')){
   if(node.parentElement.closest('figure,pre,blockquote,aside,li,table')||node.tagName==='IMG'&&node.parentElement.closest('p'))continue;
   const key=page+':'+(node.id||'item-'+index++),before=node.outerHTML,anchor=node.id||'be-anchor-'+page+'-'+index;
   node.dataset.beKey=key;if(!node.id)node.id=anchor;
   originals.set(key,{key,page:Number(page),before,node:node.cloneNode(true),anchor,isImage:node.tagName==='IMG'||!!node.querySelector('img'),position:originals.size});
  }
  templates.set(page,root.innerHTML);
 }
 async function apply(){
  let conflicts=0;const roots=new Map();for(const [page,html]of templates){const root=el('div');root.innerHTML=html;roots.set(page,root)}
  for(const patch of patches.values()){
   if(patch.reset)continue;
   const original=originals.get(patch.key);if(!original||await hash(original.before)!==patch.beforeHash){conflicts++;continue}
   const node=roots.get(String(original.page)).querySelector('[data-be-key="'+CSS.escape(patch.key)+'"]');if(!node)continue;
   if(patch.deleted){const placeholder=el('span');placeholder.dataset.beRemoved='true';node.replaceWith(placeholder);continue}
   if(patch.image){
    if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(patch.image)){conflicts++;continue}
    const image=node.tagName==='IMG'?node:node.querySelector('img');if(image){image.src=patch.image;image.removeAttribute('srcset');image.removeAttribute('width');image.removeAttribute('height')}
   }else if(patch.text!==undefined){
    const tag=patch.kind==='heading'?'h'+Math.max(1,Math.min(4,Number(patch.level)||2)):({paragraph:'p',note:'aside',quote:'blockquote',list:'li',code:'pre'}[patch.kind]||'p');
    const next=el(tag,patch.text);next.id=original.anchor;next.dataset.beKey=patch.key;next.dataset.beFormatted='true';next.style.whiteSpace='pre-wrap';next.style.paddingInlineStart=Math.max(0,Math.min(4,Number(patch.indent)||0))+'em';next.style.textIndent=Math.max(0,Math.min(2,Number(patch.firstLineIndent)||0))+'em';node.replaceWith(next);
   }
  }
  for(const [page,root]of roots){PAGES[page].html=root.innerHTML;PAGES[page].text=root.textContent}
  let sections=structuredClone(baseNav);let headingChanged=false;
  for(const patch of patches.values()){
   if(patch.reset)continue;const original=originals.get(patch.key);if(!original||await hash(original.before)!==patch.beforeHash)continue;
   const originalHeading=/^H[1-6]$/.test(original.node.tagName);
   const index=sections.findIndex(s=>s.anchor===original.anchor||s.id===original.anchor||originalHeading&&s.startFile===original.page&&s.title.trim()===original.node.textContent.trim());
   if(index>=0&&(patch.deleted||patch.kind&&patch.kind!=='heading'||patch.includeToc===false)){sections.splice(index,1);headingChanged=true}
   else if(patch.kind==='heading'&&patch.includeToc!==false&&!patch.deleted){const section={id:index>=0?sections[index].id:original.anchor,anchor:original.anchor,title:patch.text,level:Number(patch.level)||2,startFile:original.page,endFile:NAV.totalPages};if(index>=0)sections[index]={...sections[index],...section};else sections.push(section);headingChanged=true}
  }
  const rank=new Map(Array.from(originals.values(),o=>[o.anchor,o.position]));
  if(headingChanged){
   for(const s of sections)if(!s.anchor){const o=Array.from(originals.values()).find(o=>o.page===s.startFile&&/^H/.test(o.node.tagName)&&o.node.textContent.trim()===s.title.trim());if(o)s.anchor=o.anchor}
   sections.sort((a,b)=>a.startFile-b.startFile||(rank.get(a.anchor)??1e9)-(rank.get(b.anchor)??1e9));const stack=[];
   for(let i=0;i<sections.length;i++){const s=sections[i];while(stack.length&&stack.at(-1).level>=s.level)stack.pop();delete s.parent;if(stack.length)s.parent=stack.at(-1).id;const next=sections.slice(i+1).find(v=>v.level<=s.level);s.endFile=next?next.startFile:NAV.totalPages;stack.push(s)}
  }
  NAV.sections=sections;NAV.navigationMode=headingChanged?'structured':baseMode;refresh();
  status.textContent=conflicts?`${conflicts}件の編集は原本更新により適用できません。対象を確認して再編集してください。`:'クラウド保存・端末間同期に対応';
  decorate();
 }
 async function commit(original,value,remember=true){
  const previous=patches.get(original.key);status.textContent='クラウドへ暗号化して保存しています…';
  const saved=await rpc('SAVE_BOOK_EDIT',{value:{...value,key:original.key,page:original.page,beforeHash:await hash(original.before)},expectedRevision:previous?.revision||null});
  if(remember)undo.push({key:original.key,previous});patches.set(original.key,saved);undoButton.disabled=!undo.length;editing=null;await apply();status.textContent='クラウドに保存しました。別端末でも反映されます。';
 }
 async function commitMany(changes,remember=true){
  const values=[];for(const item of changes){const original=originals.get(item.key);if(!original)throw Error('編集項目が見つかりません。');values.push({value:{...item.value,key:original.key,page:original.page,beforeHash:await hash(original.before)},expectedRevision:patches.get(original.key)?.revision||null})}
  const previous=changes.map(item=>({key:item.key,previous:patches.get(item.key)}));status.textContent='選択項目を暗号化してクラウドへまとめて保存しています…';
  const records=await rpc('SAVE_BOOK_EDITS_BATCH',{changes:values});for(const record of records)patches.set(record.key,record);if(remember)undo.push({group:previous});undoButton.disabled=!undo.length;await apply();status.textContent=`${records.length}項目を保存しました。「直前の変更を取り消す」で一括して戻せます。`;
 }
 gridButton.onclick=()=>{
  if(saving)return;if(editing){status.textContent='個別の編集を保存するか閉じてから、一覧編集を開いてください。';return}
  const items=[];for(const [page,data]of Object.entries(PAGES)){const root=el('div');root.innerHTML=data.html||'';for(const node of root.querySelectorAll('[data-be-key]')){
   const original=originals.get(node.dataset.beKey);if(!original)continue;const patch=patches.get(original.key),image=node.tagName==='IMG'?node:node.querySelector('img');
   items.push({id:original.key,page:Number(page),text:original.isImage?'':node.textContent,type:original.isImage?'figure':/^H/.test(node.tagName)?'heading':({ASIDE:'note',BLOCKQUOTE:'quote',LI:'list',PRE:'code'}[node.tagName]||'paragraph'),level:/^H/.test(node.tagName)?Number(node.tagName.slice(1)):2,indent:patch?.indent||0,firstLine:patch?.firstLineIndent||0,toc:patch?.includeToc!==false,image:image?.src});
  }}
  window.ReadingGrid.openGridEditor({items,onSave:async rows=>{saving=true;try{await commitMany(rows.map(row=>({key:row.id,value:row.deleted?{deleted:true}:{text:row.text,kind:row.type,level:row.level,includeToc:row.type==='heading'&&row.toc!==false,indent:row.indent,firstLineIndent:row.firstLine}})))}finally{saving=false}}});
 };
 function decorate(){
  container.querySelectorAll('.be-item-tools').forEach(n=>n.remove());if(!enabled)return;
  for(const node of container.querySelectorAll('[data-be-key]')){
   const original=originals.get(node.dataset.beKey);if(!original)continue;
   const tools=el('div');tools.className='be-item-tools';const button=el('button',original.isImage?'この画像を編集':/^H/.test(node.tagName)?'この見出しを編集':'この本文を編集');button.onclick=()=>open(original,node,tools);tools.append(button);node.after(tools);
  }
 }
 function open(original,node,tools){
  if(saving)return;
  const scroller=container.closest('.main-content')||container.parentElement,position=window.ReaderPosition?.capturePosition(scroller);
  container.querySelectorAll('.be-panel').forEach(n=>n.remove());editing=original.key;
  const panel=el('section');panel.className='be-panel';panel.setAttribute('aria-label',original.isImage?'画像エディタ':'本文・見出しエディタ');tools.after(panel);
  const error=el('p');error.className='be-error';error.setAttribute('role','alert');
  const actions=el('div');actions.className='be-actions';
  const run=async fn=>{if(saving)return;saving=true;const buttons=panel.querySelectorAll('button,input,textarea,select');buttons.forEach(b=>b.disabled=true);error.textContent='';try{await fn()}catch(e){error.textContent=e.message;status.textContent='保存できませんでした。入力内容は編集欄に残っています。';buttons.forEach(b=>b.disabled=false)}finally{saving=false;if(panel.isConnected)buttons.forEach(b=>b.disabled=false)}};
  const action=(text,fn)=>{const button=el('button',text);button.onclick=()=>run(fn);actions.append(button);return button};
  if(!original.isImage){
   const kind=el('select');kind.setAttribute('aria-label','表示形式');for(const [value,label]of[['paragraph','本文'],['heading','見出し'],['note','注記'],['quote','引用'],['list','箇条書き'],['code','コード']]){const option=el('option',label);option.value=value;kind.append(option)}
   kind.value=/^H/.test(node.tagName)?'heading':({ASIDE:'note',BLOCKQUOTE:'quote',LI:'list',PRE:'code'}[node.tagName]||'paragraph');
   const level=el('select');level.setAttribute('aria-label','見出しの階層');for(let i=1;i<=4;i++){const option=el('option','階層 '+i);option.value=i;level.append(option)}level.value=/^H/.test(node.tagName)?node.tagName.slice(1):'2';
   const toc=el('input');toc.type='checkbox';toc.checked=patches.get(original.key)?.includeToc!==false;const label=el('label','目次に表示');label.prepend(toc);
   const options=el('div');options.className='be-actions';options.append(kind,level,label);panel.append(options);
   const area=el('textarea');area.value=node.textContent;area.rows=Math.max(4,Math.min(16,Math.ceil(area.value.length/55)));area.setAttribute('aria-label','本文・見出しの内容');panel.append(area);
   const formatting=el('div');formatting.className='be-actions';
   const spacing=(title,max,value)=>{const label=el('label',title+' '),select=el('select');select.setAttribute('aria-label',title);for(let n=0;n<=max;n++){const option=el('option',n+'字');option.value=n;select.append(option)}select.value=String(value||0);label.append(select);formatting.append(label);return select};
   const indent=spacing('段落のインデント',4,patches.get(original.key)?.indent),firstLine=spacing('先頭行の字下げ',2,patches.get(original.key)?.firstLineIndent);
   const newline=el('button','改行を挿入');newline.onclick=()=>{area.setRangeText('\n',area.selectionStart,area.selectionEnd,'end');area.focus()};formatting.append(newline);panel.append(formatting);
   action('保存して反映',()=>commit(original,{text:area.value,kind:kind.value,level:Number(level.value),includeToc:kind.value==='heading'&&toc.checked,indent:Number(indent.value),firstLineIndent:Number(firstLine.value)}));
  }else{
   const image=el('img');image.src=(node.tagName==='IMG'?node:node.querySelector('img')).src;image.alt='編集対象の画像';
   const surface=el('div');surface.className='be-image-surface';surface.append(image);const selection=el('div');selection.className='be-selection';surface.append(selection);panel.append(surface);
   let start=null,region=null,mode='';const point=e=>{const box=image.getBoundingClientRect();return[Math.max(0,Math.min(1,(e.clientX-box.left)/box.width)),Math.max(0,Math.min(1,(e.clientY-box.top)/box.height))]};
   surface.onpointerdown=e=>{if(!mode)return;e.preventDefault();start=point(e);surface.setPointerCapture(e.pointerId)};
   surface.onpointermove=e=>{if(!start)return;const p=point(e);region=[Math.min(start[0],p[0]),Math.min(start[1],p[1]),Math.max(start[0],p[0]),Math.max(start[1],p[1])];Object.assign(selection.style,{display:'block',left:region[0]*100+'%',top:region[1]*100+'%',width:(region[2]-region[0])*100+'%',height:(region[3]-region[1])*100+'%'})};
   surface.onpointerup=e=>{surface.onpointermove(e);start=null;if(surface.hasPointerCapture(e.pointerId))surface.releasePointerCapture(e.pointerId)};surface.onpointercancel=()=>{start=null;region=null;selection.style.display='none'};
   const hint=el('p');panel.append(hint);
   const file=el('input');file.type='file';file.accept='image/png,image/jpeg,image/webp';file.setAttribute('aria-label','差し替える画像');panel.append(file);
   file.onchange=()=>run(async()=>{const selected=file.files[0];if(!selected)return;if(selected.size>10*1024*1024)throw Error('画像は10MB以下にしてください。');const bitmap=await createImageBitmap(selected);if(bitmap.width*bitmap.height>40_000_000){bitmap.close();throw Error('画像が大きすぎます。')}const canvas=el('canvas'),scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();await commit(original,{image:canvas.toDataURL('image/png')})});
   for(const [value,text]of[['erase','一部分を削除'],['crop','トリミング']]){const button=el('button',text);button.onclick=()=>{mode=value;region=null;selection.style.display='none';surface.style.touchAction='none';hint.textContent='画像上をドラッグして'+(value==='erase'?'白く消す':'残す')+'範囲を選択してください。'};actions.append(button)}
   action('選択範囲を保存',async()=>{if(!region||region[0]===region[2]||region[1]===region[3])throw Error('先に範囲を選択してください。');const x=Math.floor(region[0]*image.naturalWidth),y=Math.floor(region[1]*image.naturalHeight),w=Math.ceil((region[2]-region[0])*image.naturalWidth),h=Math.ceil((region[3]-region[1])*image.naturalHeight),canvas=el('canvas');canvas.width=mode==='crop'?w:image.naturalWidth;canvas.height=mode==='crop'?h:image.naturalHeight;const context=canvas.getContext('2d');if(mode==='crop')context.drawImage(image,x,y,w,h,0,0,w,h);else{context.drawImage(image,0,0);context.fillStyle='white';context.fillRect(x,y,w,h)}await commit(original,{image:canvas.toDataURL('image/png')})});
  }
  const remove=action('この項目を削除',async()=>{if(!confirm('この項目を削除します。後から元に戻せます。'))return;await commit(original,{deleted:true})});remove.className='be-danger';
  action('原本の内容に戻す',()=>commit(original,{reset:true}));
  const cancel=el('button','編集を閉じる');cancel.onclick=()=>{const saved=window.ReaderPosition?.capturePosition(scroller);panel.remove();editing=null;window.ReaderPosition?.restorePosition(scroller,saved)};actions.append(cancel);panel.append(actions,error);window.ReaderPosition?.restorePosition(scroller,position);
 }
 toggle.onclick=()=>{const scroller=container.closest('.main-content')||container.parentElement,position=window.ReaderPosition?.capturePosition(scroller);enabled=!enabled;gridButton.hidden=!enabled;window.__beEditing=enabled;toggle.textContent=enabled?'編集を終了':'本文を編集';toggle.setAttribute('aria-pressed',enabled);if(!enabled){container.querySelectorAll('.be-panel').forEach(n=>n.remove());editing=null}refresh();decorate();window.ReaderPosition?.restorePosition(scroller,position)};
 toolbar.querySelector('.be-reload').onclick=()=>{if(editing&&!confirm('未保存の入力を閉じてクラウドから読み込みますか？'))return;load()};
 undoButton.onclick=async()=>{const item=undo.at(-1);if(!item||saving)return;try{saving=true;undoButton.disabled=true;if(item.group)await commitMany(item.group.map(v=>({key:v.key,value:v.previous?{...v.previous}:{reset:true}})),false);else await commit(originals.get(item.key),item.previous?{...item.previous}:{reset:true},false);undo.pop();undoButton.disabled=!undo.length}catch(e){status.textContent=e.message;undoButton.disabled=false}finally{saving=false}};
 document.addEventListener('book-reader-rendered',decorate);
 async function load(){if(loading)return;loading=true;toggle.disabled=true;status.textContent='クラウドの編集内容を読み込んでいます…';try{const records=await rpc('LOAD_BOOK_EDITS');patches.clear();for(const record of records)patches.set(record.key,record);undo.length=0;undoButton.disabled=true;editing=null;await apply();toggle.disabled=false}catch(e){status.textContent='クラウド編集を読み込めませんでした：'+e.message}finally{loading=false}}
 await load();
};
