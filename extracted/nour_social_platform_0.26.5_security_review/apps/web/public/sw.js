/* Nūr PWA: cache public shell only; never cache API/account responses. */
const CACHE_NAME="nour-shell-v1"; const SHELL=["/","/offline","/nour-mark.svg","/icons/nour-192.png","/icons/nour-512.png"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("nour-shell-")&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{const request=event.request;const url=new URL(request.url);if(request.method!=="GET"||url.origin!==self.location.origin||url.pathname.startsWith("/api")||url.pathname.startsWith("/account")||url.pathname.startsWith("/_next/")||url.search)return;if(request.mode==="navigate"){event.respondWith(fetch(request).then(response=>{if(response.ok&&url.pathname==="/"){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put("/",copy));}return response;}).catch(async()=>await caches.match(request)||await caches.match("/offline")));return;}if(SHELL.includes(url.pathname)||url.pathname.startsWith("/icons/"))event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));});

self.addEventListener('push', event => {
  let data = { title: 'نُور', body: '', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'نُور', {
      body: data.body || '',
      icon: '/icons/nour-192.png',
      badge: '/icons/nour-192.png',
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(clients.openWindow(url));
});
