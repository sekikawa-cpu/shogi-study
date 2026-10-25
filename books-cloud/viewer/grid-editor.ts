export type GridItem={id:string;page:number;type:string;text:string;level?:number;indent?:number;firstLine?:number;toc?:boolean;image?:string};
export type GridChange=GridItem&{before:GridItem;deleted?:boolean};
export function openGridEditor({items,onSave,onClose}:{items:GridItem[];onSave:(changes:GridChange[])=>Promise<void>;onClose?:()=>void}){
 const dialog=document.createElement('dialog') as HTMLDialogElement;dialog.className='reading-grid';dialog.setAttribute('aria-label','項目をまとめて編集');
 const original=new Map(items.map(i=>[i.id,{...i}])),drafts=new Map<string,GridChange>(),selected=new Set<string>();let page=0,busy=false;
 const make=(tag:string,text?:string)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 const button=(text:string,fn:()=>void)=>{const n=make('button',text)as HTMLButtonElement;n.type='button';n.onclick=fn;return n};
 const header=make('header'),title=make('h2','項目をまとめて編集'),close=button('閉じる',requestClose);header.append(title,close);
 const hint=make('p','行ごとに編集できます。チェックした項目へ一括適用し、最後に「変更を保存」を押してください。元画像は削除しません。');
 const bar=make('div');bar.className='reading-grid-bar';
 const search=make('input')as HTMLInputElement;search.placeholder='本文・見出しを検索';search.setAttribute('aria-label','一覧を検索');
 const filter=make('select')as HTMLSelectElement;filter.setAttribute('aria-label','項目の種類で絞り込み');
 const kinds=[['paragraph','本文'],['heading','見出し'],['note','注記'],['quote','引用'],['list','箇条書き'],['code','コード']];
 for(const [value,label]of [['','すべて'],...kinds,['image','画像・表']]){const o=make('option',label)as HTMLOptionElement;o.value=value;filter.append(o)}
 const count=make('span');count.setAttribute('role','status');bar.append(search,filter,count);
 const bulk=make('div');bulk.className='reading-grid-bar';
 const kind=make('select')as HTMLSelectElement;kind.setAttribute('aria-label','一括表示形式');for(const [value,label]of [['','表示形式を変更'],...kinds]){const o=make('option',label)as HTMLOptionElement;o.value=value;kind.append(o)}
 const indent=make('select')as HTMLSelectElement;indent.setAttribute('aria-label','一括インデント');for(let i=-1;i<=4;i++){const o=make('option',i<0?'字下げを変更':i+'字')as HTMLOptionElement;o.value=String(i);indent.append(o)}
 bulk.append(button('表示中を選択',()=>{shown().forEach(i=>selected.add(i.id));render()}),button('選択を解除',()=>{selected.clear();render()}),kind,indent,button('選択項目に適用',()=>{
  for(const id of selected){const item=current(id);if(item.image)continue;const d=edit(id);if(kind.value){d.type=kind.value;if(d.type==='heading'){d.level||=2;d.toc=true}else d.toc=false}if(indent.value!=='-1')d.indent=Number(indent.value)}render();
 }),button('選択項目を削除',()=>{if(!selected.size)return;confirmAction(`${selected.size}項目を削除対象にしますか？`,'保存するまでは反映されません。保存後も一括で取り消せます。',()=>{for(const id of selected)edit(id).deleted=true;render()})}),button('選択項目の変更を戻す',()=>{for(const id of selected)drafts.delete(id);render()}));
 const viewport=make('div');viewport.className='reading-grid-viewport';const table=make('table'),head=make('thead'),hr=make('tr');for(const label of ['選択','ページ','種類・階層','本文・見出し／画像','字下げ','状態'])hr.append(make('th',label));head.append(hr);const body=make('tbody');table.append(head,body);viewport.append(table);
 const footer=make('footer'),previous=button('前の50項目',()=>{page--;render()}),next=button('次の50項目',()=>{page++;render()}),paging=make('span'),error=make('p');error.setAttribute('role','alert');
 const save=button('変更を保存',async()=>{
  const changes=[...drafts.values()].filter(changed);if(!changes.length)return;if(changes.length>100){error.textContent='一度に保存できるのは100項目です。100項目以下に分けて保存してください。';return}
  const run=async()=>{busy=true;error.textContent='保存中…';dialog.querySelectorAll<HTMLInputElement>('button,input,textarea,select').forEach(n=>n.disabled=true);
   try{await onSave(changes);drafts.clear();finish()}catch(e){error.textContent=(e as Error).message+' 入力内容はこの画面に残っています。';busy=false;dialog.querySelectorAll<HTMLInputElement>('button,input,textarea,select').forEach(n=>n.disabled=false);render()}};
  const removed=changes.filter(c=>c.deleted).length;if(removed)confirmAction(`${removed}項目を削除して保存しますか？`,`${changes.length}項目の変更をまとめて保存します。保存後に取り消せます。`,run);else await run();
 });footer.append(previous,paging,next,save,error);dialog.append(header,hint,bar,bulk,viewport,footer);
 const focused=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';document.body.append(dialog);dialog.showModal();
 dialog.addEventListener('cancel',e=>{e.preventDefault();requestClose()});search.oninput=filter.onchange=()=>{page=0;render()};
 function current(id:string){return drafts.get(id)||original.get(id)!}
 function edit(id:string){if(!drafts.has(id))drafts.set(id,{...original.get(id)!,before:original.get(id)!});return drafts.get(id)!}
 function changed(i:GridChange){return i.deleted||['text','type','level','indent','firstLine','toc'].some(k=>(i as any)[k]!== (i.before as any)[k])}
 function filtered(){const q=search.value.trim().toLowerCase();return items.filter(i=>{const v=current(i.id);return(!q||v.text.toLowerCase().includes(q)||String(i.page)===q)&&(!filter.value||(filter.value==='image'?!!i.image:v.type===filter.value))})}
 function shown(){return filtered().slice(page*50,page*50+50)}
 function finish(){dialog.close();dialog.remove();document.body.style.overflow=overflow;onClose?.();focused?.focus({preventScroll:true})}
 function requestClose(){if(busy)return;if([...drafts.values()].some(changed))confirmAction('変更を保存せず閉じますか？','未保存の変更だけを取り消します。',finish);else finish()}
 function confirmAction(title:string,message:string,accept:()=>void){const confirm=make('dialog')as HTMLDialogElement;confirm.className='reading-grid-confirm';confirm.setAttribute('aria-label',title);confirm.append(make('h2',title),make('p',message));const actions=make('div');actions.className='reading-grid-bar';const cancel=button('キャンセル',()=>{confirm.close();confirm.remove()});actions.append(cancel,button('実行する',()=>{confirm.close();confirm.remove();accept()}));confirm.append(actions);confirm.oncancel=e=>{e.preventDefault();cancel.click()};document.body.append(confirm);confirm.showModal();cancel.focus()}
 function render(){const rows=filtered();page=Math.max(0,Math.min(page,Math.max(0,Math.ceil(rows.length/50)-1)));body.replaceChildren();
  count.textContent=`${rows.length}項目 ／ ${selected.size}件選択 ／ ${[...drafts.values()].filter(changed).length}件変更`;
  for(const base of shown()){
   const value=current(base.id),tr=make('tr');tr.classList.toggle('is-deleted',!!(value as GridChange).deleted);const check=make('input')as HTMLInputElement;check.type='checkbox';check.checked=selected.has(base.id);check.setAttribute('aria-label',`ページ${base.page} ${base.text.slice(0,25)||'画像'}を選択`);check.onchange=()=>{check.checked?selected.add(base.id):selected.delete(base.id);count.textContent=`${rows.length}項目 ／ ${selected.size}件選択 ／ ${[...drafts.values()].filter(changed).length}件変更`};const td=make('td');td.append(check);tr.append(td,make('td',String(base.page)));
   const typeCell=make('td'),content=make('td'),spacing=make('td'),state=make('td');state.textContent=(value as GridChange).deleted?'削除予定':drafts.has(base.id)&&changed(drafts.get(base.id)!)?'変更あり':'';
   const touch=()=>{const d=drafts.get(base.id)!;if(changed(d))selected.add(base.id);check.checked=selected.has(base.id);state.textContent=d.deleted?'削除予定':changed(d)?'変更あり':'';count.textContent=`${rows.length}項目 ／ ${selected.size}件選択 ／ ${[...drafts.values()].filter(changed).length}件変更`};
   if(base.image){typeCell.textContent=base.type==='table'?'表':'画像';const image=make('img')as HTMLImageElement;image.src=base.image;image.alt=base.text.slice(0,60)||'書籍画像';image.loading='lazy';content.append(image);spacing.textContent='—'}else{
    const select=make('select')as HTMLSelectElement;select.setAttribute('aria-label',`${base.id} 表示形式`);for(const [v,l]of kinds){const o=make('option',l)as HTMLOptionElement;o.value=v;select.append(o)}select.value=value.type;
    const level=make('select')as HTMLSelectElement;level.setAttribute('aria-label',`${base.id} 見出し階層`);for(let n=1;n<=4;n++){const o=make('option','階層 '+n)as HTMLOptionElement;o.value=String(n);level.append(o)}level.value=String(value.level||2);level.hidden=value.type!=='heading';
    select.onchange=()=>{const d=edit(base.id);d.type=select.value;d.toc=d.type==='heading';d.level=Number(level.value);level.hidden=d.type!=='heading';touch()};level.onchange=()=>{edit(base.id).level=Number(level.value);touch()};typeCell.append(select,level);
    const area=make('textarea')as HTMLTextAreaElement;area.value=value.text;area.rows=Math.max(3,Math.min(9,Math.ceil(value.text.length/65)));area.setAttribute('aria-label',`${base.id} 本文・見出し`);area.oninput=()=>{edit(base.id).text=area.value;touch()};content.append(area);
    const n=make('select')as HTMLSelectElement;n.setAttribute('aria-label',`${base.id} インデント`);for(let j=0;j<=4;j++){const o=make('option',j+'字')as HTMLOptionElement;o.value=String(j);n.append(o)}n.value=String(value.indent||0);n.onchange=()=>{edit(base.id).indent=Number(n.value);touch()};spacing.append(n);
   }
   tr.append(typeCell,content,spacing,state);body.append(tr);
  }
  paging.textContent=rows.length?`${page*50+1}〜${Math.min(rows.length,(page+1)*50)} / ${rows.length}`:'該当する項目がありません';previous.disabled=busy||page===0;next.disabled=busy||(page+1)*50>=rows.length;
 }
 render();return{close:requestClose};
}
