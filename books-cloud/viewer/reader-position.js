"use strict";
var ReaderPosition = (() => {
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

  // books-cloud/viewer/reader-position.ts
  var reader_position_exports = {};
  __export(reader_position_exports, {
    capturePosition: () => capturePosition,
    restorePosition: () => restorePosition
  });
  var excluded = "button,input,textarea,select,script,style,.be-panel,.be-item-tools,.inline-book-editor,.inline-image-editor,.inline-edit-banner,.breadcrumb,.deleted-item-notice";
  var restores = /* @__PURE__ */ new WeakMap();
  var compact = (text) => text.replace(/\s/g, "");
  function nodes(root) {
    const result = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.parentElement && !n.parentElement.closest(excluded) && compact(n.textContent || "")) result.push(n);
    return result;
  }
  function bounds(root) {
    const box = root.getBoundingClientRect();
    let top = Math.max(0, box.top + root.clientTop);
    for (const header of document.querySelectorAll(".topbar,.book-toolbar,body>header,#root header")) {
      const style = getComputedStyle(header), r = header.getBoundingClientRect();
      if ((style.position === "fixed" || style.position === "sticky") && r.top >= 0 && r.bottom < innerHeight * 0.6) top = Math.max(top, r.bottom);
    }
    return { top, bottom: Math.min(innerHeight, box.bottom) };
  }
  function rect(node, start = 0, end = node.length) {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, Math.min(end, node.length));
    return range.getBoundingClientRect ? range.getBoundingClientRect() : node.parentElement.getBoundingClientRect();
  }
  function capturePosition(root) {
    if (!root) return null;
    const list = nodes(root), view = bounds(root);
    let prefix = 0;
    for (const image of root.querySelectorAll(".capture-piece[id]")) {
      const box = image.getBoundingClientRect();
      if (box.height && box.bottom > view.top + 2 && box.top < view.bottom) return { index: 0, context: "", captureId: image.id, offset: box.top - view.top, scroll: root.scrollTop, outer: scrollY };
    }
    for (const panel of root.querySelectorAll(".be-panel,.inline-book-editor,.inline-image-editor")) {
      const box = panel.getBoundingClientRect(), visible = Math.min(box.bottom, view.bottom) - Math.max(box.top, view.top);
      if (visible < (view.bottom - view.top) * 0.45) continue;
      const owner = panel.closest("[data-reading-block]") || panel.previousElementSibling?.previousElementSibling;
      const i = list.findIndex((node) => owner?.contains(node));
      if (i < 0) continue;
      const index = list.slice(0, i).reduce((sum, node) => sum + compact(node.data).length, 0), stream = list.map((node) => compact(node.data)).join("");
      return { index, context: stream.slice(index, index + 48), offset: Math.max(0, box.top - view.top), scroll: root.scrollTop, outer: scrollY };
    }
    for (let i = 0; i < list.length; i++) {
      const node = list[i], box = rect(node);
      if (box.height && box.bottom > view.top + 2 && box.top < view.bottom) {
        let low = 0, high = Math.max(0, node.length - 1);
        while (low < high) {
          const mid = Math.floor((low + high) / 2);
          if (rect(node, mid, mid + 1).bottom <= view.top + 2) low = mid + 1;
          else high = mid;
        }
        const index = prefix + compact(node.data.slice(0, low)).length, stream = list.map((n) => compact(n.data)).join("");
        return { index, context: stream.slice(index, index + 48), offset: rect(node, low, low + 1).top - view.top, scroll: root.scrollTop, outer: scrollY };
      }
      prefix += compact(node.data).length;
    }
    return { index: 0, context: "", offset: 0, scroll: root.scrollTop, outer: scrollY };
  }
  function restorePosition(root, saved) {
    if (!root || !saved) return () => {
    };
    restores.get(root)?.();
    let active = true, frame = 0;
    const adjust = () => {
      if (!active || !root.isConnected) return;
      const list = nodes(root), stream = list.map((n) => compact(n.data)).join("");
      let index = saved.index;
      if (saved.context && stream.slice(index, index + saved.context.length) !== saved.context) {
        const match = stream.indexOf(saved.context);
        if (match >= 0) index = match;
      }
      const behavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(window.scrollX, saved.outer);
      if (saved.captureId) {
        const image = document.getElementById(saved.captureId);
        if (image && root.contains(image)) {
          root.scrollTop += image.getBoundingClientRect().top - (bounds(root).top + saved.offset);
          root.style.scrollBehavior = behavior;
          return;
        }
      }
      if (!saved.context) {
        root.scrollTop = saved.scroll;
        root.style.scrollBehavior = behavior;
        return;
      }
      let remaining = index, found = false;
      for (const node of list) {
        const length = compact(node.data).length;
        if (remaining >= length) {
          remaining -= length;
          continue;
        }
        let offset = 0, count = 0;
        while (offset < node.length) {
          if (!/\s/.test(node.data[offset])) {
            if (count === remaining) break;
            count++;
          }
          offset++;
        }
        const box = rect(node, Math.min(offset, node.length - 1), Math.min(offset + 1, node.length));
        root.scrollTop += box.top - (bounds(root).top + saved.offset);
        found = true;
        break;
      }
      if (!found) root.scrollTop = saved.scroll;
      root.style.scrollBehavior = behavior;
    };
    const schedule = () => {
      if (!frame && active) frame = requestAnimationFrame(() => {
        frame = 0;
        adjust();
      });
    };
    const images = Array.from(root.querySelectorAll("img")).filter((image) => !image.complete);
    const cancel = () => {
      active = false;
      cancelAnimationFrame(frame);
      for (const image of images) image.removeEventListener("load", schedule);
      for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) root.removeEventListener(event, cancel, true);
    };
    for (const image of images) image.addEventListener("load", schedule);
    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) root.addEventListener(event, cancel, { capture: true, passive: true });
    restores.set(root, cancel);
    adjust();
    schedule();
    setTimeout(cancel, 1600);
    return cancel;
  }
  return __toCommonJS(reader_position_exports);
})();
