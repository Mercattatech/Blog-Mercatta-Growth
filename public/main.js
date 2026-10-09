(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var norm = function (s) { return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); };
  var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* tema */
  var themeBtn = $('#themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* menu mobile */
  var menuBtn = $('#menuToggle'), nav = $('#nav');
  if (menuBtn) menuBtn.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', open);
  });

  /* header + progresso + topo */
  var header = $('#header'), bar = $('#progress'), prose = $('#prose');
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 8);
    if (prose) {
      var r = prose.getBoundingClientRect(), total = r.height - window.innerHeight * .4;
      var p = Math.min(1, Math.max(0, (-r.top + window.innerHeight * .3) / total));
      bar.style.width = (p * 100) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var toTop = $('#toTop');
  if (toTop) toTop.addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* animação de entrada */
  var items = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else items.forEach(function (el) { el.classList.add('in'); });

  /* índice (TOC) com destaque da seção atual */
  var tocLinks = $$('.toc a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { tocLinks.forEach(function (a) { a.classList.remove('is-active'); }); var a = map[e.target.id]; if (a) a.classList.add('is-active'); }
      });
    }, { rootMargin: '-90px 0px -70% 0px' });
    Object.keys(map).forEach(function (id) { var h = document.getElementById(id); if (h) so.observe(h); });
  }

  /* copiar link */
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var url = b.dataset.copy, done = function () { var t = b.textContent; b.textContent = 'Link copiado ✓'; setTimeout(function () { b.textContent = t; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done); else { var i = document.createElement('input'); i.value = url; document.body.appendChild(i); i.select(); document.execCommand('copy'); i.remove(); done(); }
    });
  });

  /* busca */
  var index = null, loading = null;
  function getTenantParam() {
    return new URLSearchParams(location.search).get('tenant') || '';
  }
  function load() {
    if (index) return Promise.resolve(index);
    var tp = getTenantParam();
    var fetchUrl = '/api/search-index/' + (tp ? '?tenant=' + encodeURIComponent(tp) : '');
    return loading || (loading = fetch(fetchUrl).then(function (r) { return r.json(); }).then(function (d) { return (index = d); }));
  }
  function search(q) {
    var terms = norm(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return index.map(function (p) {
      var title = norm(p.t), score = 0;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        if (p.k.indexOf(t) === -1) return null;
        score += title.indexOf(t) !== -1 ? 10 : 1;
      }
      return { p: p, s: score };
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s || (a.p.d < b.p.d ? 1 : -1); }).map(function (x) { return x.p; });
  }
  var overlay = $('#searchOverlay'), input = $('#searchInput'), results = $('#searchResults');
  function openSearch() { overlay.hidden = false; input.focus(); load(); render(''); }
  function closeSearch() { overlay.hidden = true; }
  function render(q) {
    if (!q.trim()) { results.innerHTML = '<div class="sr-empty">Comece a digitar para buscar entre os artigos…</div>'; return; }
    load().then(function () {
      var tp = getTenantParam();
      var tSuffix = tp ? '?tenant=' + encodeURIComponent(tp) : '';
      var r = search(q).slice(0, 7);
      results.innerHTML = r.length ? r.map(function (p) {
        var itemHref = p.u + tSuffix;
        return '<a class="sr-item" href="' + itemHref + '"><img src="' + p.i + '" alt="" loading="lazy"><span><strong>' + esc(p.t) + '</strong><small>' + esc(p.c) + '</small></span></a>';
      }).join('') : '<div class="sr-empty">Nenhum resultado para “' + esc(q) + '”.</div>';
    });
  }
  if (overlay) {
    $('#searchOpen').addEventListener('click', openSearch);
    var hs = $('#heroSearch'); if (hs) hs.addEventListener('click', openSearch);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeSearch(); });
    input.addEventListener('input', function () { render(input.value); });
    document.addEventListener('keydown', function (e) {
      var typing = /input|textarea/i.test((document.activeElement || {}).tagName || '');
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape') closeSearch();
    });
  }

  /* página de busca */
  var grid = $('#searchGrid');
  if (grid) {
    var q = new URLSearchParams(location.search).get('q') || '';
    var pi = $('#pageSearch'); if (pi) pi.value = q;
    var count = $('#searchCount');
    if (!q.trim()) { count.textContent = 'Digite um assunto para começar.'; }
    else load().then(function () {
      var tp = getTenantParam();
      var tSuffix = tp ? '?tenant=' + encodeURIComponent(tp) : '';
      var r = search(q);
      $('#searchTitle').textContent = 'Resultados para “' + q + '”';
      count.textContent = r.length + (r.length === 1 ? ' artigo encontrado' : ' artigos encontrados');
      grid.innerHTML = r.slice(0, 60).map(function (p, i) {
        var d = p.d.split('-');
        var cardHref = p.u + tSuffix;
        return '<article class="card reveal in"><a class="card-media fit" style="--bg:url(\'' + p.i + '\')" href="' + cardHref + '"><img src="' + p.i + '" alt="" loading="lazy"></a><div class="card-body"><span class="pill">' + esc(p.c) + '</span><h3 class="card-title"><a href="' + cardHref + '">' + esc(p.t) + '</a></h3><p class="card-excerpt">' + esc(p.e) + '</p><div class="meta"><time>' + d[2] + '/' + d[1] + '/' + d[0] + '</time></div></div></article>';
      }).join('');
    });
  }
})();
