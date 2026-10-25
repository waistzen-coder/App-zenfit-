/* ReliefPath · Lab — comportamiento del tema.
   Sin dependencias. El carrito lo lleva Dawn (product-form + cart-drawer).
   Todo es mejora progresiva: si algo no está soportado, la página queda quieta
   y completa. Con «movimiento reducido» no se anima nada. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var design = !!(window.Shopify && Shopify.designMode);
  var cssOk = function (q) { return !!(window.CSS && CSS.supports && CSS.supports(q)); };
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function store(fn) { try { return fn(); } catch (e) { return null; } }
  function once(el, key) { if (el.dataset[key]) return false; el.dataset[key] = '1'; return true; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  /* Eventos propios para Shopify (Ajustes › Eventos de clientes): miden qué
     piezas ayudan a vender. No hacen nada si la tienda no los recoge. */
  function track(name, data) {
    try { if (window.Shopify && Shopify.analytics && Shopify.analytics.publish) Shopify.analytics.publish(name, data || {}); } catch (e) {}
  }

  /* Un único bucle de scroll por fotograma para todos los módulos. */
  var scrollFns = [], sraf = 0;
  function onScroll(fn) { scrollFns.push(fn); }
  window.addEventListener('scroll', function () {
    if (sraf) return;
    sraf = requestAnimationFrame(function () { sraf = 0; scrollFns.forEach(function (f) { f(); }); });
  }, { passive: true });

  /* Importes: anima entre dos cantidades en céntimos con el mismo formato que
     el texto final que da Shopify (separadores y posición del símbolo). */
  function fmtLike(sample, cents) {
    var m = String(sample).match(/\d[\d.,\s ]*\d|\d/);
    if (!m) return sample;
    var num = m[0], dec = /,\d{2}$/.test(num) ? ',' : (/\.\d{2}$/.test(num) ? '.' : null);
    var thou = dec === ',' ? '.' : ',';
    var neg = cents < 0; cents = Math.abs(Math.round(cents));
    var ent = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, /\d[.,]\d{3}/.test(num) ? thou : '');
    var out = dec ? ent + dec + pad(cents % 100) : ent;
    return sample.slice(0, m.index) + (neg ? '-' : '') + out + sample.slice(m.index + num.length);
  }
  function roll(el, toCents, finalText, animate) {
    if (!el) return;
    var from = parseInt(el.dataset.cents, 10);
    el.dataset.cents = toCents;
    if (reduce || !animate || isNaN(from) || from === toCents) { el._labRoll = (el._labRoll || 0) + 1; el.textContent = finalText; return; }
    /* Si se cambia de pack a mitad, la animación anterior se para. */
    var id = (el._labRoll || 0) + 1, t0 = performance.now(), dur = 520;
    el._labRoll = id;
    el.classList.remove('is-rolling'); void el.offsetWidth; el.classList.add('is-rolling');
    (function step(now) {
      if (el._labRoll !== id) return;
      var k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = k < 1 ? fmtLike(finalText, from + (toCents - from) * e) : finalText;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
    /* Respaldo: el importe final siempre queda escrito aunque la pestaña
       esté en segundo plano y no haya fotogramas. */
    setTimeout(function () { if (el._labRoll === id) el.textContent = finalText; }, dur + 120);
  }

  /* Aparición suave. Donde el navegador tiene animaciones ligadas al scroll lo
     hace el CSS; aquí solo el respaldo, y solo bajo el pliegue. */
  function reveal() {
    if (reduce || design || !('IntersectionObserver' in window) || cssOk('animation-timeline: view()')) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    var limit = window.innerHeight * 0.92;
    $$('[data-lab-reveal]').forEach(function (el) {
      if (!once(el, 'labRv') || el.getBoundingClientRect().top < limit) return;
      el.classList.add('lab-reveal');
      io.observe(el);
    });
  }

  /* Barra de progreso: respaldo para navegadores sin scroll-timeline. */
  function progress() {
    var bar = document.querySelector('.lab-progress');
    if (!bar || cssOk('animation-timeline: scroll()')) return;
    var de = document.documentElement;
    var set = function () { bar.style.setProperty('--lab-p', clamp(de.scrollTop / Math.max(1, de.scrollHeight - innerHeight), 0, 1).toFixed(4)); };
    onScroll(set); set();
  }

  /* Cabecera: sombra al bajar, se esconde al seguir bajando y vuelve al subir. */
  function header() {
    var de = document.documentElement, lastY = window.scrollY, menu = document.getElementById('LabMenu');
    onScroll(function () {
      var y = window.scrollY, dy = y - lastY;
      de.classList.toggle('lab-scrolled', y > 8);
      var busy = (menu && menu.hasAttribute('open')) || document.body.classList.contains('overflow-hidden') ||
        !!document.querySelector('.lab-header :focus-visible');
      if (busy || y < 320) de.classList.remove('lab-hdr-hide');
      else if (dy > 6) de.classList.add('lab-hdr-hide');
      else if (dy < -6) de.classList.remove('lab-hdr-hide');
      lastY = y;
    });
  }

  /* Barra de oferta: cerrar y cuenta atrás hasta la fecha real. */
  function offer() {
    var bar = document.getElementById('LabOffer');
    if (!bar || !once(bar, 'labInit')) return;
    var x = bar.querySelector('[data-lab-offer-x]');
    if (x) x.addEventListener('click', function () {
      bar.hidden = true;
      store(function () { sessionStorage.setItem('lab-offer', bar.getAttribute('data-lab-offer')); });
    });
    var cd = bar.querySelector('[data-lab-cd]');
    var end = Date.parse(bar.getAttribute('data-end') || '');
    if (!cd || isNaN(end)) return;
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
    if (!open || !box || !once(box, 'labInit')) return;
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
      if (!once(bar, 'labInit')) return;
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
      function update() {
        var line = bar.getBoundingClientRect().bottom + 48;
        var hit = null;
        ids.forEach(function (id) {
          var r = map[id].el.getBoundingClientRect();
          if (r.top <= line && r.bottom > line - 48) hit = id;
        });
        setActive(hit);
      }
      onScroll(update); update();
    });
  }

  /* Cifras que cuentan desde cero al entrar en pantalla (el texto final ya
     está en el HTML; esto solo lo anima). */
  function counters() {
    if (reduce || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target, text = el.textContent, nums = [];
        text.replace(/\d+/g, function (n) { nums.push(+n); return n; });
        if (!nums.length) return;
        var t0 = performance.now(), dur = 1300;
        (function step(now) {
          var k = clamp((now - t0) / dur, 0, 1), ease = 1 - Math.pow(2, -10 * k), i = 0;
          el.textContent = k < 1 ? text.replace(/\d+/g, function () { return Math.round(nums[i++] * ease); }) : text;
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    $$('[data-lab-count]').forEach(function (el) { if (once(el, 'labCnt')) io.observe(el); });
  }

  /* Botones magnéticos, foco que sigue al puntero e inclinación 3D. Solo con
     ratón (no en pantallas táctiles) y sin movimiento reducido. */
  function pointerFx() {
    if (reduce || !fine) return;
    $$('[data-lab-magnetic]').forEach(function (el) {
      if (!once(el, 'labMag')) return;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.22, y = (e.clientY - r.top - r.height / 2) * 0.32;
        el.style.transform = 'translate(' + clamp(x, -10, 10) + 'px,' + clamp(y, -8, 8) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
    $$('.lab-spot').forEach(function (el) {
      if (!once(el, 'labSpot')) return;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    $$('.lab-tilt').forEach(function (el) {
      if (!once(el, 'labTilt')) return;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', (px * 6).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-py * 5).toFixed(2) + 'deg');
        el.classList.add('is-tilting');
      });
      el.addEventListener('pointerleave', function () { el.classList.remove('is-tilting'); });
    });
  }

  /* Visor 3D: se carga después de pintar la página (o al acercar el ratón),
     solo con WebGL y sin ahorro de datos. Mientras, se ve el póster, que es
     un render del mismo modelo desde la misma cámara. */
  function stage() {
    $$('[data-lab-stage]').forEach(function (root) {
      if (!once(root, 'labInit')) return;
      var api = null, pending = null, loading = false, src = root.getAttribute('data-src');
      var btns = $$('[data-rp3d-mode]', root);
      function show(m) {
        root.dataset.mode = m;
        btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-rp3d-mode') === m ? 'true' : 'false'); });
      }
      root.addEventListener('rp3d:mode', function (e) { show(e.detail.mode); });
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          var m = b.getAttribute('data-rp3d-mode');
          if (root.dataset.mode === m) m = 'idle';
          show(m);
          track('lab_3d_mode', { mode: m });
          if (api) api.setMode(m); else { pending = m; load(); }
        });
      });
      $$('.lab-stage__dot', root).forEach(function (d) {
        d.addEventListener('click', function () {
          var open = d.getAttribute('aria-expanded') !== 'true';
          $$('.lab-stage__dot', root).forEach(function (o) { o.setAttribute('aria-expanded', 'false'); o.parentNode.classList.remove('is-open'); });
          d.setAttribute('aria-expanded', open ? 'true' : 'false');
          d.parentNode.classList.toggle('is-open', open);
        });
      });
      var c = navigator.connection;
      if (reduce || (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')))) return;
      try { var t = document.createElement('canvas'); if (!(t.getContext('webgl2') || t.getContext('webgl'))) return; } catch (e) { return; }
      function mount() {
        if (!window.RP3D) return;
        api = window.RP3D.mount(root, { seamless: true, idleColor: root.getAttribute('data-idle') || '#dfe5ee' });
        if (api && pending) api.setMode(pending);
      }
      function load() {
        if (loading || !src) return;
        loading = true;
        if (window.RP3D) return mount();
        var s = document.createElement('script');
        s.src = src; s.async = true; s.onload = mount;
        document.head.appendChild(s);
      }
      ['pointerenter', 'focusin'].forEach(function (ev) { root.addEventListener(ev, load, { once: true }); });
      root.addEventListener('touchstart', load, { once: true, passive: true });
      var later = function () { if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 3000 }); else setTimeout(load, 1500); };
      if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
    });
  }

  /* «Cómo usarlo»: el paso más cercano al centro de la pantalla manda; la
     imagen fija cambia y la línea de progreso se llena. */
  function scrolly() {
    $$('[data-lab-scrolly]').forEach(function (root) {
      if (!once(root, 'labInit')) return;
      root.classList.add('lab-js-scrolly');
      var steps = $$('.lab-scrolly__step', root), imgs = $$('.lab-scrolly__frame img', root);
      var list = root.querySelector('.lab-scrolly__steps'), count = root.querySelector('[data-lab-scrolly-count]');
      var cur = -1;
      function set(i) {
        if (i === cur) return;
        cur = i;
        steps.forEach(function (s, j) { s.classList.toggle('is-on', j === i); });
        imgs.forEach(function (im, j) { im.classList.toggle('is-on', j === i); });
        if (count) count.textContent = pad(i + 1) + ' / ' + pad(steps.length);
      }
      function update() {
        var mid = window.innerHeight * 0.55, i = 0;
        steps.forEach(function (s, j) { if (s.getBoundingClientRect().top < mid) i = j; });
        set(i);
        var r = list.getBoundingClientRect();
        list.style.setProperty('--sp', clamp((mid - r.top) / Math.max(1, r.height), 0, 1).toFixed(3));
      }
      onScroll(update); update();
    });
  }

  /* Calculadora de packs: el precio rueda, la píldora se desliza y la barra
     del pack elegido se enciende. */
  function builder() {
    $$('[data-lab-builder]').forEach(function (root) {
      if (!once(root, 'labInit')) return;
      var seg = root.querySelector('.lab-seg'), inputs = $$('input[type="radio"]', root), qty = root.querySelector('[data-lab-qty]');
      var bars = $$('.lab-bar', root), net = root.querySelector('[data-lab-b-net]'), was = root.querySelector('[data-lab-b-was]');
      var save = root.querySelector('[data-lab-b-save]'), unit = root.querySelector('[data-lab-b-unit]'), link = root.querySelector('[data-lab-b-link]');
      var saveRow = root.querySelector('[data-lab-b-saverow]'), live = root.querySelector('[data-lab-b-live]');
      function paint(animate) {
        var on = inputs.filter(function (i) { return i.checked; })[0] || inputs[0];
        if (!on) return;
        var d = on.dataset;
        seg.setAttribute('data-i', d.qty);
        if (qty) qty.value = d.qty;
        roll(net, +d.netCents, d.net, animate);
        if (was) { was.textContent = d.was || ''; was.hidden = !d.was; }
        if (save) save.textContent = d.save || '';
        if (saveRow) saveRow.hidden = !d.save;
        if (unit) unit.textContent = d.unit;
        if (link) link.href = link.getAttribute('data-base') + '?pack=' + d.qty;
        bars.forEach(function (b, j) { b.classList.toggle('is-on', j === +d.qty - 1); });
        if (live && animate) live.textContent = d.label + ': ' + d.net;
      }
      inputs.forEach(function (i) { i.addEventListener('change', function () { paint(true); track('lab_pack_select', { qty: +i.value, place: 'calculadora' }); }); });
      paint(false);
      var chart = root.querySelector('.lab-bars');
      if (chart && !reduce && 'IntersectionObserver' in window && chart.getBoundingClientRect().top > innerHeight * 0.8) {
        chart.classList.add('is-armed');
        var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { chart.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.4 });
        io.observe(chart);
      }
    });
  }

  /* Ficha de producto: packs, precios, compra directa, contrareembolso,
     galería con zoom y visor, y barra fija en móvil. */
  function pdp() {
    $$('[data-lab-pdp]').forEach(function (root) {
      if (!once(root, 'labInit')) return;
      var pills = $$('input[name="lab-pack"]', root);
      var qty = root.querySelector('[data-lab-qty]');
      var sticky = document.querySelector('[data-lab-sticky="' + root.id + '"]');
      function txt(sel, v, scope) { $$(sel, scope || root).forEach(function (el) { el.textContent = v; }); }
      function show(sel, on, scope) { $$(sel, scope || root).forEach(function (el) { el.hidden = !on; }); }
      function paint(animate) {
        var on = pills.filter(function (p) { return p.checked; })[0] || pills[0];
        if (!on) return;
        var d = on.dataset;
        pills.forEach(function (p) { p.closest('.lab-pill').classList.toggle('is-on', p === on); });
        if (qty) qty.value = d.qty;
        $$('[data-lab-now]', root).forEach(function (el) { roll(el, +d.netCents, d.net, animate); el.classList.toggle('is-sale', !!d.was); });
        txt('[data-lab-was]', d.was || ''); show('[data-lab-was]', !!d.was);
        txt('[data-lab-unit]', d.unit);
        txt('[data-lab-save]', d.save || ''); show('[data-lab-save]', !!d.save);
        txt('[data-lab-cod-sub]', d.net);
        roll(root.querySelector('[data-lab-cod-total]'), +d.codCents, d.cod || d.net, animate);
        $$('[data-lab-buy]', root).forEach(function (a) { a.href = d.buy; });
        $$('[data-lab-pick]', root).forEach(function (b) { b.hidden = d.qty !== '1'; });
        $$('[data-lab-cod-go]', root).forEach(function (a) { a.href = d.codUrl || d.buy; });
        if (sticky) {
          roll(sticky.querySelector('[data-lab-now]'), +d.netCents, d.net, animate);
          txt('[data-lab-sticky-label]', d.label, sticky);
        }
      }
      pills.forEach(function (p) { p.addEventListener('change', function () { paint(true); track('lab_pack_select', { qty: +p.value, place: 'ficha' }); }); });
      $$('[data-lab-pick]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          var to = pills.filter(function (p) { return p.value === b.getAttribute('data-lab-pick') && !p.disabled; })[0];
          if (!to) return;
          to.checked = true;
          to.dispatchEvent(new Event('change', { bubbles: true }));
          to.closest('.lab-pill').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        });
      });
      $$('[data-lab-buy]', root).forEach(function (a) { a.addEventListener('click', function () { track('lab_buy_now', { qty: +(qty && qty.value || 1) }); }); });
      $$('[data-lab-cod-go]', root).forEach(function (a) { a.addEventListener('click', function () { track('lab_cod_checkout', { qty: +(qty && qty.value || 1) }); }); });
      var start = parseInt(new URLSearchParams(location.search).get('pack'), 10);
      if (start) pills.forEach(function (p) { if (+p.dataset.qty === start && !p.disabled) p.checked = true; });
      paint(false);

      var codBtn = root.querySelector('[data-lab-cod-open]');
      var codBox = root.querySelector('[data-lab-cod]');
      if (codBtn && codBox) codBtn.addEventListener('click', function () {
        var open = codBox.hidden;
        codBox.hidden = !open;
        codBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) { codBox.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' }); track('lab_cod_open', {}); }
      });

      var gal = root.querySelector('.lab-gal__track'), galCount = root.querySelector('[data-lab-gal-count]');
      var thumbs = $$('.lab-gal__thumbs button', root);
      if (gal && (thumbs.length || galCount)) {
        thumbs.forEach(function (b, i) {
          b.addEventListener('click', function () {
            var slide = gal.children[i];
            if (slide) gal.scrollTo({ left: slide.offsetLeft - gal.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
          });
        });
        var raf = 0;
        gal.addEventListener('scroll', function () {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(function () {
            var i = Math.round(gal.scrollLeft / Math.max(1, gal.clientWidth));
            thumbs.forEach(function (b, j) { b.setAttribute('aria-current', j === i ? 'true' : 'false'); });
            if (galCount) galCount.textContent = pad(i + 1) + ' / ' + pad(gal.children.length);
          });
        }, { passive: true });
      }
      if (gal) gallery(root, gal);

      var actions = root.querySelector('[data-lab-actions]');
      if (sticky && actions) {
        /* Visible siempre que los botones de compra no estén en pantalla (por
           debajo, al entrar en el móvil, o por encima, al seguir bajando). */
        var toggle = function () {
          var r = actions.getBoundingClientRect();
          var on = r.bottom < 0 || r.top > window.innerHeight - 40;
          if (on === sticky.classList.contains('is-on')) return;
          sticky.classList.toggle('is-on', on);
          document.documentElement.classList.toggle('lab-has-sticky', on);
          if (on) sticky.removeAttribute('inert'); else sticky.setAttribute('inert', '');
        };
        onScroll(toggle); toggle();
        var go = sticky.querySelector('[data-lab-sticky-add]');
        if (go) go.addEventListener('click', function () {
          var btn = root.querySelector('product-form [type="submit"]');
          if (btn && btn.getAttribute('aria-disabled') !== 'true' && !btn.disabled) btn.click();
          else actions.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        });
      }
    });
  }

  /* Galería: zoom que sigue al ratón y visor a pantalla completa (dialog). */
  function gallery(root, trk) {
    var slides = $$('.lab-gal__slide', trk);
    if (fine) slides.forEach(function (sl) {
      var img = sl.querySelector('img');
      if (!img) return;
      sl.addEventListener('pointermove', function (e) {
        var r = sl.getBoundingClientRect();
        img.style.transformOrigin = ((e.clientX - r.left) / r.width * 100).toFixed(1) + '% ' + ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%';
      });
      sl.addEventListener('pointerenter', function () { sl.classList.add('is-zoom'); });
      sl.addEventListener('pointerleave', function () { sl.classList.remove('is-zoom'); });
    });
    var dlg = null;
    function build() {
      dlg = document.createElement('dialog');
      dlg.className = 'lab lab-lightbox';
      dlg.setAttribute('aria-label', root.getAttribute('data-lab-gallery-label') || '');
      var t = document.createElement('div'); t.className = 'lab-lightbox__track';
      slides.forEach(function (sl) {
        var im = sl.querySelector('img'); if (!im) return;
        var f = document.createElement('figure'), big = document.createElement('img');
        big.src = sl.getAttribute('data-full') || im.currentSrc || im.src; big.alt = im.alt; big.loading = 'lazy'; big.decoding = 'async';
        f.appendChild(big); t.appendChild(f);
      });
      var close = document.createElement('button');
      close.type = 'button'; close.className = 'lab-icon-btn lab-lightbox__close';
      close.setAttribute('aria-label', root.getAttribute('data-lab-close-label') || 'Cerrar');
      close.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
      close.addEventListener('click', function () { dlg.close(); });
      var count = document.createElement('span'); count.className = 'lab-mono lab-lightbox__count';
      t.addEventListener('scroll', function () { count.textContent = pad(Math.round(t.scrollLeft / Math.max(1, t.clientWidth)) + 1) + ' / ' + pad(t.children.length); }, { passive: true });
      dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.tagName === 'FIGURE') dlg.close(); });
      dlg.appendChild(count); dlg.appendChild(t); dlg.appendChild(close);
      document.body.appendChild(dlg);
    }
    slides.forEach(function (sl, i) {
      sl.setAttribute('role', 'button'); sl.setAttribute('tabindex', '0');
      var open = function () {
        if (!dlg) build();
        dlg.showModal();
        track('lab_gallery_zoom', { image: i + 1 });
        var t = dlg.querySelector('.lab-lightbox__track');
        t.scrollLeft = i * t.clientWidth;
        dlg.querySelector('.lab-lightbox__count').textContent = pad(i + 1) + ' / ' + pad(t.children.length);
      };
      sl.addEventListener('click', open);
      sl.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }

  /* Vuelo al carrito: la foto del producto viaja hasta el icono del carrito y
     el contador da un salto. El carrito lateral de Dawn hace el resto. */
  function fly() {
    if (reduce || !Element.prototype.animate) return;
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('product-form [type="submit"]');
      if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
      var img = null, card = btn.closest('.lab-pc'), page = btn.closest('[data-lab-pdp]'), calc = btn.closest('[data-lab-builder]');
      if (card) img = card.querySelector('.lab-pc__media img');
      else if (page) {
        var tr = page.querySelector('.lab-gal__track');
        var i = tr ? Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth)) : 0;
        img = tr && (tr.children[i] || tr.children[0]).querySelector('img');
      } else if (calc) img = calc.querySelector('[data-lab-fly-src]');
      var cart = document.getElementById('cart-icon-bubble');
      if (!img || !cart) return;
      document.documentElement.classList.remove('lab-hdr-hide');
      var a = img.getBoundingClientRect(), t = cart.getBoundingClientRect();
      if (!a.width || a.bottom < 0 || a.top > innerHeight) { bump(cart); return; }
      var size = Math.min(a.width, a.height, 140);
      var el = document.createElement('div');
      el.className = 'lab-fly';
      el.style.cssText = 'left:' + (a.left + a.width / 2 - size / 2) + 'px;top:' + (a.top + a.height / 2 - size / 2) + 'px;width:' + size + 'px;height:' + size + 'px';
      var c = document.createElement('img'); c.src = img.currentSrc || img.src; c.alt = '';
      el.appendChild(c); document.body.appendChild(el);
      var dx = t.left + t.width / 2 - (a.left + a.width / 2), dy = t.top + t.height / 2 - (a.top + a.height / 2);
      var anim = el.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + dx * 0.45 + 'px,' + (dy * 0.45 - 90) + 'px) scale(.6)', opacity: 1, offset: 0.55 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.12)', opacity: 0.3 }
      ], { duration: 720, easing: 'cubic-bezier(.5,0,.3,1)' });
      anim.onfinish = function () { el.remove(); bump(cart); };
    }, true);
    function bump(cart) { cart.classList.remove('is-bump'); void cart.offsetWidth; cart.classList.add('is-bump'); }
  }

  /* Carrito lateral: «Pasa al pack de 2/3» cambia la cantidad de la línea con
     el propio método de Dawn, que vuelve a pintar el carrito con el descuento. */
  function upsell() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-lab-upsell]');
      if (!b) return;
      var items = document.querySelector('cart-drawer-items') || document.querySelector('cart-items');
      if (!items || typeof items.updateQuantity !== 'function') return;
      b.setAttribute('aria-disabled', 'true');
      track('lab_upsell', { qty: +b.getAttribute('data-qty') });
      items.updateQuantity(+b.getAttribute('data-line'), +b.getAttribute('data-qty'), e, 'updates[]', b.getAttribute('data-variant'));
    });
  }

  /* Pagar desde el carrito: el idioma principal de la tienda es el inglés, así
     que el botón de Dawn llevaría a un checkout en inglés. Se va al checkout
     con un enlace de carrito (las mismas líneas) en el idioma de los ajustes
     y, si es 1 unidad, con el código de primera compra. Si algo falla, se
     paga como siempre. */
  function checkout() {
    var cfg = window.labCfg || {};
    if (!cfg.locale && !cfg.code) return;
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('#CartDrawer-Checkout, #checkout');
      if (!b || b.disabled || b.getAttribute('aria-disabled') === 'true') return;
      e.preventDefault();
      var base = (window.routes && window.routes.cart_url) || '/cart';
      var fallback = function () {
        var f = b.form || document.getElementById(b.getAttribute('form'));
        if (!f) { location.href = base; return; }
        var i = document.createElement('input'); i.type = 'hidden'; i.name = 'checkout'; f.appendChild(i);
        HTMLFormElement.prototype.submit.call(f);
      };
      b.setAttribute('aria-disabled', 'true');
      fetch(base + '.js', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (c) {
          if (!c || !c.items || !c.items.length) return fallback();
          var units = 0, lines = c.items.map(function (i) { units += i.quantity; return i.variant_id + ':' + i.quantity; }).join(',');
          var q = [];
          if (cfg.locale) q.push('locale=' + encodeURIComponent(cfg.locale));
          if (cfg.code && units === 1) q.push('discount=' + encodeURIComponent(cfg.code));
          Object.keys(c.attributes || {}).forEach(function (k) { q.push('attributes%5B' + encodeURIComponent(k) + '%5D=' + encodeURIComponent(c.attributes[k])); });
          if (c.note) q.push('note=' + encodeURIComponent(c.note));
          track('lab_checkout', { units: units });
          location.href = base + '/' + lines + (q.length ? '?' + q.join('&') : '');
        })
        .catch(fallback);
    }, true);
  }

  /* Transición entre páginas: la foto de la tarjeta pulsada recibe el nombre
     que tiene la primera foto de la ficha, y el navegador las une. */
  function transitions() {
    if (!('onpagereveal' in window) && !document.startViewTransition) return;
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="/products/"]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      var holder = a.closest('.lab-pc, .lab-float__card');
      var img = holder && holder.querySelector('img');
      $$('[style*="view-transition-name"]').forEach(function (el) { el.style.viewTransitionName = ''; });
      if (img) img.style.viewTransitionName = 'lab-product-img';
    });
    window.addEventListener('pageshow', function () {
      $$('img[style*="view-transition-name"]').forEach(function (el) { el.style.viewTransitionName = ''; });
    });
  }

  /* Pie: idioma y preferencias de cookies del aviso nativo de Shopify. */
  function footer() {
    $$('[data-lab-autosubmit]').forEach(function (s) { if (once(s, 'labInit')) s.addEventListener('change', function () { s.form.submit(); }); });
    var li = document.querySelector('[data-lab-cookies]');
    if (!li || !once(li, 'labInit')) return;
    function check() {
      if (!window.privacyBanner || typeof window.privacyBanner.showPreferences !== 'function') return false;
      li.hidden = false;
      li.querySelector('button').addEventListener('click', function () { window.privacyBanner.showPreferences(); });
      return true;
    }
    if (!check()) window.addEventListener('load', function () { if (!check()) setTimeout(check, 2500); });
  }

  function sections() { reveal(); offer(); drawer(); catbar(); counters(); pointerFx(); stage(); scrolly(); builder(); pdp(); footer(); }
  function init() { sections(); progress(); header(); fly(); upsell(); checkout(); transitions(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  document.addEventListener('shopify:section:load', sections);
})();
