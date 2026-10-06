#!/usr/bin/env node
// Hace las capturas de móvil de las webs de ejemplo que enseña la web de la agencia.
// Necesita Playwright con Chromium (npm i -g playwright && npx playwright install chromium).
//
//   node negocio/fabrica/capturas.mjs
//
// Fija la hora a un miércoles a media mañana para que todas salgan «Abierto ahora».

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const WEB = resolve(AQUI, '../web');
const require = createRequire(join(execSync('npm root -g').toString().trim(), '/'));
const { chromium } = require('playwright');

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await pagina.clock.setFixedTime(new Date('2026-10-07T11:00:00+02:00'));
for (const slug of readdirSync(join(WEB, 'demo')).filter((d) => d.startsWith('ejemplo-'))) {
  await pagina.goto(`file://${join(WEB, 'demo', slug, 'index.html')}`);
  // Sin el aviso de propuesta: en la web de la agencia se ve el diseño tal cual
  await pagina.addStyleTag({ content: '.demo{display:none!important}' });
  await pagina.waitForTimeout(200);
  const salida = join(WEB, 'img', `${slug}.jpg`);
  await pagina.screenshot({ path: salida, type: 'jpeg', quality: 78 });
  console.log(`✓ ${salida}`);
}
await navegador.close();
