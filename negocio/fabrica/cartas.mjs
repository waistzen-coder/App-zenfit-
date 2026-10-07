#!/usr/bin/env node
// Cartas en papel para los negocios: una página A4 por negocio, con su propuesta en un móvil
// y un código QR que la abre. La LSSI prohíbe mandar publicidad por correo electrónico a quien
// no la ha pedido, también a empresas, pero no por correo postal. La carta pide que escriban
// ellos, y a partir de ahí ya se les puede contestar por correo electrónico.
//
//   node negocio/fabrica/cartas.mjs negocio/privado/leads/*.json --correo tu@correo.es [--salida carpeta]
//
// Sale un PDF listo para imprimir en negocio/privado/cartas/cartas.pdf, y además cada carta suelta
// en sueltas/<negocio>.pdf con las direcciones en direcciones.txt, para subirlas a la carta online
// de Correos (un PDF por envío, de menos de 1 MB). La dirección cae en la ventana de un sobre
// americano (DL, 110 × 220 mm) con ventana a la derecha, doblando el folio en tres por las marcas
// del margen. Los negocios sin dirección completa (calle y código postal) se saltan. Las propuestas
// tienen que estar ya generadas en negocio/web/demo/.
//
// Necesita Playwright con Chromium, como capturas.mjs.

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { prepararNegocio } from './lib/negocio.mjs';
import { fontFace } from './lib/fuentes.mjs';
import { esc } from './lib/utils.mjs';
import qrcode from './lib/vendor/qrcode.mjs';
import { CONFIG } from './generar.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const DEMOS = resolve(AQUI, '../web/demo');

// Con qué se busca cada sector y qué le pasa al cliente que no le encuentra.
// Una ficha puede cambiarlo con "carta": { "busqueda", "escena", "lugar" }.
const GANCHOS = {
  taller: { busqueda: 'talleres', escena: 'cuando a alguien se le estropea el coche, saca el móvil y llama al primer taller que le da confianza' },
  fontaneria: { busqueda: 'fontaneros', escena: 'cuando a alguien se le rompe una tubería, saca el móvil y llama al primer fontanero que le da confianza' },
  electricidad: { busqueda: 'electricistas', escena: 'cuando a alguien se le va la luz, saca el móvil y llama al primer electricista que le da confianza' },
  climatizacion: { busqueda: 'empresas de climatización', escena: 'cuando a alguien se le estropea el aire acondicionado, saca el móvil y llama a la primera empresa que le da confianza' },
  reformas: { busqueda: 'empresas de reformas', escena: 'quien piensa reformar su casa busca antes en el móvil y llama a la empresa que le da más confianza' },
  cerrajeria: { busqueda: 'cerrajeros', escena: 'cuando alguien se queda en la calle sin llaves, saca el móvil y llama al primer cerrajero que le da confianza' },
  generico: { busqueda: 'negocios como el suyo', escena: 'cuando alguien necesita lo que usted hace, saca el móvil y llama al primero que le da confianza' },
};

function argumentos(args) {
  const valor = (nombre) => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : undefined; };
  const opciones = new Set([valor('--correo'), valor('--salida')]);
  return {
    archivos: args.filter((a) => a.endsWith('.json') && !opciones.has(a)),
    correo: valor('--correo') ?? CONFIG.agencia.email,
    salida: resolve(valor('--salida') ?? join(AQUI, '../privado/cartas')),
  };
}

