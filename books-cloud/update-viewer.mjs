// Update generic viewer assets without rebuilding or replacing any book content.
import fs from'node:fs/promises';
import path from'node:path';
import{fileURLToPath}from'node:url';
import{createHash,createCipheriv,createDecipheriv,pbkdf2Sync,randomBytes}from'node:crypto';
import{gzipSync,gunzipSync}from'node:zlib';
import vm from'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dir=path.join(root,'public/books-study');
const manifest=JSON.parse(await fs.readFile(path.join(dir,'encrypted-manifest.json'),'utf8'));
const uid=(await fs.readFile('C:/Apps/書籍/book-app-owner-uid.txt','utf8')).trim();
const secret=createHash('sha256').update('book-app-v3:'+uid).digest('base64url');
function unpack(bytes){const cipher=createDecipheriv('aes-256-gcm',pbkdf2Sync(secret,bytes.subarray(8,24),600000,32,'sha256'),bytes.subarray(24,36));cipher.setAuthTag(bytes.subarray(36,52));return JSON.parse(gunzipSync(Buffer.concat([cipher.update(bytes.subarray(52)),cipher.final()])))}
const original=unpack(Buffer.concat(await Promise.all(manifest.parts.map(n=>{if(!/^encrypted-[a-f0-9]{16}-\d+\.bundle$/.test(n))throw Error('Invalid part');return fs.readFile(path.join(dir,n))}))));
const payload=structuredClone(original),names=['text.html','app.js','book-editor.js','book-editor.css','library.js','library.css','reader-position.js','grid-editor.js','grid-editor.css','comic-reading.js','comic-reading.css','comic-layouts.js'];
for(const name of names)payload.files[name]=(await fs.readFile(name==='comic-layouts.js'?'C:/Apps/書籍/webapp/comic-layouts.js':path.join(root,'books-cloud/viewer',name))).toString('base64');
const coverOption=process.argv.indexOf('--cover');
if(coverOption!==-1){
 const config=JSON.parse(await fs.readFile(process.argv[coverOption+1],'utf8'));
 if(!/^[a-zA-Z0-9_-]+$/.test(config.bookId)||!/^[a-zA-Z0-9_.-]+\.jpg$/.test(config.fileName))throw Error('Invalid cover destination');
 const script=Buffer.from(payload.files['books.js'],'base64').toString('utf8'),context={window:{}};vm.runInNewContext(script,context,{timeout:3000});
 const book=context.window.BOOKS.find(b=>b.id===config.bookId);if(!book||book.title!==config.title)throw Error('Cover title and book ID do not match');
 const image=await fs.readFile(config.source);if(image.length>10*1024*1024||image[0]!==255||image[1]!==216)throw Error('Invalid JPEG cover');
 const destination=`books/${config.bookId}/${config.fileName}`;
 payload.files[destination]=image.toString('base64');payload.files['books.js']=Buffer.from(script.replaceAll(book.cover,destination)).toString('base64');
 names.push(destination,'books.js');
 console.log(JSON.stringify({coverBookId:config.bookId,originalCoverRetained:true,newCover:destination}));
}
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
