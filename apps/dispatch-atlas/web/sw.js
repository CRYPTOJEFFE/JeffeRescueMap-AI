/* Cache the application shell only. Never cache private APIs, feeds, or third-party map tiles. */
const CACHE='dispatch-atlas-shell-v1';
const SHELL=['./','./index.html','./styles.css','./core.js','./data.js','./map.js','./app.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('dispatch-atlas-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin||url.pathname.includes('/api/'))return;
 const allowed=SHELL.some(file=>new URL(file,self.registration.scope).pathname===url.pathname);
 if(!allowed)return;
 event.respondWith(fetch(event.request).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,clone))}return response}).catch(()=>caches.match(event.request).then(response=>response||Response.error())));
});
