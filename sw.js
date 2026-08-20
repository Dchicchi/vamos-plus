const CACHE = 'vamos-phase10-10-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './offline.html'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(APP_SHELL.map(x => x + (x.includes('?') ? '&' : '?') + 'v=1010'))
        .catch(() => Promise.resolve())
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if(event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  // Navigation: always network first and bypass HTTP cache.
  if(req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, {cache:'no-store'});
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone()).catch(()=>{});
        return fresh;
      } catch (e) {
        return (await caches.match('./index.html')) || (await caches.match('./offline.html'));
      }
    })());
    return;
  }

  // Same-origin assets: stale-while-revalidate.
  if(url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      const freshPromise = fetch(req, {cache:'no-store'}).then(async res => {
        if(res && res.ok){
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone()).catch(()=>{});
        }
        return res;
      }).catch(()=>null);

      return cached || (await freshPromise) || Response.error();
    })());
  }
});
