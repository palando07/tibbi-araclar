// Tüm sayfalarda ortak: sonuç kartlarına "Kopyala" düğmesi, örnek değer uyarısı ve araçlar arası hasta değerleri; çevrimdışı çalışmayı başlatır.
(function(){
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

  var buSayfa = (location.pathname.split('/').pop() || '').replace('.html', '');
  if (buSayfa !== 'nobet-listesi') {
  // 1) Tema: 'vizit-tema' = oto | acik | koyu. Sayfadaki @media (prefers-color-scheme: dark) kurallarını açar/kapatır.
    var tema = 'oto'; try { tema = localStorage.getItem('vizit-tema') || 'oto'; } catch (e) {}
    function uygula(t){
      Array.prototype.forEach.call(document.styleSheets, function(ss){
        var rules; try { rules = ss.cssRules; } catch (e) { return; }
        Array.prototype.forEach.call(rules, function(r){
          if (r.type !== 4) return;
          if (!r._asil) r._asil = r.media.mediaText;
          if (!/prefers-color-scheme:\s*dark/.test(r._asil)) return;
          r.media.mediaText = t === 'koyu' ? 'all' : t === 'acik' ? 'not all' : r._asil;
        });
      });
      var m = document.querySelector('meta[name=color-scheme]');
      document.documentElement.style.colorScheme = t === 'koyu' ? 'dark' : t === 'acik' ? 'light' : '';
    }
    uygula(tema);
    window.vizitTema = function(t){ tema = t; try { localStorage.setItem('vizit-tema', t); } catch (e) {} uygula(t); };

  }


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
    '.copy:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.cbtns{display:flex;flex-wrap:wrap;gap:8px}' +
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

  // Vizit notu: "Nota ekle" sonucun ilk satırını aynı hastanın notuna ekler (menüdeki Hasta kartında toplanır).
  // Hasta değerleriyle aynı kurallar: yalnız bu oturumda, 30 dakika işlem yapılmazsa silinir.
  var NK = 'vizit-not', bu = (location.pathname.split('/').pop() || '').replace('.html', '');
  function notOku(){ try { var o = JSON.parse(sessionStorage.getItem(NK)); if (o && Date.now() - o.t < 30 * 60 * 1000) return o.v || []; sessionStorage.removeItem(NK); } catch (e) {} return []; }
  // Not yazılınca hasta değerlerinin süresi de yenilenir; ikisi birlikte silinir.
  function notYaz(v){ try { if (v.length) sessionStorage.setItem(NK, JSON.stringify({t: Date.now(), v: v})); else sessionStorage.removeItem(NK);
    var h = JSON.parse(sessionStorage.getItem('vizit-hasta')); if (h && v.length) { h.t = Date.now(); sessionStorage.setItem('vizit-hasta', JSON.stringify(h)); } } catch (e) {} }
  // Bu sayfada kullanıcı bir değer girdi ya da seçim yaptı mı? Yapmadıysa sonuç örnek değerlerden gelir.
  var dokunuldu = false;
  function disButon(t){ return t.closest && t.closest('.cbtns, .gb, .ornek, .sonuca, .ilgili, .icindekiler, .hpanel, header, a.back, details > summary'); }
  ['input', 'change'].forEach(function(ev){ document.addEventListener(ev, function(e){ if (e.isTrusted && !disButon(e.target)) dokunuldu = true; }, true); });
  document.addEventListener('click', function(e){ if (e.isTrusted && e.target.closest && e.target.closest('button, label, input') && !disButon(e.target)) dokunuldu = true; }, true);
  function notEkle(card, btn){
    if (!dokunuldu && btn.getAttribute('data-uyari') !== '1') {
      btn.setAttribute('data-uyari', '1'); btn.textContent = 'Örnek değerler! Yine de ekle';
      setTimeout(function(){ btn.removeAttribute('data-uyari'); btn.textContent = 'Nota ekle'; }, 4000);
      return;
    }
    btn.removeAttribute('data-uyari');
    var sl = summary(card).split('\n'), satir = sl[0], ad = AN[bu], kartNo = Array.prototype.indexOf.call(document.querySelectorAll('section.card[aria-live]'), card);
    if (satir.indexOf(': ') < 0) {
      var ek = sl.slice(1).filter(function(x){ return /\d/.test(x); }).slice(0, 3);
      if (!ek.length) { btn.textContent = 'Sonuç yok'; setTimeout(function(){ btn.textContent = 'Nota ekle'; }, 1800); return; }
      satir += ': ' + ek.join(' · ');
    }
    if (ad && satir.toLocaleLowerCase('tr').indexOf(ad.split(' ')[0].toLocaleLowerCase('tr')) < 0) {
      var ik = satir.indexOf(': ');
      satir = ik > 0 && /^(Yorum|Sınıflama|Sonuç|Yapılacaklar|Tahmini GFR)$/.test(satir.slice(0, ik)) ? ad + satir.slice(ik) : ad + ' · ' + satir;
    }
    var v = notOku().filter(function(n){ return !(n.k === bu && n.c === kartNo); });
    v.push({k: bu, c: kartNo, s: satir}); if (v.length > 30) v.shift();
    notYaz(v);
    btn.textContent = 'Notta ✓ (' + v.length + ')';
    setTimeout(function(){ btn.textContent = 'Nota ekle'; }, 1800);
  }

  document.querySelectorAll('section.card[aria-live]').forEach(function(card){
    var sira = document.createElement('div'); sira.className = 'cbtns';
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'copy'; btn.textContent = 'Kopyala';
    btn.setAttribute('aria-label', 'Sonucu kopyala');
    btn.addEventListener('click', function(){ copy(summary(card), btn); });
    var nb = document.createElement('button');
    nb.type = 'button'; nb.className = 'copy'; nb.textContent = 'Nota ekle';
    nb.setAttribute('aria-label', 'Sonucu hasta notuna ekle');
    nb.addEventListener('click', function(){ notEkle(card, nb); });
    sira.appendChild(btn); sira.appendChild(nb);
    var before = card.querySelector('.note, .f, .warnbox');
    card.insertBefore(sira, before);
  });

  // Hasta değerleri: [data-hasta] alanlarına elle girilen değerler araçlar arasında taşınır.
  // Yalnız bu oturumda (sessionStorage) ve 30 dakika hareketsizlikte silinir; kimlik bilgisi tutulmaz.
  var HK = 'vizit-hasta', SURE = 30 * 60 * 1000;
  var AD = {yas:'Yaş', kilo:'Kilo', boy:'Boy', kreatinin:'Kreatinin', egfr:'eGFR', na:'Na', k:'K', glukoz:'Glukoz', ure:'Üre',
    hb:'Hb', alb:'Albümin', bil:'Bilirubin', inr:'INR', plt:'Trombosit', ca:'Ca', sbp:'Sistolik', dbp:'Diyastolik', nabiz:'Nabız'};
  function oku(){ try { var o = JSON.parse(sessionStorage.getItem(HK)); if (o && Date.now() - o.t < SURE) return o.v || {}; sessionStorage.removeItem(HK); } catch (e) {} return {}; }
  function yaz(v){ try { if (Object.keys(v).length) sessionStorage.setItem(HK, JSON.stringify({t: Date.now(), v: v})); else sessionStorage.removeItem(HK); } catch (e) {} var n = notOku(); if (n.length) notYaz(n); }
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
      'border-radius:12px;padding:6px 6px 6px 14px;font-size:.9rem;color:var(--fg)}.ornek span{flex:1 1 160px;min-width:0}' +
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
      yazi.textContent = 'Örnek değerler gösteriliyor.';
      dug.textContent = 'Temizle';
      if (notOku().length) {
        yazi.textContent += ' Notta önceki hastanın sonuçları olabilir.';
        var dug2 = document.createElement('button'); dug2.type = 'button'; dug2.textContent = 'Yeni hasta';
        dug2.addEventListener('click', function(){ notYaz([]); yaz({}); dug.click(); });
      }
    }
    dug.addEventListener('click', function(){
      if (dug.textContent === 'Yeni hasta') notYaz([]);
      yaz({});
      girdiler.forEach(function(el){ if (el.value !== '') { el.value = ''; tetikle(el); } });
      document.querySelectorAll('input[type=checkbox]').forEach(function(el){ if (el.checked && !el.closest('header')) { el.checked = false; tetikle(el); } });
      bant.remove();
      if (girdiler[0]) girdiler[0].focus();
    });
    bant.appendChild(yazi); bant.appendChild(dug); if (dug2) bant.appendChild(dug2);
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
    'levotiroksin':'Levotiroksin dozu','stop-bang':'STOP-BANG','birim-cevirici':'Birim çevirici','idame-sivi':'İdame sıvı ve refeeding','pesi':'PESI ve sPESI','hit-4t':'4T skoru (HIT)','rcri':'RCRI (ameliyat öncesi)','ust-gis-kanama':'Üst GİS kanaması','sepsis-sivi':'Sepsiste sıvı ve vazopresör','koah-astim':'KOAH ve astım alevlenmesi','tiroid-krizi':'Tiroid krizi ve miksödem','transfuzyon':'Transfüzyon eşikleri','light-kriterleri':'Light kriterleri','delirium-4at':'4AT deliryum taraması','alkol-yoksunlugu':'Alkol yoksunluğu','hepatik-ensefalopati':'Hepatik ensefalopati','beslenme':'Beslenme hesabı','febril-notropeni':'Febril nötropeni','parasetamol-zehirlenmesi':'Parasetamol zehirlenmesi','kontrast-nefropati':'Kontrast ilişkili AKI'};
  var IL = {
    'egfr':['kreatinin-klerensi','bobrek-ilac-dozu','akut-bobrek-hasari','elektrolit-replasmani'],
    'kreatinin-klerensi':['bobrek-ilac-dozu','egfr','antikoagulan-kesme','akut-bobrek-hasari'],
    'bobrek-ilac-dozu':['kreatinin-klerensi','egfr','akut-bobrek-hasari','ampirik-antibiyotik'],
    'akut-bobrek-hasari':['bobrek-ilac-dozu','kontrast-nefropati','elektrolit-replasmani','kan-gazi'],
    'elektrolit':['kan-gazi','osmolalite','elektrolit-replasmani','hiponatremi-tani'],
    'elektrolit-replasmani':['elektrolit','idame-sivi','acil-tedavi','birim-cevirici'],
    'kan-gazi':['elektrolit','osmolalite','akut-bobrek-hasari','acil-tedavi'],
    'hiponatremi-tani':['sodyum','osmolalite','acil-tedavi','tiroid-testi'],
    'sodyum':['hiponatremi-tani','acil-tedavi','osmolalite','elektrolit'],
    'osmolalite':['hiponatremi-tani','elektrolit','kan-gazi','sodyum'],
    'af-skor':['antikoagulan-kesme','kreatinin-klerensi','bobrek-ilac-dozu','varfarin-inr'],
    'qtc':['elektrolit-replasmani','elektrolit','af-skor'],
    'wells-pe':['pesi','vte-profilaksisi','antikoagulan-kesme','heart-skoru'],
    'vte-profilaksisi':['wells-pe','kreatinin-klerensi','antikoagulan-kesme','vki'],
    'antikoagulan-kesme':['varfarin-inr','kreatinin-klerensi','af-skor','bobrek-ilac-dozu'],
    'varfarin-inr':['antikoagulan-kesme','af-skor','glasgow-blatchford'],
    'prevent':['diyabet-tedavi','egfr','vki','ortalama-arter-basinci'],
    'heart-skoru':['wells-pe','af-skor','qtc','prevent'],
    'duke-kriterleri':['ampirik-antibiyotik','qsofa','news2'],
    'ortalama-arter-basinci':['hipertansif-acil','news2','infuzyon-hizi','qsofa'],
    'siroz-asit':['child-pugh','meld-na','hepatik-ensefalopati','ust-gis-kanama'],
    'child-pugh':['meld-na','siroz-asit','fib-4','bobrek-ilac-dozu'],
    'meld-na':['child-pugh','siroz-asit','fib-4'],
    'glasgow-blatchford':['ust-gis-kanama','anemi','transfuzyon','antikoagulan-kesme'],
    'pankreatit':['news2','elektrolit-replasmani','r-faktor','kan-gazi'],
    'r-faktor':['fib-4','child-pugh','pankreatit'],
    'fib-4':['child-pugh','meld-na','r-faktor','siroz-asit'],
    'acil-tedavi':['elektrolit-replasmani','infuzyon-hizi','insulin-dozu','kan-gazi'],
    'hipertansif-acil':['ortalama-arter-basinci','infuzyon-hizi','acil-tedavi','glasgow-koma'],
    'infuzyon-hizi':['acil-tedavi','hipertansif-acil','elektrolit-replasmani','opioid-donusumu'],
    'ampirik-antibiyotik':['bobrek-ilac-dozu','curb-65','qsofa','news2'],
    'curb-65':['ampirik-antibiyotik','news2','qsofa'],
    'news2':['qsofa','curb-65','ampirik-antibiyotik','glasgow-koma'],
    'qsofa':['sepsis-sivi','news2','ampirik-antibiyotik','kan-gazi'],
    'glasgow-koma':['news2','hipertansif-acil','acil-tedavi'],
    'anemi':['iv-demir','transfuzyon','glasgow-blatchford','egfr'],
    'diyabet-tedavi':['insulin-dozu','egfr','prevent','vki'],
    'insulin-dozu':['diyabet-tedavi','steroid-esdegeri','acil-tedavi','egfr'],
    'steroid-esdegeri':['insulin-dozu','acil-tedavi'],
    'opioid-donusumu':['infuzyon-hizi','bobrek-ilac-dozu'],
    'iv-demir':['anemi','egfr'],
    'vki':['kreatinin-klerensi','stop-bang','prevent','diyabet-tedavi'],
    'tiroid-testi':['levotiroksin','tiroid-krizi','hiponatremi-tani','anemi'],
    'levotiroksin':['tiroid-testi','vki'],
    'stop-bang':['vki','prevent','rcri'],
    'birim-cevirici':['elektrolit-replasmani','elektrolit','egfr','kan-gazi'],
    'idame-sivi':['beslenme','elektrolit-replasmani','sodyum','infuzyon-hizi'],
    'pesi':['wells-pe','vte-profilaksisi','antikoagulan-kesme','hit-4t'],
    'hit-4t':['antikoagulan-kesme','vte-profilaksisi','transfuzyon','kreatinin-klerensi'],
    'rcri':['stop-bang','antikoagulan-kesme','egfr','heart-skoru'],
    'ust-gis-kanama':['glasgow-blatchford','transfuzyon','child-pugh','antikoagulan-kesme'],
    'sepsis-sivi':['qsofa','ampirik-antibiyotik','infuzyon-hizi','news2'],
    'koah-astim':['kan-gazi','news2','ampirik-antibiyotik','curb-65'],
    'tiroid-krizi':['tiroid-testi','levotiroksin','steroid-esdegeri','acil-tedavi'],
    'transfuzyon':['anemi','iv-demir','ust-gis-kanama','varfarin-inr'],
    'light-kriterleri':['siroz-asit','ampirik-antibiyotik','pesi'],
    'delirium-4at':['alkol-yoksunlugu','elektrolit','hiponatremi-tani','glasgow-koma'],
    'alkol-yoksunlugu':['delirium-4at','hepatik-ensefalopati','elektrolit-replasmani','idame-sivi'],
    'hepatik-ensefalopati':['siroz-asit','child-pugh','meld-na','ust-gis-kanama'],
    'beslenme':['idame-sivi','vki','insulin-dozu','siroz-asit'],
    'febril-notropeni':['ampirik-antibiyotik','bobrek-ilac-dozu','sepsis-sivi','news2'],
    'parasetamol-zehirlenmesi':['acil-tedavi','infuzyon-hizi','varfarin-inr','siroz-asit'],
    'kontrast-nefropati':['akut-bobrek-hasari','egfr','bobrek-ilac-dozu','diyabet-tedavi']
  };
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

  // Geri bildirim: sayfanın en altında; araç adı ve sürüm yazılı hazır e-posta açar. Hiçbir şey kaydedilmez.
  var SURUM = 'v50', GB_ADRES = 'blgnonur97@gmail.com';
  var kap = document.querySelector('.wrap');
  if (kap && bu !== 'nobet-listesi') {
    var cssG = document.createElement('style');
    cssG.textContent = '.gb{display:flex;flex-direction:column;gap:8px;margin-top:4px}.gb>button{align-self:center;border:0;background:none;color:var(--muted);font:500 .88rem var(--font-body);text-decoration:underline;cursor:pointer;padding:8px}' +
      '.gb textarea{font:400 1rem var(--font-body);padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--fg);min-height:90px;resize:vertical;width:100%;box-sizing:border-box}' +
      '.gb .gbk{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:10px}.gb .gbk p{margin:0;font-size:.85rem;color:var(--muted)}' +
      '.gb .gbd{display:flex;flex-wrap:wrap;gap:8px}.gb a.gbm{background:var(--accent);color:#fff;border:1px solid var(--accent);text-decoration:none;font:600 .9rem var(--font-body);padding:8px 16px;border-radius:999px}' +
      '.gb button:focus-visible,.gb a:focus-visible,.gb textarea:focus-visible{outline:3px solid var(--accent);outline-offset:2px}';
    document.head.appendChild(cssG);
    var gb = document.createElement('section'); gb.className = 'gb'; gb.setAttribute('aria-label', 'Geri bildirim');
    var ac = document.createElement('button'); ac.type = 'button'; ac.textContent = 'Hata mı gördünüz? Geri bildirim gönderin';
    var kutu = document.createElement('div'); kutu.className = 'gbk'; kutu.hidden = true;
    var aracAd = AN[bu] || (bu === 'index' || bu === '' ? 'Menü' : document.title);
    kutu.innerHTML = '<strong>Geri bildirim</strong><p>Hasta adı, TC no veya hastayı tanıtacak bilgi yazmayın.</p>';
    var ta = document.createElement('textarea'); ta.setAttribute('aria-label', 'Geri bildiriminiz'); ta.placeholder = 'Ne fark ettiniz? (yanlış sonuç, eksik bilgi, öneri…)';
    var dd = document.createElement('div'); dd.className = 'gbd';
    var mail = document.createElement('a'); mail.className = 'gbm'; mail.textContent = 'E-posta ile gönder';
    var kb = document.createElement('button'); kb.type = 'button'; kb.className = 'copy'; kb.textContent = 'Kopyala';
    function metin(){ return 'Vizit geri bildirim\nAraç: ' + aracAd + ' (' + (bu || 'index') + ')\nSürüm: ' + SURUM + '\n\n' + ta.value.trim(); }
    function guncelle(){ mail.href = 'mailto:' + GB_ADRES + '?subject=' + encodeURIComponent('Vizit geri bildirim: ' + aracAd) + '&body=' + encodeURIComponent(metin()); }
    ta.addEventListener('input', guncelle); guncelle();
    kb.addEventListener('click', function(){ copy(metin(), kb); });
    ac.addEventListener('click', function(){ kutu.hidden = !kutu.hidden; if (!kutu.hidden) ta.focus(); });
    dd.appendChild(mail); dd.appendChild(kb);
    kutu.appendChild(ta); kutu.appendChild(dd);
    gb.appendChild(ac); gb.appendChild(kutu);
    kap.appendChild(gb);
  }

  // Alt gezinme çubuğu, menüde bölüm ikonları ve tema seçimi (Nöbet uygulamasında yok)
  if (bu !== 'nobet-listesi') (function(){
  var cssA = document.createElement('style');
  cssA.textContent =
    '.altnav{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;justify-content:space-around;background:var(--surface);border-top:1px solid var(--line);padding:6px 4px calc(6px + env(safe-area-inset-bottom,0px));box-shadow:0 -2px 10px rgba(0,0,0,.06)}' +
    '.altnav a,.altnav button{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;border:0;background:none;color:var(--muted);font:600 .72rem var(--font-body);text-decoration:none;padding:4px 0;cursor:pointer;position:relative}' +
    '.altnav svg{width:24px;height:24px}.altnav .on{color:var(--accent)}' +
    '.altnav .rozet{position:absolute;top:0;left:calc(50% + 6px);background:var(--accent);color:#fff;border-radius:999px;font-size:.65rem;min-width:16px;padding:0 4px;line-height:16px}' +
    'body{padding-bottom:calc(76px + env(safe-area-inset-bottom,0px))}.sonuca{bottom:calc(80px + env(safe-area-inset-bottom,0px))!important}@media print{.altnav{display:none}}' +
    '.tema{display:flex;align-items:center;gap:6px}.tema span{font-size:.8rem;color:var(--muted)}.tema button{height:36px;padding:0 10px;border:1px solid var(--line);background:var(--surface);color:var(--fg);border-radius:10px;font:600 .82rem var(--font-body);cursor:pointer}.tema button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#fff}' +
    '.yazi{display:flex;align-items:center;gap:6px}.yazi span{font-size:.8rem;color:var(--muted);margin-right:2px}.yazi button{width:40px;height:36px;border:1px solid var(--line);background:var(--surface);color:var(--fg);border-radius:10px;font-weight:700;font-family:var(--font-body);cursor:pointer;line-height:1}.yazi button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#fff}.gorunum{display:flex;flex-direction:column;gap:12px}' +
    '.ayar{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:-8px}.ayar .yazi{margin:0}' +
    'a.tool .ik{flex:none;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent)}a.tool .ik svg{width:22px;height:22px}' +
    'a.tool>div:nth-child(2){flex:1;min-width:0}.tost{position:fixed;left:16px;right:16px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:40;background:var(--fg);color:var(--bg);padding:12px 14px;border-radius:12px;font-size:.9rem;text-align:center}';
  document.head.appendChild(cssA);

  var I = {
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    ara:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    hasta:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    yildiz:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    bobrek:'<path d="M9 4c-3 0-5 3-5 7s2 9 5 9c2 0 3-2 3-4v-1c0-1-1-1-1-2s1-1 1-2V8c0-2-1-4-3-4z"/><path d="M15 4c3 0 5 3 5 7s-2 9-5 9"/>',
    kalp:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><polyline points="7,12 10,12 11,10 13,14 14,12 17,12"/>',
    karaciger:'<path d="M3 9c0-3 3-4 7-4 5 0 11 1 11 4 0 4-5 9-9 9-2 0-3-2-5-3S3 12 3 9z"/>',
    acil:'<path d="M12 3v4M5 6l2.5 2.5M19 6l-2.5 2.5"/><path d="M6 20v-6a6 6 0 0 1 12 0v6"/><path d="M4 20h16"/>',
    genel:'<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v3a4 4 0 0 0 8 0v-2"/><circle cx="18" cy="12" r="2"/>'
  };
  function svg(k){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[k] + '</svg>'; }

  var menude = !!document.getElementById('hasta');
  // 3) Menüde araç kartlarına bölüm ikonu
  if (menude) {
    var B = {'b-bobrek':'bobrek','b-kardiyo':'kalp','b-karaciger':'karaciger','b-acil':'acil','b-genel':'genel'};
    Object.keys(B).forEach(function(id){
      var g = document.getElementById(id); if (!g) return;
      g.querySelectorAll('a.tool').forEach(function(a){ var d = document.createElement('div'); d.className = 'ik'; d.innerHTML = svg(B[id]); a.insertBefore(d, a.firstChild); });
    });
    // tema düğmeleri yazı boyutunun yanına
    var y = document.querySelector('.yazi');
    if (y) {
      var ayar = document.createElement('div'); ayar.className = 'ayar';
      var t = document.createElement('div'); t.className = 'tema'; t.setAttribute('role', 'group'); t.setAttribute('aria-label', 'Tema');
      t.innerHTML = '<span>Tema</span><button type="button" data-t="oto">Oto</button><button type="button" data-t="acik">Açık</button><button type="button" data-t="koyu">Koyu</button>';
      y.parentNode.insertBefore(ayar, y); ayar.appendChild(t); ayar.appendChild(y);
      function ciz(){ t.querySelectorAll('button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.t === tema); }); }
      t.addEventListener('click', function(e){ var b = e.target.closest('button'); if (b) { window.vizitTema(b.dataset.t); ciz(); } });
      ciz();
    }
  }
  // Ayarlar (Hakkında sayfasında): tema ve yazı boyutu
  if (bu === 'hakkinda') {
    var hd = document.querySelector('header');
    if (hd) {
      var ak = document.createElement('section'); ak.className = 'card'; ak.id = 'ayarlar';
      ak.innerHTML = '<h2>Görünüm</h2><div class="gorunum"><div class="tema" role="group" aria-label="Tema"><span>Tema</span><button type="button" data-t="oto">Oto</button><button type="button" data-t="acik">Açık</button><button type="button" data-t="koyu">Koyu</button></div>' +
        '<div class="yazi" role="group" aria-label="Yazı boyutu"><span>Yazı</span><button type="button" data-y="1" style="font-size:.85rem">A</button><button type="button" data-y="1.12" style="font-size:1rem">A</button><button type="button" data-y="1.25" style="font-size:1.2rem">A</button></div></div>';
      hd.parentNode.insertBefore(ak, hd.nextSibling);
      var tm = ak.querySelector('.tema'), yv = '1'; try { yv = localStorage.getItem('vizit-yazi') || '1'; } catch (e) {}
      function cizA(){ tm.querySelectorAll('button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.t === tema); });
        ak.querySelectorAll('.yazi button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.y === yv); }); }
      tm.addEventListener('click', function(e){ var b = e.target.closest('button'); if (b) { window.vizitTema(b.dataset.t); cizA(); } });
      ak.querySelectorAll('.yazi button').forEach(function(b){ b.onclick = function(){ yv = b.dataset.y; try { localStorage.setItem('vizit-yazi', yv); } catch (e) {} location.reload(); }; });
      cizA();
    }
  }
  // 1) Alt gezinme çubuğu
  var notSay = 0; try { var o = JSON.parse(sessionStorage.getItem('vizit-not')); if (o && Date.now() - o.t < 1800000) notSay = (o.v || []).length; } catch (e) {}
  var nav = document.createElement('nav'); nav.className = 'altnav'; nav.setAttribute('aria-label', 'Gezinme');
  nav.innerHTML =
    '<a href="index.html"' + (menude ? ' class="on" aria-current="page"' : '') + '>' + svg('menu') + 'Menü</a>' +
    '<a href="index.html#ara">' + svg('ara') + 'Ara</a>' +
    '<a href="index.html#hasta">' + svg('hasta') + 'Hasta' + (notSay ? '<span class="rozet">' + notSay + '</span>' : '') + '</a>' +
    '<a href="index.html#fav">' + svg('yildiz') + 'Favoriler</a>';
  document.body.appendChild(nav);
  if (menude) {
    nav.addEventListener('click', function(e){
      var a = e.target.closest('a'); if (!a) return; var h = a.getAttribute('href').split('#')[1];
      e.preventDefault();
      if (!h) { window.scrollTo({top: 0, behavior: 'smooth'}); return; }
      if (h === 'ara') { var q = document.getElementById('q'); q.scrollIntoView({block: 'center'}); q.focus(); return; }
      var el = document.getElementById(h); if (el && !el.hidden) el.scrollIntoView({behavior: 'smooth', block: 'start'});
      else if (h === 'fav') { var t2 = document.createElement('div'); t2.className = 'tost'; t2.textContent = 'Henüz favori yok. Araç kartının yanındaki ★ ile ekleyin.'; document.body.appendChild(t2); setTimeout(function(){ t2.remove(); }, 2600); }
    });
    if (location.hash === '#ara') setTimeout(function(){ document.getElementById('q').focus(); }, 50);
  }
  })();

  // Uzun sayfalarda içindekiler, araç sayfalarında alttan açılan Hasta paneli, Enter ile sonraki alana geçiş
  if (bu !== 'nobet-listesi' && !document.getElementById('hasta')) (function(){
    var cssP = document.createElement('style');
    cssP.textContent =
      '.icindekiler{position:sticky;top:0;z-index:15;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;background:var(--bg);padding:8px 0;margin:-4px 0 0}' +
      '.icindekiler::-webkit-scrollbar{display:none}.icindekiler a{flex:none;border:1px solid var(--line);background:var(--surface);color:var(--fg);text-decoration:none;font:600 .82rem var(--font-body);padding:6px 12px;border-radius:999px;white-space:nowrap}' +
      '.icindekiler a.on{background:var(--accent);border-color:var(--accent);color:#fff}.icindekiler a:focus-visible{outline:3px solid var(--accent);outline-offset:2px}' +
      'section.card{scroll-margin-top:60px}' +
      '.hperde{position:fixed;inset:0;z-index:45;background:rgba(0,0,0,.35)}' +
      '.hpanel{position:fixed;left:0;right:0;bottom:0;z-index:46;max-height:80vh;overflow:auto;background:var(--surface);color:var(--fg);border-radius:18px 18px 0 0;padding:14px 16px calc(16px + env(safe-area-inset-bottom,0px));box-shadow:0 -6px 24px rgba(0,0,0,.18)}' +
      '.hpanel .ust{display:flex;justify-content:space-between;align-items:center;gap:8px}.hpanel h2{margin:0;font-size:1.05rem}' +
      '.hpanel .kapat{border:0;background:none;color:var(--muted);font-size:1.6rem;line-height:1;padding:4px 8px;cursor:pointer}' +
      '.hpanel .ozet{color:var(--muted);font-size:.9rem;margin:6px 0 10px}.hpanel .izgara{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}' +
      '.hpanel label{display:flex;flex-direction:column;gap:3px;font-size:.78rem;color:var(--muted)}' +
      '.hpanel input{width:100%;box-sizing:border-box;height:40px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--fg);font:500 1rem var(--font-body);padding:0 10px}' +
      '.hpanel .cins{display:flex;gap:6px;margin-bottom:8px}.hpanel button.c{flex:1;height:38px;border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:10px;font:600 .9rem var(--font-body);cursor:pointer}' +
      '.hpanel button.c[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#fff}' +
      '.hpanel ul{list-style:none;padding:0;margin:6px 0}.hpanel li{display:flex;gap:8px;align-items:flex-start;border-top:1px solid var(--line);padding:6px 0;font-size:.9rem}.hpanel li span{flex:1}' +
      '.hpanel li button{border:0;background:none;color:var(--muted);font-size:1.2rem;cursor:pointer;padding:0 6px}' +
      '.hpanel .alt{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.hpanel .alt button,.hpanel .alt a{border:1px solid var(--accent);background:var(--surface);color:var(--accent);font:600 .88rem var(--font-body);padding:8px 14px;border-radius:999px;cursor:pointer;text-decoration:none}' +
      '.hpanel .alt .ana{background:var(--accent);color:#fff}.hpanel .bilgi{font-size:.78rem;color:var(--muted);margin:10px 0 0}' +
      '@media print{.icindekiler,.hpanel,.hperde{display:none}}';
    document.head.appendChild(cssP);

    // 1) İçindekiler: 5 veya daha fazla bölümü olan sayfalarda üstte bölüm çipleri
    var basliklar = Array.prototype.filter.call(document.querySelectorAll('section.card > h2'), function(h){ return !h.closest('[hidden]'); });
    var header = document.querySelector('body > header, main > header, header');
    if (basliklar.length >= 5 && header && !document.querySelector('.tabs') && bu !== 'hakkinda') {
      var tc = document.createElement('nav'); tc.className = 'icindekiler'; tc.setAttribute('aria-label', 'Sayfa bölümleri');
      var ciftler = basliklar.map(function(h, i){
        var kart = h.parentNode; if (!kart.id) kart.id = 'vizit-bolum-' + (i + 1);
        var k = h.cloneNode(true); k.querySelectorAll('span, small, button').forEach(function(x){ x.remove(); });
        var a = document.createElement('a'); a.href = '#' + kart.id; a.textContent = k.textContent.replace(/\s+/g, ' ').trim();
        a.addEventListener('click', function(e){ e.preventDefault(); kart.scrollIntoView({behavior: 'smooth', block: 'start'}); });
        tc.appendChild(a); return {a: a, kart: kart};
      });
      header.parentNode.insertBefore(tc, header.nextSibling);
      var sb = document.querySelector('.sonuca'); if (sb) sb.remove();
      var etkin = null;
      function isaretle(){
        var sec = ciftler[0];
        ciftler.forEach(function(c){ if (c.kart.getBoundingClientRect().top < 120) sec = c; });
        if (sec === etkin) return; if (etkin) etkin.a.classList.remove('on');
        etkin = sec; sec.a.classList.add('on');
        var x = sec.a.offsetLeft - (tc.clientWidth - sec.a.offsetWidth) / 2; tc.scrollTo({left: Math.max(0, x)});
      }
      var bek = false;
      window.addEventListener('scroll', function(){ if (!bek) { bek = true; requestAnimationFrame(function(){ bek = false; isaretle(); }); } }, {passive: true});
      isaretle();
    }

    // 2) Hasta paneli: sayfadan çıkmadan kayıtlı değerler ve vizit notu
    var BIRIM = {yas:'yıl', kilo:'kg', boy:'cm', kreatinin:'mg/dL', egfr:'mL/dk', na:'mEq/L', k:'mEq/L', glukoz:'mg/dL', ure:'mg/dL', hb:'g/dL', alb:'g/dL',
      bil:'mg/dL', inr:'', plt:'bin/µL', ca:'mg/dL', sbp:'mmHg', dbp:'mmHg', nabiz:'/dk'};
    var buSayfadaki = {}; document.querySelectorAll('input[data-hasta]').forEach(function(el){ if (gecerli(el)) buSayfadaki[el.getAttribute('data-hasta')] = true; });
    function ozet(v){ var p = []; if (v.cins) p.push(v.cins === 'm' ? 'Erkek' : 'Kadın');
      Object.keys(AD).forEach(function(k){ if (v[k] != null && v[k] !== '') p.push(AD[k] + ' ' + String(v[k]).replace('.', ',') + (BIRIM[k] ? ' ' + BIRIM[k] : '')); }); return p.join(' · '); }
    var perde, panel, sonOdak;
    function rozet(){ var r = document.querySelector('.altnav .rozet'), n = notOku().length, l = document.querySelector('.altnav a[href="index.html#hasta"]');
      if (!l) return; if (!n) { if (r) r.remove(); return; } if (!r) { r = document.createElement('span'); r.className = 'rozet'; l.appendChild(r); } r.textContent = n; }
    function kapat(){ if (!panel) return; panel.remove(); perde.remove(); panel = perde = null; document.removeEventListener('keydown', esc); if (sonOdak) sonOdak.focus(); }
    function esc(e){ if (e.key === 'Escape') kapat(); }
    function ciz(){
      var v = oku(), n = notOku(), t = ozet(v);
      panel.querySelector('.ozet').textContent = t || 'Değer girilmedi. Buraya ya da herhangi bir araca yazdığınız değerler diğer araçlarda hazır gelir.';
      panel.querySelectorAll('button.c').forEach(function(b){ b.setAttribute('aria-pressed', v.cins === b.dataset.c); });
      panel.querySelectorAll('.izgara input').forEach(function(i){ if (document.activeElement !== i) i.value = v[i.dataset.k] != null ? v[i.dataset.k] : ''; });
      var ul = panel.querySelector('ul'); ul.textContent = ''; panel.querySelector('.notlar').hidden = !n.length;
      n.forEach(function(x, i){ var li = document.createElement('li'), sp = document.createElement('span'), b = document.createElement('button');
        sp.textContent = x.s; b.type = 'button'; b.textContent = '×'; b.setAttribute('aria-label', 'Nottan çıkar: ' + x.s);
        b.onclick = function(){ var m = notOku(); m.splice(i, 1); notYaz(m); ciz(); rozet(); }; li.appendChild(sp); li.appendChild(b); ul.appendChild(li); });
    }
    function sayfayaYaz(k, deger){
      document.querySelectorAll('input[data-hasta="' + k + '"]').forEach(function(el){ if (gecerli(el) && el.value !== deger) { el.value = deger; tetikle(el); } });
    }
    function ac(){
      sonOdak = document.activeElement;
      perde = document.createElement('div'); perde.className = 'hperde'; perde.onclick = kapat;
      panel = document.createElement('div'); panel.className = 'hpanel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Hasta');
      var h = '<div class="ust"><h2>Hasta</h2><button type="button" class="kapat" aria-label="Kapat">×</button></div><p class="ozet"></p>' +
        '<div class="cins" role="group" aria-label="Cinsiyet"><button type="button" class="c" data-c="m">Erkek</button><button type="button" class="c" data-c="f">Kadın</button></div>';
      function alan(k){ return '<label>' + AD[k] + (BIRIM[k] ? ' (' + BIRIM[k] + ')' : '') +
        '<input type="number" inputmode="decimal" step="any" min="0" data-k="' + k + '"></label>'; }
      var bunlar = Object.keys(AD).filter(function(k){ return buSayfadaki[k]; }), digerleri = Object.keys(AD).filter(function(k){ return !buSayfadaki[k]; });
      h += '<div class="alt"><button type="button" class="ana" data-i="kop">Kopyala</button><button type="button" data-i="yeni">Yeni hasta</button><a href="index.html#hasta">Menüde aç</a></div>' +
        '<div class="notlar" hidden><h2 style="margin-top:14px">Vizit notu</h2><ul></ul></div>';
      if (bunlar.length) h += '<h2 style="margin:14px 0 8px">Bu sayfada kullanılanlar</h2><div class="izgara">' + bunlar.map(alan).join('') + '</div>';
      h += '<details' + (bunlar.length ? '' : ' open') + ' style="margin-top:12px"><summary style="cursor:pointer;font-weight:600">Diğer değerler</summary><div class="izgara" style="margin-top:8px">' + digerleri.map(alan).join('') + '</div></details>' +
        '<p class="bilgi">Burada değiştirdiğiniz değer bu sayfadaki kutuya da yazılır. Değerler yalnız bu cihazda, 30 dakika saklanır.</p>';
      panel.innerHTML = h;
      panel.querySelector('.kapat').onclick = kapat;
      panel.addEventListener('input', function(e){
        var k = e.target.dataset && e.target.dataset.k; if (!k) return;
        var v = oku(), d = e.target.value;
        if (d === '') delete v[k]; else v[k] = d; yaz(v); sayfayaYaz(k, d); ciz();
      });
      panel.querySelectorAll('button.c').forEach(function(b){ b.onclick = function(){
        var v = oku(); if (v.cins === b.dataset.c) delete v.cins; else v.cins = b.dataset.c; yaz(v);
        if (v.cins) document.querySelectorAll('button[data-hasta-cins="' + v.cins + '"]').forEach(function(x){ if (gecerli(x) && x.getAttribute('aria-pressed') !== 'true') x.click(); });
        ciz(); }; });
      panel.querySelector('[data-i=kop]').onclick = function(){
        var b = this, t = [ozet(oku())].concat(notOku().map(function(x){ return x.s; })).filter(Boolean).join('\n');
        if (!t) return; copy(t, b);
      };
      panel.querySelector('[data-i=yeni]').onclick = function(){ yaz({}); notYaz([]); ciz(); rozet(); };
      document.body.appendChild(perde); document.body.appendChild(panel);
      document.addEventListener('keydown', esc);
      ciz(); panel.querySelector('.kapat').focus();
    }
    var hl = document.querySelector('.altnav a[href="index.html#hasta"]');
    if (hl) hl.addEventListener('click', function(e){ e.preventDefault(); ac(); });
    window.vizitHastaPaneli = ac;

    // 3) Klavyede İleri/Enter: sonraki giriş kutusuna geç, sonuncuda klavyeyi kapat
    function kutular(){ return Array.prototype.filter.call(document.querySelectorAll('input'), function(i){
      return /^(number|text)$/.test(i.type) && !i.disabled && !i.readOnly && i.offsetParent !== null && !i.closest('header, .hpanel, .gb'); }); }
    function ipucu(){ var k = kutular(); k.forEach(function(i, n){ i.setAttribute('enterkeyhint', n === k.length - 1 ? 'done' : 'next'); }); }
    ipucu(); document.addEventListener('change', function(){ setTimeout(ipucu, 0); }); document.addEventListener('click', function(){ setTimeout(ipucu, 0); });
    document.addEventListener('keydown', function(e){
      if (e.key !== 'Enter' || e.isComposing) return;
      var i = e.target; if (!i.matches || !i.matches('input') || !/^(number|text)$/.test(i.type) || i.closest('header, .hpanel, .gb, form')) return;
      var k = kutular(), n = k.indexOf(i); if (n < 0) return;
      e.preventDefault();
      if (n < k.length - 1) { k[n + 1].focus(); try { k[n + 1].select(); } catch (x) {} } else i.blur();
    });
  })();

  // Uzun kaynak listeleri kapalı başlar, dokununca açılır
  document.querySelectorAll('p').forEach(function(pa){
    var m = /^\s*Kaynak(lar)?\s*:?\s*/.exec(pa.textContent);
    if (!m || pa.textContent.length < 160 || pa.closest('details, .hpanel')) return;
    var d = document.createElement('details'); d.className = 'kaynaklar';
    var sm = document.createElement('summary'); sm.textContent = 'Kaynaklar';
    var u = pa.innerHTML.indexOf('Bu araç klinik karar desteği'), p2 = null;
    if (u > 0) { p2 = document.createElement('p'); p2.className = pa.className; p2.innerHTML = pa.innerHTML.slice(u); pa.innerHTML = pa.innerHTML.slice(0, u); }
    pa.parentNode.insertBefore(d, pa); d.appendChild(sm); d.appendChild(pa);
    if (p2) d.parentNode.insertBefore(p2, d.nextSibling);
  });
  if (document.querySelector('details.kaynaklar')) { var cssK = document.createElement('style');
    cssK.textContent = 'details.kaynaklar>summary{cursor:pointer;color:var(--muted);font:600 .88rem var(--font-body);padding:4px 0}details.kaynaklar>summary:focus-visible{outline:3px solid var(--accent);outline-offset:2px}@media print{details.kaynaklar>p{display:block}}';
    document.head.appendChild(cssK); }

  // Geri bağlantısında küçük nabız işareti (logo ile uyumlu)
  document.querySelectorAll('a.back').forEach(function(a){
    if (a.textContent.trim() !== '← Vizit') return;
    a.innerHTML = '← <svg viewBox="0 0 44 26" aria-hidden="true" style="width:22px;height:13px;vertical-align:-1px;margin:0 3px 0 2px"><polyline points="2,14 11,14 14,9 19,23 25,3 28,14 42,14" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>Vizit';
  });
})();
