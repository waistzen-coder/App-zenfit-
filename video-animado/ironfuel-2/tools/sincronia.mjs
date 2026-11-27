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
  ["pila en el pecho", "pila", "mitad", T.mitad],
  ["bocadillo", "bocadillo", "Esta", T.esta],
  ["el «1» del omega-3", "badge-1", "Uno", T.uno1],
  ["tarjeta del omega-3", "card-a", "Con", T.con],
  ["«CON LA COMIDA»", "a-comida", "comida", T.comida],
  ["los siete días", "a-d0", "todos", T.todos],
  ["corazón", "a-corazon", "corazón", T.corazon],
  ["el «2» del multivitamínico", "badge-2", "Dos", T.dos2],
  ["tarjeta del multivitamínico", "card-b", "Uno", T.uno2],
  ["«1 AL DÍA»", "b-al-dia", "día", T.dia],
  ["«EN EL DESAYUNO»", "b-desayuno", "desayuno", T.desayuno],
  ["pila del cansancio", "b-pila", "cansancio", T.cansancio],
  ["escudo de las defensas", "b-escudo", "defensas", T.defensas],
  ["tarjeta: botes", "regla", "Esto", T.esto1],
  ["comida", "r-comida", "comer", T.comer],
  ["sueño", "r-sueno", "dormir", T.dormir],
  ["magia tachada", "r-magia", "magia", T.magia],
  ["datáfono: pagado", "datafono-ok", "Pagó", T.pago],
  ["sale el abuelo", "abu-root", "abuelo", T.abuelo],
  ["tarjeta de seguir", "seguir", "segunda", T.segunda2],
  ["«PARTE 2»", "chip-p2", "parte", T.parte],
  ["«SIGUIENDO»", "boton-siguiendo", "Síguenos", T.siguenos],
  ["«PARTE 3»", "chip-p3", "tercera", T.tercera],
];
// cosas que no aparecen sino que cambian: [qué, id, atributo, palabra, segundo]
const CAMBIOS = [
  ["la barra se dobla", "barra-flaco-bar", "d", "doblaba", T.doblaba],
  ["la pila se vacía", "pila-nivel", "width", "quedaba", T.quedaba],
  ["el omega-3 cae en el mostrador", "bote-omega", "transform", "dos", T.dos1],
  ["el multivitamínico cae en el mostrador", "bote-multi", "transform", "botes", T.botes1],
  ["el electrocardiograma se dibuja", "a-ecg", "stroke-dashoffset", "funcione", T.funcione],
  ["la pila se carga", "b-pila-nivel", "width", "cansancio", T.cansancio],
  ["marcador → 01", "marcador-u", "transform", "uno", T.uno3],
  ["marcador → 04", "marcador-u", "transform", "cuatro", T.cuatro],
  ["marcador → 08", "marcador-u", "transform", "ocho", T.ocho],
  ["se apaga el gimnasio", "gym-oscuro", "opacity", "apagaba", T.apagaba],
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
