window.initTextViewer = function(bookId){
"use strict";

const NAV = window.NAV;
const PAGES = window.PAGES || {};
window.ComicReading?.configure(bookId,NAV);
const TOTAL = NAV.totalPages;
const MEMO_KEY = bookId + "-memos-v1";
const BATCH_SIZE = 12;          // pages rendered per incremental step
const RESET_GAP = BATCH_SIZE * 3; // jump distances beyond this rebuild the render window instead of extending it

let currentPage = 1;
let currentSectionId = null;
let memos = loadMemos();

// ---------- DOM refs ----------
const homeBtn = document.getElementById("homeBtn");
const bookTitleEl = document.querySelector(".book-title");
const pagesContainer = document.getElementById("pagesContainer");
const mainContentEl = document.getElementById("mainContent");
const breadcrumbEl = document.getElementById("breadcrumb");
const currentPageLabel = document.getElementById("currentPageLabel");
const sidebar = document.getElementById("sidebar");
const navTreeEl = document.getElementById("navTree");
const navToggleBtn = document.getElementById("navToggleBtn");
const searchInput = document.getElementById("searchInput");
const searchResultsEl = document.getElementById("searchResults");
const memoPopup = document.getElementById("memoPopup");
const addMemoBtn = document.getElementById("addMemoBtn");
const memoEditor = document.getElementById("memoEditor");
const memoEditorQuote = document.getElementById("memoEditorQuote");
const memoEditorText = document.getElementById("memoEditorText");
const memoSaveBtn = document.getElementById("memoSaveBtn");
const memoDeleteBtn = document.getElementById("memoDeleteBtn");
const memoCancelBtn = document.getElementById("memoCancelBtn");
const memoListBtn = document.getElementById("memoListBtn");
const memoListPanel = document.getElementById("memoListPanel");
const memoListBody = document.getElementById("memoListBody");
const memoListCloseBtn = document.getElementById("memoListCloseBtn");
const memoCountEl = document.getElementById("memoCount");
const overlay = document.getElementById("overlay");

// ---------- utils ----------
function escapeHtml(s){
  return s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

// ---------- nav tree ----------
function getCurrentSection(){
  if(NAV.navigationMode === "structured") return currentSectionId ? NAV.sections.find(s=>s.id === currentSectionId) || null : null;
  return findSectionForPage(currentPage);
}
function findSectionForPage(page){
  // deepest (highest level) matching section
  let best = null;
  for(const s of NAV.sections){
    if(page >= s.startFile && page <= s.endFile){
      if(!best || s.level > best.level) best = s;
    }
  }
  return best;
}
function breadcrumbChain(section){
  const chain = [];
  let cur = section;
  const byId = Object.fromEntries(NAV.sections.map(s=>[s.id,s]));
  while(cur){
    chain.unshift(cur);
    cur = cur.parent ? byId[cur.parent] : null;
  }
  return chain;
}

function scrollToSection(section){
  const target = section.anchor && document.getElementById(section.anchor);
  if(!target) return scrollToPage(section.startFile);
  target.scrollIntoView({behavior:"auto",block:"start"});
  currentSectionId = section.id;
  currentPage = section.startFile;
  renderBreadcrumb();updateNavActive();updateProgressDisplay();
}
function syncStructuredNavigation(){
  if(NAV.navigationMode !== "structured") return;
  const cutoff = mainContentEl.getBoundingClientRect().top + 40;
  let chosen = null;
  for(const section of NAV.sections){
    const target = section.anchor && document.getElementById(section.anchor);
    if(target && target.getBoundingClientRect().top <= cutoff) chosen = section;
  }
  const next = chosen ? chosen.id : null;
  if(next === currentSectionId) return;
  currentSectionId = next;
  if(chosen) currentPage = chosen.startFile;
  else sidebar.scrollTop = 0;
  renderBreadcrumb();updateNavActive();
}
function buildNavTree(){
  sidebar.classList.toggle("structured-sidebar",NAV.navigationMode === "structured");
  sidebar.classList.toggle("structured-sidebar",NAV.navigationMode === "structured");
  navTreeEl.innerHTML = "";
  NAV.sections.forEach(s=>{
    const div = document.createElement("div");
    div.className = "nav-item level-" + s.level;
    div.textContent = s.title;
    div.dataset.start = s.startFile;
    div.dataset.id = s.id;
    if(NAV.navigationMode === "structured"){
      div.dataset.anchor = s.anchor || "";
      div.tabIndex = 0;
      div.setAttribute("role","button");
      div.addEventListener("keydown",event=>{
        if(event.key === "Enter" || event.key === " "){event.preventDefault();div.click();}
      });
    }
    div.addEventListener("click", ()=>{
      if(NAV.navigationMode === "structured") scrollToSection(s);
      else scrollToPage(s.startFile);
      if(window.innerWidth <= 900) sidebar.classList.add("collapsed");
    });
    navTreeEl.appendChild(div);
  });
}
function updateNavActive(){
  const sec = getCurrentSection();
  const chain = sec ? breadcrumbChain(sec).map(s=>s.id) : [];
  navTreeEl.querySelectorAll(".nav-item").forEach(el=>{
    el.classList.toggle("active", chain.includes(el.dataset.id));
  });
  const active = navTreeEl.querySelector(".nav-item.active[data-id='"+(sec?sec.id:"")+"']");
  if(active) active.scrollIntoView({block:"nearest"});
}

// ---------- rendering ----------
function renderBreadcrumb(){
  const sec = getCurrentSection();
  breadcrumbEl.innerHTML = "";
  if(!sec){ breadcrumbEl.textContent = ""; return; }
  const chain = breadcrumbChain(sec);
  chain.forEach((s,i)=>{
    if(i>0){
      const sep = document.createElement("span");
      sep.className = "sep"; sep.textContent = "›";
      breadcrumbEl.appendChild(sep);
    }
    const span = document.createElement("span");
    span.textContent = s.title;
    breadcrumbEl.appendChild(span);
  });
}

// ---------- continuous page rendering ----------


function renderAllPages(){
  let fullHtml = "";
  for(let p = 1; p <= TOTAL; p++){
    const data = PAGES[p];
    if(!data || !data.html || data.html.trim() === "") continue;
    let html = data.html;
    html = `<span id="page-${p}" class="page-anchor" data-page="${p}"></span>` + html;
    fullHtml += html;
  }
  
  // Merge broken paragraphs across pages
  // Sentence enders: 。 ！ ？ 」 . ! ?
  if(NAV.navigationMode !== "structured" && !window.__beEditing && !fullHtml.includes("data-be-formatted")) fullHtml = fullHtml.replace(/([^。！？！」.!?])<\/p>\s*<span id="page-(\d+)" class="page-anchor" data-page="\d+"><\/span>\s*<p(?:\s[^>]*)?>/g, '$1<span id="page-$2" class="page-anchor" data-page="$2"></span>');
  
  const content = document.createElement("article");
  content.className = "page-content continuous-content";
  if(NAV.presentation === "quality-v3") content.classList.add("structured-book");
  content.innerHTML = fullHtml;
  window.ComicReading?.render(content,bookId,NAV);
  if(NAV.navigationMode === "structured" && !window.__beEditing){
    for(let p=2;p<=TOTAL;p++){
      if(!PAGES[p] || !PAGES[p].joinPrevious) continue;
      const anchor=content.querySelector("#page-"+p);
      const before=anchor && anchor.previousElementSibling;
      const after=anchor && anchor.nextElementSibling;
      if(before && after && before.tagName === "P" && after.tagName === "P" && !before.hasAttribute("data-be-formatted") && !after.hasAttribute("data-be-formatted")){
        before.appendChild(anchor);
        if(/[A-Za-z0-9]$/.test(before.textContent) && /^[A-Za-z0-9]/.test(after.textContent)) before.appendChild(document.createTextNode(" "));
        while(after.firstChild) before.appendChild(after.firstChild);
        after.remove();
      }
    }
  }
  
  content.querySelectorAll("table").forEach(t=>{
    if(t.parentElement.classList.contains("table-scroll")) return;
    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    t.parentNode.insertBefore(wrap, t);
    wrap.appendChild(t);
  });
  
  pagesContainer.innerHTML = "";
  pagesContainer.appendChild(content);
  
  pagesContainer.querySelectorAll(".page-anchor").forEach(el => {
    if(scrollObserver) scrollObserver.observe(el);
  });
  
  for(let p = 1; p <= TOTAL; p++) applyMemoHighlightsForPage(p);
  document.dispatchEvent(new Event("book-reader-rendered"));
}

function setCurrentPage(n){
  if(n === currentPage) return;
  currentPage = n;
    updateProgressDisplay();
  renderBreadcrumb();
  updateNavActive();
  // if(!suppressProgressSave) saveLastScroll(); handled by scroll listener now
}

function updateProgressDisplay(){
  const st = mainContentEl.scrollTop;
  const sh = mainContentEl.scrollHeight;
  const ch = mainContentEl.clientHeight;
  const maxScroll = Math.max(0, sh - ch);
  let percent = 0;
  if(maxScroll > 0) percent = Math.round((st / maxScroll) * 100);
  else if(sh > 0) percent = 100;
  percent = Math.max(0, Math.min(100, percent));
  currentPageLabel.textContent = `読書進捗 ${percent}%`;
}

function scrollToPage(n, behavior){
  n = Math.max(1, Math.min(TOTAL, n));
  const el = document.getElementById("page-" + n);
  if(el) {
    const chapterNavigation = NAV.navigationMode === "chapters";
    el.scrollIntoView({behavior: behavior || (chapterNavigation ? "auto" : "smooth"), block:"start"});
    if(chapterNavigation) setCurrentPage(n);
  }
}

// ---------- reading progress (resume on next visit) ----------
const PROGRESS_KEY = bookId + "-lastscroll-v1";
let suppressProgressSave = false;
let saveProgressTimer;
function loadLastScroll(){
  const n = parseInt(localStorage.getItem(PROGRESS_KEY), 10);
  return (!isNaN(n) && n >= 0) ? n : null;
}
function saveLastScroll(){
  clearTimeout(saveProgressTimer);
  saveProgressTimer = setTimeout(()=>{
    localStorage.setItem(PROGRESS_KEY, String(mainContentEl.scrollTop));
  }, 250);
}

// ---------- scroll-spy: figure out which page is currently in view ----------
let scrollObserver;
function setupScrollSpy(){
  scrollObserver = new IntersectionObserver((entries)=>{
    let best = null;
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        const p = parseInt(entry.target.dataset.page, 10);
        if(best === null || p < best) best = p;
      }
    });
    if(best !== null) setCurrentPage(best);
  }, {
    root: mainContentEl,
    rootMargin: "-20% 0px -60% 0px",
    threshold: 0
  });
}

