// Tipografías incrustadas en cada página como data: URI.
// Así cada web es un único archivo: carga sin pedir nada a Google ni a nadie (sin cookies,
// sin transferencias de datos que explicar en la política de privacidad) y se puede
// mandar tal cual por WhatsApp o correo. Licencias en ../fuentes/LICENCIAS.txt.

import { readFileSync } from 'node:fs';

const DIR = new URL('../fuentes/', import.meta.url);

const FUENTES = {
  figtree: { familia: 'Figtree', archivo: 'figtree.woff2', peso: '300 900' },
  barlowCondensed: { familia: 'Barlow Condensed', archivo: 'barlow-condensed-700.woff2', peso: '700' },
  youngSerif: { familia: 'Young Serif', archivo: 'young-serif.woff2', peso: '400' },
  plexMono: { familia: 'IBM Plex Mono', archivo: 'ibm-plex-mono-500.woff2', peso: '500' },
};

const cache = new Map();

/** Bloques @font-face para las fuentes pedidas. */
export function fontFace(...claves) {
  return claves.map((clave) => {
    const f = FUENTES[clave];
    if (!f) throw new Error(`Fuente desconocida: ${clave}`);
    if (!cache.has(clave)) cache.set(clave, readFileSync(new URL(f.archivo, DIR)).toString('base64'));
    return `@font-face{font-family:'${f.familia}';src:url(data:font/woff2;base64,${cache.get(clave)}) format('woff2');font-weight:${f.peso};font-style:normal;font-display:swap}`;
  }).join('\n');
}

const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** Parejas tipográficas. Cada sector elige una. */
export const ESTILOS = {
  // Oficios y talleres: titulares estrechos y rotundos, como el rotulado de una furgoneta.
  rotulo: {
    fuentes: ['barlowCondensed', 'figtree'],
    titulo: `'Barlow Condensed', 'Arial Narrow', ${SANS}`,
    texto: `'Figtree', ${SANS}`,
    pesoTitulo: 700,
    espaciadoTitulo: '0.005em',
  },
  // Barberías, peluquerías, estética, restaurantes: serif con carácter, de cartel de fachada.
  salon: {
    fuentes: ['youngSerif', 'figtree'],
    titulo: `'Young Serif', Georgia, 'Times New Roman', serif`,
    texto: `'Figtree', ${SANS}`,
    pesoTitulo: 400,
    espaciadoTitulo: '-0.01em',
  },
  // Clínicas, academias, entrenadores: una sola familia limpia y cercana.
  clinica: {
    fuentes: ['figtree'],
    titulo: `'Figtree', ${SANS}`,
    texto: `'Figtree', ${SANS}`,
    pesoTitulo: 750,
    espaciadoTitulo: '-0.02em',
  },
};
