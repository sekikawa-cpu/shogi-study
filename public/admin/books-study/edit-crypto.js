export const encode64=bytes=>{let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text)};
export const decode64=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
export async function seal(value,key,aad){
 const plain=new TextEncoder().encode(JSON.stringify(value));
 if(plain.length>8*1024*1024)throw Error('画像・本文が大きすぎます。画像を小さくして保存してください。');
 const compressed=await new Response(new Blob([plain]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
 if(compressed.byteLength>5*1024*1024)throw Error('画像が大きすぎます。画像を小さくして保存してください。');
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(aad)},key,compressed);
 return {iv:encode64(iv),cipher:encode64(new Uint8Array(cipher))};
}
export async function unseal(value,key,aad){
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode64(value.iv),additionalData:new TextEncoder().encode(aad)},key,decode64(value.cipher));
 const json=await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
 return JSON.parse(json);
}
