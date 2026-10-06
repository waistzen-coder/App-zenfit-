#!/usr/bin/env node
// Monta la carpeta negocio/web completa, lista para subir tal cual a Cloudflare Pages:
//   index.html          la web de la agencia
//   aviso-legal/        su aviso legal (datos del titular en config.json)
//   demo/ejemplo-*/     las webs de ejemplo del escaparate
//   _headers            para que ninguna demo salga en Google
//
//   node negocio/fabrica/construir.mjs
//
// Las capturas de img/ se rehacen aparte con capturas.mjs (necesita Playwright).

import { writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generar, CONFIG } from './generar.mjs';
import { paginaAgencia, paginaAvisoLegalAgencia } from './lib/agencia.mjs';

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

mkdirSync(join(WEB, 'aviso-legal'), { recursive: true });
const fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
writeFileSync(join(WEB, 'aviso-legal', 'index.html'), paginaAvisoLegalAgencia(a, fecha));

writeFileSync(join(WEB, '_headers'), `# Cloudflare Pages: las demos nunca se indexan
/demo/*
  X-Robots-Tag: noindex, nofollow
`);
writeFileSync(join(WEB, 'robots.txt'), `User-agent: *\nAllow: /\n`);

const pendientes = [];
if (a.whatsapp === '34600000000') pendientes.push('el WhatsApp de la agencia');
if (a.titular.nif.startsWith('[')) pendientes.push('los datos del titular para el aviso legal');
console.log(`✓ Web de ${a.nombre} y ${hechos.length} ejemplos en ${WEB}`);
if (pendientes.length) console.log(`! Antes de publicar, rellena en config.json: ${pendientes.join(' y ')}.`);