/** El QR como SVG: un solo trazado, módulos negros sobre blanco, con su margen de silencio. */
function qrSvg(texto) {
  const q = qrcode(0, 'M');
  q.addData(texto);
  q.make();
  const n = q.getModuleCount();
  const margen = 4;
  let d = '';
  for (let f = 0; f < n; f += 1) {
    for (let c = 0; c < n; c += 1) if (q.isDark(f, c)) d += `M${c + margen} ${f + margen}h1v1h-1z`;
  }
  const lado = n + margen * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" shape-rendering="crispEdges" role="img" aria-label="Código QR"><rect width="${lado}" height="${lado}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

function carta(n, { url, correo, captura, a }) {
  const g = { ...(GANCHOS[n.sector] ?? GANCHOS.generico), ...(n.carta ?? {}) };
  const lugar = g.lugar ?? n.ciudad;
  // El dominio no se parte; la ruta, solo después de una barra
  const [dominio, ...ruta] = url.replace(/^https:\/\//, '').replace(/\/$/, '').split('/');
  const urlCorta = `<span class="dominio">${esc(dominio)}</span>${ruta.map((r) => `/<wbr>${esc(r)}`).join('')}`;
  return `<section class="hoja">
  <span class="pliegue" style="top:99mm"></span><span class="pliegue" style="top:198mm"></span>
  <header class="cab">
    <span class="marca">${esc(a.nombre.toUpperCase())}</span>
    <span class="toldo" aria-hidden="true"></span>
    <span class="lema">${esc(a.lema)}</span>
  </header>
  <p class="fecha">${esc(fechaCarta())}</p>
  <address class="destino">
    <strong>${esc(n.nombre)}</strong><br>
    ${esc(n.direccion)}<br>
    ${esc(n.cp)} ${esc(n.ciudad)}${n.provincia && n.provincia !== n.ciudad ? ` (${esc(n.provincia)})` : ''}
  </address>
  <h1>Le he hecho la web a ${esc(n.nombre)}. <span>Mírela antes de decidir nada.</span></h1>
  <div class="cuerpo">
    <div class="texto">
      <p>Hola:</p>
      <p>Soy ${esc(a.vendedor)}, de ${esc(a.nombre)}. Buscando ${esc(g.busqueda)} en ${esc(lugar)}, no encontré la página web de ${esc(n.nombre)}. Y hoy, ${esc(g.escena)}. Sin web, ese cliente acaba llamando a otro.</p>
      <p>Así que le he preparado una, ya hecha, con su nombre, su teléfono y sus servicios. <strong>Escanee el código con la cámara del móvil y véala usted mismo.</strong></p>
      <ul>
        <li><strong>Verla no cuesta nada</strong> ni le compromete a nada.</li>
        <li>Si le gusta, la dejo publicada en 72 horas por <strong>${a.precios.esencial} € + IVA</strong>, con su dominio .es del primer año incluido. Paga cuando la vea terminada.</li>
        <li>Si quiere cambiar algo (textos, fotos, servicios), lo ajustamos juntos.</li>
      </ul>
      <p class="cta">Para pedirla, o para preguntarme lo que quiera, escríbame a <strong>${esc(correo)}</strong> con el nombre de su negocio y le contesto enseguida.</p>
      <p class="firma">Un saludo,<br><span class="nombre">${esc(a.vendedor)}</span><br>${esc(a.nombre)} · ${esc(a.lema)}</p>
      <p class="pd">P. D.: Su propuesta no sale en Google y, si no le interesa, la borro.</p>
    </div>
    <figure class="muestra">
      <span class="movil"><img src="${captura}" alt="La web de ${esc(n.nombre)} vista en un móvil"></span>
      <span class="qr">${qrSvg(url)}</span>
      <figcaption>Escanee con la cámara<br><span class="url">${urlCorta}</span></figcaption>
    </figure>
  </div>
  <p class="privacidad">Saqué la dirección de ${esc(n.nombre)} de directorios públicos de empresas, solo para enseñarle esta propuesta. Si no quiere recibir nada más, escríbame a ese mismo correo y borro sus datos y su propuesta.</p>
</section>`;
}

const fechaCarta = () => {
  const mes = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
  return mes.charAt(0).toUpperCase() + mes.slice(1);
};

function documento(hojas) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Cartas · Mostrador</title>
<style>
${fontFace('barlowCondensed', 'figtree')}
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:#fff}
body{font:400 10.4pt/1.45 'Figtree',Arial,sans-serif;color:#17201b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hoja{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;break-after:page}
.hoja:last-child{page-break-after:auto;break-after:auto}
.pliegue{position:absolute;left:0;width:5mm;border-top:0.3mm solid #b9c2bd}
.cab{position:absolute;top:14mm;left:20mm;right:20mm;display:flex;align-items:center;gap:5mm}
.marca{font:700 19pt/1 'Barlow Condensed',Arial Narrow,sans-serif;letter-spacing:.22em;color:#0A3A2C}
.toldo{flex:none;width:24mm;height:4mm;background:repeating-linear-gradient(90deg,#0F5A43 0 3mm,#fff 3mm 6mm);border:0.3mm solid #0F5A43;border-radius:0 0 2mm 2mm}
.lema{margin-left:auto;font-size:9pt;color:#4b5b53}
.fecha{position:absolute;top:52mm;left:20mm;margin:0;font-size:9.5pt;color:#4b5b53}
.destino{position:absolute;top:50mm;left:110mm;width:82mm;font-style:normal;font-size:10.5pt;line-height:1.4}
h1{position:absolute;top:90mm;left:20mm;right:20mm;margin:0;font:700 23pt/1.02 'Barlow Condensed',Arial Narrow,sans-serif;text-transform:uppercase;color:#0A3A2C;text-wrap:balance}
h1 span{display:block;color:#0F5A43;font-size:17pt;margin-top:1.5mm}
.cuerpo{position:absolute;top:118mm;left:20mm;right:20mm;display:grid;grid-template-columns:minmax(0,1fr) 50mm;gap:9mm;align-items:start}
.texto p{margin:0 0 2.6mm}
.texto ul{margin:0 0 3mm;padding-left:4.5mm}
.texto li{margin-bottom:1.6mm}
.texto li::marker{color:#0F5A43}
.cta{background:#eef4f0;border-left:1mm solid #0F5A43;padding:2.4mm 3mm}
.firma{margin-top:4mm!important}
.firma .nombre{font:700 15pt/1.3 'Barlow Condensed',Arial Narrow,sans-serif;letter-spacing:.04em;color:#0A3A2C}
.pd{font-size:9.6pt;color:#33433b}
.muestra{margin:0;display:flex;flex-direction:column;align-items:center;gap:3.5mm}
.movil{display:block;width:46mm;padding:1.8mm;border-radius:7mm;background:#111614}
.movil img{display:block;width:100%;border-radius:5.4mm}
.qr{display:block;width:34mm;height:34mm}
.qr svg{width:100%;height:100%}
figcaption{text-align:center;font-size:8.6pt;line-height:1.35;color:#33433b}
.url{font-size:7.4pt;color:#4b5b53}
.dominio{white-space:nowrap}
.privacidad{position:absolute;bottom:10mm;left:20mm;right:20mm;margin:0;font-size:7.4pt;line-height:1.35;color:#6b7a72;border-top:0.3mm solid #dfe5e1;padding-top:2mm}
</style>
</head>
<body>
${hojas.join('\n')}
</body>
</html>
`;
}

async function principal(args) {
  const { archivos, correo, salida } = argumentos(args);
  if (!archivos.length || !correo) {
    console.log('Uso: node negocio/fabrica/cartas.mjs negocio/privado/leads/*.json --correo tu@correo.es [--salida carpeta]');
    process.exit(1);
  }
  const a = CONFIG.agencia;
  const negocios = [];
  for (const archivo of archivos) {
    const n = prepararNegocio(JSON.parse(readFileSync(archivo, 'utf8')), relative(process.cwd(), archivo));
    if (!n.direccion || !n.cp) { console.log(`- ${n.nombre}: sin carta (le falta ${n.direccion ? 'el código postal' : 'la dirección'})`); continue; }
    if (!existsSync(join(DEMOS, n.slug, 'index.html'))) { console.log(`- ${n.nombre}: sin carta (antes, genera su propuesta)`); continue; }
    negocios.push(n);
  }
  if (!negocios.length) { console.log('No hay ninguna carta que hacer.'); return; }

  const require = createRequire(join(execSync('npm root -g').toString().trim(), '/'));
  const { chromium } = require('playwright');
  const navegador = await chromium.launch();
  const hojas = [];
  try {
    // Captura de la propuesta tal y como se ve en el móvil, sin el aviso de propuesta de arriba
    const movil = await navegador.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 });
    for (const n of negocios) {
      await movil.goto(pathToFileURL(join(DEMOS, n.slug, 'index.html')).href);
      await movil.addStyleTag({ content: '.demo{display:none!important}' });
      await movil.evaluate(() => document.fonts.ready);
      const jpg = await movil.screenshot({ type: 'jpeg', quality: 82 });
      const url = `${a.urlDemos}/${n.slug}/`;
      hojas.push({ n, html: carta(n, { url, correo, captura: `data:image/jpeg;base64,${jpg.toString('base64')}`, a }) });
      console.log(`✓ ${n.nombre} · ${n.direccion}, ${n.cp} ${n.ciudad}`);
    }
    mkdirSync(join(salida, 'sueltas'), { recursive: true });
    const pagina = await navegador.newPage();
    const imprimir = async (html, ruta) => {
      await pagina.setContent(html, { waitUntil: 'load' });
      await pagina.evaluate(() => document.fonts.ready);
      await pagina.pdf({ path: ruta, format: 'A4', printBackground: true, preferCSSPageSize: true });
    };
    const html = documento(hojas.map((h) => h.html));
    writeFileSync(join(salida, 'cartas.html'), html);
    await imprimir(html, join(salida, 'cartas.pdf'));
    for (const { n, html: hoja } of hojas) await imprimir(documento([hoja]), join(salida, 'sueltas', `${n.slug}.pdf`));
    writeFileSync(join(salida, 'direcciones.txt'), hojas.map(({ n }) =>
      [n.nombre, n.direccion, `${n.cp} ${n.ciudad}`, n.provincia ?? '', `Archivo: sueltas/${n.slug}.pdf`].filter(Boolean).join('\n')).join('\n\n') + '\n');
  } finally {
    await navegador.close();
  }
  console.log(`\n${hojas.length} cartas en ${relative(process.cwd(), join(salida, 'cartas.pdf'))}, sueltas en sueltas/ y sus direcciones en direcciones.txt`);
  console.log('Antes de echarlas al buzón, comprueba que las propuestas están publicadas: el QR abre su enlace.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await principal(process.argv.slice(2));
