// Update generic viewer assets without rebuilding or replacing any book content.
import fs from'node:fs/promises';
import path from'node:path';
import{fileURLToPath}from'node:url';
import{createHash,createCipheriv,createDecipheriv,pbkdf2Sync,randomBytes}from'node:crypto';
import{gzipSync,gunzipSync}from'node:zlib';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dir=path.join(root,'public/books-study');
const manifest=JSON.parse(await fs.readFile(path.join(dir,'encrypted-manifest.json'),'utf8'));
const uid=(await fs.readFile('C:/Apps/書籍/book-app-owner-uid.txt','utf8')).trim();
const secret=createHash('sha256').update('book-app-v3:'+uid).digest('base64url');
function unpack(bytes){const cipher=createDecipheriv('aes-256-gcm',pbkdf2Sync(secret,bytes.subarray(8,24),600000,32,'sha256'),bytes.subarray(24,36));cipher.setAuthTag(bytes.subarray(36,52));return JSON.parse(gunzipSync(Buffer.concat([cipher.update(bytes.subarray(52)),cipher.final()])))}
const original=unpack(Buffer.concat(await Promise.all(manifest.parts.map(n=>{if(!/^encrypted-[a-f0-9]{16}-\d+\.bundle$/.test(n))throw Error('Invalid part');return fs.readFile(path.join(dir,n))}))));
const payload=structuredClone(original),names=['text.html','app.js','book-editor.js','book-editor.css'];
for(const name of names)payload.files[name]=(await fs.readFile(path.join(root,'books-cloud/viewer',name))).toString('base64');
for(const [name,data]of Object.entries(original.files))if(!names.includes(name)&&payload.files[name]!==data)throw Error('Unrelated asset changed');
const salt=randomBytes(16),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',pbkdf2Sync(secret,salt,600000,32,'sha256'),iv);
const encrypted=Buffer.concat([cipher.update(gzipSync(Buffer.from(JSON.stringify(payload)),{level:6})),cipher.final()]);
const bundle=Buffer.concat([Buffer.from('BOOKAPP1'),salt,iv,cipher.getAuthTag(),encrypted]);
if(JSON.stringify(unpack(bundle))!==JSON.stringify(payload))throw Error('Roundtrip failed');
const revision=createHash('sha256').update(bundle).digest('hex').slice(0,16),parts=[];
for(let offset=0;offset<bundle.length;offset+=20*1024*1024){const name=`encrypted-${revision}-${parts.length}.bundle`;await fs.writeFile(path.join(dir,name),bundle.subarray(offset,offset+20*1024*1024));parts.push(name)}
const next={...manifest,parts,bytes:bundle.length,sourceHash:createHash('sha256').update(JSON.stringify(payload)).update(secret).digest('hex')};
for(const name of ['public/books-study/encrypted-manifest.json','public/admin/books-study/encrypted-manifest.json'])await fs.writeFile(path.join(root,name),JSON.stringify(next));
console.log(JSON.stringify({beforeBytes:manifest.bytes,afterBytes:next.bytes,viewerFiles:names,bookFilesPreserved:true,lazyMappingPreserved:true,parts}));
