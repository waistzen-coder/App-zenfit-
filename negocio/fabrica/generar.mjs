#!/usr/bin/env node
// La fábrica: convierte la ficha JSON de un negocio en su web.
//
//   node negocio/fabrica/generar.mjs ficha.json [otra.json ...]          demo para enseñar
//   node negocio/fabrica/generar.mjs ficha.json --final                  web para publicar
//   node negocio/fabrica/generar.mjs ficha.json --salida otra/carpeta
//
// Demo:  negocio/web/demo/<slug>/index.html, con el aviso de propuesta y sin indexar.
// Final: negocio/entregas/<slug>/index.html + aviso-legal/, lista para subir a su dominio.
// Al terminar imprime el enlace y el mensaje para mandárselo a quien ya ha aceptado verla.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepararNegocio } from './lib/negocio.mjs';
import { paginaNegocio, paginaAvisoLegal } from './lib/plantilla.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ_NEGOCIO = resolve(AQUI, '..');
export const CONFIG = JSON.parse(readFileSync(join(AQUI, 'config.json'), 'utf8'));

const hoy = () => new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });

/** Genera las webs de una lista de fichas. Devuelve lo generado, para quien lo llame. */
export function generar(archivos, { final = false, salida } = {}) {
  const agencia = CONFIG.agencia;
  const destinoBase = resolve(salida ?? join(RAIZ_NEGOCIO, final ? 'entregas' : 'web/demo'));
  const hechos = [];
  for (const archivo of archivos) {
    const json = JSON.parse(readFileSync(archivo, 'utf8'));
    const n = prepararNegocio(json, relative(process.cwd(), archivo));
    const dir = join(destinoBase, n.slug);
    mkdirSync(dir, { recursive: true });
    const opciones = { modo: final ? 'final' : 'demo', agencia, fecha: hoy() };
    writeFileSync(join(dir, 'index.html'), paginaNegocio(n, opciones));
    if (final) {
      mkdirSync(join(dir, 'aviso-legal'), { recursive: true });
      writeFileSync(join(dir, 'aviso-legal', 'index.html'), paginaAvisoLegal(n, opciones));
    }
    hechos.push({ n, dir, url: final ? n.dominio ?? null : `${agencia.urlDemos}/${n.slug}/` });
  }
  return hechos;
}

/**
 * Mensaje con el enlace a la demo, para mandarlo SOLO a quien ya ha dicho que sí a recibirla
 * (en la visita o por teléfono). Mandar publicidad por WhatsApp o correo sin permiso previo
 * está prohibido en España (art. 21 de la LSSI), también entre empresas.
 */
export function mensajeContacto(n, url, agencia = CONFIG.agencia) {
  const saludo = n.contacto ? `Hola, ${n.contacto}.` : 'Hola.';
  return [
    `${saludo} Soy ${agencia.vendedor}, de ${agencia.nombre}, como te comentaba.`,
    `Aquí tienes la propuesta de web para ${n.nombre}: ${url}`,
    `Mírala con calma desde el móvil. Si te gusta, la dejamos publicada en 72 horas desde ${agencia.precioDesde} € + IVA, y si quieres cambiar algo, lo ajustamos. Cualquier duda, me dices por aquí.`,
  ].join('\n');
}

function principal(args) {
  const final = args.includes('--final');
  const iSalida = args.indexOf('--salida');
  const salida = iSalida >= 0 ? args[iSalida + 1] : undefined;
  const archivos = args.filter((a, i) => a.endsWith('.json') && (iSalida < 0 || i !== iSalida + 1));
  if (!archivos.length) {
    console.log('Uso: node negocio/fabrica/generar.mjs ficha.json [más.json] [--final] [--salida carpeta]');
    process.exit(1);
  }
  const agencia = CONFIG.agencia;
  const avisos = [];
  if (!agencia.whatsapp && !agencia.email) avisos.push('config.json: sin WhatsApp ni correo de la agencia; el aviso de las demos pide contestar al mensaje con el que llegó');
  if (!agencia.vendedor || agencia.vendedor.startsWith('[')) avisos.push('config.json: falta tu nombre en «vendedor» (se usa en el mensaje)');

  let hechos;
  try {
    hechos = generar(archivos, { final, salida });
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
  for (const { n, dir, url } of hechos) {
    console.log(`\n✓ ${n.nombre}  →  ${relative(process.cwd(), join(dir, 'index.html'))}`);
    if (!final) {
      console.log(`  Enlace: ${url}`);
      console.log(`  Mensaje (solo para quien ya te ha dicho que sí a recibirla):`);
      console.log(`    Asunto, si va por correo: Propuesta de web para ${n.nombre}`);
      console.log(mensajeContacto(n, url).replace(/^/gm, '    '));
    } else if (!n.dominio) {
      console.log('  Aviso: sin «dominio» en la ficha, la web no lleva enlace canónico.');
    }
    if (final && !(n.titular_legal ?? n.legal)?.nif) console.log('  Aviso: falta el NIF del titular en «legal» (el aviso legal lo pide).');
  }
  for (const a of avisos) console.log(`\n! ${a}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal(process.argv.slice(2));
