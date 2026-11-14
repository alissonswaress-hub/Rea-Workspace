/* Offline fallback. NUNCA cacheia respostas /api ou dados de analises. */
const CACHE='rea-hub-mobile-v1';
const ASSETS=['/offline.html','/icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin || url.pathname.startsWith('/api/'))return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).catch(async()=>{
      const cache=await caches.open(CACHE);
      return await cache.match('/offline.html') || Response.error();
    }));
  }
});
