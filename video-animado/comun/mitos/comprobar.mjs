// Comprobaciones de un episodio de «Mitos del gimnasio» (desde la carpeta del episodio):
//   node ../comun/mitos/comprobar.mjs
// 1) Sincronía: cada cosa aparece cuando EMPIEZA la palabra que la nombra (±3 fotogramas).
// 2) Zonas seguras: mientras se ven, los bocadillos, la nube, la tarjeta, el veredicto y la
//    llamada quedan dentro de 60–1020 px en horizontal y 220–1500 px en vertical.
// Escribe SINCRONIA.md.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "tools/"));
const { chromium } = require("playwright");
const html = fs.readFileSync(path.join(RAIZ, "compositions/mundo.html"), "utf8");
const dentro = html.replace(/^[\s\S]*?<template>/, "").replace(/<\/template>[\s\S]*$/, "");
const gsapJs = fs.readFileSync(path.join(RAIZ, "tools/node/node_modules/gsap/dist/gsap.min.js"), "utf8");
const IF = JSON.parse(html.match(/window\.__IF = (\{.*?\});\n/s)[1]);
const { T, D, EP } = IF;
const tk = (k) => (k == null ? null : typeof k === "number" ? k : Array.isArray(k) ? (typeof k[0] === "number" ? k[0] : T[k[0]]) + (k[1] || 0) : T[k]);
const palabra = (k) => (Array.isArray(k) ? k[0] : k);
const enPalabra = (k) => typeof k === "string" || (Array.isArray(k) && typeof k[0] === "string" && Math.abs(k[1] || 0) <= 0.15);

const EVENTOS = [];
EP.objetos.forEach((o, i) => {
  if (["marcador", "barra", "estelas", "noche"].includes(o.tipo) || !enPalabra(o.t0)) return;
  EVENTOS.push([`${o.tipo} ${o.lineas ? "«" + o.lineas.join(" ") + "»" : o.texto || o.que || o.gag || ""}`.trim(), `o${i}`, palabra(o.t0), T[palabra(o.t0)]]);
});
if (EP.tarjeta) {
  EVENTOS.push([`tarjeta ${EP.tarjeta.titulo || "REALIDAD"}`, "r-titulo", palabra(EP.tarjeta.t0), T[palabra(EP.tarjeta.t0)]]);
  EP.tarjeta.filas.forEach((f, k) => EVENTOS.push([`fila «${[].concat(f.texto).join(" ")}»`, `r-f${k}`, palabra(f.t), T[palabra(f.t)]]));
}
if (EP.producto && enPalabra(EP.producto.t)) EVENTOS.push(["el bote en el mostrador", "producto", palabra(EP.producto.t), T[palabra(EP.producto.t)]]);
const boton = EP.cta.boton || ["SEGUIR", "SIGUIENDO"];
const CAMBIOS = [...(EP.veredicto ? [["sello MITO del veredicto", "veredicto-sello", "opacity", palabra(EP.veredicto.sello), T[palabra(EP.veredicto.sello)]]] : []), [`${boton[0]} → ${boton[1]}`, "boton-siguiendo", "opacity", palabra(EP.cta.siguenos), T[palabra(EP.cta.siguenos)] + 0.25]];
// el calendario cambia de hoja en cada «Día…»
EP.objetos.forEach((o, i) => o.tipo === "calendario" && (o.dias || []).forEach(([k, n]) => enPalabra(k) && CAMBIOS.push([`calendario: día ${n}`, `o${i}-hoja`, "transform", palabra(k), T[palabra(k)]])));
EP.objetos.forEach((o, i) => o.sello != null && CAMBIOS.push([`sello MITO del bocadillo`, `o${i}-sello`, "opacity", palabra(o.sello), T[palabra(o.sello)]]));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.setContent(`<html><body style="margin:0"><script>${gsapJs}</script>${dentro}</body></html>`);
await page.waitForFunction(() => window.__IF && window.__IF.render);
const F = 1 / 30;
let mal = 0;
const filas = [];
for (const [que, id, pal, tw] of EVENTOS) {
  const ap = await page.evaluate(([id, tw, F]) => {
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
  }, [id, tw, F]);
  const d = ap === null ? null : ap - tw;
  const ok = d !== null && d >= -0.1 && d <= 0.1;
  if (!ok) mal++;
  filas.push([ok, que, pal, tw, d]);
}
for (const [que, id, attr, pal, tw] of CAMBIOS) {
  const ap = await page.evaluate(([id, attr, tw, F]) => {
    const el = document.getElementById(id);
    let prev = null;
    for (let t = tw - 0.4; t <= tw + 0.5; t += F) {
      window.__IF.render(t);
      const v = el.getAttribute(attr);
      if (prev !== null && v !== prev) return t;
      prev = v;
    }
    return null;
  }, [id, attr, tw, F]);
  const d = ap === null ? null : ap - tw;
  const ok = d !== null && d >= -0.1 && d <= 0.1;
  if (!ok) mal++;
  filas.push([ok, que, pal, tw, d]);
}
// zonas seguras: cajas reales en pantalla de lo importante mientras se ve del todo
const IMPORTANTES = [
  ...EP.objetos.map((o, i) => (["bocadillo", "nube", "pildora", "reloj"].includes(o.tipo) ? [`${o.tipo} ${i}`, `o${i}${o.tipo === "nube" ? "-nube" : ""}`, Math.max(0, tk(o.t0) + 0.4), o.t1 == null ? D : tk(o.t1) - 0.25] : null)).filter(Boolean),
  ...(EP.tarjeta ? [["tarjeta REALIDAD", "card-r", tk(EP.tarjeta.filas.at(-1).t) + 0.5, tk(EP.tarjeta.cierra) - 0.2]] : []),
  ...(EP.veredicto ? [["veredicto", "veredicto", tk(EP.veredicto.sello) + 0.2, tk(EP.cta.t) - 0.4]] : []),
  ["llamada", "cta", tk(EP.cta.t) + 0.45, D],
];
const zonas = [];
for (const [que, id, t0, t1] of IMPORTANTES) {
  const peor = await page.evaluate(([id, t0, t1]) => {
    const el = document.getElementById(id);
    let peor = null;
    for (let t = t0; t <= t1; t += 0.1) {
      window.__IF.render(t);
      const r = el.getBoundingClientRect();
      const fuera = Math.max(60 - r.left, r.right - 1020, 220 - r.top, r.bottom - 1500, 0);
      if (fuera > 4 && (!peor || fuera > peor.fuera)) peor = { t, fuera, caja: [r.left, r.top, r.right, r.bottom].map(Math.round) };
    }
    return peor;
  }, [id, t0, t1]);
  zonas.push([que, t0, t1, peor]);
}
await browser.close();

