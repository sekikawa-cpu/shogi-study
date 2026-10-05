const CACHE_NAME="books-private-v3";
self.addEventListener("install",event=>event.waitUntil(self.skipWaiting()));
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  const privatePath=new URL("private/",self.registration.scope).pathname;
  if(url.origin===self.location.origin&&url.pathname.startsWith(privatePath)){
    event.respondWith(caches.open(CACHE_NAME).then(cache=>cache.match(event.request,{ignoreSearch:true})).then(hit=>hit||new Response("Authentication required",{status:403,headers:{"Content-Type":"text/plain;charset=utf-8","Cache-Control":"no-store"}})));
  }
});
self.addEventListener("message",event=>{
  if(event.data?.type==="CLEAR_PRIVATE_BOOKS") event.waitUntil(Promise.all([caches.delete("books-private-v1"),caches.delete("books-private-v2"),caches.delete(CACHE_NAME)]));
});
