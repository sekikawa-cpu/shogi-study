import { createCipheriv, createHash, pbkdf2Sync, randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import { promises as fs } from "node:fs";
import path from "node:path";

const sourceRoot = "C:/Apps/書籍/webapp";
const outputFile = "C:/Apps/shogi-study/public/books-study/encrypted.bundle";
const ownerUidFile = "C:/Apps/書籍/book-app-owner-uid.txt";
const ownerEmail = "sekikawa0301@gmail.com";
const allowedRootFiles = new Set([
  "index.html", "library.css", "books.js", "book.html", "book-dashboard.js",
  "book-loader.js", "text.html", "style.css", "app.js", "diagram-enhancer.js",
  "diagram-library.js", "summary.html", "summary.css", "summary.js", "quiz.html",
  "quiz-play.html", "quiz-common.css", "quiz-common.js", "quiz-list.js", "quiz-play.js",
  "progress-data.json"
]);
const allowedExtensions = new Set([".html", ".css", ".js", ".json", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"]);

async function collect(directory, prefix = "") {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (["node_modules", "__pycache__"].includes(entry.name)) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!prefix && !["books", "illustrations"].includes(entry.name)) continue;
      result.push(...await collect(full, relative));
    } else if ((prefix && allowedExtensions.has(path.extname(entry.name).toLowerCase())) || (!prefix && allowedRootFiles.has(entry.name))) {
      result.push({ relative, full });
    }
  }
  return result;
}

await fs.mkdir(path.dirname(outputFile), { recursive: true });
const ownerUid = (await fs.readFile(ownerUidFile, "utf8")).trim();
if (!/^[A-Za-z0-9_-]{20,}$/.test(ownerUid)) throw new Error("The local owner UID file is missing or invalid.");
const passphrase = createHash("sha256").update(`book-app-v2:${ownerUid}:${ownerEmail}`).digest("base64url");

const files = {};
for (const item of await collect(sourceRoot)) {
  files[item.relative] = (await fs.readFile(item.full)).toString("base64");
}
const payload = Buffer.from(JSON.stringify({ version: 1, files }), "utf8");
const compressed = gzipSync(payload, { level: 9 });
const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(passphrase, salt, 600000, 32, "sha256");
const cipher = createCipheriv("aes-256-gcm", key, iv);
const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
const tag = cipher.getAuthTag();
const header = Buffer.concat([Buffer.from("BOOKAPP1"), salt, iv, tag]);
await fs.writeFile(outputFile, Buffer.concat([header, encrypted]));
console.log(JSON.stringify({ files: Object.keys(files).length, rawBytes: payload.length, compressedBytes: compressed.length, encryptedBytes: header.length + encrypted.length, outputFile, keyMode: "firebase-owner" }, null, 2));
