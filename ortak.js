// Tüm sayfalarda ortak: sonuç kartlarına "Kopyala" düğmesi, örnek değer uyarısı ve araçlar arası hasta değerleri; çevrimdışı çalışmayı başlatır.
(function(){
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

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
  var ilkKart = girdiler.length ? girdiler[0].closest('section, .card, form') : null;
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
})();
