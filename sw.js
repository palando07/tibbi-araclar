// Sayfaları telefona kaydeder, böylece internet yokken de açılır.
// Bir sayfayı değiştirdiğinizde aşağıdaki sürüm numarasını artırın.
const CACHE = 'tibbi-araclar-v62';
const FILES = ['./', 'index.html', 'egfr.html', 'af-skor.html', 'elektrolit.html', 'kreatinin-klerensi.html', 'child-pugh.html', 'wells-pe.html',
  'meld-na.html', 'curb-65.html', 'qsofa.html', 'glasgow-blatchford.html',
  'sodyum.html', 'osmolalite.html', 'vki.html', 'qtc.html', 'glasgow-koma.html', 'ortak.js',
  'prevent.html', 'heart-skoru.html', 'duke-kriterleri.html', 'ortalama-arter-basinci.html', 'r-faktor.html', 'fib-4.html', 'levotiroksin.html', 'stop-bang.html', 'nobet-listesi.html', 'diyabet-tedavi.html', 'insulin-dozu.html', 'bobrek-ilac-dozu.html', 'elektrolit-replasmani.html', 'ampirik-antibiyotik.html', 'kan-gazi.html', 'acil-tedavi.html', 'infuzyon-hizi.html', 'steroid-esdegeri.html', 'pankreatit.html', 'opioid-donusumu.html', 'vte-profilaksisi.html', 'antikoagulan-kesme.html', 'varfarin-inr.html', 'iv-demir.html', 'news2.html', 'hakkinda.html', 'tiroid-testi.html', 'siroz-asit.html', 'hipertansif-acil.html', 'akut-bobrek-hasari.html', 'anemi.html', 'hiponatremi-tani.html', 'alkol-yoksunlugu.html', 'hepatik-ensefalopati.html', 'beslenme.html', 'birim-cevirici.html', 'idame-sivi.html', 'pesi.html', 'hit-4t.html', 'rcri.html', 'ust-gis-kanama.html', 'sepsis-sivi.html', 'koah-astim.html', 'tiroid-krizi.html', 'transfuzyon.html', 'light-kriterleri.html', 'delirium-4at.html', 'febril-notropeni.html', 'parasetamol-zehirlenmesi.html', 'kontrast-nefropati.html', 'ilac-etkilesimi.html', 'trombositopeni.html', 'hipokalemi.html', 'normal-degerler.html', 'kalp-yetersizligi.html', 'lipid-tedavisi.html', 'dka-hhs.html', 'nobet.webmanifest', 'icons/nobet-192.png', 'icons/nobet-512.png', 'icons/nobet-apple.png', 'lib/qrcode.js', 'lib/jsQR.js',
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
