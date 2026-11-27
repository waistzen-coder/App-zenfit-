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
  ["la hoja «VEGANO»", "hoja", "vegano", T.vegano1],
  ["«¿SIN CARNE?»", "g-carne", "dijeron", T.dijeron],
  ["bocadillo", "bocadillo", "preguntar", T.preguntar],
  ["el «1» de la proteína", "badge-1", "Uno", T.uno1],
  ["tarjeta de la proteína", "card-a", "vegetal", T.vegetal],
  ["«GUISANTE»", "a-guisante", "guisante", T.guisante],
  ["«+ ARROZ»", "a-arroz", "arroz", T.arroz],
  ["«1 CACITO»", "a-cacito", "cacito", T.cacito],
  ["«TRAS ENTRENAR»", "a-despues", "después", T.despues],
  ["músculo", "a-musculo", "ganar", T.ganar],
  ["escudo: no perderlo", "a-escudo", "perderlo", T.perderlo],
  ["«VENGA DE DONDE VENGA»", "a-venga", "venga", T.venga1],
  ["el «2» de la B12", "badge-2", "Dos", T.dos2],
  ["tarjeta de la B12", "card-b", "vitamina", T.vitamina],
  ["«SI ERES VEGANO»", "b-vegano", "vegano", T.vegano2],
  ["«IMPRESCINDIBLE»", "b-falta", "faltar", T.faltar],
  ["cansancio", "b-pila", "cansancio", T.cansancio],
  ["glóbulos rojos", "b-globulos", "glóbulos", T.globulos],
  ["tarjeta «lo de siempre»", "regla", "sin", T.sin],
  ["entrenar", "r-entrenar", "entrenar", T.entrenar2],
  ["botes", "r-botes", "nada", T.nada],
  ["datáfono: pagado", "datafono-ok", "Pagó", T.pago],
  ["«?» le miran raro", "g-raro-1", "raro", T.raro],
  ["«¿QUÉ?»", "g-come", "preguntaban", T.preguntaban],
  ["«¡RECETA!»", "g-receta", "receta", T.receta],
  ["sus lentejas", "lentejas", "lentejas", T.lentejas],
  ["los diez botes", "mini-0", "diez", T.diez],
  ["«ENTRENA»", "c-entrena", "Entrena", T.entrena],
  ["«COME BIEN»", "c-come", "come", T.come],
  ["«DESCANSA»", "c-descansa", "descansa", T.descansa],
  ["el logo de la puerta", "logo-grande", "encontrarlo", T.encontrarlo],
  ["tarjeta de seguir", "seguir", "Síguenos", T.siguenos],
  ["«¿PARTE 6?»", "chip-p3", "venga", T.venga3],
];
const CAMBIOS = [
  ["la proteína cae en el mostrador", "bote-veg", "transform", "dos", T.dos1],
  ["la B12 cae en el mostrador", "bote-b12", "transform", "botes", T.botes1],
  ["marcador → 1", "marcador-u", "transform", "uno", T.uno2],
  ["marcador → 4", "marcador-u", "transform", "cuatro", T.cuatro1],
  ["marcador → 8", "marcador-u", "transform", "ocho", T.ocho],
  ["más músculo (semana 4)", "comp-tronco", "d", "cuatro", T.cuatro1],
  ["más músculo (semana 8)", "comp-tronco", "d", "ocho", T.ocho],
  ["la tarjeta late con «consejo»", "regla", "transform", "consejo", T.consejo],
  ["…y se convierte en el consejo", "regla-fondo", "width", "Entrena", T.entrena],
  ["«SIGUIENDO»", "boton-siguiendo", "opacity", "perderte", T.perderte],
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
