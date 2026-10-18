// Sayfaları telefona kaydeder, böylece internet yokken de açılır.
// Bir sayfayı değiştirdiğinizde aşağıdaki sürüm numarasını artırın.
const CACHE = 'tibbi-araclar-v5';
const FILES = ['./', 'index.html', 'egfr.html', 'af-skor.html', 'elektrolit.html', 'kreatinin-klerensi.html', 'child-pugh.html', 'wells-pe.html',
  'meld-na.html', 'curb-65.html', 'qsofa.html', 'glasgow-blatchford.html',
  'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Önce internetten güncel hâlini dener, olmazsa kayıtlı kopyayı açar.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
