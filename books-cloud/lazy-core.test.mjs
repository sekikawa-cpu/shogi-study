import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {splitCore} from './lazy-core.mjs';
test('library keeps covers and shared files; book content moves losslessly',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'books-lazy-'));
  try{
    const files={'books.js':Buffer.from('window.BOOKS=[{id:"one",cover:"books/one/cover.png"}]').toString('base64'),'index.html':'index','books/one/cover.png':'cover','books/one/nav.js':'nav','books/one/figure.png':'figure'};
    const payload={version:1,files};
    const result=await splitCore(payload,{old:'encrypted-0000000000000000-manifest.json'},dir,'test',value=>Buffer.from(JSON.stringify(value)));
    assert.equal(payload.files['books/one/nav.js'],'nav');
    assert.equal(result.payload.files['books/one/cover.png'],'cover');
    assert.equal(result.payload.files['books/one/nav.js'],undefined);
    assert.equal(result.books.old,'encrypted-0000000000000000-manifest.json');
    const manifest=JSON.parse(await fs.readFile(path.join(dir,result.books.one)));
    const restored=JSON.parse(Buffer.concat(await Promise.all(manifest.parts.map(n=>fs.readFile(path.join(dir,n))))));
    assert.deepEqual({...result.payload.files,...restored.files},files);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
