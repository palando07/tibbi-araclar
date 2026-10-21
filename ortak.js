// Tüm sayfalarda ortak: sonuç kartlarına "Kopyala" düğmesi, örnek değer uyarısı ve araçlar arası hasta değerleri; çevrimdışı çalışmayı başlatır.
(function(){
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');


  // Yazı boyutu: menüdeki ayar (localStorage 'vizit-yazi') her sayfada uygulanır.
  try {
    var yb = parseFloat(localStorage.getItem('vizit-yazi'));
    if (yb > 1 && yb < 1.5) {
      document.documentElement.style.fontSize = (16 * yb) + 'px';
      var cssY = document.createElement('style'); cssY.textContent = 'body{font-size:1rem!important}.sub>b,.sub>span{white-space:normal;min-width:0;overflow-wrap:anywhere}.sub>b{text-align:right}li,small{overflow-wrap:anywhere}'; document.head.appendChild(cssY);
    }
  } catch (e) {}
  var css = document.createElement('style');
  css.textContent = '.copy{align-self:flex-start;border:1px solid var(--line);background:var(--bg);color:var(--accent);' +
    'font:600 .9rem var(--font-body);padding:8px 16px;border-radius:999px;cursor:pointer}' +
    '.copy:focus-visible{outline:3px solid var(--accent);outline-offset:2px}' +
    '.field label.item{font:inherit;letter-spacing:normal;color:inherit;text-transform:none}';
  document.head.appendChild(css);

  function txt(el){ return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function shown(el){ return !el.closest('[hidden]') && txt(el) !== ''; }

  // Kartta görünen sonucu tek satırlık düz metne çevirir.
  function summary(card){
    var lines = [];
    var title = card.querySelector('h2') || card.querySelector('.lbl');
    var head = [];
    card.querySelectorAll('.res, .big').forEach(function(r){
      var parts = Array.prototype.filter.call(r.querySelectorAll('.num, .unit, .of, .pill'), shown).map(txt);
      if (parts.length) head.push(parts.join(' '));
    });
    card.querySelectorAll('.pill').forEach(function(p){
      if (shown(p) && !p.closest('.res, .big') && head.indexOf(txt(p)) < 0) head.push(txt(p));
    });
    lines.push(txt(title) + (head.length ? ': ' + head.join(' · ') : ''));
    card.querySelectorAll('.sub').forEach(function(s){
      if (!shown(s)) return;
      var c = s.children;
      lines.push(c.length >= 2 ? txt(c[0]) + ': ' + txt(c[c.length - 1]) : txt(s));
    });
    card.querySelectorAll('table.t tbody tr').forEach(function(tr){
      var c = tr.cells, h = tr.closest('table').querySelectorAll('thead th');
      lines.push(txt(c[0]) + ': ' + Array.prototype.slice.call(c, 1).map(function(td, i){ return (h[i + 1] ? txt(h[i + 1]) + ' ' : '') + txt(td); }).join(', '));
    });
    Array.prototype.filter.call(card.querySelectorAll('ol li, ul li'), function(li){ return !li.closest('[hidden]'); }).forEach(function(li, i){
      var b = li.querySelector('b'), a = li.querySelector('.advice');
      lines.push((i + 1) + '. ' + (b ? txt(b) + (a ? ': ' + txt(a) : '') : txt(li)));
    });
    card.querySelectorAll('.advice, .stage-text').forEach(function(a){ if (shown(a) && !a.closest('li')) lines.push(txt(a)); });
    return lines.join('\n');
  }

  function copy(text, btn){
    function done(){ btn.textContent = 'Kopyalandı ✓'; setTimeout(function(){ btn.textContent = 'Kopyala'; }, 1600); }
    function fallback(){
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  document.querySelectorAll('section.card[aria-live]').forEach(function(card){
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'copy'; btn.textContent = 'Kopyala';
    btn.setAttribute('aria-label', 'Sonucu kopyala');
    btn.addEventListener('click', function(){ copy(summary(card), btn); });
    var before = card.querySelector('.note, .f, .warnbox');
    card.insertBefore(btn, before);
  });

  // Hasta değerleri: [data-hasta] alanlarına elle girilen değerler araçlar arasında taşınır.
  // Yalnız bu oturumda (sessionStorage) ve 30 dakika hareketsizlikte silinir; kimlik bilgisi tutulmaz.
  var HK = 'vizit-hasta', SURE = 30 * 60 * 1000;
  var AD = {yas:'Yaş', kilo:'Kilo', boy:'Boy', kreatinin:'Kreatinin', egfr:'eGFR', na:'Na', k:'K', glukoz:'Glukoz', ure:'Üre',
    hb:'Hb', alb:'Albümin', bil:'Bilirubin', inr:'INR', plt:'Trombosit', ca:'Ca', sbp:'Sistolik', dbp:'Diyastolik', nabiz:'Nabız'};
  function oku(){ try { var o = JSON.parse(sessionStorage.getItem(HK)); if (o && Date.now() - o.t < SURE) return o.v || {}; sessionStorage.removeItem(HK); } catch (e) {} return {}; }
  function yaz(v){ try { if (Object.keys(v).length) sessionStorage.setItem(HK, JSON.stringify({t: Date.now(), v: v})); else sessionStorage.removeItem(HK); } catch (e) {} }
  function gecerli(el){ var k = el.getAttribute('data-hasta-kosul'); return !k || !!document.querySelector(k); }
  function tetikle(el){ el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }

  var girdiler = Array.prototype.filter.call(document.querySelectorAll('input'), function(i){
    return /^(number|text)$/.test(i.type) && !i.closest('header') && i.type !== 'search';
  });
  var ilkGirdi = girdiler[0] || document.querySelector('[data-hasta-cins]');
  var ilkKart = ilkGirdi ? ilkGirdi.closest('section, .card, form') : null;
  if (ilkKart && !document.body.hasAttribute('data-ornek-yok')) {
    var css2 = document.createElement('style');
    css2.textContent = '.ornek{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;background:var(--surface);border:1px dashed var(--accent);' +
      'border-radius:12px;padding:10px 14px;font-size:.9rem;color:var(--fg)}.ornek span{flex:1 1 200px;min-width:0}' +
      '.ornek button{border:1px solid var(--accent);background:var(--accent);color:#fff;font:600 .88rem var(--font-body);padding:7px 14px;border-radius:999px;cursor:pointer}' +
      '.ornek button:focus-visible{outline:3px solid var(--accent);outline-offset:2px}';
    document.head.appendChild(css2);

    var kayit = oku(), kullanilan = [];
    document.querySelectorAll('input[data-hasta]').forEach(function(el){
      var a = el.getAttribute('data-hasta');
      if (kayit[a] != null && gecerli(el)) { el.value = kayit[a]; kullanilan.push(AD[a] + ' ' + String(kayit[a]).replace('.', ',')); tetikle(el); }
    });
    if (kayit.cins) {
      var cinsEl = Array.prototype.filter.call(document.querySelectorAll('[data-hasta-cins]'), gecerli), uyg = false;
      var gruplar = [];
      cinsEl.forEach(function(b){
        if (b.tagName !== 'BUTTON') return;
        var g = gruplar.filter(function(x){ return x.ust === b.parentNode; })[0];
        if (!g) gruplar.push(g = {ust: b.parentNode, bs: []});
        g.bs.push(b);
      });
      gruplar.forEach(function(g){
        var bs = g.bs, basili = bs.filter(function(b){ return b.getAttribute('aria-pressed') === 'true'; })[0];
        if (basili && basili.getAttribute('data-hasta-cins') === kayit.cins) { uyg = true; return; }
        var hedef = bs.filter(function(b){ return b.getAttribute('data-hasta-cins') === kayit.cins; })[0];
        if (hedef) { hedef.click(); uyg = true; }
      });
      cinsEl.forEach(function(c){ if (c.type === 'checkbox') { var on = kayit.cins === c.getAttribute('data-hasta-cins'); if (c.checked !== on) { c.checked = on; tetikle(c); } uyg = true; } });
      if (uyg) kullanilan.unshift(kayit.cins === 'm' ? 'Erkek' : 'Kadın');
    }
    if (kullanilan.length) yaz(kayit);

    var bant = document.createElement('div'); bant.className = 'ornek'; bant.setAttribute('role', 'status');
    var yazi = document.createElement('span'), dug = document.createElement('button'); dug.type = 'button';
    if (kullanilan.length) {
      yazi.textContent = 'Önceki araçtan alınan değerler: ' + kullanilan.join(' · ') + '. Diğer alanlarda örnek değerler var.';
      dug.textContent = 'Yeni hasta';
    } else {
      yazi.textContent = 'Örnek değerlerle açıldı. Kendi hastanızın değerlerini girin.';
      dug.textContent = 'Temizle';
    }
    dug.addEventListener('click', function(){
      yaz({});
      girdiler.forEach(function(el){ if (el.value !== '') { el.value = ''; tetikle(el); } });
      document.querySelectorAll('input[type=checkbox]').forEach(function(el){ if (el.checked && !el.closest('header')) { el.checked = false; tetikle(el); } });
      bant.remove();
      if (girdiler[0]) girdiler[0].focus();
    });
    bant.appendChild(yazi); bant.appendChild(dug);
    ilkKart.parentNode.insertBefore(bant, ilkKart);

    function cinsKaydet(deger){ var v = oku(); v.cins = deger; yaz(v); }
    document.addEventListener('click', function(e){
      if (!e.isTrusted) return;
      var b = e.target.closest && e.target.closest('button[data-hasta-cins]');
      if (b && gecerli(b)) cinsKaydet(b.getAttribute('data-hasta-cins'));
    });
    document.addEventListener('change', function(e){
      var c = e.target;
      if (e.isTrusted && c.type === 'checkbox' && c.hasAttribute('data-hasta-cins')) cinsKaydet(c.checked ? c.getAttribute('data-hasta-cins') : (c.getAttribute('data-hasta-cins') === 'm' ? 'f' : 'm'));
    });
    document.addEventListener('input', function(e){
      if (!e.isTrusted) return;
      var el = e.target;
      if (el.matches && el.matches('input[data-hasta]') && gecerli(el)) {
        var v = oku(), a = el.getAttribute('data-hasta');
        if (el.value === '') delete v[a]; else v[a] = el.value;
        yaz(v);
      }
      if (!kullanilan.length && bant.parentNode) bant.remove();
    });
  }

  // İlgili araçlar: sayfanın altına klinik olarak bağlantılı araçlara kısayol ekler.
  var AN = {'egfr':'eGFR','akut-bobrek-hasari':'Akut böbrek hasarı','kreatinin-klerensi':'Kreatinin klerensi','bobrek-ilac-dozu':'Böbrekte ilaç dozu',
    'elektrolit':'Elektrolit hesaplamaları','elektrolit-replasmani':'Elektrolit replasmanı','kan-gazi':'Kan gazı yorumu','hiponatremi-tani':'Hiponatremi tanısı',
    'sodyum':'Sodyum ve sıvı açığı','osmolalite':'Serum osmolalitesi','af-skor':'AF risk skorları','qtc':'Düzeltilmiş QT','wells-pe':'Wells skoru (PE)',
    'vte-profilaksisi':'VTE profilaksisi','antikoagulan-kesme':'Antikoagülan kesme','varfarin-inr':'Varfarin ve INR','prevent':'PREVENT','heart-skoru':'HEART skoru',
    'duke-kriterleri':'Duke kriterleri','ortalama-arter-basinci':'Ortalama arter basıncı','siroz-asit':'Siroz ve asit','child-pugh':'Child-Pugh','meld-na':'MELD-Na',
    'glasgow-blatchford':'Glasgow-Blatchford','pankreatit':'Pankreatit skorları','r-faktor':'R faktör','fib-4':'FIB-4','acil-tedavi':'Acil tedavi rehberi',
    'hipertansif-acil':'Hipertansif acil','infuzyon-hizi':'İnfüzyon hızı','ampirik-antibiyotik':'Ampirik antibiyotik','curb-65':'CURB-65','news2':'NEWS2',
    'qsofa':'qSOFA','glasgow-koma':'Glasgow Koma Skalası','anemi':'Anemi yaklaşımı','diyabet-tedavi':'Tip 2 diyabet tedavisi','insulin-dozu':'İnsülin dozu',
    'steroid-esdegeri':'Steroid eşdeğeri','opioid-donusumu':'Opioid dönüşümü','iv-demir':'IV demir dozu','vki':'VKİ ve VYA','tiroid-testi':'Tiroid testi yorumu',
    'levotiroksin':'Levotiroksin dozu','stop-bang':'STOP-BANG'};
  var IL = {
    'egfr':['kreatinin-klerensi','bobrek-ilac-dozu','akut-bobrek-hasari','elektrolit-replasmani'],
    'kreatinin-klerensi':['bobrek-ilac-dozu','egfr','antikoagulan-kesme','akut-bobrek-hasari'],
    'bobrek-ilac-dozu':['kreatinin-klerensi','egfr','akut-bobrek-hasari','ampirik-antibiyotik'],
    'akut-bobrek-hasari':['bobrek-ilac-dozu','elektrolit-replasmani','kan-gazi','acil-tedavi'],
    'elektrolit':['kan-gazi','osmolalite','elektrolit-replasmani','hiponatremi-tani'],
    'elektrolit-replasmani':['elektrolit','acil-tedavi','infuzyon-hizi','egfr'],
    'kan-gazi':['elektrolit','osmolalite','akut-bobrek-hasari','acil-tedavi'],
    'hiponatremi-tani':['sodyum','osmolalite','acil-tedavi','tiroid-testi'],
    'sodyum':['hiponatremi-tani','acil-tedavi','osmolalite','elektrolit'],
    'osmolalite':['hiponatremi-tani','elektrolit','kan-gazi','sodyum'],
    'af-skor':['antikoagulan-kesme','kreatinin-klerensi','bobrek-ilac-dozu','varfarin-inr'],
    'qtc':['elektrolit-replasmani','elektrolit','af-skor'],
    'wells-pe':['vte-profilaksisi','antikoagulan-kesme','heart-skoru','news2'],
    'vte-profilaksisi':['wells-pe','kreatinin-klerensi','antikoagulan-kesme','vki'],
    'antikoagulan-kesme':['varfarin-inr','kreatinin-klerensi','af-skor','bobrek-ilac-dozu'],
    'varfarin-inr':['antikoagulan-kesme','af-skor','glasgow-blatchford'],
    'prevent':['diyabet-tedavi','egfr','vki','ortalama-arter-basinci'],
    'heart-skoru':['wells-pe','af-skor','qtc','prevent'],
    'duke-kriterleri':['ampirik-antibiyotik','qsofa','news2'],
    'ortalama-arter-basinci':['hipertansif-acil','news2','infuzyon-hizi','qsofa'],
    'siroz-asit':['child-pugh','meld-na','glasgow-blatchford','hiponatremi-tani'],
    'child-pugh':['meld-na','siroz-asit','fib-4','bobrek-ilac-dozu'],
    'meld-na':['child-pugh','siroz-asit','fib-4'],
    'glasgow-blatchford':['anemi','antikoagulan-kesme','child-pugh','varfarin-inr'],
    'pankreatit':['news2','elektrolit-replasmani','r-faktor','kan-gazi'],
    'r-faktor':['fib-4','child-pugh','pankreatit'],
    'fib-4':['child-pugh','meld-na','r-faktor','siroz-asit'],
    'acil-tedavi':['elektrolit-replasmani','infuzyon-hizi','insulin-dozu','kan-gazi'],
    'hipertansif-acil':['ortalama-arter-basinci','infuzyon-hizi','acil-tedavi','glasgow-koma'],
    'infuzyon-hizi':['acil-tedavi','hipertansif-acil','elektrolit-replasmani','opioid-donusumu'],
    'ampirik-antibiyotik':['bobrek-ilac-dozu','curb-65','qsofa','news2'],
    'curb-65':['ampirik-antibiyotik','news2','qsofa'],
    'news2':['qsofa','curb-65','ampirik-antibiyotik','glasgow-koma'],
    'qsofa':['news2','ampirik-antibiyotik','ortalama-arter-basinci','kan-gazi'],
    'glasgow-koma':['news2','hipertansif-acil','acil-tedavi'],
    'anemi':['iv-demir','glasgow-blatchford','egfr'],
    'diyabet-tedavi':['insulin-dozu','egfr','prevent','vki'],
    'insulin-dozu':['diyabet-tedavi','steroid-esdegeri','acil-tedavi','egfr'],
    'steroid-esdegeri':['insulin-dozu','acil-tedavi'],
    'opioid-donusumu':['infuzyon-hizi','bobrek-ilac-dozu'],
    'iv-demir':['anemi','egfr'],
    'vki':['kreatinin-klerensi','stop-bang','prevent','diyabet-tedavi'],
    'tiroid-testi':['levotiroksin','hiponatremi-tani','anemi'],
    'levotiroksin':['tiroid-testi','vki'],
    'stop-bang':['vki','prevent']
  };
  var bu = (location.pathname.split('/').pop() || '').replace('.html', '');
  if (IL[bu]) {
    var css3 = document.createElement('style');
    css3.textContent = '.ilgili{display:flex;flex-direction:column;gap:8px}.ilgili h2{margin:8px 0 0;font:700 .78rem var(--font-body);text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}' +
      '.ilgili div{display:flex;flex-wrap:wrap;gap:8px}.ilgili a{border:1px solid var(--line);background:var(--surface);color:var(--accent);' +
      'text-decoration:none;font:600 .9rem var(--font-body);padding:8px 14px;border-radius:999px}.ilgili a:focus-visible{outline:3px solid var(--accent);outline-offset:2px}';
    document.head.appendChild(css3);
    var kartlar = document.querySelectorAll('section.card, .card');
    var son = kartlar[kartlar.length - 1];
    if (son) {
      var il = document.createElement('nav'); il.className = 'ilgili'; il.setAttribute('aria-label', 'İlgili araçlar');
      var h = document.createElement('h2'); h.textContent = 'İlgili araçlar'; il.appendChild(h);
      var d = document.createElement('div');
      IL[bu].forEach(function(k){ var a = document.createElement('a'); a.href = k + '.html'; a.textContent = AN[k]; d.appendChild(a); });
      il.appendChild(d);
      son.parentNode.insertBefore(il, son.nextSibling);
    }
  }

  // Sonuca git: sonuç kartı ekranda değilken altta küçük bir düğme gösterir.
  var sonuc = document.querySelector('section.card[aria-live]');
  if (sonuc && 'IntersectionObserver' in window) {
    var cssJ = document.createElement('style');
    cssJ.textContent = '.sonuca{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:20;' +
      'border:0;background:var(--accent);color:#fff;font:600 .95rem var(--font-body);padding:11px 18px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer}' +
      '.sonuca:focus-visible{outline:3px solid var(--fg);outline-offset:2px}';
    document.head.appendChild(cssJ);
    var git = document.createElement('button'); git.type = 'button'; git.className = 'sonuca'; git.textContent = 'Sonuç ↓'; git.hidden = true;
    git.setAttribute('aria-label', 'Sonuca git');
    git.addEventListener('click', function(){ sonuc.scrollIntoView({behavior: 'smooth', block: 'start'}); });
    document.body.appendChild(git);
    new IntersectionObserver(function(es){
      var e = es[0];
      git.hidden = e.isIntersecting || e.boundingClientRect.top < 0;
    }, {threshold: 0}).observe(sonuc);
  }

  // Geri bağlantısında küçük nabız işareti (logo ile uyumlu)
  document.querySelectorAll('a.back').forEach(function(a){
    if (a.textContent.trim() !== '← Vizit') return;
    a.innerHTML = '← <svg viewBox="0 0 44 26" aria-hidden="true" style="width:22px;height:13px;vertical-align:-1px;margin:0 3px 0 2px"><polyline points="2,14 11,14 14,9 19,23 25,3 28,14 42,14" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>Vizit';
  });
})();
