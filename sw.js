// Sayfaları telefona kaydeder, böylece internet yokken de açılır.
// Bir sayfayı değiştirdiğinizde aşağıdaki sürüm numarasını artırın.
const CACHE = 'tibbi-araclar-v19';
const FILES = ['./', 'index.html', 'egfr.html', 'af-skor.html', 'elektrolit.html', 'kreatinin-klerensi.html', 'child-pugh.html', 'wells-pe.html',
  'meld-na.html', 'curb-65.html', 'qsofa.html', 'glasgow-blatchford.html',
  'sodyum.html', 'osmolalite.html', 'vki.html', 'qtc.html', 'glasgow-koma.html', 'ortak.js',
  'prevent.html', 'heart-skoru.html', 'duke-kriterleri.html', 'ortalama-arter-basinci.html', 'r-faktor.html', 'fib-4.html', 'levotiroksin.html', 'stop-bang.html', 'nobet-listesi.html', 'diyabet-tedavi.html', 'insulin-dozu.html', 'bobrek-ilac-dozu.html', 'elektrolit-replasmani.html', 'ampirik-antibiyotik.html', 'nobet.webmanifest', 'icons/nobet-192.png', 'icons/nobet-512.png', 'icons/nobet-apple.png',
  'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const MATCH = { ignoreSearch: true, ignoreVary: true };

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Önce telefondaki kayıtlı kopyayı hemen açar, arka planda internetten günceller.
// Yalnız sorunsuz gelen yanıtlar kaydedilir; böylece hastane Wi-Fi giriş sayfası gibi
// yanlış bir sayfa kayıtlı kopyanın yerine geçmez.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, MATCH);
    const network = fetch(req).then(res => {
      if (res.ok && res.type === 'basic' && !res.redirected) cache.put(req, res.clone());
      return res;
    });
    if (cached) { e.waitUntil(network.catch(() => {})); return cached; }
    try { return await network; }
    catch (err) {
      if (req.mode === 'navigate') {
        const home = await cache.match('index.html', MATCH);
        if (home) return home;
      }
      throw err;
    }
  }));
});
