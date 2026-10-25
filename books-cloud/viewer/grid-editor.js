"use strict";
var ReadingGrid = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // frontend/src/grid-editor.ts
  var grid_editor_exports = {};
  __export(grid_editor_exports, {
    openGridEditor: () => openGridEditor
  });
  function openGridEditor({ items, onSave, onClose }) {
    const dialog = document.createElement("dialog");
    dialog.className = "reading-grid";
    dialog.setAttribute("aria-label", "\u9805\u76EE\u3092\u307E\u3068\u3081\u3066\u7DE8\u96C6");
    const original = new Map(items.map((i) => [i.id, { ...i }])), drafts = /* @__PURE__ */ new Map(), selected = /* @__PURE__ */ new Set();
    let page = 0, busy = false;
    const make = (tag, text) => {
      const n = document.createElement(tag);
      if (text !== void 0) n.textContent = text;
      return n;
    };
    const button = (text, fn) => {
      const n = make("button", text);
      n.type = "button";
      n.onclick = fn;
      return n;
    };
    const header = make("header"), title = make("h2", "\u9805\u76EE\u3092\u307E\u3068\u3081\u3066\u7DE8\u96C6"), close = button("\u9589\u3058\u308B", requestClose);
    header.append(title, close);
    const hint = make("p", "\u884C\u3054\u3068\u306B\u7DE8\u96C6\u3067\u304D\u307E\u3059\u3002\u30C1\u30A7\u30C3\u30AF\u3057\u305F\u9805\u76EE\u3078\u4E00\u62EC\u9069\u7528\u3057\u3001\u6700\u5F8C\u306B\u300C\u5909\u66F4\u3092\u4FDD\u5B58\u300D\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u5143\u753B\u50CF\u306F\u524A\u9664\u3057\u307E\u305B\u3093\u3002");
    const bar = make("div");
    bar.className = "reading-grid-bar";
    const search = make("input");
    search.placeholder = "\u672C\u6587\u30FB\u898B\u51FA\u3057\u3092\u691C\u7D22";
    search.setAttribute("aria-label", "\u4E00\u89A7\u3092\u691C\u7D22");
    const filter = make("select");
    filter.setAttribute("aria-label", "\u9805\u76EE\u306E\u7A2E\u985E\u3067\u7D5E\u308A\u8FBC\u307F");
    const kinds = [["paragraph", "\u672C\u6587"], ["heading", "\u898B\u51FA\u3057"], ["note", "\u6CE8\u8A18"], ["quote", "\u5F15\u7528"], ["list", "\u7B87\u6761\u66F8\u304D"], ["code", "\u30B3\u30FC\u30C9"]];
    for (const [value, label] of [["", "\u3059\u3079\u3066"], ...kinds, ["image", "\u753B\u50CF\u30FB\u8868"]]) {
      const o = make("option", label);
      o.value = value;
      filter.append(o);
    }
    const count = make("span");
    count.setAttribute("role", "status");
    bar.append(search, filter, count);
    const bulk = make("div");
    bulk.className = "reading-grid-bar";
    const kind = make("select");
    kind.setAttribute("aria-label", "\u4E00\u62EC\u8868\u793A\u5F62\u5F0F");
    for (const [value, label] of [["", "\u8868\u793A\u5F62\u5F0F\u3092\u5909\u66F4"], ...kinds]) {
      const o = make("option", label);
      o.value = value;
      kind.append(o);
    }
    const indent = make("select");
    indent.setAttribute("aria-label", "\u4E00\u62EC\u30A4\u30F3\u30C7\u30F3\u30C8");
    for (let i = -1; i <= 4; i++) {
      const o = make("option", i < 0 ? "\u5B57\u4E0B\u3052\u3092\u5909\u66F4" : i + "\u5B57");
      o.value = String(i);
      indent.append(o);
    }
    bulk.append(button("\u8868\u793A\u4E2D\u3092\u9078\u629E", () => {
      shown().forEach((i) => selected.add(i.id));
      render();
    }), button("\u9078\u629E\u3092\u89E3\u9664", () => {
      selected.clear();
      render();
    }), kind, indent, button("\u9078\u629E\u9805\u76EE\u306B\u9069\u7528", () => {
      for (const id of selected) {
        const item = current(id);
        if (item.image) continue;
        const d = edit(id);
        if (kind.value) {
          d.type = kind.value;
          if (d.type === "heading") {
            d.level || (d.level = 2);
            d.toc = true;
          } else d.toc = false;
        }
        if (indent.value !== "-1") d.indent = Number(indent.value);
      }
      render();
    }), button("\u9078\u629E\u9805\u76EE\u3092\u524A\u9664", () => {
      if (!selected.size) return;
      confirmAction(`${selected.size}\u9805\u76EE\u3092\u524A\u9664\u5BFE\u8C61\u306B\u3057\u307E\u3059\u304B\uFF1F`, "\u4FDD\u5B58\u3059\u308B\u307E\u3067\u306F\u53CD\u6620\u3055\u308C\u307E\u305B\u3093\u3002\u4FDD\u5B58\u5F8C\u3082\u4E00\u62EC\u3067\u53D6\u308A\u6D88\u305B\u307E\u3059\u3002", () => {
        for (const id of selected) edit(id).deleted = true;
        render();
      });
    }), button("\u9078\u629E\u9805\u76EE\u306E\u5909\u66F4\u3092\u623B\u3059", () => {
      for (const id of selected) drafts.delete(id);
      render();
    }));
    const viewport = make("div");
    viewport.className = "reading-grid-viewport";
    const table = make("table"), head = make("thead"), hr = make("tr");
    for (const label of ["\u9078\u629E", "\u30DA\u30FC\u30B8", "\u7A2E\u985E\u30FB\u968E\u5C64", "\u672C\u6587\u30FB\u898B\u51FA\u3057\uFF0F\u753B\u50CF", "\u5B57\u4E0B\u3052", "\u72B6\u614B"]) hr.append(make("th", label));
    head.append(hr);
    const body = make("tbody");
    table.append(head, body);
    viewport.append(table);
    const footer = make("footer"), previous = button("\u524D\u306E50\u9805\u76EE", () => {
      page--;
      render();
    }), next = button("\u6B21\u306E50\u9805\u76EE", () => {
      page++;
      render();
    }), paging = make("span"), error = make("p");
    error.setAttribute("role", "alert");
    const save = button("\u5909\u66F4\u3092\u4FDD\u5B58", async () => {
      const changes = [...drafts.values()].filter(changed);
      if (!changes.length) return;
      if (changes.length > 100) {
        error.textContent = "\u4E00\u5EA6\u306B\u4FDD\u5B58\u3067\u304D\u308B\u306E\u306F100\u9805\u76EE\u3067\u3059\u3002100\u9805\u76EE\u4EE5\u4E0B\u306B\u5206\u3051\u3066\u4FDD\u5B58\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
        return;
      }
      const run = async () => {
        busy = true;
        error.textContent = "\u4FDD\u5B58\u4E2D\u2026";
        dialog.querySelectorAll("button,input,textarea,select").forEach((n) => n.disabled = true);
        try {
          await onSave(changes);
          drafts.clear();
          finish();
        } catch (e) {
          error.textContent = e.message + " \u5165\u529B\u5185\u5BB9\u306F\u3053\u306E\u753B\u9762\u306B\u6B8B\u3063\u3066\u3044\u307E\u3059\u3002";
          busy = false;
          dialog.querySelectorAll("button,input,textarea,select").forEach((n) => n.disabled = false);
          render();
        }
      };
      const removed = changes.filter((c) => c.deleted).length;
      if (removed) confirmAction(`${removed}\u9805\u76EE\u3092\u524A\u9664\u3057\u3066\u4FDD\u5B58\u3057\u307E\u3059\u304B\uFF1F`, `${changes.length}\u9805\u76EE\u306E\u5909\u66F4\u3092\u307E\u3068\u3081\u3066\u4FDD\u5B58\u3057\u307E\u3059\u3002\u4FDD\u5B58\u5F8C\u306B\u53D6\u308A\u6D88\u305B\u307E\u3059\u3002`, run);
      else await run();
    });
    footer.append(previous, paging, next, save, error);
    dialog.append(header, hint, bar, bulk, viewport, footer);
    const focused = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.append(dialog);
    dialog.showModal();
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      requestClose();
    });
    search.oninput = filter.onchange = () => {
      page = 0;
      render();
    };
    function current(id) {
      return drafts.get(id) || original.get(id);
    }
    function edit(id) {
      if (!drafts.has(id)) drafts.set(id, { ...original.get(id), before: original.get(id) });
      return drafts.get(id);
    }
    function changed(i) {
      return i.deleted || ["text", "type", "level", "indent", "firstLine", "toc"].some((k) => i[k] !== i.before[k]);
    }
    function filtered() {
      const q = search.value.trim().toLowerCase();
      return items.filter((i) => {
        const v = current(i.id);
        return (!q || v.text.toLowerCase().includes(q) || String(i.page) === q) && (!filter.value || (filter.value === "image" ? !!i.image : v.type === filter.value));
      });
    }
    function shown() {
      return filtered().slice(page * 50, page * 50 + 50);
    }
    function finish() {
      dialog.close();
      dialog.remove();
      document.body.style.overflow = overflow;
      onClose?.();
      focused?.focus({ preventScroll: true });
    }
    function requestClose() {
      if (busy) return;
      if ([...drafts.values()].some(changed)) confirmAction("\u5909\u66F4\u3092\u4FDD\u5B58\u305B\u305A\u9589\u3058\u307E\u3059\u304B\uFF1F", "\u672A\u4FDD\u5B58\u306E\u5909\u66F4\u3060\u3051\u3092\u53D6\u308A\u6D88\u3057\u307E\u3059\u3002", finish);
      else finish();
    }
    function confirmAction(title2, message, accept) {
      const confirm = make("dialog");
      confirm.className = "reading-grid-confirm";
      confirm.setAttribute("aria-label", title2);
      confirm.append(make("h2", title2), make("p", message));
      const actions = make("div");
      actions.className = "reading-grid-bar";
      const cancel = button("\u30AD\u30E3\u30F3\u30BB\u30EB", () => {
        confirm.close();
        confirm.remove();
      });
      actions.append(cancel, button("\u5B9F\u884C\u3059\u308B", () => {
        confirm.close();
        confirm.remove();
        accept();
      }));
      confirm.append(actions);
      confirm.oncancel = (e) => {
        e.preventDefault();
        cancel.click();
      };
      document.body.append(confirm);
      confirm.showModal();
      cancel.focus();
    }
    function render() {
      const rows = filtered();
      page = Math.max(0, Math.min(page, Math.max(0, Math.ceil(rows.length / 50) - 1)));
      body.replaceChildren();
      count.textContent = `${rows.length}\u9805\u76EE \uFF0F ${selected.size}\u4EF6\u9078\u629E \uFF0F ${[...drafts.values()].filter(changed).length}\u4EF6\u5909\u66F4`;
      for (const base of shown()) {
        const value = current(base.id), tr = make("tr");
        tr.classList.toggle("is-deleted", !!value.deleted);
        const check = make("input");
        check.type = "checkbox";
        check.checked = selected.has(base.id);
        check.setAttribute("aria-label", `\u30DA\u30FC\u30B8${base.page} ${base.text.slice(0, 25) || "\u753B\u50CF"}\u3092\u9078\u629E`);
        check.onchange = () => {
          check.checked ? selected.add(base.id) : selected.delete(base.id);
          count.textContent = `${rows.length}\u9805\u76EE \uFF0F ${selected.size}\u4EF6\u9078\u629E \uFF0F ${[...drafts.values()].filter(changed).length}\u4EF6\u5909\u66F4`;
        };
        const td = make("td");
        td.append(check);
        tr.append(td, make("td", String(base.page)));
        const typeCell = make("td"), content = make("td"), spacing = make("td"), state = make("td");
        state.textContent = value.deleted ? "\u524A\u9664\u4E88\u5B9A" : drafts.has(base.id) && changed(drafts.get(base.id)) ? "\u5909\u66F4\u3042\u308A" : "";
        const touch = () => {
          const d = drafts.get(base.id);
          if (changed(d)) selected.add(base.id);
          check.checked = selected.has(base.id);
          state.textContent = d.deleted ? "\u524A\u9664\u4E88\u5B9A" : changed(d) ? "\u5909\u66F4\u3042\u308A" : "";
          count.textContent = `${rows.length}\u9805\u76EE \uFF0F ${selected.size}\u4EF6\u9078\u629E \uFF0F ${[...drafts.values()].filter(changed).length}\u4EF6\u5909\u66F4`;
        };
        if (base.image) {
          typeCell.textContent = base.type === "table" ? "\u8868" : "\u753B\u50CF";
          const image = make("img");
          image.src = base.image;
          image.alt = base.text.slice(0, 60) || "\u66F8\u7C4D\u753B\u50CF";
          image.loading = "lazy";
          content.append(image);
          spacing.textContent = "\u2014";
        } else {
          const select = make("select");
          select.setAttribute("aria-label", `${base.id} \u8868\u793A\u5F62\u5F0F`);
          for (const [v, l] of kinds) {
            const o = make("option", l);
            o.value = v;
            select.append(o);
          }
          select.value = value.type;
          const level = make("select");
          level.setAttribute("aria-label", `${base.id} \u898B\u51FA\u3057\u968E\u5C64`);
          for (let n2 = 1; n2 <= 4; n2++) {
            const o = make("option", "\u968E\u5C64 " + n2);
            o.value = String(n2);
            level.append(o);
          }
          level.value = String(value.level || 2);
          level.hidden = value.type !== "heading";
          select.onchange = () => {
            const d = edit(base.id);
            d.type = select.value;
            d.toc = d.type === "heading";
            d.level = Number(level.value);
            level.hidden = d.type !== "heading";
            touch();
          };
          level.onchange = () => {
            edit(base.id).level = Number(level.value);
            touch();
          };
          typeCell.append(select, level);
          const area = make("textarea");
          area.value = value.text;
          area.rows = Math.max(3, Math.min(9, Math.ceil(value.text.length / 65)));
          area.setAttribute("aria-label", `${base.id} \u672C\u6587\u30FB\u898B\u51FA\u3057`);
          area.oninput = () => {
            edit(base.id).text = area.value;
            touch();
          };
          content.append(area);
          const n = make("select");
          n.setAttribute("aria-label", `${base.id} \u30A4\u30F3\u30C7\u30F3\u30C8`);
          for (let j = 0; j <= 4; j++) {
            const o = make("option", j + "\u5B57");
            o.value = String(j);
            n.append(o);
          }
          n.value = String(value.indent || 0);
          n.onchange = () => {
            edit(base.id).indent = Number(n.value);
            touch();
          };
          spacing.append(n);
        }
        tr.append(typeCell, content, spacing, state);
        body.append(tr);
      }
      paging.textContent = rows.length ? `${page * 50 + 1}\u301C${Math.min(rows.length, (page + 1) * 50)} / ${rows.length}` : "\u8A72\u5F53\u3059\u308B\u9805\u76EE\u304C\u3042\u308A\u307E\u305B\u3093";
      previous.disabled = busy || page === 0;
      next.disabled = busy || (page + 1) * 50 >= rows.length;
    }
    render();
    return { close: requestClose };
  }
  return __toCommonJS(grid_editor_exports);
})();
