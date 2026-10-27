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
    '.field label.item{font:inherit;letter-spacing:normal;color:inherit;text-transform:none}' +
    'input.olasi-g{border-color:var(--high,#d24b32)!important;box-shadow:0 0 0 2px var(--high,#d24b32)}' +
    '.olasi-m{margin:3px 0 0;padding:4px 8px;border:1px solid var(--high,#d24b32);border-radius:8px;background:var(--surface);font-size:.78rem;line-height:1.3;font-weight:600;color:color-mix(in srgb,var(--high,#d24b32) 70%,var(--fg))}' +
    '.olasi-s{margin:0 0 4px;padding:8px 12px;border-radius:10px;border-left:4px solid var(--high,#d24b32);background:color-mix(in srgb,var(--high,#d24b32) 12%,var(--surface));color:var(--fg);font-size:.88rem;font-weight:600;line-height:1.4}';
  document.head.appendChild(css);

  function txt(el){ return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function shown(el){ return !el.closest('[hidden]') && txt(el) !== ''; }

  // Olası değer denetimi: aralık dışı ya da eksi bir değer girilince kutu kırmızı çizilir, altında kısa uyarı çıkar ve sonuç kartlarının üstünde
  // "bu sonucu kullanmayın" şeridi çıkar. Aralık sırası: kutunun data-aralik'i (sayfaya özel; "|seçici:aralık" ile birime göre değişir,
  // "yok" denetimi kapatır) → kutunun hem min hem max'ı → hasta anahtarı (data-hasta ya da paneldeki data-k) → kutu adı (id). Aralıklar bilerek
  // geniştir: yalnız yazım hatasını (400480, 1,65 m, µmol/L girilmiş kreatinin) yakalamak içindir, klinik eşik değildir.
  var ARALIK = {yas:[0, 120, 'yıl', 'Yaş'], kilo:[20, 350, 'kg', 'Kilo'], boy:[100, 230, 'cm', 'Boy'], kreatinin:[0.1, 25, 'mg/dL', 'Kreatinin'],
    egfr:[1, 200, 'mL/dk/1,73 m²', 'eGFR'], crcl:[1, 300, 'mL/dk', 'CrCl'], na:[90, 200, 'mEq/L', 'Na'], k:[1, 12, 'mEq/L', 'K'], glukoz:[10, 3000, 'mg/dL', 'Glukoz'],
    ure:[2, 1000, 'mg/dL', 'Üre'], hb:[2, 25, 'g/dL', 'Hb'], alb:[0.5, 7, 'g/dL', 'Albümin'], bil:[0.1, 60, 'mg/dL', 'Bilirubin'], inr:[0.5, 20, '', 'INR'],
    plt:[0.1, 2000, '×10³/µL', 'Trombosit'], ca:[2, 25, 'mg/dL', 'Ca'], sbp:[40, 300, 'mmHg', 'Sistolik'], dbp:[20, 200, 'mmHg', 'Diyastolik'],
    nabiz:[20, 300, '/dk', 'Nabız'], ph:[6.5, 8, '', 'pH'], pco2:[5, 200, 'mmHg', 'pCO₂'], po2:[10, 700, 'mmHg', 'pO₂'], hco3:[1, 60, 'mEq/L', 'HCO₃'],
    qt:[150, 900, 'ms', 'QT'], ates:[25, 45, '°C', 'Ateş'], spo2:[30, 100, '%', 'SpO₂'], ss:[4, 80, '/dk', 'Solunum sayısı'],
    cl:[50, 160, 'mEq/L', 'Cl'], mg:[0.2, 12, 'mg/dL', 'Mg'], p:[0.2, 20, 'mg/dL', 'Fosfor'], osm:[180, 450, 'mOsm/kg', 'Osmolalite'],
    uosm:[30, 1500, 'mOsm/kg', 'İdrar osmolalitesi'], una:[0, 300, 'mmol/L', 'İdrar Na'], uk:[0, 300, 'mmol/L', 'İdrar K'], fio2:[21, 100, '%', 'FiO₂'], a1c:[3, 20, '%', 'HbA1c']};
  var KUTU = {wt:'kilo', kilo:'kilo', kg:'kilo', age:'yas', yas:'yas', ht:'boy', boy:'boy', scr:'kreatinin', cr:'kreatinin', bcr:'kreatinin', ccr:'kreatinin',
    egfr:'egfr', crcl:'crcl', na:'na', sna:'na', k:'k', glu:'glukoz', bg:'glukoz', fbg:'glukoz', hb:'hb', alb:'alb', salb:'alb', bil:'bil', inr:'inr', plt:'plt', ca:'ca',
    sbp:'sbp', dbp:'dbp', ph:'ph', pco2:'pco2', po2:'po2', hco3:'hco3', hco:'hco3', qt:'qt', temp:'ates', tmp:'ates', spo2:'spo2', bspo2:'spo2', spo2b:'spo2', rr:'ss',
    cl:'cl', mg:'mg', p:'p', osm:'osm', mos:'osm', uosm:'uosm', uos2:'uosm', una:'una', uk:'uk', fio2:'fio2', a1c:'a1c'};
  // Ana sonucu eksi çıkamayacak araçlar (baz açığı, sodyum değişimi, açıklar gibi eksi olabilen sonuçlar bu listede yok)
  var EKSI_OLMAZ = ['kreatinin-klerensi', 'egfr', 'bobrek-ilac-dozu', 'febril-notropeni', 'vki', 'qtc', 'ortalama-arter-basinci', 'iv-demir', 'beslenme',
    'idame-sivi', 'infuzyon-hizi', 'insulin-dozu', 'meld-na', 'fib-4', 'kontrast-nefropati', 'levotiroksin', 'prevent', 'child-pugh', 'vte-profilaksisi',
    'antikoagulan-kesme', 'steroid-esdegeri', 'opioid-donusumu', 'r-faktor'];
  // Hasta kaydına (ve başka araçlara) yalnız olası değerler gider
  function olasi(k, d){ var r = ARALIK[k], x = parseFloat(d); return !r || d === '' || d == null || (isFinite(x) && x >= r[0] && x <= r[1]); }
  window.vizitOlasi = olasi;
  function temizKayit(v){ delete v.crcl; Object.keys(v).forEach(function(k){ if (k === 'etiket' ? window.vizitEtiket && !window.vizitEtiket(v[k]) : k !== 'cins' && k !== 'egfrk' && !olasi(k, v[k])) delete v[k]; });
    // Hesaplanan eGFR (egfrk = kaynak kreatinin|yaş|cinsiyet) kaynaklardan biri değişince geçersizdir: silinir
    if (v.egfrk != null && (v.egfr == null || v.egfrk !== egfrKaynak(v))) { if (v.egfr != null) delete v.egfr; delete v.egfrk; }
    return v; }
  function egfrKaynak(v){ return [parseFloat(v.kreatinin), parseFloat(v.yas), v.cins].join('|'); }
  window.vizitTemizKayit = temizKayit;


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
  // Değeri hasta kaydından ya da kullanıcının kendi yazdığı kutular (geri yazma yalnız bunlardan hesaplanan sonuç için yapılır)
  var kaynak = [], geriYaz = null;
  document.addEventListener('input', function(e){ var t = e.target; if (e.isTrusted && t.matches && t.matches('input') && kaynak.indexOf(t) < 0) kaynak.push(t); }, true);
  // "Değerler örnek olarak doldurulmuştur" cümlesi, örnekler silinince ya da kullanıcı ilk değeri girince kalkar (paragrafın kalanı durur).
  // tum: örnek seçimler de silindiyse (hasta yüklendi, Temizle) "Örnek seçimler işaretlenmiştir" cümlesi de kalkar; tek dokunuşta kalmaz
  function ornekGizle(tum){
    document.querySelectorAll('p.note, p, small').forEach(function(p){
      var t = p.firstChild, re = tum ? /^\s*(Değerler örnek olarak|Örnek seçimler işaretlenmiştir|Örnek değerler doldurulmuştur)[^.]*\.\s*/ : /^\s*Değerler örnek olarak[^.]*\.\s*/;
      if (!t || t.nodeType !== 3 || !re.test(t.nodeValue)) return;
      t.nodeValue = t.nodeValue.replace(re, '');
      if (!p.textContent.trim()) p.hidden = true;
    });
  }
  function dokun(){ if (!dokunuldu) { dokunuldu = true; ornekGizle(); } }
  function disButon(t){ return t.closest && t.closest('.cbtns, .gb, .ornek, .sonuca, .ilgili, .icindekiler, .hpanel, header, a.back, details > summary'); }
  ['input', 'change'].forEach(function(ev){ document.addEventListener(ev, function(e){ if (e.isTrusted && !disButon(e.target)) dokun(); }, true); });
  document.addEventListener('click', function(e){ if (e.isTrusted && e.target.closest && e.target.closest('button, label, input') && !disButon(e.target)) dokun(); }, true);
  // Olası olmayan değer ya da geçersiz sonuç varken Kopyala ve Nota ekle çalışmaz.
  function engel(card, btn, asil){
    denetle();
    // Sayfa sonucu eksik saydıysa (data-eksik="Yaş girilmedi" gibi) kopyalanmaz, nota eklenmez
    var eks = card.getAttribute('data-eksik'); if (eks) { btn.textContent = eks; setTimeout(function(){ btn.textContent = asil; }, 2500); return true; }
    if (!card._olasiS || !card._olasiS.parentNode) return false;
    btn.textContent = /^Seçilmemiş/.test(card._olasiS.textContent) ? 'Önce seçimleri yapın' : 'Değeri kontrol edin'; setTimeout(function(){ btn.textContent = asil; }, 2500); return true;
  }
  function notEkle(card, btn){
    if (engel(card, btn, 'Nota ekle')) return;
    if (!dokunuldu && btn.getAttribute('data-uyari') !== '1') {
      btn.setAttribute('data-uyari', '1'); btn.textContent = 'Örnek değerler! Yine de ekle';
      setTimeout(function(){ btn.removeAttribute('data-uyari'); btn.textContent = 'Nota ekle'; }, 4000);
      return;
    }
    btn.removeAttribute('data-uyari');
    // Sayfa, kartın data-not özniteliğiyle not satırını kendisi tanımlayabilir (ör. "CHA₂DS₂-VA 3, HAS-BLED 2"); aynı satırı taşıyan kartlar tek not olur.
    var ozel = (card.getAttribute('data-not') || '').trim();
    var sl = summary(card).split('\n'), satir = ozel || sl[0], ad = AN[bu], kartNo = ozel ? 'not' : Array.prototype.indexOf.call(document.querySelectorAll('section.card[aria-live]'), card);
    if (!ozel && satir.indexOf(': ') < 0) {
      var ek = sl.slice(1).filter(function(x){ return /\d/.test(x); }).slice(0, 3);
      if (!ek.length) { btn.textContent = 'Sonuç yok'; setTimeout(function(){ btn.textContent = 'Nota ekle'; }, 1800); return; }
      satir += ': ' + ek.join(' · ');
    }
    if (!ozel && ad && satir.toLocaleLowerCase('tr').indexOf(ad.split(' ')[0].toLocaleLowerCase('tr')) < 0) {
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
    btn.addEventListener('click', function(){ if (!engel(card, btn, 'Kopyala')) copy(summary(card), btn); });
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
  // Kopyala çıktısı: HBYS'ye yapıştırılabilen epikriz/konsültasyon biçimi
  window.vizitEpikriz = function(v, notlar){
    var f = function(k){ return v[k] != null && v[k] !== '' ? String(v[k]).replace('.', ',') : null; };
    var bas = function(liste){ return liste.filter(Boolean).join(', '); };
    var b = function(k, ad, birim){ var x = f(k); return x ? ad + ' ' + x + (birim ? ' ' + birim : '') : null; };
    var d = new Date(), iki = function(n){ return (n < 10 ? '0' : '') + n; }, s = [];
    var hasta = bas([v.cins ? (v.cins === 'm' ? 'Erkek' : 'Kadın') : null, f('yas') ? f('yas') + ' yaş' : null, f('kilo') ? f('kilo') + ' kg' : null, f('boy') ? f('boy') + ' cm' : null]);
    var ta = f('sbp') && f('dbp') ? 'TA ' + f('sbp') + '/' + f('dbp') + ' mmHg' : (b('sbp', 'Sistolik TA', 'mmHg') || b('dbp', 'Diyastolik TA', 'mmHg'));
    var vital = bas([ta, (f('nabiz') ? 'Nabız ' + f('nabiz') + '/dk' : null)]);
    var lab = bas([b('kreatinin', 'Kreatinin', 'mg/dL'), b('egfr', 'eGFR', 'mL/dk/1,73 m²'), b('ure', 'Üre', 'mg/dL'), b('na', 'Na', 'mEq/L'), b('k', 'K', 'mEq/L'), b('ca', 'Ca', 'mg/dL'),
      b('glukoz', 'Glukoz', 'mg/dL'), b('alb', 'Albümin', 'g/dL'), b('bil', 'Bilirubin', 'mg/dL'), b('hb', 'Hb', 'g/dL'), b('plt', 'Trombosit', 'bin/µL'), b('inr', 'INR')]);
    if (!hasta && !vital && !lab && !(notlar || []).length) return '';
    s.push('Tarih: ' + iki(d.getDate()) + '.' + iki(d.getMonth() + 1) + '.' + d.getFullYear() + (v.etiket ? ' · Yatak: ' + v.etiket : ''));
    if (hasta) s.push('Hasta: ' + hasta);
    if (vital) s.push('Vital: ' + vital);
    if (lab) s.push('Laboratuvar: ' + lab);
    if ((notlar || []).length) { s.push('Değerlendirme:'); notlar.forEach(function(n){ s.push('- ' + n); }); }
    return s.join('\n');
  };
  // Yatak / etiket: isim ya da TC no tutulmaz. En çok 6 karakter: isteğe bağlı Y / Yatak / O / Oda, 1–4 rakam, isteğe bağlı tek harf (ör. Y12, 12A, Oda 3).
  // Boşsa '', uygun değilse null döner.
  window.vizitEtiket = function(s){ s = String(s || '').replace(/\s+/g, ' ').trim(); if (!s) return '';
    var b = s.toLocaleUpperCase('tr').replace(/İ/g, 'I');
    return s.length <= 6 && /^(Y|YATAK|ODA|O)? ?\d{1,4}[A-Z]?$/.test(b) ? s : null; };
  var AD = {yas:'Yaş', kilo:'Kilo', boy:'Boy', kreatinin:'Kreatinin', egfr:'eGFR', na:'Na', k:'K', glukoz:'Glukoz', ure:'Üre',
    hb:'Hb', alb:'Albümin', bil:'Bilirubin', inr:'INR', plt:'Trombosit', ca:'Ca', sbp:'Sistolik', dbp:'Diyastolik', nabiz:'Nabız'};
  function oku(){ try { var o = JSON.parse(sessionStorage.getItem(HK)); if (o && Date.now() - o.t < SURE) return temizKayit(o.v || {}); sessionStorage.removeItem(HK); } catch (e) {} return {}; }
  function yaz(v){ temizKayit(v); try { if (Object.keys(v).length) sessionStorage.setItem(HK, JSON.stringify({t: Date.now(), v: v})); else sessionStorage.removeItem(HK); } catch (e) {} var n = notOku(); if (n.length) notYaz(n); if (window.vizitNavGuncelle) window.vizitNavGuncelle(); }
  function gecerli(el){ var k = el.getAttribute('data-hasta-kosul'); return !k || !!document.querySelector(k); }
  function tetikle(el){ el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
  // data-sabit: laboratuvar üst sınırı, ilaç konsantrasyonu, güvenli varsayılan seçim gibi hastaya ait olmayan değerler örnek silinirken kalır
  function korunur(el){ return el.hasAttribute('data-sabit') || !!el.closest('[data-sabit], header, .hpanel, .gb'); }
  // Örnek seçimleri: body[data-ornek-secim] = "g g=v #id" → data-g grubu seçimsiz kalır (g) ya da nötr değere döner (g=v); #id ile seçim kutusu boşalır
  var SECIM = (document.body.getAttribute('data-ornek-secim') || '').split(/\s+/).filter(Boolean);
  function ornekleriSil(koru, girdiler){
    girdiler.forEach(function(el){ if (el.value !== '' && koru.indexOf(el) < 0 && !korunur(el)) { el.value = ''; tetikle(el); } });
    document.querySelectorAll('input[type=checkbox]').forEach(function(el){ if (el.checked && !el.disabled && koru.indexOf(el) < 0 && !korunur(el)) { el.checked = false; tetikle(el); } });
    document.querySelectorAll('input[type=radio]').forEach(function(el){ if (el.checked && !korunur(el)) { el.checked = false; tetikle(el); } });
    SECIM.forEach(function(t){
      if (t.charAt(0) === '#') { var se = document.querySelector(t); if (!se || se.tagName !== 'SELECT') return;
        if (!se.querySelector('option[value=""]')) { var o = document.createElement('option'); o.value = ''; o.textContent = '— Seçin —'; se.insertBefore(o, se.firstChild); }
        if (se.value !== '') { se.value = ''; tetikle(se); } return; }
      var p = t.split('=');
      document.querySelectorAll('button[data-g="' + p[0] + '"]').forEach(function(b){ b.setAttribute('aria-pressed', p[1] != null && b.getAttribute('data-v') === p[1] ? 'true' : 'false'); });
    });
  }

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

    var kayit = oku(), kullanilan = [], hastaEl = kaynak;
    document.querySelectorAll('input[data-hasta]').forEach(function(el){
      var a = el.getAttribute('data-hasta');
      if (kayit[a] != null && gecerli(el)) { el.value = kayit[a]; hastaEl.push(el); if (kullanilan.indexOf(AD[a] + ' ' + String(kayit[a]).replace('.', ',')) < 0) kullanilan.push(AD[a] + ' ' + String(kayit[a]).replace('.', ',')); }
    });
    var cinsEl = Array.prototype.filter.call(document.querySelectorAll('[data-hasta-cins]'), gecerli), uyg = false, koru = hastaEl.slice();
    if (kayit.cins) {
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
      cinsEl.forEach(function(c){ if (c.type === 'checkbox') { var on = kayit.cins === c.getAttribute('data-hasta-cins'); if (c.checked !== on) { c.checked = on; tetikle(c); } uyg = true; koru.push(c); } });
      if (uyg) kullanilan.unshift(kayit.cins === 'm' ? 'Erkek' : 'Kadın');
    }
    if (kullanilan.length) yaz(kayit);
    // Hastanın değeri geldiyse kalan örnek değerler silinir (kutular boşalır, işaretler kalkar); örnek ile hastanın değeri karışmaz.
    // data-sabit: laboratuvar üst sınırı, ilaç konsantrasyonu gibi hastaya ait olmayan varsayılanlar kalır.
    // Radyo ve body[data-ornek-secim] seçimleri de sıfırlanır. Cinsiyet kayıtta yoksa sayfanın örnek cinsiyeti kalır: o zaman örnek uyarısı sürer.
    var cinsOrnek = false;
    if (kullanilan.length) {
      ornekleriSil(koru, girdiler);
      (hastaEl.length ? hastaEl : girdiler.slice(0, 1)).forEach(tetikle);
      cinsOrnek = !uyg && cinsEl.some(function(b){ return b.tagName === 'BUTTON' && b.getAttribute('aria-pressed') === 'true'; });
      if (!cinsOrnek) { dokunuldu = true; ornekGizle(true); }
    } else hastaEl.forEach(tetikle);

    var bant = document.createElement('div'); bant.className = 'ornek'; bant.setAttribute('role', 'status');
    var yazi = document.createElement('span'), dug = document.createElement('button'); dug.type = 'button';
    if (kullanilan.length) {
      yazi.textContent = (kayit.etiket ? kayit.etiket + ' değerleri kullanılıyor: ' : 'Önceki araçtan alınan değerler: ') + kullanilan.join(' · ') + '. Diğer alanları bu hasta için doldurun.' + (cinsOrnek ? ' Cinsiyet seçimi örnektir; hastaya göre seçin.' : '');
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
      if (dug.textContent === 'Yeni hasta') { notYaz([]); yaz({}); }
      else { var et = oku().etiket; yaz(et ? {etiket: et} : {}); }
      ornekleriSil([], girdiler); if (girdiler[0]) tetikle(girdiler[0]);
      bant.remove(); ornekGizle(true);
      if (girdiler[0]) girdiler[0].focus();
    });
    bant.appendChild(yazi); bant.appendChild(dug); if (dug2) bant.appendChild(dug2);
    ilkKart.parentNode.insertBefore(bant, ilkKart);

    function cinsKaydet(deger){ var v = oku(); v.cins = deger; yaz(v); }
    // Hesaplanan eGFR'yi hasta kaydına yazar (data-hasta-yaz="egfr"): yalnız tüm dolu kutular hastadan ya da kullanıcıdan geldiyse,
    // cinsiyet seçilmişse, olası olmayan değer uyarısı yoksa ve sonuç pozitif bir sayıysa. Sonuç sonra geçersizleşirse yazılan değer geri alınır.
    var yazilan = {};
    geriYaz = function(){
      document.querySelectorAll('[data-hasta-yaz]').forEach(function(n){
        var k = n.getAttribute('data-hasta-yaz'), card = n.closest('section.card'), x = parseFloat(txt(n).replace(',', '.'));
        var tamam = isFinite(x) && x > 0 && !n.closest('[hidden]') && !(card && card._olasiS && card._olasiS.parentNode) &&
          girdiler.every(function(el){ return el.value === '' || el.hasAttribute('data-sabit') || el.offsetParent === null || kaynak.indexOf(el) >= 0; }) &&
          (!document.querySelector('[data-hasta-cins]') || !!oku().cins);
        var v = oku();
        // Yalnız kayıttaki kreatinin, yaş ve cinsiyetten hesaplanmışsa yazılır; kaynakları da birlikte saklanır
        if (tamam) tamam = k === 'egfr' && v.kreatinin != null && v.yas != null && !!v.cins;
        if (tamam) { var d = String(Math.round(x)); if (v[k] !== d || v.egfrk !== egfrKaynak(v)) { v[k] = d; v.egfrk = egfrKaynak(v); yaz(v); yazilan[k] = d; } }
        else if (yazilan[k] && v[k] === yazilan[k]) { delete v[k]; delete v.egfrk; yaz(v); delete yazilan[k]; }
      });
    };
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
        if (el.value === '' || disinda(el)) delete v[a]; else v[a] = el.value;
        yaz(v);
      } else if (el.matches && el.matches('input[data-hasta][data-hasta-cevir]')) {
        // Diğer birimde (ör. kreatinin µmol/L) girilen değer kayda kayıt birimine çevrilerek yazılır (÷ 88,4, 2 basamak); geçersizse eskisi silinir
        var v2 = oku(), a2 = el.getAttribute('data-hasta'), x2 = parseFloat(el.value) / parseFloat(el.getAttribute('data-hasta-cevir'));
        if (el.value === '' || disinda(el) || !isFinite(x2)) delete v2[a2]; else v2[a2] = String(Math.round(x2 * 100) / 100);
        yaz(v2);
      }
      if (!kullanilan.length && bant.parentNode) bant.remove();
    });
  }

  function etiket(el){ return el.labels && el.labels[0] || (el.id ? document.querySelector('label[for="' + el.id + '"]') : null); }
  function etiketBirim(el){ var l = etiket(el), sp = l && l.querySelector('span'); return sp ? txt(sp).split(',')[0] : ''; }
  function etiketAd(el){ var l = etiket(el); if (!l) return el.getAttribute('aria-label') || 'Değer';
    var k = l.cloneNode(true); k.querySelectorAll('span, small, input').forEach(function(x){ x.remove(); }); return txt(k) || 'Değer'; }
  function aralikBul(el){
    var s = el.getAttribute('data-aralik');
    if (s) {
      if (s === 'yok') return null;
      var p = s.split('|'), r = p[0];
      for (var i = 1; i < p.length; i++) { var j = p[i].lastIndexOf(':'); if (j > 0 && document.querySelector(p[i].slice(0, j))) { r = p[i].slice(j + 1); break; } }
      var m = /^\s*(-?[\d.]+)\s*-\s*(-?[\d.]+)\s*(.*)$/.exec(r);
      return m ? {a: +m[1], b: +m[2], birim: m[3].trim(), ad: etiketAd(el)} : null;
    }
    var mn = el.getAttribute('min'), mx = el.getAttribute('max');
    if (mn && mx) return {a: +mn, b: +mx, birim: etiketBirim(el), ad: etiketAd(el)};
    var a = ARALIK[el.getAttribute('data-hasta') || el.getAttribute('data-k')] || ARALIK[KUTU[el.id]];
    return a ? {a: a[0], b: a[1], birim: a[2], ad: a[3]} : null;
  }
  function disinda(el){ var r = el.value !== '' ? aralikBul(el) : null, x = parseFloat(el.value); return r && isFinite(x) && (x < r.a || x > r.b || x < 0) ? r : null; }
  // Bir bölümde (panel, menüdeki Hasta kartı) olası olmayan değer var mı? Varsa oradaki Kopyala çalışmaz.
  window.vizitOlasiVar = function(kok){ return Array.prototype.some.call(kok.querySelectorAll('input[type=number]'), function(el){ return !!disinda(el); }); };
  function sayiTr(x){ return String(x).replace('.', ','); }
  // Sonuç kartında NaN/sonsuz, (EKSI_OLMAZ araçlarında) eksi bir ana sayı ya da data-gecerli="alt:üst" dışına çıkan bir sonuç varsa onu döndürür
  function sonucGecersiz(card){
    if (card.closest('[hidden]')) return '';
    var bul = '';
    card.querySelectorAll('.res, .big, .num, .sub b, .pill, [data-gecerli]').forEach(function(n){
      if (bul || n.closest('[hidden]')) return; var t = txt(n), g = n.getAttribute('data-gecerli');
      if (/NaN|Infinity|∞|undefined/.test(t)) bul = t.slice(0, 40);
      else if (n.classList.contains('num') && EKSI_OLMAZ.indexOf(bu) >= 0 && /^[−-]\s*\d/.test(t)) bul = t;
      else if (g) { var x = parseFloat(t.replace('−', '-').replace(',', '.')), ab = g.split(':');
        if (isFinite(x) && (x < +ab[0] || x > +ab[1])) bul = t; }
    });
    return bul;
  }
  // Seçilmemiş puanlama maddeleri: işaretsiz radyo grupları ve body[data-ornek-secim]'de adı geçen (nötr değeri olmayan) segment grupları ile seçim kutuları
  function grupAd(el){
    if (el.tagName === 'SELECT') return etiketAd(el).slice(0, 40);
    var k = el.closest('.items, .seg, fieldset, [role=radiogroup], [role=group]') || el.parentNode, l = k.getAttribute('aria-label');
    if (!l && k.getAttribute('aria-labelledby')) { var x = document.getElementById(k.getAttribute('aria-labelledby')); l = x && txt(x); }
    if (!l) { var o = k.previousElementSibling; if (o && !o.matches('input, button, .seg, .items') && txt(o) && txt(o).length < 80) l = txt(o); }
    if (!l && el.tagName === 'SELECT') l = etiketAd(el);
    return (l || 'seçim').replace(/\s*[\(:].*$/, '').slice(0, 40);
  }
  function eksikler(){
    var out = [], rg = {};
    document.querySelectorAll('input[type=radio]').forEach(function(r){
      if (!r.name || korunur(r)) return; var g = rg[r.name] || (rg[r.name] = {el: r, sec: false, gor: false});
      if (r.checked) g.sec = true; if (r.offsetParent !== null) g.gor = true;
    });
    Object.keys(rg).forEach(function(n){ if (!rg[n].sec && rg[n].gor) out.push(rg[n].el); });
    SECIM.forEach(function(t){
      if (t.charAt(0) === '#') { var se = document.querySelector(t); if (se && se.value === '' && se.offsetParent !== null) out.push(se); return; }
      if (t.indexOf('=') >= 0) return;
      var bs = document.querySelectorAll('button[data-g="' + t + '"]');
      if (bs.length && bs[0].offsetParent !== null && !document.querySelector('button[data-g="' + t + '"][aria-pressed="true"]')) out.push(bs[0]);
    });
    return out;
  }
  function kartBul(el, kartlar){
    var c = el.closest('section.card[aria-live]'); if (c) return c;
    for (var i = 0; i < kartlar.length; i++) if (el.compareDocumentPosition(kartlar[i]) & 4) return kartlar[i];
    return null;
  }
  var denBek = null, gecBek = null;
  function denetle(){
    var hatalar = [], simdi = Date.now(), bekle = false;
    document.querySelectorAll('input[type=number]').forEach(function(el){
      if (el.closest('header, .gb')) return;
      var r = el.offsetParent !== null ? disinda(el) : null, m = el._olasiM, panel = !!el.closest('.hpanel, #h-grid'), kalan;
      if (r) {
        if (!panel) hatalar.push(r.ad + ' ' + sayiTr(el.value));
        // Yazarken her tuşta çıkıp kaybolmasın: uyarı yazmaya ara verince (600 ms) ya da kutudan çıkınca görünür; düzelince hemen kalkar
        if (document.activeElement === el && (kalan = 600 - (simdi - (el._yT || 0))) > 0) { bekle = bekle ? Math.min(bekle, kalan) : kalan; return; }
        if (!m) { m = el._olasiM = document.createElement('p'); m.className = 'olasi-m'; m.id = 'olasi-' + Math.random().toString(36).slice(2, 8); }
        var y = 'Bu değer olası görünmüyor (beklenen ' + sayiTr(r.a) + '–' + sayiTr(r.b) + (r.birim ? ' ' + r.birim : '') + '). Kontrol edin.';
        if (m.textContent !== y) m.textContent = y;
        // Uyarı akış içinde kutunun altında durur, komşu düğmelerin üstüne binmez; kutu yan yana dizilmiş bir satırdaysa satırın altına gelir
        if (!m.parentNode) { var ust = el.parentNode, cs = getComputedStyle(ust), yan = /grid/.test(cs.display) || /flex/.test(cs.display) && !/column/.test(cs.flexDirection);
          if (yan) ust.parentNode.insertBefore(m, ust.nextSibling); else ust.appendChild(m); el.classList.add('olasi-g'); el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', m.id); }
      } else if (m && m.parentNode) { m.remove(); el.classList.remove('olasi-g'); el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); }
    });
    if (bekle) { clearTimeout(gecBek); gecBek = setTimeout(function(){ gecBek = null; denetle(); }, bekle + 20); }
    var kartlar = Array.prototype.slice.call(document.querySelectorAll('section.card[aria-live]')), eks = {};
    eksikler().forEach(function(el){ var c = kartBul(el, kartlar); if (!c) return; var i = kartlar.indexOf(c), a = grupAd(el); eks[i] = eks[i] || []; if (eks[i].indexOf(a) < 0) eks[i].push(a); });
    kartlar.forEach(function(card, i){
      var g, e = eks[i], y = hatalar.length ? (hatalar.length > 1 ? 'Girilen bazı değerler olası değil (' : 'Girilen bir değer olası değil (') + hatalar.join(', ') + '). Bu sonucu kullanmayın.'
        : (g = sonucGecersiz(card)) ? 'Hesaplanan sonuç geçersiz (' + g + '). Girilen değerleri kontrol edin; bu sonucu kullanmayın.'
        : e ? 'Seçilmemiş madde var: ' + e.slice(0, 3).join(', ') + (e.length > 3 ? ' ve ' + (e.length - 3) + ' madde daha' : '') + '. Sonuç eksik; seçimleri hastaya göre yapın.' : '';
      var s = card._olasiS;
      if (y) { if (!s) { s = card._olasiS = document.createElement('div'); s.className = 'olasi-s'; s.setAttribute('role', 'alert'); }
        if (s.textContent !== y) s.textContent = y; if (!s.parentNode) card.insertBefore(s, card.firstChild); }
      else if (s && s.parentNode) s.remove();
    });
    if (geriYaz) geriYaz();
  }
  function denetleSonra(){ if (!denBek) denBek = setTimeout(function(){ denBek = null; denetle(); }, 0); }
  if (bu !== 'nobet-listesi') {
    document.addEventListener('input', function(e){ if (e.isTrusted && e.target.type === 'number') e.target._yT = Date.now(); }, true);
    ['input', 'change', 'click', 'focusout'].forEach(function(ev){ document.addEventListener(ev, denetleSonra); }); denetle();
    // Ondalık virgül: sayı kutusunda "2,1" yazılınca 21 olmasın, 2.1 olsun
    document.addEventListener('beforeinput', function(e){
      var el = e.target; if (!el.matches || !el.matches('input[type=number]') || !e.data || e.data.indexOf(',') < 0) return;
      e.preventDefault(); try { document.execCommand('insertText', false, e.data.replace(/,/g, '.')); } catch (x) {}
    });
  }
  // Dolu sayı kutusuna dokununca (kutu zaten odaktaysa da) içerik seçilir: yazılan sayı eskisinin sonuna eklenmez, yerine geçer.
  var secilen = null, secT = 0;
  function sec(el){ try { el.select(); } catch (x) {} }
  function secHazirla(el){
    if (bu === 'nobet-listesi' || !el.matches || !el.matches('input[type=number]') || el.value === '') return;
    var v0 = el.value; secilen = el; secT = Date.now(); sec(el);
    setTimeout(function(){ if (document.activeElement === el && el.value === v0) sec(el); }, 10);
  }
  document.addEventListener('focusin', function(e){ secHazirla(e.target); });
  document.addEventListener('pointerdown', function(e){ if (e.target === document.activeElement) secHazirla(e.target); }, true);
  document.addEventListener('mouseup', function(e){ if (secilen && e.target === secilen && Date.now() - secT < 700) e.preventDefault(); }, true);
  document.addEventListener('click', function(e){ if (secilen && e.target === secilen && Date.now() - secT < 700) { sec(secilen); secilen = null; } }, true);

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
    'levotiroksin':'Levotiroksin dozu','stop-bang':'STOP-BANG','birim-cevirici':'Birim çevirici','idame-sivi':'İdame sıvı ve refeeding','pesi':'PESI ve sPESI','hit-4t':'4T skoru (HIT)','rcri':'RCRI (ameliyat öncesi)','ust-gis-kanama':'Üst GİS kanaması','sepsis-sivi':'Sepsiste sıvı ve vazopresör','koah-astim':'KOAH ve astım alevlenmesi','tiroid-krizi':'Tiroid krizi ve miksödem','transfuzyon':'Transfüzyon eşikleri','light-kriterleri':'Light kriterleri','delirium-4at':'4AT deliryum taraması','alkol-yoksunlugu':'Alkol yoksunluğu','hepatik-ensefalopati':'Hepatik ensefalopati','beslenme':'Beslenme hesabı','febril-notropeni':'Febril nötropeni','parasetamol-zehirlenmesi':'Parasetamol zehirlenmesi','kontrast-nefropati':'Kontrast ilişkili AKI','ilac-etkilesimi':'İlaç etkileşimi','trombositopeni':'Trombositopeni yaklaşımı','hipokalemi':'Hipokalemi yaklaşımı','normal-degerler':'Normal değerler'};
  var IL = {
    'ilac-etkilesimi':['qtc','elektrolit-replasmani','bobrek-ilac-dozu','varfarin-inr'],
    'trombositopeni':['hit-4t','transfuzyon','vte-profilaksisi','anemi'],
    'hipokalemi':['elektrolit-replasmani','kan-gazi','elektrolit','hiponatremi-tani'],
    'normal-degerler':['birim-cevirici','elektrolit','anemi','tiroid-testi'],
    'egfr':['kreatinin-klerensi','bobrek-ilac-dozu','akut-bobrek-hasari','elektrolit-replasmani'],
    'kreatinin-klerensi':['bobrek-ilac-dozu','egfr','antikoagulan-kesme','akut-bobrek-hasari'],
    'bobrek-ilac-dozu':['kreatinin-klerensi','egfr','akut-bobrek-hasari','ampirik-antibiyotik'],
    'akut-bobrek-hasari':['bobrek-ilac-dozu','kontrast-nefropati','elektrolit-replasmani','kan-gazi'],
    'elektrolit':['kan-gazi','osmolalite','elektrolit-replasmani','hiponatremi-tani'],
    'elektrolit-replasmani':['hipokalemi','elektrolit','idame-sivi','acil-tedavi'],
    'kan-gazi':['elektrolit','osmolalite','akut-bobrek-hasari','acil-tedavi'],
    'hiponatremi-tani':['sodyum','osmolalite','acil-tedavi','tiroid-testi'],
    'sodyum':['hiponatremi-tani','acil-tedavi','osmolalite','elektrolit'],
    'osmolalite':['hiponatremi-tani','elektrolit','kan-gazi','sodyum'],
    'af-skor':['antikoagulan-kesme','kreatinin-klerensi','bobrek-ilac-dozu','varfarin-inr'],
    'qtc':['elektrolit-replasmani','ilac-etkilesimi','elektrolit','af-skor'],
    'wells-pe':['pesi','vte-profilaksisi','antikoagulan-kesme','heart-skoru'],
    'vte-profilaksisi':['wells-pe','kreatinin-klerensi','antikoagulan-kesme','vki'],
    'antikoagulan-kesme':['varfarin-inr','kreatinin-klerensi','af-skor','bobrek-ilac-dozu'],
    'varfarin-inr':['antikoagulan-kesme','ilac-etkilesimi','af-skor','glasgow-blatchford'],
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
    'birim-cevirici':['normal-degerler','elektrolit-replasmani','elektrolit','egfr'],
    'idame-sivi':['beslenme','elektrolit-replasmani','sodyum','infuzyon-hizi'],
    'pesi':['wells-pe','vte-profilaksisi','antikoagulan-kesme','hit-4t'],
    'hit-4t':['trombositopeni','antikoagulan-kesme','vte-profilaksisi','transfuzyon'],
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
  var SURUM = 'v59', SURUM_TARIH = '27 Ekim 2026', GB_ADRES = 'blgnonur97@gmail.com';
  window.vizitSurum = SURUM; window.vizitGbAdres = GB_ADRES;
  var sEl = document.getElementById('surum'); if (sEl) sEl.textContent = 'Sürüm ' + SURUM + ' · ' + SURUM_TARIH;
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
    '.altnav svg{width:24px;height:24px}.altnav .on{color:var(--accent)}.altnav .hy{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
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
  // Ana ekrana ekleme ipucu: menüde, uygulama olarak açılmadıysa, en çok 3 açılışta; × ile kalıcı kapanır
  if (menude) (function(){
    var bag = window.matchMedia && matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    var n = 0; try { n = parseInt(localStorage.getItem('vizit-ipucu') || '0', 10); } catch (e) { return; }
    if (bag || n < 0 || n >= 3) return;
    try { localStorage.setItem('vizit-ipucu', String(n + 1)); } catch (e) {}
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent), istek = null;
    var k = document.createElement('div'); k.className = 'ipucu'; k.setAttribute('role', 'note');
    k.innerHTML = '<span><b>Ana ekrana ekleyin:</b> tek dokunuşla ve internetsiz açılır. ' +
      (ios ? 'Safari’de Paylaş <svg viewBox="0 0 24 24" aria-label="Paylaş simgesi" style="width:16px;height:16px;vertical-align:-2px" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5v10h14V11h-1"/></svg> → <b>Ana Ekrana Ekle</b>.' : 'Tarayıcı menüsü <b>⋮</b> → <b>Ana ekrana ekle</b>.') + '</span>' +
      '<button type="button" class="ekle" hidden>Ekle</button><button type="button" class="kapat" aria-label="Kapat">×</button>';
    var cssI = document.createElement('style');
    cssI.textContent = '.ipucu{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:12px;padding:8px 6px 8px 12px;font-size:.88rem}' +
      '.ipucu span{flex:1;min-width:0}.ipucu .ekle{border:0;background:var(--accent);color:#fff;font:600 .85rem var(--font-body);padding:7px 12px;border-radius:999px;cursor:pointer}' +
      '.ipucu .kapat{border:0;background:none;color:var(--muted);font-size:1.4rem;line-height:1;padding:2px 8px;cursor:pointer}';
    document.head.appendChild(cssI);
    var qq = document.getElementById('q'); if (!qq) return; qq.parentNode.insertBefore(k, qq);
    function kapat(){ k.remove(); try { localStorage.setItem('vizit-ipucu', '-1'); } catch (e) {} }
    k.querySelector('.kapat').onclick = kapat;
    window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); istek = e; k.querySelector('.ekle').hidden = false; });
    k.querySelector('.ekle').onclick = function(){ if (!istek) return; istek.prompt(); istek.userChoice.then(function(r){ if (r.outcome === 'accepted') kapat(); }); };
    window.addEventListener('appinstalled', kapat);
  })();
  // 1) Alt gezinme çubuğu
  var notSay = 0; try { var o = JSON.parse(sessionStorage.getItem('vizit-not')); if (o && Date.now() - o.t < 1800000) notSay = (o.v || []).length; } catch (e) {}
  var nav = document.createElement('nav'); nav.className = 'altnav'; nav.setAttribute('aria-label', 'Gezinme');
  nav.innerHTML =
    '<a href="index.html"' + (menude ? ' class="on" aria-current="page"' : '') + '>' + svg('menu') + 'Menü</a>' +
    '<a href="index.html#ara">' + svg('ara') + 'Ara</a>' +
    '<a href="index.html#hasta">' + svg('hasta') + '<span class="hy">Hasta</span>' + (notSay ? '<span class="rozet">' + notSay + '</span>' : '') + '</a>' +
    '<a href="index.html#fav">' + svg('yildiz') + 'Favoriler</a>';
  document.body.appendChild(nav);
  // Hasta düğmesinde yatak/etiket (ör. Y12) ve not sayısı
  window.vizitNavGuncelle = function(){
    var l = nav.querySelector('a[href="index.html#hasta"]'), hy = l.querySelector('.hy'), r = l.querySelector('.rozet'), et = oku().etiket, n = notOku().length;
    hy.textContent = et || 'Hasta'; l.setAttribute('aria-label', et ? 'Hasta ' + et : 'Hasta');
    if (!n) { if (r) r.remove(); } else { if (!r) { r = document.createElement('span'); r.className = 'rozet'; l.appendChild(r); } r.textContent = n; }
  };
  window.vizitNavGuncelle();
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
      '.hpanel label.etiket{margin-bottom:10px}.hpanel label.etiket input{font-weight:600}.hpanel .etiket .u{color:var(--high,#d24b32);font-weight:600}' +
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
    function rozet(){ if (window.vizitNavGuncelle) window.vizitNavGuncelle(); }
    function kapat(){ if (!panel) return; panel.remove(); perde.remove(); panel = perde = null; document.removeEventListener('keydown', esc); if (sonOdak) sonOdak.focus(); }
    function esc(e){ if (e.key === 'Escape') kapat(); }
    function ciz(){
      var v = oku(), n = notOku(), t = ozet(v), ei = panel.querySelector('.etiket input');
      panel.querySelector('.ust h2').textContent = v.etiket ? 'Hasta · ' + v.etiket : 'Hasta';
      if (document.activeElement !== ei) { ei.value = v.etiket || ''; panel.querySelector('.etiket .u').hidden = true; }
      panel.querySelector('.ozet').textContent = t || 'Değer girilmedi. Buraya ya da herhangi bir araca yazdığınız değerler diğer araçlarda hazır gelir.';
      panel.querySelectorAll('button.c').forEach(function(b){ b.setAttribute('aria-pressed', v.cins === b.dataset.c); });
      panel.querySelectorAll('.izgara input').forEach(function(i){ if (document.activeElement !== i) i.value = v[i.dataset.k] != null ? v[i.dataset.k] : ''; });
      var ul = panel.querySelector('ul'); ul.textContent = ''; panel.querySelector('.notlar').hidden = !n.length;
      n.forEach(function(x, i){ var li = document.createElement('li'), sp = document.createElement('span'), b = document.createElement('button');
        sp.textContent = x.s; b.type = 'button'; b.textContent = '×'; b.setAttribute('aria-label', 'Nottan çıkar: ' + x.s);
        b.onclick = function(){ var m = notOku(); m.splice(i, 1); notYaz(m); ciz(); rozet(); }; li.appendChild(sp); li.appendChild(b); ul.appendChild(li); });
    }
    function sayfayaYaz(k, deger){
      document.querySelectorAll('input[data-hasta="' + k + '"]').forEach(function(el){ if (gecerli(el) && el.value !== deger) { el.value = deger; if (kaynak.indexOf(el) < 0) kaynak.push(el); tetikle(el); } });
    }
    function ac(){
      sonOdak = document.activeElement;
      perde = document.createElement('div'); perde.className = 'hperde'; perde.onclick = kapat;
      panel = document.createElement('div'); panel.className = 'hpanel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Hasta');
      var h = '<div class="ust"><h2>Hasta</h2><button type="button" class="kapat" aria-label="Kapat">×</button></div><p class="ozet"></p>' +
        '<label class="etiket">Yatak / etiket (isim yazmayın)<input type="text" maxlength="6" placeholder="ör. Y12" autocomplete="off" autocapitalize="characters"><span class="u" hidden>Yalnız yatak ya da oda no (ör. Y12, 12A, Oda 3). İsim veya TC no yazmayın.</span></label>' +
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
      // Yazarken kaydedilmez (TC'nin ilk haneleri kayda geçmesin); geçersiz girişte eski etiket silinir, geçerli değer kutudan çıkınca kaydedilir
      var ein = panel.querySelector('.etiket input');
      ein.addEventListener('input', function(){
        var e2 = window.vizitEtiket(this.value), v = oku(); panel.querySelector('.etiket .u').hidden = e2 !== null || this.value.trim().length < 2;
        if (e2 !== v.etiket && v.etiket != null) { delete v.etiket; yaz(v); ciz(); rozet(); }
      });
      ein.addEventListener('change', function(){
        var e2 = window.vizitEtiket(this.value), v = oku(); panel.querySelector('.etiket .u').hidden = e2 !== null;
        if (e2) v.etiket = e2; else delete v.etiket; yaz(v); ciz(); rozet();
      });
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
        var b = this; if (window.vizitOlasiVar(panel)) { b.textContent = 'Değeri kontrol edin'; setTimeout(function(){ b.textContent = 'Kopyala'; }, 2500); return; }
        var t = window.vizitEpikriz(oku(), notOku().map(function(x){ return x.s; }));
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

  // Güven satırı: aracın dayandığı ana kılavuz ve son kontrol tarihi (başlığın altında)
  var KL = {"ilac-etkilesimi":"CredibleMeds 2025 · AHA 2020 · FDA 2023","trombositopeni":"PLASMIC 2017 · ISTH 2001 · AABB/ICTMG 2025","hipokalemi":"Harrison's · CCJM 2024 · NHS York 2024","normal-degerler":"ABIM 2026 · AMA SI tablosu","acil-tedavi":"UKKA 2026 · TEMD 2026 · ADA 2025","af-skor":"ESC 2024 · Lip 2010 · Pisters 2010","akut-bobrek-hasari":"KDIGO 2012 · NICE NG148","alkol-yoksunlugu":"CIWA-Ar 1989 · ASAM 2020","ampirik-antibiyotik":"ATS/IDSA 2019 · IDSA · SSC 2021","anemi":"WHO 2024 · BSG 2021 · AGA 2020","antikoagulan-kesme":"EHRA 2021 · ACCP 2022 · PAUSE","beslenme":"NRS 2002 · ESPEN 2019/2023","birim-cevirici":"AMA SI tablosu · MSD Manual","bobrek-ilac-dozu":"KÜB/SmPC · Sanford · KDIGO 2022","child-pugh":"Pugh 1973","curb-65":"Lim 2003 · BTS 2009","delirium-4at":"4AT (Bellelli 2014) · NICE CG103","diyabet-tedavi":"ADA 2025 · TEMD 2026 · KDIGO 2022","duke-kriterleri":"Li 2000 · ESC 2023","egfr":"CKD-EPI 2021","elektrolit-replasmani":"Kraft 2005 · Brown 2006","elektrolit":"Payne 1973 · Figge 1998 · Hillier 1999","febril-notropeni":"IDSA 2010 · ASCO/IDSA 2018 · MASCC","fib-4":"Sterling 2006 · EASL-EASD-EASO 2024","glasgow-blatchford":"Blatchford 2000 · ESGE 2021","glasgow-koma":"Teasdale 1974","heart-skoru":"Six 2008 · Backus 2013","hepatik-ensefalopati":"AASLD/EASL 2014 · EASL 2022","hipertansif-acil":"ESC 2019 · ESC 2024 · AHA/ASA","hiponatremi-tani":"ESE/ESICM/ERBP 2014","hit-4t":"Lo 2006 (4T) · ASH 2018","idame-sivi":"NICE CG174 · NICE CG32","infuzyon-hizi":"SSC 2021 · ESC · Raschke 1993","insulin-dozu":"ADA 2026 · Endocrine Society 2012","iv-demir":"Ganzoni 1970 · ESC 2023","kan-gazi":"Berend 2014 · Kraut 2007","koah-astim":"GOLD 2026 · GINA 2026","kontrast-nefropati":"Mehran 2004 · ESUR 2018","kreatinin-klerensi":"Cockcroft-Gault 1976","levotiroksin":"ATA 2014 · ATA 2017","light-kriterleri":"Light 1972 · BTS 2023","meld-na":"Kim 2008 · MELD 3.0 (Kim 2021)","news2":"RCP NEWS2 2017","opioid-donusumu":"CDC 2022 · ESMO 2018","ortalama-arter-basinci":"SSC 2021","osmolalite":"Standart formül","pankreatit":"BISAP 2008 · Atlanta 2013 · ACG 2024","parasetamol-zehirlenmesi":"MHRA 2012 · Dart 2023 · SNAP","pesi":"Aujesky 2005 · Jiménez 2010 · ESC 2019","prevent":"Khan 2024 (PREVENT) · AHA/ACC 2025","qsofa":"Seymour 2016","qtc":"Bazett · Fridericia · AHA 2009","r-faktor":"EASL DILI 2019","rcri":"Lee 1999 · CCS 2017 · ESC 2022","sepsis-sivi":"SSC 2021 · SSC 2026","siroz-asit":"AASLD 2021 · EASL 2018","sodyum":"Adrogué 2000 · ESE 2014","steroid-esdegeri":"Liu 2013 · ESE/ES 2024","stop-bang":"Chung 2016","tiroid-krizi":"TEMD 2025 · Burch-Wartofsky 1993","tiroid-testi":"TEMD 2025","transfuzyon":"AABB 2023 · AABB/ICTMG 2025 · BSH","ust-gis-kanama":"ESGE 2021 · ACG 2021 · Baveno VII","varfarin-inr":"ACCP 2012 · ASH 2018","vki":"DSÖ sınıflaması · Mosteller · DuBois","vte-profilaksisi":"Padua 2010 · IMPROVE 2011 · ASH 2018","wells-pe":"Wells 2000 · ESC 2019"}, SON_KONTROL = 'Ekim 2026';
  if (KL[bu]) { var bh = document.querySelector('header'), bp = bh && bh.querySelector('p');
    if (bp) { var dy = document.createElement('p'); dy.className = 'dayanak'; dy.textContent = 'Dayanak: ' + KL[bu] + ' · son kontrol ' + SON_KONTROL;
      dy.style.cssText = 'margin:6px 0 0;font-size:.78rem;color:var(--muted)'; bp.parentNode.insertBefore(dy, bp.nextSibling); } }

  // SGK ödeme koşulları (SUT): yalnız ilgili sayfalarda, kapalı bir kutu olarak
  var SUT_TARIH = '29.08.2026', SUTB = {
    dmEski: ['Metformin, sülfonilüre, akarboz, insan insülini', '4.2.38(1)', ['Tüm hekimler yazabilir.']],
    dpp4: ['DPP-4 inhibitörleri', '4.2.38(4)', ['Metformin ve/veya sülfonilürenin en yüksek tolere dozunda glisemik kontrol yetersizse ödenir.', 'Endokrinoloji ya da iç hastalıkları uzmanı yazar; bu uzmanların uzman hekim raporuyla tüm hekimler yazabilir.', 'GLP-1 analoğuyla birlikte ödenmez.', 'Saksagliptin 2,5 mg ve alogliptin 12,5 mg tek başına formları yalnız KBY\'de ödenir.']],
    sglt2dm: ['SGLT2 inhibitörleri (diyabet)', '4.2.38(6)', ['Tip 2 diyabette metformin ve/veya sülfonilürenin en yüksek tolere dozunda glisemik kontrol yetersizse ödenir.', 'Endokrinoloji ya da iç hastalıkları uzmanı yazar; bu uzmanların uzman hekim raporuyla tüm hekimler yazabilir.']],
    sglt2ky: ['Dapagliflozin, empagliflozin: kalp yetmezliği', '4.2.74(1)', ['EF ≤ %40, NYHA II–IV semptomatik kronik kalp yetmezliği.', 'Standart tedaviye (ACEİ ya da ARB, beta bloker, MRA) ek olarak; kullanılamayan ilacın gerekçesi raporda yazılır.', 'eGFR: empagliflozin ≥ 20, dapagliflozin ≥ 25.', 'En az bir kardiyoloji uzmanının bulunduğu 1 yıllık sağlık kurulu raporu; tüm hekimler yazabilir.']],
    sglt2kbh: ['Dapagliflozin, empagliflozin: kronik böbrek hastalığı', '4.2.74(2)', ['RAAS inhibitörü alırken en az 3 ay süren proteinüri: idrar ACR ≥ 200 mg/g ya da PCR > 300 mg/g.', 'eGFR: empagliflozin ≥ 20, dapagliflozin ≥ 25.', 'En az bir nefroloji uzmanının bulunduğu sağlık kurulu raporu; tüm hekimler yazabilir.']],
    glp1: ['GLP-1 analogları', '4.2.38(5), (7)', ['SUT\'ta madde yalnız eksenatid ile insülin glarjin + liksisenatid için var. İkisinde de tedavi başında VKİ > 35 kg/m² ve pankreatit öyküsü olmaması gerekir.', 'Eksenatid: metformin ve/veya sülfonilüre en yüksek dozda yetersizse onlara ek olarak ya da bazal insülinle yetersizse bazal insüline ek olarak. İlk kutu raporsuz, endokrinoloji uzmanı yazar. Devam için 6 aylık endokrinoloji uzman raporu, sonra 1 yıllık; endokrinoloji ya da iç hastalıkları uzmanı yazar.', 'İnsülin glarjin + liksisenatid: metforminle birlikte; 1 yıllık endokrinoloji uzman raporu, endokrinoloji ya da iç hastalıkları uzmanı yazar.', 'Tedavi sırasında akut pankreatit gelişirse ilaç kesilir ve yeniden ödenmez.', 'Liraglutid, semaglutid, dulaglutid için SUT\'ta madde yok.', 'DPP-4 inhibitörüyle birlikte ödenmez.']],
    analog: ['Analog insülinler, pioglitazon', '4.2.38(3)', ['Endokrinoloji, iç hastalıkları, çocuk sağlığı ya da kardiyoloji uzmanı yazar; bu uzmanların uzman hekim raporuyla tüm hekimler yazabilir.', 'İnsülin degludek + aspart: analog karışım ya da uzun etkili insüline rağmen kan şekeri labil, sık hipoglisemi ya da regülasyon yoksa. En az bir endokrinoloğun bulunduğu sağlık kurulu raporu; yalnız endokrinoloji ya da iç hastalıkları uzmanı yazar. İlk 24 aydan sonra iç hastalıkları uzmanının bulunduğu kurul da yeterli.']],
    statin: ['Statinler', '4.2.28.A-1', ['İlk kez başlarken uzman hekim raporu gerekir; raporla tüm hekimler yazabilir.', 'Başlama ölçütü: LDL > 190; LDL > 160 ve 2 ek risk; LDL > 130 ve 3 ek risk; LDL > 70 ve diyabet, AKS, geçirilmiş Mİ ya da inme, koroner, periferik ya da karotis arter hastalığı, abdominal aort anevrizması.', 'Ek risk: hipertansiyon, ailede erken kardiyovasküler hastalık, 65 yaş ve üstü. LDL > 190, > 160 ve > 130 basamaklarında son 6 ay içinde en az 1 hafta arayla 2 yüksek ölçüm raporda yazılır.', 'Yüksek doz (rosuvastatin ≥ 20 mg; atorvastatin, simvastatin, pravastatin ≥ 40 mg; fluvastatin ≥ 80 mg): kardiyoloji, KVC, endokrinoloji, geriatri, nöroloji ya da iç hastalıkları uzman raporu; tüm hekimler yazabilir. İlk 24 aydan sonra devam raporunu aile hekimliği uzmanı da düzenleyebilir.', '6 ay ya da daha uzun ara verilirse başlama ölçütleri yeniden aranır.']],
    ezetimib: ['Ezetimib', '4.2.28.C', ['En az 6 ay statine rağmen LDL > 100 ise, ya da statin AST/ALT ≥ 3 × ÜSN veya CK ≥ 2 × ÜSN nedeniyle kullanılamıyorsa (belgelenerek).', 'Kardiyoloji, iç hastalıkları, nöroloji ya da KVC uzman raporu; tüm hekimler yazabilir.']],
    pcsk9: ['PCSK9 inhibitörü (evolokumab)', '4.2.28.E', ['Yalnız erişkin homozigot ailesel hiperkolesterolemide: en az 3 ay en yüksek doz statin (atorvastatin 80 ya da rosuvastatin 40 mg) + ezetimib 10 mg\'a rağmen LDL > 190.', 'Kardiyoloji, iç hastalıkları ya da endokrinoloji uzmanının bulunduğu 6 aylık sağlık kurulu raporu; bu uzmanlar yazar. En çok 1 haftalık LDL sonucu rapora ve reçeteye eklenir. 6. ayda LDL en az %30 düşmüşse 1 yıllık yeni raporla devam.']],
    doakAf: ['DOAK (dabigatran, rivaroksaban, apiksaban, edoksaban): AF', '4.2.15.D-1', ['Orta-ciddi mitral darlık ya da mekanik protez kapak olmayan non-valvüler AF; inme/TİA, ≥ 75 yaş, NYHA ≥ II kalp yetmezliği, diyabet ya da hipertansiyondan en az biri raporda yazılır.', 'Önce en az 2 ay varfarin: en az 1 hafta arayla son 5 INR\'nin en az 3\'ü 2–3 dışındaysa geçilir. Varfarin altında inme geçirende doğrudan geçilir.', 'Kardiyoloji, iç hastalıkları, göğüs hastalıkları, KVC, girişimsel radyoloji, beyin cerrahisi ve nöroloji uzmanlarından en az üçünün (en az biri kardiyolog ya da nörolog) bulunduğu 1 yıllık sağlık kurulu raporu; bu uzmanlar yazar.', 'İlk 24 aydan sonra bu uzmanların uzman hekim raporu yeterli; aile hekimleri de yazabilir.', 'İki DOAK birlikte ödenmez.']],
    doakVte: ['DOAK: DVT ve PE', '4.2.15.D-2', ['Rivaroksaban, apiksaban, edoksaban ve dabigatran DVT/PE tedavisi ve tekrarın önlenmesinde.', 'Önce en az 2 ay varfarin: son 5 INR\'nin en az 3\'ü 2–3 dışındaysa geçilir.', 'Varfarin koşulu aranmayanlar: tekrarlayan idiyopatik PE, homozigot trombofili, daha önce VTE geçirmiş aktif kanser, immobil hasta (neden raporda yazılır).', 'Kardiyoloji, iç hastalıkları, göğüs hastalıkları, KVC ya da girişimsel radyoloji uzmanlarından en az üçünün bulunduğu 1 yıllık sağlık kurulu raporu; bu uzmanlar yazar. İlk 24 aydan sonra uzman hekim raporu yeterli; nöroloji uzmanı ve aile hekimleri de yazabilir.']],
    dmah: ['Düşük molekül ağırlıklı heparin', '4.2.7', ['Yatan hastada ve acil serviste raporsuz, tüm hekimler yazabilir.', 'Ayaktan: dozu yazan, en çok 6 aylık uzman hekim raporuyla tüm hekimler yazabilir.', '6 aydan uzun kullanımda onkoloji, hematoloji, KVC, kardiyoloji, göğüs hastalıkları, iç hastalıkları, genel cerrahi ya da nöroloji uzmanından birinin bulunduğu sağlık kurulu raporu gerekir.', 'Gebede kadın doğum uzmanının 10 aylık uzman hekim raporu.', 'İki farklı DMAH birlikte ödenmez. Hemodiyalizdeki heparin işlem puanına dahildir, ayrıca ödenmez.']],
    demir: ['Parenteral demir', '4.2.41', ['Demir eksikliğinde şu durumlarda ödenir: malabsorpsiyon, inflamatuvar bağırsak hastalığı, aktif GİS kanama, hemodiyaliz, periton diyalizi, prediyaliz (evre 5), total ya da subtotal gastrektomi, atrofik gastrit, oral demiri tolere edemeyen gebe, evre 3–5 KBH (TSAT < %20 ve/veya ferritin < 100), postpartum, cerrahi öncesi ve sonrası, kansere bağlı ve kalp yetmezliğindeki anemi.', 'Kardiyoloji, kadın doğum, genel cerrahi, iç hastalıkları, çocuk sağlığı ya da anestezi uzmanının 6 aylık uzman hekim raporu; bu uzmanlar yazar.']],
    esa: ['Eritropoetin, darbepoetin, roksadustat', '4.2.9.A', ['Yalnız KBY anemisinde (eritropoetin ve darbepoetin MDS\'de de) ödenir.', 'KBY anemisinde: önce TSAT ≥ %20 ve/veya ferritin ≥ 100 µg/L olmalı; değilse önce demir verilir. Hb < 10 g/dl ise başlanır, hedef 11–12; Hb > 12 olursa kesilir. İdamede TSAT/ferritin hemodiyalizde 3, periton diyalizinde 4 ayda bir bakılır.', 'KBY anemisinde rapor: nefroloji, iç hastalıkları, çocuk sağlığı ya da diyaliz sertifikalı uzmanın uzman hekim raporu. Prediyaliz ve periton diyalizinde nefroloji uzmanı yazar; hemodiyalizde nefroloji, iç hastalıkları, çocuk sağlığı uzmanı ya da diyaliz merkezindeki sertifikalı hekim.', 'Bir defada en çok 1 aylık ilaç verilir. MDS\'de koşullar farklıdır (hematoloji raporu).']],
    albumin: ['İnsan albümin', '4.2.27.Ç', ['Yalnız yatan hastada, serum albümin ≤ 2,5 g/dl ise uzman hekim yazar.', 'Laboratuvar sonucu ve kullanılan miktar epikrizde yazılır.', 'Albümin düzeyi şartı yalnız plazmaferezde ve karaciğer nakli yapılmış hastada aranmaz.']],
    tolvaptan: ['Tolvaptan', '4.2.67', ['SUT\'ta tolvaptan için madde yalnız ADPKD (otozomal dominant polikistik böbrek hastalığı) içindir. Hiponatremi ya da SIADH için madde yok.']]
  }, SUT = {'diyabet-tedavi': ['dmEski', 'dpp4', 'sglt2dm', 'sglt2ky', 'sglt2kbh', 'glp1', 'analog', 'statin', 'ezetimib', 'pcsk9'], 'insulin-dozu': ['analog'], 'prevent': ['statin', 'ezetimib', 'pcsk9'], 'af-skor': ['doakAf'], 'pesi': ['doakVte'], 'wells-pe': ['doakVte'], 'vte-profilaksisi': ['dmah'], 'iv-demir': ['demir'], 'anemi': ['demir', 'esa'], 'siroz-asit': ['albumin'], 'hiponatremi-tani': ['tolvaptan']};
  if (SUT[bu]) { var sk = document.querySelectorAll('section.card:not(.sut)'), son = sk[sk.length - 1];
    if (son) { var sc = document.createElement('section'); sc.className = 'card sut';
      var sh = '<details><summary>SGK ödeme koşulu (SUT)</summary>';
      SUT[bu].forEach(function(k){ var b = SUTB[k]; sh += '<h3>' + b[0] + ' <span>SUT ' + b[1] + '</span></h3><ul>' + b[2].map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ul>'; });
      sh += '<p class="sutk">SUT birleştirilmiş metni, ' + SUT_TARIH + ' tarihli Resmî Gazete değişikliğine kadar. Ödeme koşulları sık değişir; reçeteden önce güncel metni kontrol edin.</p></details>';
      sc.innerHTML = sh; son.parentNode.insertBefore(sc, son.nextSibling);
      var cssS = document.createElement('style');
      cssS.textContent = '.sut>details>summary{cursor:pointer;font:600 1rem var(--font-body);color:var(--accent)}.sut>details>summary:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.sut h3{font-size:.95rem;margin:14px 0 4px}.sut h3 span{font-weight:400;font-size:.78rem;color:var(--muted)}.sut ul{margin:0;padding-left:20px}.sut li{margin:3px 0;font-size:.92rem}.sut .sutk{font-size:.8rem;color:var(--muted);margin:12px 0 0}';
      document.head.appendChild(cssS); } }

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
