// Ejecuta el JavaScript real de la sección contra su HTML real y hace pedidos.
const fs = require('fs');
const { JSDOM } = require('jsdom');

const file = fs.readFileSync(__dirname + '/cod.html', 'utf8');
// El <script> de comportamiento es el único sin atributo type.
const code = file.match(/<script>([\s\S]*?)<\/script>/)[1];

let nav = null;

// 'outside-only' impide que el script se ejecute al parsear: así lo lanzamos
// nosotros con un window propio cuyo location podemos observar. Todo lo demás
// (document, Event, localStorage, Date) sigue siendo el de jsdom.
const dom = new JSDOM(file, {
  url: 'https://waistzen.com/products/juego-de-ventosa-electrica-con-cable',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});

const realWindow = dom.window;
realWindow.Shopify = { routes: { root: '/' } };
realWindow.HTMLElement.prototype.scrollIntoView = function () {};
realWindow.__skew = 0;
const realNow = realWindow.Date.now.bind(realWindow.Date);
realWindow.Date.now = () => realNow() + realWindow.__skew;

const locStub = { get href() { return nav || ''; }, set href(v) { nav = v; } };
const fakeWindow = new Proxy(realWindow, {
  get(t, k) {
    if (k === 'location') return locStub;
    const v = t[k];
    return typeof v === 'function' ? v.bind(t) : v;
  },
  set(t, k, v) {
    if (k === 'location') { nav = v; return true; }
    t[k] = v; return true;
  },
  has(t, k) { return k in t; }
});

realWindow.eval('(function (window) {' + code + '\n})')(fakeWindow);

const w = dom.window, d = w.document;
const $ = (s) => d.querySelector(s);
const f = (n) => d.querySelector('[data-cod="' + n + '"]');
const ev = (el, t) => el.dispatchEvent(new w.Event(t, { bubbles: true }));

function set(n, v) { const el = f(n); el.value = v; ev(el, 'input'); ev(el, 'change'); }
function check(n, on = true) { const el = f(n); el.checked = on; ev(el, 'change'); }
function way(k) { d.querySelector('[data-calmia-way="' + k + '"]').click(); }
function pack(i) { d.querySelectorAll('[data-calmia-pack]')[i].click(); }
function press() {
  nav = null;
  const b = $('[data-calmia-cod-submit]');
  b.disabled = false;                 // en la web real la página ya habría navegado
  b.click();
  return nav;
}
function buyKeep() { w.__skew += 10000; return press(); }
function buy() { w.localStorage.clear(); return buyKeep(); }
function errors() {
  return Array.from(d.querySelectorAll('[data-cod-err]'))
    .filter((e) => !e.hidden && e.textContent.trim())
    .map((e) => e.getAttribute('data-cod-err') + ': ' + e.textContent.trim());
}
function fill(over = {}) {
  const base = {
    name: 'María García López', phone: '645 210 337', email: 'maria.garcia@gmail.com',
    zip: '28806', city: 'Alcalá de Henares', address: 'Calle Mayor, 24',
    floor: '3º B, escalera izquierda', slot: 'Tarde (14:00 - 19:00)', backup: 'Mi vecina del 2º A'
  };
  Object.assign(base, over);
  for (const k of Object.keys(base)) set(k, base[k]);
  check('cash'); check('home');
}

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); console.log('  ✓ ' + name); pass++; }
  catch (e) { console.log('  ✗ ' + name + '\n      ' + e.message); fail++; }
}
const eq = (a, b, m) => { if (a !== b) throw new Error((m || '') + '\n      esperado: ' + b + '\n      obtenido: ' + a); };
const has = (s, sub) => { if (!String(s).includes(sub)) throw new Error('falta «' + sub + '» en:\n      ' + s); };

console.log('\n── Estado inicial ──');
t('arranca en tarjeta, sin cuestionario', () => {
  eq($('[data-calmia-cod-form]').hidden, true, 'el cuestionario debería estar oculto');
  eq($('[data-calmia-cod-btntext]').textContent, 'Comprar ahora');
  eq($('[data-calmia-cod-btnprice]').textContent, '49,95 €');
});
t('el aviso del checkout está oculto en tarjeta', () => {
  eq($('[data-calmia-cod-note]').hidden, true);
});

