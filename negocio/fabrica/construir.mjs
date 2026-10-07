#!/usr/bin/env node
// Monta la carpeta negocio/web completa, lista para subir tal cual a GitHub Pages:
//   index.html          la web de la agencia
//   aviso-legal/        su aviso legal, solo cuando config.json tiene todos los datos del titular
//   demo/ejemplo-*/     las webs de ejemplo del escaparate
//   .nojekyll           para que GitHub Pages sirva los archivos tal cual
// Las demos llevan su propia etiqueta noindex para no salir en Google.
//
//   node negocio/fabrica/construir.mjs
//
// Las capturas de img/ se rehacen aparte con capturas.mjs (necesita Playwright).

import { writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generar, CONFIG } from './generar.mjs';
import { paginaAgencia, paginaAvisoLegalAgencia, avisoLegalCompleto } from './lib/agencia.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const WEB = resolve(AQUI, '../web');
const a = CONFIG.agencia;

const fichas = readdirSync(join(AQUI, 'ejemplos')).filter((f) => f.endsWith('.json')).sort()
  .map((f) => join(AQUI, 'ejemplos', f));
// Orden del escaparate: oficio, salón, clínica, restaurante
const orden = ['fontaneria', 'barberia', 'fisioterapia', 'restaurante'];
const hechos = generar(fichas)
  .sort((x, y) => orden.indexOf(x.n.sector) - orden.indexOf(y.n.sector));

for (const { n } of hechos) {
  if (!existsSync(join(WEB, 'img', `${n.slug}.jpg`))) console.warn(`! Falta la captura img/${n.slug}.jpg (node negocio/fabrica/capturas.mjs)`);
}

const ejemplos = hechos.map(({ n }) => ({ slug: n.slug, nombre: n.nombre, actividad: n.actividad, ciudad: n.ciudad }));
writeFileSync(join(WEB, 'index.html'), paginaAgencia(a, ejemplos));

// Sin los datos del titular no se publica un aviso legal a medias: la web sale sin él y con noindex.
rmSync(join(WEB, 'aviso-legal'), { recursive: true, force: true });
if (avisoLegalCompleto(a)) {
  mkdirSync(join(WEB, 'aviso-legal'), { recursive: true });
  const fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
  writeFileSync(join(WEB, 'aviso-legal', 'index.html'), paginaAvisoLegalAgencia(a, fecha));
}

writeFileSync(join(WEB, '.nojekyll'), '');
writeFileSync(join(WEB, 'robots.txt'), `User-agent: *\nAllow: /\n`);

console.log(`✓ Web de ${a.nombre} y ${hechos.length} ejemplos en ${WEB}`);
if (!a.whatsapp && !a.email) console.log('! Sin WhatsApp ni correo en config.json: los botones de la web llevan a los ejemplos y a los precios.');
if (!avisoLegalCompleto(a)) console.log('! Sin nombre, NIF, domicilio y correo del titular en config.json: la web va sin aviso legal y fuera de Google.');
