// Tüm sayfalarda ortak: sonuç kartlarına "Kopyala" düğmesi ekler ve çevrimdışı çalışmayı başlatır.
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
      var c = tr.cells; lines.push(txt(c[0]) + ': ' + Array.prototype.slice.call(c, 1).map(txt).join(', '));
    });
    card.querySelectorAll('ol li, ul li').forEach(function(li, i){
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
})();