console.log('\n── Compra con tarjeta ──');
t('tarjeta, 1 ud → carrito sin recargo y sin datos personales', () => {
  const u = buy();
  eq(u, '/cart/59286832939353:1', 'la URL de tarjeta debe ser limpia');
});
t('tarjeta, 3 uds → precio con -30% en el botón', () => {
  pack(2);
  eq($('[data-calmia-cod-btnprice]').textContent, '104,89 €');
  eq(buy(), '/cart/59286832939353:3');
});

console.log('\n── Cambio a contrareembolso ──');
t('aparece el cuestionario y cambian botón y aviso', () => {
  pack(0); way('cod');
  eq($('[data-calmia-cod-form]').hidden, false);
  eq($('[data-calmia-cod-note]').hidden, false);
  eq($('[data-calmia-cod-btntext]').textContent, 'Pedir contrareembolso');
  eq($('[data-calmia-cod-btnprice]').textContent, '54,95 €');
});
t('el compromiso muestra el importe exacto', () => {
  has($('[data-cod-cash-text]').textContent, '54,95 €');
});
t('enviado al instante → lo frena el filtro antibots', () => {
  fill();
  eq(press(), null, 'sin avanzar el reloj no debería dejar enviar');
});

console.log('\n── El formulario no deja pasar basura ──');
function clear() {
  for (const k of ['name','phone','email','zip','city','address','floor','slot','backup']) set(k, '');
  check('cash', false); check('home', false);
}
t('vacío → no navega y marca 8 errores', () => {
  clear();
  eq(buy(), null, 'no debería navegar con el formulario vacío');
  eq(errors().length, 8, 'errores: ' + JSON.stringify(errors()));
});
t('móvil falso (666 666 666) → rechazado', () => {
  fill({ phone: '666 666 666' });
  eq(buy(), null);
  has(errors().join(' '), 'phone');
});
t('móvil fijo (912…) → rechazado', () => {
  fill({ phone: '912 345 678' }); eq(buy(), null); has(errors().join(' '), 'phone');
});
t('calle sin número → rechazado con el motivo correcto', () => {
  fill({ address: 'Calle Mayor' });
  eq(buy(), null);
  has(errors().join(' '), 'Falta el número de la calle');
});
t('nombre de una sola palabra → rechazado', () => {
  fill({ name: 'María' }); eq(buy(), null); has(errors().join(' '), 'name');
});
t('correo sin dominio → rechazado', () => {
  fill({ email: 'maria@correo' }); eq(buy(), null); has(errors().join(' '), 'email');
});
t('CP de Las Palmas → bloqueado y se ofrece tarjeta', () => {
  fill({ zip: '35001', city: 'Las Palmas de Gran Canaria' });
  eq(buy(), null);
  has(d.querySelector('[data-cod-blocked]').textContent, 'Las Palmas');
  eq(d.querySelector('[data-cod-blocked]').hidden, false);
});
t('sin marcar los compromisos → rechazado', () => {
  fill(); check('cash', false);
  eq(buy(), null);
  has(errors().join(' '), 'importe');
});
t('trampa de robots rellena → no navega', () => {
  fill();
  const hp = d.querySelector('[data-cod-hp]'); hp.value = 'http://spam';
  eq(buy(), null, 'un bot no debería poder pedir');
  hp.value = '';
});

