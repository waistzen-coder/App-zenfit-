// ¿Cada cosa aparece justo cuando EMPIEZA la palabra que la nombra?
// Carga el mundo en Chrome sin pantalla, recorre fotograma a fotograma alrededor
// de cada palabra y apunta el primer fotograma en que el elemento ya se ve.
//   node tools/sincronia.mjs
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const raiz = new URL("../", import.meta.url);
const html = fs.readFileSync(new URL("compositions/mundo.html", raiz), "utf8");
const dentro = html.replace(/^[\s\S]*?<template>/, "").replace(/<\/template>[\s\S]*$/, "");
const gsapJs = fs.readFileSync(new URL("tools/node/node_modules/gsap/dist/gsap.min.js", raiz), "utf8");
const IF = JSON.parse(html.match(/window\.__IF = (\{.*?\});\n/s)[1]);
const T = IF.T;

// [qué se ve, id del elemento, palabra, segundo en que empieza la palabra]
const EVENTOS = [
  ["aviso «12 semanas antes»", "chip-rebobina", "Esto", T.esto],
  ["bocadillo", "bocadillo", "pidió", T.pidio],
  ["la X sobre el bote mágico", "magia-x", "magia", T.magia],
  ["el «1» de la creatina", "badge-1", "Uno", T.uno1],
  ["tarjeta de la creatina", "card-a", "Tres", T.tres],
  ["«3 g»", "a-3g", "Tres", T.tres],
  ["«AL DÍA»", "a-dia", "día", T.dia],
  ["los siete días", "a-d0", "todos", T.todos],
  ["«DESCANSO»", "a-descanso", "descanso", T.descanso],
  ["gráfica de series", "a-leyenda", "rendir", T.rendir],
  ["rayo", "a-rayo", "cortos", T.cortos],
  ["el «2» de la proteína", "badge-2", "Dos", T.dos2],
  ["tarjeta de la proteína", "card-b", "Ayuda", T.ayuda2],
  ["flecha de ganar músculo", "b-flecha", "ganar", T.ganar],
  ["escudo de no perderlo", "b-escudo", "perderlo", T.perderlo],
  ["cacito", "b-cacito", "cacito", T.cacito],
  ["«AGUA»", "b-agua", "agua", T.agua],
  ["«LECHE»", "b-leche", "leche", T.leche],
  ["«TRAS ENTRENAR»", "b-despues", "entrenar", T.entrenar1],
  ["neón del gimnasio", "neon-gym", "entrenar", T.entrenar2],
  ["datáfono: pagado", "datafono-ok", "Pagó", T.pago],
  ["bolsa", "bolsa", "llevó", T.llevo],
  ["chispa del choque de manos", "choque", "más", T.mas4],
  ["caja de comentario", "comentario", "Comenta", T.comenta],
  ["corazón", "com-corazon", "botes", T.botes2],
];
// cosas que no aparecen sino que cambian: [qué, id, atributo, palabra, segundo]
const CAMBIOS = [
  ["la creatina cae en el mostrador", "bote-creatina", "transform", "dos", T.dos1],
  ["la proteína cae en el mostrador", "bote-proteina", "transform", "botes", T.botes],
  ["marcador → 01", "marcador-u", "transform", "uno", T.uno2],
  ["marcador → 04", "marcador-u", "transform", "cuatro", T.cuatro],
  ["marcador → 08", "marcador-u", "transform", "ocho", T.ocho],
  ["marcador → 12", "marcador-u", "transform", "doce", T.doce],
  ["la barra se dobla", "barra-flaco-bar", "d", "doblaba", T.doblaba],
  ["«FUERTE» se escribe", "com-texto", "text", "FUERTE", T.fuerte2],
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
        for (let n = e; n && n.getAttribute; n = n.parentElement) o *= parseFloat(n.getAttribute("opacity") ?? "1");
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
      const leer = () => (attr === "text" ? el.textContent : el.getAttribute(attr));
      // el último fotograma en que el cambio arranca: compara cada fotograma con el siguiente
      let prev = null;
      for (let t = tw - 0.4; t <= tw + 0.5; t += F) {
        window.__IF.render(t);
        const v = leer();
        if (prev !== null && v !== prev && t >= tw - 0.35) {
          // para la caída de los botes, lo que cuenta es cuándo tocan el mostrador
          if (id.startsWith("bote-")) {
            const y = parseFloat(v.split(" ")[1]);
            if (Math.abs(y - 1470) < 1) return t;
          } else return t;
        }
        prev = v;
      }
      return null;
    },
    [id, attr, tw, F],
  );
  const d = ap === null ? null : ap - tw;
  const ok = d !== null && d >= -0.1 && d <= 0.15;
  if (!ok) mal++;
  filas.push([ok, que, palabra, tw, d]);
}
await browser.close();

let md = "# Sincronía imagen–voz\n\nCada fila: lo que se ve, la palabra que lo nombra, cuándo empieza esa palabra en la voz y cuántos fotogramas (a 30 fps) de diferencia hay entre la palabra y el primer fotograma en que se ve. Margen aceptado: ±3 fotogramas.\n\n| | Qué se ve | Palabra | Empieza | Diferencia |\n| --- | --- | --- | --- | --- |\n";
for (const [ok, que, palabra, tw, d] of filas) {
  const fr = d === null ? "no aparece" : `${d >= 0 ? "+" : ""}${Math.round(d * 30)} fot. (${d >= 0 ? "+" : ""}${d.toFixed(2)} s)`;
  md += `| ${ok ? "✓" : "✗"} | ${que} | «${palabra}» | ${tw.toFixed(2)} s | ${fr} |\n`;
  console.log(`${ok ? "✓" : "✗"} ${que.padEnd(34)} «${palabra}» ${tw.toFixed(2)} s  ${fr}`);
}
md += `\n${mal ? `${mal} fuera de margen.` : "Todo cae en su palabra."}\n`;
fs.writeFileSync(new URL("SINCRONIA.md", raiz), md);
console.log(mal ? `\n${mal} fuera de margen` : "\nTodo cae en su palabra.");
