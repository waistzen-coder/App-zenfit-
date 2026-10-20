/* ReliefPath · Lab — comportamiento del tema.
   Sin dependencias. El carrito lo lleva Dawn (product-form + cart-drawer). */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var design = !!(window.Shopify && Shopify.designMode);
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function store(fn) { try { return fn(); } catch (e) { return null; } }

  /* Aparición suave: solo lo que está por debajo del pliegue, así nada se
     esconde si el script no llega a cargar. */
  function reveal() {
    if (reduce || design || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    var limit = window.innerHeight * 0.92;
    $$('[data-lab-reveal]').forEach(function (el) {
      if (el.getBoundingClientRect().top < limit) return;
      el.classList.add('lab-reveal');
      io.observe(el);
    });
  }

  /* Barra de oferta: cerrar y cuenta atrás hasta la fecha real. */
  function offer() {
    var bar = document.getElementById('LabOffer');
    if (!bar) return;
    var x = bar.querySelector('[data-lab-offer-x]');
    if (x) x.addEventListener('click', function () {
      bar.hidden = true;
      store(function () { sessionStorage.setItem('lab-offer', bar.getAttribute('data-lab-offer')); });
    });
    var cd = bar.querySelector('[data-lab-cd]');
    var end = Date.parse(bar.getAttribute('data-end') || '');
    if (!cd || isNaN(end)) return;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function tick() {
      var s = Math.floor((end - Date.now()) / 1000);
      if (s <= 0) { bar.hidden = true; return; }
      var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
      cd.textContent = (d ? d + ' d ' : '') + pad(h) + ':' + pad(m) + ':' + pad(s % 60);
      cd.hidden = false;
      setTimeout(tick, 1000);
    }
    tick();
  }

  /* Menú móvil. */
  function drawer() {
    var open = document.querySelector('[data-lab-drawer-open]');
    var box = document.getElementById('LabMenu');
    if (!open || !box) return;
    var panel = box.querySelector('.lab-drawer__panel');
    function close() {
      if (!box.hasAttribute('open')) return;
      box.removeAttribute('open');
      open.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      open.focus();
    }
    open.addEventListener('click', function () {
      box.setAttribute('open', '');
      open.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      var first = panel.querySelector('a, button:not([data-lab-drawer-close])');
      if (first) first.focus();
    });
    $$('[data-lab-drawer-close]', box).forEach(function (b) { b.addEventListener('click', close); });
    $$('a', panel).forEach(function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) {
      if (!box.hasAttribute('open')) return;
      if (e.key === 'Escape') return close();
      if (e.key !== 'Tab') return;
      var f = $$('a[href], button', panel);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 990) close(); });
  }

  /* Barra de catálogo: marca la categoría que se está viendo. */
  function catbar() {
    $$('[data-lab-catbar]').forEach(function (bar) {
      if (bar.dataset.labInit) return;
      bar.dataset.labInit = '1';
      var row = bar.querySelector('.lab-catbar__chips');
      var chips = $$('a[href^="#"]', bar);
      var map = {};
      chips.forEach(function (c) { var t = document.getElementById(c.getAttribute('href').slice(1)); if (t) map[t.id] = { chip: c, el: t }; });
      var ids = Object.keys(map);
      if (!ids.length) return;
      var current = null;
      function setActive(id) {
        if (id === current) return;
        current = id;
        chips.forEach(function (c) { c.classList.remove('is-active'); c.removeAttribute('aria-current'); });
        if (!id) return;
        var c = map[id].chip;
        c.classList.add('is-active');
        c.setAttribute('aria-current', 'true');
        if (row && row.scrollWidth > row.clientWidth) {
          row.scrollTo({ left: Math.max(0, c.offsetLeft - 16), behavior: reduce ? 'auto' : 'smooth' });
        }
      }
      /* Activa la última categoría cuyo inicio ya pasó bajo la barra. */
      var raf = 0;
      function update() {
        raf = 0;
        var line = bar.getBoundingClientRect().bottom + 48;
        var hit = null;
        ids.forEach(function (id) {
          var r = map[id].el.getBoundingClientRect();
          if (r.top <= line && r.bottom > line - 48) hit = id;
        });
        setActive(hit);
      }
      window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
      update();
    });
  }

  /* Pie: idioma y preferencias de cookies del aviso nativo de Shopify. */
  function footer() {
    $$('[data-lab-autosubmit]').forEach(function (s) { s.addEventListener('change', function () { s.form.submit(); }); });
    var li = document.querySelector('[data-lab-cookies]');
    if (!li) return;
    function check() {
      if (!window.privacyBanner || typeof window.privacyBanner.showPreferences !== 'function') return false;
      li.hidden = false;
      li.querySelector('button').addEventListener('click', function () { window.privacyBanner.showPreferences(); });
      return true;
    }
    if (!check()) window.addEventListener('load', function () { if (!check()) setTimeout(check, 2500); });
  }

  /* Ficha de producto: packs, precios, compra directa, contrareembolso,
     galería y barra fija en móvil. Los importes vienen ya formateados del
     Liquid; aquí solo se cambian. */
  function pdp() {
    $$('[data-lab-pdp]').forEach(function (root) {
      if (root.dataset.labInit) return;
      root.dataset.labInit = '1';
      var pills = $$('input[name="lab-pack"]', root);
      var qty = root.querySelector('[data-lab-qty]');
      var sticky = document.querySelector('[data-lab-sticky="' + root.id + '"]');
      function txt(sel, v, scope) { $$(sel, scope || root).forEach(function (el) { el.textContent = v; }); }
      function show(sel, on, scope) { $$(sel, scope || root).forEach(function (el) { el.hidden = !on; }); }
      function paint() {
        var on = pills.filter(function (p) { return p.checked; })[0] || pills[0];
        if (!on) return;
        var d = on.dataset;
        pills.forEach(function (p) { p.closest('.lab-pill').classList.toggle('is-on', p === on); });
        if (qty) qty.value = d.qty;
        txt('[data-lab-now]', d.net);
        $$('[data-lab-now]', root).forEach(function (el) { el.classList.toggle('is-sale', !!d.was); });
        txt('[data-lab-was]', d.was || ''); show('[data-lab-was]', !!d.was);
        txt('[data-lab-unit]', d.unit);
        txt('[data-lab-save]', d.save || ''); show('[data-lab-save]', !!d.save);
        txt('[data-lab-cod-sub]', d.net);
        txt('[data-lab-cod-total]', d.cod || d.net);
        $$('[data-lab-buy]', root).forEach(function (a) { a.href = d.buy; });
        $$('[data-lab-cod-go]', root).forEach(function (a) { a.href = d.codUrl || d.buy; });
        if (sticky) {
          txt('[data-lab-now]', d.net, sticky);
          txt('[data-lab-sticky-label]', d.label, sticky);
        }
      }
      pills.forEach(function (p) { p.addEventListener('change', paint); });
      var start = parseInt(new URLSearchParams(location.search).get('pack'), 10);
      if (start) pills.forEach(function (p) { if (+p.dataset.qty === start && !p.disabled) p.checked = true; });
      paint();

      var codBtn = root.querySelector('[data-lab-cod-open]');
      var codBox = root.querySelector('[data-lab-cod]');
      if (codBtn && codBox) codBtn.addEventListener('click', function () {
        var open = codBox.hidden;
        codBox.hidden = !open;
        codBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) codBox.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
      });

      var track = root.querySelector('.lab-gal__track');
      var thumbs = $$('.lab-gal__thumbs button', root);
      if (track && thumbs.length) {
        thumbs.forEach(function (b, i) {
          b.addEventListener('click', function () {
            var slide = track.children[i];
            if (slide) track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
          });
        });
        var raf = 0;
        track.addEventListener('scroll', function () {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(function () {
            var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
            thumbs.forEach(function (b, j) { b.setAttribute('aria-current', j === i ? 'true' : 'false'); });
          });
        }, { passive: true });
      }

      var actions = root.querySelector('[data-lab-actions]');
      if (sticky && actions) {
        /* Aparece cuando los botones de compra han quedado por encima. */
        var tick = 0;
        var toggle = function () {
          tick = 0;
          var on = actions.getBoundingClientRect().bottom < 0;
          if (on === sticky.classList.contains('is-on')) return;
          sticky.classList.toggle('is-on', on);
          if (on) sticky.removeAttribute('inert'); else sticky.setAttribute('inert', '');
        };
        window.addEventListener('scroll', function () { if (!tick) tick = requestAnimationFrame(toggle); }, { passive: true });
        toggle();
        var go = sticky.querySelector('[data-lab-sticky-add]');
        if (go) go.addEventListener('click', function () {
          var btn = root.querySelector('product-form [type="submit"]');
          if (btn && btn.getAttribute('aria-disabled') !== 'true' && !btn.disabled) btn.click();
          else actions.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        });
      }
    });
  }

  function init() { reveal(); offer(); drawer(); catbar(); footer(); pdp(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  document.addEventListener('shopify:section:load', function () { catbar(); pdp(); });
})();