console.log('\n── Pedido bueno ──');
let url = null;
t('rellenado correcto → navega', () => {
  fill();
  d.querySelector('[data-cod-hp]').value = '';
  url = buy();
  if (!url) throw new Error('no navegó. errores: ' + JSON.stringify(errors()));
  eq(errors().length, 0, 'no debería quedar ningún error');
});
t('lleva el aparato y el recargo, en ese orden', () => {
  has(url, '/cart/59286832939353:1,59250983928153:1');
});
t('el importe a cobrar viaja en los atributos', () => {
  has(decodeURIComponent(url), 'attributes[Importe a cobrar]=54,95 €');
});
t('el teléfono viaja normalizado, sin espacios', () => {
  has(decodeURIComponent(url), 'attributes[Telefono de reparto]=645210337');
});
t('la provincia se dedujo del CP', () => {
  has(decodeURIComponent(url), 'checkout[shipping_address][province]=Madrid');
});
t('la dirección y el piso van a los campos del checkout', () => {
  const u = decodeURIComponent(url);
  has(u, 'checkout[shipping_address][address1]=Calle Mayor, 24');
  has(u, 'checkout[shipping_address][address2]=3º B, escalera izquierda');
  has(u, 'checkout[shipping_address][zip]=28806');
  has(u, 'checkout[shipping_address][country]=Spain');
});
t('el nombre se parte en nombre y apellidos', () => {
  const u = decodeURIComponent(url);
  has(u, 'first_name]=María');
  has(u, 'last_name]=García López');
});
t('todo lo que escribió el comprador llega como atributo del pedido', () => {
  const u = decodeURIComponent(url);
  has(u, 'attributes[Nombre declarado]=María García López');
  has(u, 'attributes[Correo declarado]=maria.garcia@gmail.com');
  has(u, 'attributes[Pack]=1 unidad');
  has(u, 'attributes[Piso y puerta]=3º B, escalera izquierda');
  has(u, 'attributes[Franja horaria]=Tarde (14:00 - 19:00)');
  has(u, 'attributes[Puede recogerlo]=Mi vecina del 2º A');
  has(u, 'attributes[Avisar por WhatsApp]=Si');
  has(u, 'attributes[Compromiso de pago]=Aceptado ');
});
t('la nota va en varias líneas y no se corta', () => {
  const u = decodeURIComponent(url);
  const note = u.split('note=')[1].split('&checkout')[0];
  const lines = note.split('\n');
  if (lines.length < 9) throw new Error('la nota solo tiene ' + lines.length + ' líneas:\n      ' + note);
  eq(lines[0], 'CONTRAREEMBOLSO · COBRAR 54,95 €');
  has(note, 'Nombre: María García López');
  has(note, 'Teléfono: 645210337');
  has(note, 'Correo: maria.garcia@gmail.com');
  has(note, 'Dirección: Calle Mayor, 24, 3º B, escalera izquierda · 28806 Alcalá de Henares (Madrid)');
  has(note, 'Entrega: Tarde (14:00 - 19:00)');
  has(note, 'Si no está, recoge: Mi vecina del 2º A');
  has(note, 'Avisar por WhatsApp: sí');
  has(note, 'Compromiso aceptado: ');
  if (note.length > 880) throw new Error('la nota roza el tope: ' + note.length);
  console.log('      (' + lines.length + ' líneas, ' + note.length + ' caracteres)');
});
t('la URL se queda en un tamaño cómodo', () => {
  if (url.length > 2000) throw new Error('URL de ' + url.length + ' caracteres, demasiado larga');
  console.log('      (' + url.length + ' caracteres)');
});

t('dirección larguísima → la URL se recorta sola y sigue siendo válida', () => {
  fill({ address: 'Avenida de la Constitución Española de mil novecientos setenta y ocho, 128',
         city: 'Santa María de los Caballeros del Camino Real', backup: 'X'.repeat(120) });
  const u = buy();
  if (!u) throw new Error('debería seguir pasando');
  if (u.length > 4200) throw new Error('sigue midiendo ' + u.length);
  const d = decodeURIComponent(u);
  has(d, 'checkout[shipping_address][zip]=28806');
  has(d, 'note=CONTRAREEMBOLSO');          // la nota sobrevive: es lo que se lee
  console.log('      (' + u.length + ' caracteres, sin perder nada)');
});

console.log('\n── Contrareembolso con pack de 2 ──');
t('2 uds → 84,92 € y cantidad 2 en el carrito', () => {
  pack(1);
  eq($('[data-calmia-cod-btnprice]').textContent, '84,92 €');
  has($('[data-cod-cash-text]').textContent, '84,92 €');
  fill();
  const u = buy();
  has(u, '/cart/59286832939353:2,59250983928153:1');
  has(decodeURIComponent(u), 'attributes[Importe a cobrar]=84,92 €');
});

console.log('\n── Pedido duplicado ──');
t('mismo móvil dos veces seguidas → avisa antes de dejar pasar', () => {
  pack(0); fill();
  const first = buy();          // limpia y guarda este móvil
  if (!first) throw new Error('el primero debería pasar');
  eq(buyKeep(), null, 'el segundo debería frenarse y avisar');
  has(d.querySelector('[data-cod-err="global"]').textContent, 'Ya has hecho un pedido');
  if (!buyKeep()) throw new Error('al insistir debería dejar pasar');
});

console.log('\n' + (fail ? '✗ ' + fail + ' fallos' : '✓ todo correcto') + ' · ' + pass + ' comprobaciones pasadas\n');
process.exit(fail ? 1 : 0);
