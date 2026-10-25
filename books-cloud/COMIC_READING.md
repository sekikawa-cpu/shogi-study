# Existing comic capture presentation

`comic-reading.js` changes the rendered DOM only. It does not change `PAGES` source HTML, original images, book IDs, source capture numbers, or cloud edit hashes. Comic text is limited to the book title; navigation/search use reviewed headings. Other book formats are unaffected.

The encrypted core contains `comic-layouts.js`. Its local source is `C:/Apps/書籍/webapp/comic-layouts.js`; never copy private page text or raw OCR into public assets. `update-viewer.mjs` imports it together with the generic viewer and preserves all lazy-book mappings and unrelated assets.

Each capture records its source image SHA-256, dimensions, decision, and the original scan boundary. An asymmetric crop must use `(originalWidth / 2 - cropLeft) / cropWidth`, not the output image midpoint. Only a continuous gutter supports automatic splitting. Crossing or ambiguous art stays as a spread. Split pages are ordered right then left and jointly cover the complete original image. Each visible page has a thin grey separator.

Reviewed paper contents provide chapter names and printed page numbers. The per-book evidence records the contents capture hash and page-number alignment. Recheck this alignment whenever captures are added, removed, reordered, or replaced; regenerate the local plan before publishing changed book sources. A replacement cloud image is shown whole instead of inheriting the old geometry.

The image editor adds automatic / spread / split / whole controls. Overrides use the existing encrypted cloud revision checks and undo, with the same immutable original image hash. Capture element anchors preserve the visible page when entering or leaving edit mode.

Verification: `node --test books-cloud/*.test.mjs`, source-to-encrypted image inventory, known crossing-spread regression, then authenticated live UI. Automated layout decisions are conservative; they are not a claim of page-by-page artistic review.