let md = "# Sincronía imagen–voz\n\nCada fila: lo que se ve, la palabra que lo nombra, cuándo empieza esa palabra en la voz y cuántos fotogramas (a 30 fps) de diferencia hay entre la palabra y el primer fotograma en que se ve. Margen aceptado: ±3 fotogramas.\n\n| | Qué se ve | Palabra | Empieza | Diferencia |\n| --- | --- | --- | --- | --- |\n";
for (const [ok, que, pal, tw, d] of filas) {
  const fr = d === null ? "no aparece" : `${d >= 0 ? "+" : ""}${Math.round(d * 30)} fot. (${d >= 0 ? "+" : ""}${d.toFixed(2)} s)`;
  md += `| ${ok ? "✓" : "✗"} | ${que} | «${pal}» | ${tw.toFixed(2)} s | ${fr} |\n`;
  if (!ok) console.log(`✗ ${que} «${pal}» ${tw.toFixed(2)} s  ${fr}`);
}
md += `\n${mal ? `${mal} fuera de margen.` : "Todo cae en su palabra."}\n\n## Zonas seguras\n\n`;
let fz = 0;
for (const [que, t0, t1, peor] of zonas) {
  if (peor) fz++;
  md += `- ${peor ? "✗" : "✓"} ${que} (${t0.toFixed(2)}–${t1.toFixed(2)} s)${peor ? `: se sale ${Math.round(peor.fuera)} px a los ${peor.t.toFixed(2)} s (caja ${peor.caja.join(", ")})` : ""}\n`;
  if (peor) console.log(`✗ zona: ${que} se sale ${Math.round(peor.fuera)} px a los ${peor.t.toFixed(2)} s (caja ${peor.caja.join(", ")})`);
}
fs.writeFileSync(path.join(RAIZ, "SINCRONIA.md"), md);
console.log(`${filas.length - mal}/${filas.length} en su palabra · ${zonas.length - fz}/${zonas.length} dentro de la zona segura`);