navToggleBtn.addEventListener("click", ()=>{
  sidebar.classList.toggle("collapsed");
});

// ---------- search ----------
let searchIndex = null;
function buildSearchIndex(){
  searchIndex = [];
  if(NAV.captureReading){searchIndex=NAV.sections.map(section=>({page:section.startFile,text:section.title,section}));return;}
  for(let p=1; p<=TOTAL; p++){
    const d = PAGES[p];
    if(d && d.text){
      searchIndex.push({page:p, text:d.text});
    }
  }
}
function doSearch(query){
  if(!searchIndex) buildSearchIndex();
  query = query.trim();
  if(!query){ searchResultsEl.classList.add("hidden"); return; }
  const q = query.toLowerCase();
  const results = [];
  for(const item of searchIndex){
    const idx = item.text.toLowerCase().indexOf(q);
    if(idx !== -1){
      const start = Math.max(0, idx-24);
      const end = Math.min(item.text.length, idx+q.length+40);
      let snippet = (start>0?"…":"") + item.text.slice(start,end) + (end<item.text.length?"…":"");
      snippet = escapeHtml(snippet).replace(new RegExp(escapeRegExp(escapeHtml(query)),"gi"), m=>"<mark>"+m+"</mark>");
      const sec = findSectionForPage(item.page);
      results.push({page:item.page, snippet, secTitle: item.section?.title||(sec?sec.title:""),section:item.section});
      if(results.length >= 40) break;
    }
  }
  renderSearchResults(results, query);
}
function renderSearchResults(results, query){
  if(results.length === 0){
    searchResultsEl.innerHTML = '<div class="sr-empty">「'+escapeHtml(query)+'」に一致する結果はありません</div>';
  } else {
    searchResultsEl.innerHTML = results.map(r=>(
      '<div class="sr-item" data-page="'+r.page+'">' +
        '<div class="sr-path">'+escapeHtml(r.secTitle)+'（p.'+r.page+'）</div>' +
        '<div class="sr-snippet">'+r.snippet+'</div>' +
      '</div>'
    )).join("");
    searchResultsEl.querySelectorAll(".sr-item").forEach((el,index)=>{
      el.addEventListener("click", ()=>{
        if(results[index].section)scrollToSection(results[index].section);else scrollToPage(parseInt(el.dataset.page,10));
        searchResultsEl.classList.add("hidden");
        searchInput.value = "";
      });
    });
  }
  searchResultsEl.classList.remove("hidden");
}
let searchDebounce;
searchInput.addEventListener("input", ()=>{
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(()=>doSearch(searchInput.value), 150);
});
document.addEventListener("click", (e)=>{
  if(!e.target.closest(".search-wrap")) searchResultsEl.classList.add("hidden");
});

