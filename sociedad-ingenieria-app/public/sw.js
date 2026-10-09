const CACHE='sa-shell-v1';
const SHELL=['/offline.html','/sai-logo.png','/icons/icon-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/'))return;
  if(r.mode==='navigate'){e.respondWith(fetch(r).catch(()=>caches.match('/offline.html')));return}
  if(SHELL.includes(u.pathname)||u.pathname.startsWith('/_next/static/')){e.respondWith(caches.match(r).then(c=>c||fetch(r).then(res=>{const copy=res.clone();caches.open(CACHE).then(x=>x.put(r,copy));return res})))}
});
