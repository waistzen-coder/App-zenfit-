// Comprueba que lo importante cae dentro de las zonas seguras de Shorts, Reels y TikTok
// (nada en los 220 px de arriba, en los 420 de abajo ni a menos de 60 de los lados)
// mientras está en pantalla, usando la cámara real del vídeo.
//   node tools/zonas.mjs
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { gsap } = require("./node/node_modules/gsap/dist/gsap.js");
const html = fs.readFileSync(new URL("../compositions/mundo.html", import.meta.url), "utf8");
const IF = JSON.parse(html.match(/window\.__IF = (\{.*?\});\n/s)[1]);
globalThis.window = { __IF: IF };
globalThis.gsap = gsap;
globalThis.document = { getElementById: () => null };
new Function(fs.readFileSync(new URL("./motor.js", import.meta.url), "utf8"))();
const cam = window.__IF.camara;
const T = IF.T, D = IF.D;
const ZONA = { x0: 60, x1: 1020, y0: 220, y1: 1500 };
// [nombre, desde, hasta, caja del mundo x0, y0, x1, y1]
const COSAS = [
  ["el dependiente y las preguntas", 0.6, T.ensena, 615, 880, 1385, 1470],
  ["su bote en alto", T.ensena + 0.3, T.nad1 - 0.3, 860, 760, 1180, 1470],
  ["el bote NAD+ en el mostrador", T.nad1 + 0.4, T.uvaFin, 825, 1200, 975, 1470],
  ["«¿y lo demás?»", T.demas + 0.35, T.siempre2 + 0.2, 765, 980, 1235, 1470],
  ["7:00 en el gimnasio", T.asi + 0.8, T.ocho - 0.1, 3130, 1150, 3750, 1800],
  ["8:00: café y cápsulas", T.ocho + 0.4, T.nueve1 - 0.1, 820, 1200, 1210, 1470],
  ["9:00: abre la tienda", T.nueve1 + 0.45, T.ahora - 0.1, 1700, 580, 2520, 1800],
  ["9:01: el flaco en la puerta", T.puerta, T.ahora - 0.1, 2330, 1100, 2600, 1800],
  ["lo que toma él", T.toma2 + 0.3, T.siguenos - 0.1, 820, 700, 1730, 1800],
  ["tarjeta de seguir", T.siguenos + 0.5, D, 540, 80, 2380, 480],
];
// las tarjetas por datos, con su tamaño final, mientras están en pantalla
const tk = (k) => (Array.isArray(k) ? T[k[0]] + k[1] : T[k]);
for (const c of IF.CARDS || []) {
  const abajo = Math.max(...c.filas.map((f) => f.abajo)) + 26;
  COSAS.push([`tarjeta ${c.id}`, Math.max(...c.filas.map((f) => tk(f.t))) + 0.3, tk(c.hasta), c.x, c.y, c.x + c.w, abajo]);
}
let fallos = 0;
for (const [nombre, t0, t1, x0, y0, x1, y1] of COSAS) {
  let peor = null;
  for (let t = t0; t <= t1; t += 1 / 30) {
    const c = cam(t);
    const sx0 = 540 + (x0 - c.x) * c.z, sx1 = 540 + (x1 - c.x) * c.z;
    const sy0 = 960 + (y0 - c.y) * c.z, sy1 = 960 + (y1 - c.y) * c.z;
    const fuera = Math.max(ZONA.x0 - sx0, sx1 - ZONA.x1, ZONA.y0 - sy0, sy1 - ZONA.y1, 0);
    if (fuera > 0 && (!peor || fuera > peor.fuera)) peor = { t, fuera, caja: [sx0, sy0, sx1, sy1].map(Math.round) };
  }
  if (peor) fallos++;
  console.log(`${peor ? "✗" : "✓"} ${nombre.padEnd(30)} ${t0.toFixed(2)}–${t1.toFixed(2)} s${peor ? `  se sale ${Math.round(peor.fuera)} px a los ${peor.t.toFixed(2)} s · caja ${peor.caja.join(", ")}` : ""}`);
}
console.log(fallos ? `\n${fallos} elemento(s) se salen de la zona segura` : "\nTodo lo importante está dentro de la zona segura.");
