// Super Music Service Worker
const CACHE = 'supermusic-v1';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap'
];

// ── Install: cache app shell ──
self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())
  );
});

// ── Activate: clear old caches ──
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    ).then(()=>self.clients.claim())
  );
});

// ── Fetch: serve from cache first, then network ──
self.addEventListener('fetch', e=>{
  // Skip non-GET, chrome-extension, and blob: URLs
  if(e.request.method!=='GET') return;
  if(e.request.url.startsWith('blob:')) return;
  if(e.request.url.startsWith('chrome-extension:')) return;

  // For Google Fonts — network first, fallback to cache
  if(e.request.url.includes('fonts.g') || e.request.url.includes('fonts.googleapis')){
    e.respondWith(
      fetch(e.request).then(res=>{
        const clone = res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone));
        return res;
      }).catch(()=>caches.match(e.request))
    );
    return;
  }

  // For everything else — cache first
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached) return cached;
      return fetch(e.request).then(res=>{
        if(!res||res.status!==200||res.type==='opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone));
        return res;
      });
    })
  );
});

// ── Background sync / Media Session passthrough ──
self.addEventListener('message', e=>{
  if(e.data==='skipWaiting') self.skipWaiting();
});