// ---------- memo: storage ----------
function loadMemos(){
  try{
    const raw = localStorage.getItem(MEMO_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveMemos(){
  localStorage.setItem(MEMO_KEY, JSON.stringify(memos));
  updateMemoCount();
}
function updateMemoCount(){
  if(memos.length > 0){
    memoCountEl.textContent = memos.length;
    memoCountEl.classList.remove("hidden");
  } else {
    memoCountEl.classList.add("hidden");
  }
}

// ---------- memo: text selection popup ----------
let pendingSelection = null; // {page, text}

pagesContainer.addEventListener("mouseup", ()=>{
  setTimeout(()=>{
    const sel = window.getSelection();
    if(!sel || sel.isCollapsed || sel.rangeCount === 0){
      memoPopup.classList.add("hidden");
      return;
    }
    const text = sel.toString().trim();
    if(!text || text.length > 400){
      memoPopup.classList.add("hidden");
      return;
    }
    const block = sel.anchorNode && sel.anchorNode.nodeType === 1
      ? sel.anchorNode.closest(".page-block")
      : sel.anchorNode && sel.anchorNode.parentElement && sel.anchorNode.parentElement.closest(".page-block");
    if(!block){
      memoPopup.classList.add("hidden");
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    pendingSelection = { page: parseInt(block.dataset.page,10), text };
    memoPopup.style.top = (window.scrollY + rect.top - 40) + "px";
    memoPopup.style.left = (window.scrollX + rect.left) + "px";
    memoPopup.classList.remove("hidden");
  }, 10);
});
document.addEventListener("mousedown", (e)=>{
  if(!e.target.closest("#memoPopup")) memoPopup.classList.add("hidden");
});

addMemoBtn.addEventListener("click", ()=>{
  if(!pendingSelection) return;
  openMemoEditor({mode:"create", page: pendingSelection.page, quote: pendingSelection.text});
  memoPopup.classList.add("hidden");
});

// ---------- memo editor ----------
let editingMemoId = null;
function openMemoEditor({mode, page, quote, memoId, existingNote}){
  editingMemoId = mode === "edit" ? memoId : null;
  memoEditorQuote.textContent = quote;
  memoEditorText.value = existingNote || "";
  memoDeleteBtn.classList.toggle("hidden", mode !== "edit");
  memoEditor.dataset.page = page;
  memoEditor.dataset.quote = quote;
  overlay.classList.remove("hidden");
  memoEditor.classList.remove("hidden");
  memoEditorText.focus();
}
function closeMemoEditor(){
  overlay.classList.add("hidden");
  memoEditor.classList.add("hidden");
  editingMemoId = null;
}
memoCancelBtn.addEventListener("click", closeMemoEditor);
overlay.addEventListener("click", ()=>{
  closeMemoEditor();
  memoListPanel.classList.add("hidden");
});

memoSaveBtn.addEventListener("click", ()=>{
  const note = memoEditorText.value.trim();
  if(!note){ closeMemoEditor(); return; }
  const page = parseInt(memoEditor.dataset.page,10);
  if(editingMemoId){
    const m = memos.find(x=>x.id === editingMemoId);
    if(m) m.note = note;
  } else {
    memos.push({
      id: "m" + Date.now() + Math.floor(Math.random()*1000),
      page,
      quote: memoEditor.dataset.quote,
      note,
      createdAt: new Date().toISOString()
    });
  }
  saveMemos();
  closeMemoEditor();
  applyMemoHighlightsForPage(page);
  renderMemoList();
});
memoDeleteBtn.addEventListener("click", ()=>{
  const page = parseInt(memoEditor.dataset.page,10);
  if(editingMemoId){
    memos = memos.filter(x=>x.id !== editingMemoId);
    saveMemos();
  }
  closeMemoEditor();
  applyMemoHighlightsForPage(page);
  renderMemoList();
});

// ---------- memo highlighting within page content ----------
function applyMemoHighlightsForPage(page){
  const anchor = document.getElementById("page-" + page);
  if(!anchor) return;
  const contentEl = anchor.closest(".continuous-content");
  if(!contentEl) return;
  
  // To avoid removing highlights from other pages when editing, we only remove ones matching our memo IDs
  const pageMemos = memos.filter(m=>m.page === page);
  const memoIds = pageMemos.map(m=>m.id);
  contentEl.querySelectorAll(".memo-highlight").forEach(mark=>{
    if(memoIds.includes(mark.dataset.memoId)){
      const parent = mark.parentNode;
      while(mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    }
  });
  
  if(pageMemos.length === 0) return;
  const sorted = [...pageMemos].sort((a,b)=>b.quote.length - a.quote.length);
  sorted.forEach(m=>{
    highlightTextInElement(contentEl, m.quote, m.id); // It searches the whole document, but finds the first match. In most cases, it's fine.
  });
}
function highlightTextInElement(root, quote, memoId){
  if(!quote) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node){
      if(node.parentElement && node.parentElement.classList.contains("memo-highlight")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  let n;
  while((n = walker.nextNode())) nodes.push(n);
  for(const node of nodes){
    const idx = node.nodeValue.indexOf(quote);
    if(idx === -1) continue;
    const range = document.createRange();
    range.setStart(node, idx);
    range.setEnd(node, idx + quote.length);
    const mark = document.createElement("mark");
    mark.className = "memo-highlight";
    mark.dataset.memoId = memoId;
    try{
      range.surroundContents(mark);
      mark.addEventListener("click", (e)=>{
        e.stopPropagation();
        const m = memos.find(x=>x.id === memoId);
        if(m) openMemoEditor({mode:"edit", page:m.page, quote:m.quote, memoId:m.id, existingNote:m.note});
      });
    }catch(e){ /* skip if range spans multiple elements */ }
    break; // only first occurrence per memo
  }
}

// ---------- memo list panel ----------
memoListBtn.addEventListener("click", ()=>{
  renderMemoList();
  memoListPanel.classList.remove("hidden");
  overlay.classList.remove("hidden");
});
memoListCloseBtn.addEventListener("click", ()=>{
  memoListPanel.classList.add("hidden");
  overlay.classList.add("hidden");
});
function renderMemoList(){
  if(memos.length === 0){
    memoListBody.innerHTML = '<div class="memo-list-empty">まだメモがありません。<br>本文を範囲選択すると「+メモを追加」ボタンが表示されます。</div>';
    return;
  }
  const sorted = [...memos].sort((a,b)=>a.page - b.page);
  memoListBody.innerHTML = sorted.map(m=>{
    const sec = findSectionForPage(m.page);
    return '<div class="memo-card" data-page="'+m.page+'" data-id="'+m.id+'">' +
      '<div class="memo-card-page">p.'+m.page+(sec?"　"+escapeHtml(sec.title):"")+'</div>' +
      '<div class="memo-card-quote">"'+escapeHtml(m.quote)+'"</div>' +
      '<div class="memo-card-note">'+escapeHtml(m.note)+'</div>' +
    '</div>';
  }).join("");
  memoListBody.querySelectorAll(".memo-card").forEach(el=>{
    el.addEventListener("click", ()=>{
      const id = el.dataset.id;
      memoListPanel.classList.add("hidden");
      overlay.classList.add("hidden");
      scrollToPage(parseInt(el.dataset.page,10));
      setTimeout(()=>{
        const markEl = pagesContainer.querySelector('.memo-highlight[data-memo-id="'+id+'"]');
        if(markEl) markEl.scrollIntoView({block:"center", behavior:"smooth"});
      }, 400);
    });
  });
}

// ---------- init ----------
homeBtn.href = "book.html?book=" + bookId;
if(NAV.book && NAV.book.title){
  if(bookTitleEl) bookTitleEl.textContent = NAV.book.title;
  document.title = NAV.book.title + "　本文版ビューア";
}
buildNavTree();
updateMemoCount();
setupScrollSpy();

renderAllPages();
if(NAV.navigationMode === "structured") setTimeout(syncStructuredNavigation,0);

const lastScroll = loadLastScroll();
if(lastScroll !== null){
  suppressProgressSave = true;
  mainContentEl.scrollTop = lastScroll;
  setTimeout(()=>{ suppressProgressSave = false; }, 400);
}

updateProgressDisplay();
renderBreadcrumb();
updateNavActive();

let scrollUpdateTimer;
mainContentEl.addEventListener("scroll", ()=>{
  if(scrollUpdateTimer) return;
  scrollUpdateTimer = setTimeout(()=>{
    scrollUpdateTimer = null;
    updateProgressDisplay();
    if(!suppressProgressSave) saveLastScroll();
    syncStructuredNavigation();
  }, 100);
}, {passive:true});

if(window.installBookEditor) window.installBookEditor({bookId,NAV,PAGES,container:pagesContainer,refresh:()=>{
 const savedPosition=window.ReaderPosition?.capturePosition(mainContentEl),navScroll=sidebar.scrollTop;searchIndex=null;buildNavTree();renderAllPages();sidebar.scrollTop=navScroll;
 window.ReaderPosition?.restorePosition(mainContentEl,savedPosition);
 renderBreadcrumb();updateNavActive();if(searchInput.value.trim())doSearch(searchInput.value);
}});

};
