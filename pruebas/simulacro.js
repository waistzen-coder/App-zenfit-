// Un pedido completo, narrado, más una tanda de datos retorcidos.
const fs = require('fs');
const { JSDOM } = require('jsdom');

const file = fs.readFileSync(__dirname + '/cod.html', 'utf8');
const code = file.match(/<script>([\s\S]*?)<\/script>/)[1];
let nav = null;

const dom = new JSDOM(file, {
  url: 'https://waistzen.com/products/juego-de-ventosa-electrica-con-cable',
  runScripts: 'outside-only', pretendToBeVisual: true
});
const w = dom.window, d = w.document;
w.Shopify = { routes: { root: '/' } };
w.HTMLElement.prototype.scrollIntoView = function () {};
w.__skew = 0;
const realNow = w.Date.now.bind(w.Date);
w.Date.now = () => realNow() + w.__skew;
const locStub = { get href() { return nav || ''; }, set href(v) { nav = v; } };
w.eval('(function (window) {' + code + '\n})')(new Proxy(w, {
  get(t, k) { if (k === 'location') return locStub; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; },
  set(t, k, v) { if (k === 'location') { nav = v; return true; } t[k] = v; return true; },
  has(t, k) { return k in t; }
}));

const $ = (s) => d.querySelector(s);
const f = (n) => d.querySelector('[data-cod="' + n + '"]');
const ev = (el, t) => el.dispatchEvent(new w.Event(t, { bubbles: true }));
const set = (n, v) => { const el = f(n); el.value = v; ev(el, 'input'); ev(el, 'change'); };
const check = (n, on = true) => { const el = f(n); el.checked = on; ev(el, 'change'); };
const way = (k) => d.querySelector('[data-calmia-way="' + k + '"]').click();
const pack = (i) => d.querySelectorAll('[data-calmia-pack]')[i].click();
function press() { nav = null; const b = $('[data-calmia-cod-submit]'); b.disabled = false; b.click(); return nav; }
function buy() { w.localStorage.clear(); w.__skew += 10000; return press(); }
const errs = () => Array.from(d.querySelectorAll('[data-cod-err]'))
  .filter((e) => !e.hidden && e.textContent.trim()).map((e) => e.textContent.trim());

let bad = 0;
const ok = (cond, msg) => { console.log((cond ? '   ✓ ' : '   ✗ ') + msg); if (!cond) bad++; };

console.log('\n════════ SIMULACRO DE UN PEDIDO ════════\n');

console.log('1. La clienta abre la página.');
console.log('   Empieza en:', $('[data-calmia-cod-btntext]').textContent, '—', $('[data-calmia-cod-btnprice]').textContent);
ok($('[data-calmia-cod-form]').hidden, 'el cuestionario no la abruma: está plegado');

console.log('\n2. Elige el pack de 2 unidades.');
pack(1);
console.log('   Botón:', $('[data-calmia-cod-btnprice]').textContent, '· contrareembolso:', $('[data-cod-price], [data-calmia-cod-codprice]').textContent);
ok($('[data-calmia-cod-cardprice]').textContent === '79,92 €', 'tarjeta 79,92 € (99,90 − 20 %)');
ok($('[data-calmia-cod-codprice]').textContent === '84,92 €', 'contrareembolso 84,92 € (79,92 + 5)');

console.log('\n3. Prefiere pagar al repartidor.');
way('cod');
ok(!$('[data-calmia-cod-form]').hidden, 'se despliega el cuestionario');
ok(!$('[data-calmia-cod-note]').hidden, 'aparece el aviso de elegir contrareembolso en el pago');
ok($('[data-cod-cash-text]').textContent.includes('84,92 €'), 'el compromiso dice el importe exacto: 84,92 €');

console.log('\n4. Escribe sus datos.');
const datos = {
  name: 'Mª Ángeles Fernández-Bermúdez', phone: '+34 645 21 03 37',
  email: 'm.angeles+tienda@correo.es', zip: '01001', city: 'Vitoria-Gasteiz',
  address: "Calle Nueva Dentro, 3 (esq. C/ Postas) & 5", floor: "1º Izq., portal B",
  slot: 'Mañana (9:00 - 14:00)', backup: 'Mi madre = Pilar & mi vecino'
};
for (const k of Object.keys(datos)) set(k, datos[k]);
console.log('   Teléfono escrito:', datos.phone, '→ eco:', $('[data-cod-phone-echo]').textContent || '(nada)');
ok(f('province').value === 'Álava', 'del CP 01001 deduce Álava (con el cero delante)');
ok(!$('[data-cod-phone-echo]').hidden, 'acepta el móvil con prefijo +34 y espacios');
console.log('   Resumen en pantalla:', $('[data-cod-sum-where]').textContent);

