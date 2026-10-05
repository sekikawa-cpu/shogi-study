const CACHE_NAME="books-private-v1";
self.addEventListener("install",event=>event.waitUntil(self.skipWaiting()));
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(url.origin===self.location.origin&&url.pathname.startsWith("/books-study/private/")){
    event.respondWith(caches.open(CACHE_NAME).then(cache=>cache.match(event.request)).then(hit=>hit||new Response("Authentication required",{status:403,headers:{"Content-Type":"text/plain;charset=utf-8","Cache-Control":"no-store"}})));
  }
});
self.addEventListener("message",event=>{
  if(event.data?.type==="CLEAR_PRIVATE_BOOKS") event.waitUntil(caches.delete(CACHE_NAME));
});
