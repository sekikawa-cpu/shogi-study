import { createCipheriv, createHash, pbkdf2Sync, randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import { promises as fs } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const sourceRoot = "C:/Apps/書籍/webapp";
const outputFile = "C:/Apps/shogi-study/public/books-study/encrypted.bundle";
const ownerUidFile = "C:/Apps/書籍/book-app-owner-uid.txt";
const allowedRootFiles = new Set([
  "index.html", "library.css", "library.js", "books.js", "book.html", "book-dashboard.js",
  "book-loader.js", "text.html", "style.css", "app.js", "diagram-enhancer.js",
  "diagram-library.js", "summary.html", "summary.css", "summary.js", "quiz.html",
  "quiz-play.html", "quiz-common.css", "quiz-common.js", "quiz-list.js", "quiz-play.js",
  "progress-data.json", "book-editor.js", "book-editor.css"
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
const passphrase = createHash("sha256").update(`book-app-v3:${ownerUid}`).digest("base64url");


const registryContext = {window:{}};
vm.runInNewContext(await fs.readFile(path.join(sourceRoot,"books.js"),"utf8"),registryContext);
const comicIds = new Set(registryContext.window.BOOKS.map(book=>book.id));
const coverFiles = new Set(registryContext.window.BOOKS.map(book=>book.cover));
const allFiles = await collect(sourceRoot);
const groups = new Map([["core",[]], ...[...comicIds].map(id=>[id,[]])]);
for (const item of allFiles) {
  const match = item.relative.match(/^books\/([^/]+)\//);
  const group = match && comicIds.has(match[1]) && !coverFiles.has(item.relative) ? match[1] : "core";
  groups.get(group).push(item);
}
const generated = new Set(["encrypted-manifest.json"]);
async function pack(items, extra = {}) {
  const files = {};
  for (const item of items) files[item.relative] = (await fs.readFile(item.full)).toString("base64");
  const payload = Buffer.from(JSON.stringify({version:1,files}),"utf8");
  const sourceHash = createHash("sha256").update(payload).update(JSON.stringify(extra)).update(passphrase).digest("hex");
  const manifestName = `encrypted-${sourceHash.slice(0,16)}-manifest.json`;
  const outputDir = path.dirname(outputFile);
  try {
    const previous = JSON.parse(await fs.readFile(path.join(outputDir,manifestName),"utf8"));
    if(previous.sourceHash === sourceHash) {
      await Promise.all(previous.parts.map(name=>fs.access(path.join(outputDir,name))));
      generated.add(manifestName);previous.parts.forEach(name=>generated.add(name));
      return {manifestName,manifest:previous,count:items.length};
    }
  } catch {}
  const compressed = gzipSync(payload,{level:6});
  const salt = randomBytes(16),iv = randomBytes(12);
  const key = pbkdf2Sync(passphrase,salt,600000,32,"sha256");
  const cipher = createCipheriv("aes-256-gcm",key,iv);
  const encrypted = Buffer.concat([cipher.update(compressed),cipher.final()]);
  const bundle = Buffer.concat([Buffer.from("BOOKAPP1"),salt,iv,cipher.getAuthTag(),encrypted]);
  const chunkSize=20*1024*1024,parts=[];
  const revision=createHash("sha256").update(bundle).digest("hex").slice(0,16);
  for(let offset=0;offset<bundle.length;offset+=chunkSize){
    const name=`encrypted-${revision}-${parts.length}.bundle`;
    await fs.writeFile(path.join(outputDir,name),bundle.subarray(offset,offset+chunkSize));
    parts.push(name);generated.add(name);
  }
  const manifest={version:2,bytes:bundle.length,parts,sourceHash,...extra};
  await fs.writeFile(path.join(outputDir,manifestName),JSON.stringify(manifest));generated.add(manifestName);
  return {manifestName,manifest,count:items.length};
}
const books = {};
for(const [id,items] of groups){
  if(id === "core")continue;
  const result=await pack(items);books[id]=result.manifestName;
  console.log(JSON.stringify({id,images:result.count,bytes:result.manifest.bytes}));
}
const core=await pack(groups.get("core"),{books});
await fs.writeFile(path.join(path.dirname(outputFile),"encrypted-manifest.json"),JSON.stringify(core.manifest));
await fs.writeFile("C:/Apps/shogi-study/public/admin/books-study/encrypted-manifest.json",JSON.stringify(core.manifest));
console.log(JSON.stringify({coreFiles:core.count,coreBytes:core.manifest.bytes,imageBooks:Object.keys(books).length}));
// Remove obsolete generated chunks only within the fixed bundle directory.
for(const name of await fs.readdir(path.dirname(outputFile))){
  if(/^encrypted-[a-f0-9]{16}-(?:[0-9]+\.bundle|manifest\.json)$/.test(name)&&!generated.has(name))
    await fs.unlink(path.join(path.dirname(outputFile),name));
}