console.log('\n5. Intenta enviar sin marcar los compromisos.');
ok(buy() === null, 'no la deja pasar');
console.log('   Le dice:', errs().join(' / '));

console.log('\n6. Los marca y envía.');
check('cash'); check('home');
const url = buy();
ok(!!url, 'el pedido sale');
if (!url) { console.log('   errores:', errs()); process.exit(1); }

console.log('\n════════ LO QUE LE LLEGA A SHOPIFY ════════\n');
const U = new w.URL(url, 'https://waistzen.com');
console.log('Carrito:', U.pathname);
ok(U.pathname === '/cart/59286832939353:2,59250983928153:1', '2 aparatos + 1 recargo');

const p = U.searchParams;
console.log('\n── Nota del pedido ──');
console.log(p.get('note').split('\n').map((l) => '   ' + l).join('\n'));

console.log('\n── Detalles adicionales ──');
for (const [k, v] of p.entries()) if (k.startsWith('attributes')) console.log('   ' + k.replace(/^attributes\[|\]$/g, '').padEnd(22) + v);

console.log('\n── Dirección que ve el transportista ──');
for (const [k, v] of p.entries()) if (k.startsWith('checkout')) console.log('   ' + k.replace('checkout[shipping_address]', '').replace(/[\[\]]/g, ' ').trim().padEnd(22) + v);

console.log('\n════════ ¿SE HA CORROMPIDO ALGO? ════════\n');
ok(p.get('attributes[Nombre declarado]') === datos.name, 'el nombre con Mª, tildes y guion llega intacto');
ok(p.get('attributes[Telefono de reparto]') === '645210337', 'el móvil se limpia de +34 y espacios');
ok(p.get('attributes[Correo declarado]') === datos.email, 'el correo con + llega intacto');
ok(p.get('attributes[Puede recogerlo]') === datos.backup, 'los & y = del texto NO parten el enlace');
ok(p.get('attributes[Piso y puerta]') === datos.floor, 'el piso con comas y puntos llega intacto');
ok(p.get('checkout[shipping_address][address1]') === datos.address, 'la dirección con paréntesis, & y barras llega intacta');
ok(p.get('checkout[shipping_address][province]') === 'Álava', 'la provincia va con tilde');
ok(p.get('checkout[shipping_address][zip]') === '01001', 'el CP conserva el cero delante');
ok(p.get('checkout[shipping_address][first_name]') === 'Mª', 'nombre de pila separado');
ok(p.get('checkout[shipping_address][last_name]') === 'Ángeles Fernández-Bermúdez', 'apellidos separados');
ok(p.get('attributes[Importe a cobrar]') === '84,92 €', 'el importe del pack elegido, no el de una unidad');
ok(p.get('note').includes('COBRAR 84,92 €'), 'la nota lleva el mismo importe');
ok(p.get('note').includes('Pilar & mi vecino'), 'la nota conserva los símbolos raros');
ok(Array.from(p.keys()).length === 22, 'llegan los 22 campos: 11 atributos + nota + 10 del checkout');
ok(url.length < 2600, 'el enlace mide ' + url.length + ' caracteres');

