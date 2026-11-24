// Offline support. Bump CACHE whenever you deploy a new version.
const CACHE = 'head-light-lab-v5';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'css/styles.css', 'js/app.js', 'js/sw-register.js',
  'assets/asaro-head.glb', 'icons/icon-180.png', 'icons/icon-512.png'];
// Each library: the copy bundled in lib/ first, the web copy as a fallback.
const LIBS = [
  ['lib/three.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'],
  ['lib/OrbitControls.js', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'],
  ['lib/GLTFLoader.js', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'],
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    for (const [local, remote] of LIBS) {
      for (const url of [local, remote]) {
        try { const r = await fetch(url); if (r.ok && r.type !== 'opaque') { await c.put(url, r); break; } } catch (err) { /* try the next source */ }
      }
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const hit = await caches.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(e.request); }
    catch (err) {
      if (e.request.mode === 'navigate') { const home = await caches.match('index.html'); if (home) return home; }
      throw err;
    }
  })());
});
