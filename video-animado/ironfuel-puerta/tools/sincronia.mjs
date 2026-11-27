// ¿Cada cosa aparece justo cuando EMPIEZA la palabra que la nombra?
// Carga el mundo en Chrome sin pantalla, recorre fotograma a fotograma alrededor
// de cada palabra y apunta el primer fotograma en que el elemento ya se ve (o cambia).
//   node tools/sincronia.mjs        → SINCRONIA.md
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const raiz = new URL("../", import.meta.url);
const html = fs.readFileSync(new URL("compositions/mundo.html", raiz), "utf8");
const dentro = html.replace(/^[\s\S]*?<template>/, "").replace(/<\/template>[\s\S]*$/, "");
const gsapJs = fs.readFileSync(new URL("tools/node/node_modules/gsap/dist/gsap.min.js", raiz), "utf8");
const IF = JSON.parse(html.match(/window\.__IF = (\{.*?\});\n/s)[1]);
const { T, ON } = IF;

// [qué se ve, id del elemento, palabra, segundo en que empieza la palabra]
const PAL = ["FUERZA", "RESISTENCIA", "ENERGÍA", "RENDIMIENTO", "RECUPERACIÓN"];
const EVENTOS = [
  ...PAL.map((p, i) => [`${p} en cromo`, `ph${i}`, p.toLowerCase(), ON[i]]),
  ...PAL.map((p, i) => [`mundo de ${p}`, `w${i}`, p.toLowerCase(), ON[i]]),
  ...PAL.slice(0, 4).map((p, i) => [`icono de ${p}`, `ic${i}`, p.toLowerCase(), ON[i]]),
  ...PAL.map((p, i) => [`tira de luz de ${p}`, `sub${i}`, p.toLowerCase(), ON[i]]),
  ["plan de la primera franja", "plan0-0", "plan", T.plan],
  ["¿PARA QUÉ", "preg1", "para", T.para2],
  ["ENTRENAS?", "preg2", "entrenas", T.entrenas],
  ["el foco se enciende", "foco", "algo", T.algo],
  ["el bote sube", "producto", "sirve", T.sirve],
  ["etiqueta COLÁGENO", "tag0", "explicamos", T.explicamos],
  ["etiqueta ÁCIDO HIALURÓNICO", "tag2", "por", T.por2],
  ["bocadillo «ESTO NO TE HACE FALTA»", "bocadillo", "lo", T.lo],
  ["tique: IRON FUEL NUTRITION", "tl0", "Aunque", T.aunque],
  ["tique: CONSEJO 0,00 €", "tl1", "eso", T.eso2],
  ["tique: PREGUNTAS 0,00 €", "tl2", "signifique", T.signifique],
  ["tique: COMPRA 0,00 €", "tl3", "no", T.no2],
  ["tique: TOTAL 0,00 €", "tl4", "nada", T.nada2],
  ["la frase impresa del cartel", "lp0", "debajo", T.debajo],
  ["CONSTRUYE", "lh0", "Construye", T.construye],
  ["TU MEJOR", "lh1", "tu", T.tu],
  ["VERSIÓN", "lh2", "versión", T.version],
  ["el logo", "logo", "Nutríshon", T.nutrishon],
  ["botón SÍGUENOS", "boton", "Síguenos", T.siguenos],
  ["VEN A VERNOS", "ven", "ven", T.ven],
];
// cambios que no son aparecer: [qué, id, atributo, palabra, segundo]
const CAMBIOS = [
  ["las cinco tiras de luz de la foto", "hs0", "stroke-dashoffset", "cinco", T.cinco1],
  ["«QUÉ» del titular", "q1-c", "fill-opacity", "qué", T.que1],
  ["el foco se apaga", "foco", "opacity", "no", T.no1],
  ["el rótulo real se enciende", "rotulo-apagado", "opacity", "Áiron", T.airon],
  ["se encienden las cinco tiras", "sub0", "opacity", "cinco", T.cinco3],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.setContent(`<html><body style="margin:0"><script>${gsapJs}</script>${dentro}</body></html>`);
await page.waitForFunction(() => window.__IF && window.__IF.render);

const F = 1 / 30;
let mal = 0;
const filas = [];
for (const [que, id, palabra, tw] of EVENTOS) {
  const ap = await page.evaluate(
    ([id, tw, F]) => {
      const el = document.getElementById(id);
      const op = (e) => {
        let o = 1;
        for (let n = e; n && n.getAttribute; n = n.parentElement) {
          if (n.getAttribute("display") === "none") return 0;
          o *= parseFloat(n.getAttribute("opacity") ?? "1");
        }
        return o;
      };
      for (let t = tw - 0.6; t <= tw + 0.6; t += F) {
        window.__IF.render(t);
        if (op(el) > 0.08) return t;
      }
      return null;
    },
    [id, tw, F],
  );
  const d = ap === null ? null : ap - tw;
  const ok = d !== null && d >= -0.1 && d <= 0.1;
  if (!ok) mal++;
  filas.push([ok, que, palabra, tw, d]);
}
for (const [que, id, attr, palabra, tw] of CAMBIOS) {
  const ap = await page.evaluate(
    ([id, attr, tw, F]) => {
      const el = document.getElementById(id);
      let prev = null;
      for (let t = tw - 0.4; t <= tw + 0.5; t += F) {
        window.__IF.render(t);
        const v = el.getAttribute(attr) + "|" + el.getAttribute("display");
        if (prev !== null && v !== prev) return t;
        prev = v;
      }
      return null;
    },
    [id, attr, tw, F],
  );
  const d = ap === null ? null : ap - tw;
  const ok = d !== null && d >= -0.1 && d <= 0.1;
  if (!ok) mal++;
  filas.push([ok, que, palabra, tw, d]);
}
await browser.close();

let md = "# Sincronía imagen–voz\n\nCada fila: lo que se ve, la palabra que lo nombra, cuándo empieza esa palabra en la voz y cuántos fotogramas (a 30 fps) de diferencia hay entre la palabra y el primer fotograma en que se ve. Margen aceptado: ±3 fotogramas.\n\n| | Qué se ve | Palabra | Empieza | Diferencia |\n| --- | --- | --- | --- | --- |\n";
for (const [ok, que, palabra, tw, d] of filas) {
  const fr = d === null ? "no aparece" : `${d >= 0 ? "+" : ""}${Math.round(d * 30)} fot. (${d >= 0 ? "+" : ""}${d.toFixed(2)} s)`;
  md += `| ${ok ? "✓" : "✗"} | ${que} | «${palabra}» | ${tw.toFixed(2)} s | ${fr} |\n`;
  console.log(`${ok ? "✓" : "✗"} ${que.padEnd(36)} «${palabra}» ${tw.toFixed(2)} s  ${fr}`);
}
md += `\n${mal ? `${mal} fuera de margen.` : "Todo cae en su palabra."}\n`;
fs.writeFileSync(new URL("SINCRONIA.md", raiz), md);
console.log(mal ? `\n${mal} fuera de margen` : "\nTodo cae en su palabra.");