console.log('\n════════ MÁS INTENTOS DE ROMPERLO ════════\n');
function intento(nombre, cambios, debePasar) {
  way('card'); way('cod');
  for (const k of Object.keys(datos)) set(k, k in cambios ? cambios[k] : datos[k]);
  check('cash'); check('home');
  const r = buy();
  ok(debePasar ? !!r : r === null, nombre + (debePasar ? '' : ' → ' + (errs()[0] || 'frenado')));
  return r;
}
intento('móvil que empieza por 7 (válido en España)', { phone: '744102938' }, true);
intento('escalera 712345678 → la caza el antifraude', { phone: '712345678' }, false);
intento('móvil con guiones y puntos', { phone: '645-21.03 37' }, true);
intento('correo con mayúsculas', { email: 'Maria.Garcia@Correo.ES' }, true);
intento('nombre con tres apellidos', { name: 'José Luis Pérez de la Fuente' }, true);
intento('dirección con emoji', { address: 'Calle Mayor 24 🏠' }, true);
intento('CP de Baleares (07) — sí se sirve', { zip: '07001', city: 'Palma' }, true);
intento('CP de Melilla (52) — bloqueado', { zip: '52001', city: 'Melilla' }, false);
intento('CP inexistente (99)', { zip: '99999', city: 'Nowhere' }, false);
intento('móvil de 8 cifras', { phone: '64521033' }, false);
intento('móvil de 10 cifras', { phone: '6452103370' }, false);
intento('nombre con número', { name: 'Maria 2 Garcia' }, false);
intento('localidad de dos letras', { city: 'AB' }, false);
intento('dirección de 7 caracteres', { address: 'C/ M 4' }, false);
intento('sin franja horaria', { slot: '' }, false);

console.log('\n════════ RECUPERARSE DE UN ERROR ════════\n');
way('card'); way('cod');
for (const k of Object.keys(datos)) set(k, datos[k]);
check('cash'); check('home');
set('zip', '38001'); set('city', 'Santa Cruz de Tenerife');
ok(buy() === null, 'Tenerife: frenado');
ok(!d.querySelector('[data-cod-blocked]').hidden, 'y se le explica por qué, en amarillo');
set('zip', '28806'); set('city', 'Alcalá de Henares');
ok(d.querySelector('[data-cod-blocked]').hidden, 'corrige el CP y el aviso desaparece solo');
ok(f('province').value === 'Madrid', 'y la provincia se recalcula a Madrid');
const rec = buy();
ok(!!rec, 'ahora sí puede pedir, sin recargar la página');
ok(new w.URL(rec, 'https://waistzen.com').searchParams.get('checkout[shipping_address][province]') === 'Madrid',
   'y va Madrid, no Tenerife: no se queda el dato viejo');

way('card'); way('cod');
for (const k of Object.keys(datos)) set(k, datos[k]);
check('cash'); check('home'); check('whatsapp', false);
const sinWa = new w.URL(buy(), 'https://waistzen.com').searchParams;
ok(sinWa.get('attributes[Avisar por WhatsApp]') === 'No', 'si no quiere WhatsApp, llega No');
ok(sinWa.get('note').includes('Avisar por WhatsApp: no'), 'y la nota lo dice igual');
check('whatsapp', true);

way('card'); way('cod');
for (const k of Object.keys(datos)) set(k, datos[k]);
set('phone', '0034645210337'); check('cash'); check('home');
ok(new w.URL(buy(), 'https://waistzen.com').searchParams.get('attributes[Telefono de reparto]') === '645210337',
   'acepta también el prefijo 0034');

way('card'); way('cod');
for (const k of Object.keys(datos)) set(k, datos[k]);
set('backup', ''); check('cash'); check('home');
const sinBackup = new w.URL(buy(), 'https://waistzen.com').searchParams;
ok(sinBackup.get('attributes[Puede recogerlo]') === null, 'si no da segunda persona, no se manda el campo vacío');
ok(!sinBackup.get('note').includes('Si no está'), 'y la nota no deja una línea coja');

console.log('\n════════ CAMBIOS DE OPINIÓN ════════\n');
way('card'); way('cod');
for (const k of Object.keys(datos)) set(k, datos[k]);
check('cash'); check('home');
pack(2);
ok($('[data-cod-cash-text]').textContent.includes('109,89 €'), 'al cambiar a 3 uds el compromiso pasa a 109,89 €');
ok($('[data-cod-sum-pay]').textContent === '109,89 €', 'y el resumen también');
const u3 = buy();
ok(new w.URL(u3, 'https://waistzen.com').searchParams.get('attributes[Importe a cobrar]') === '109,89 €',
   'el pedido sale con 109,89 €, no con el importe viejo');
way('card');
ok($('[data-calmia-cod-form]').hidden, 'al volver a tarjeta se pliega el cuestionario');
ok(buy() === '/cart/59286832939353:3', 'y el pedido con tarjeta va limpio, sin datos personales ni recargo');

console.log('\n' + (bad ? '✗ ' + bad + ' FALLOS' : '✓ SIN UN SOLO FALLO') + '\n');
process.exit(bad ? 1 : 0);
