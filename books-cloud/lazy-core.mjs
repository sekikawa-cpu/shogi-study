import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

// Keep registry covers in the initial library; load each book only when opened.
export async function splitCore(payload, books, directory, pass, pack, forceIds=[]) {
  const context={window:{}};
  vm.runInNewContext(Buffer.from(payload.files['books.js'],'base64').toString(),context,{timeout:3000});
  const covers=new Set(context.window.BOOKS.map(b=>b.cover));
  const files={...payload.files}, groups=new Map(), mapping={...books}, generated=[];
  for(const [name,data] of Object.entries(files)) {
    const match=name.match(/^books\/([^/]+)\//);
    if(!match||covers.has(name)||(mapping[match[1]]&&!forceIds.includes(match[1])))continue;
    if(!groups.has(match[1]))groups.set(match[1],{});
    groups.get(match[1])[name]=data;delete files[name];
  }
  for(const [id,assets] of groups) {
    const bundle=pack({version:1,files:assets},pass);
    const hash=createHash('sha256').update(bundle).digest('hex'), parts=[];
    for(let offset=0;offset<bundle.length;offset+=20*1024*1024) {
      const name=`encrypted-${hash.slice(0,16)}-${parts.length}.bundle`;
      await fs.writeFile(path.join(directory,name),bundle.subarray(offset,offset+20*1024*1024));parts.push(name);generated.push(name);
    }
    const name=`encrypted-${hash.slice(0,16)}-manifest.json`;
    await fs.writeFile(path.join(directory,name),JSON.stringify({version:2,bytes:bundle.length,parts,sourceHash:hash}));
    mapping[id]=name;generated.push(name);
  }
  return {payload:{...payload,files},books:mapping,generated};
}
