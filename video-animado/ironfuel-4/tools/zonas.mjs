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
  ["vecina y chaval", 0.5, T.correr, 2580, 1200, 3150, 1800],
  ["vecina corriendo con su reloj", T.correr + 0.3, T.asi, -1, 1000, -1, 1800],
  ["bocadillo", T.pidio + 0.4, T.dependiente - 0.1, 1180, 900, 1780, 1150],
  ["dependiente", T.pidio + 0.4, T.enteraFin, 880, 1150, 1130, 1470],
  ["vecina en el mostrador", T.pidio + 0.4, T.enteraFin, 1520, 1230, 1690, 1800],
  ["tarjeta de la isotónica", T.sorbos + 0.4, T.agua2Fin + 0.1, 420, 780, 900, 1200],
  ["bote de isotónica", T.uno1 + 0.4, T.agua2Fin, 600, 1220, 800, 1470],
  ["tarjeta del magnesio", T.uno2 + 0.4, T.cansancioFin, 1080, 780, 1560, 1140],
  ["bote de magnesio", T.magnesio, T.cansancioFin, 1165, 1180, 1355, 1470],
  ["dependiente («lo de siempre»)", T.siempre + 0.3, T.entrenar1 - 0.2, 880, 1150, 1130, 1470],
  ["tarjeta entrenar + botes", T.entrenar1 + 0.1, T.pago - 0.2, 640, 140, 2280, 440],
  ["vecina en la carrera con su reloj", T.semana1 + 0.4, T.meta - 0.3, -1, 1000, -1, 1800],
  ["meta y los que la esperan", T.meta + 0.5, T.alto + 0.2, 5120, 960, 5880, 1800],
  ["el compañero y su hoja", T.companero + 0.3, T.siguenos, 6180, 1080, 6340, 1800],
  ["tarjeta de seguir", T.siguenos + 0.5, D, 4680, 80, 6520, 480],
];
let fallos = 0;
for (const [nombre, t0, t1, x0, y0, x1, y1] of COSAS) {
  let peor = null, x0b, x1b;
  for (let t = t0; t <= t1; t += 1 / 30) {
    const c = cam(t);
    if (x0 === -1) { const vx = window.__IF.vecinaX(t); x0b = vx - 180; x1b = vx + 180; } else { x0b = x0; x1b = x1; }
    const sx0 = 540 + (x0b - c.x) * c.z, sx1 = 540 + (x1b - c.x) * c.z;
    const sy0 = 960 + (y0 - c.y) * c.z, sy1 = 960 + (y1 - c.y) * c.z;
    const fuera = Math.max(ZONA.x0 - sx0, sx1 - ZONA.x1, ZONA.y0 - sy0, sy1 - ZONA.y1, 0);
    if (fuera > 0 && (!peor || fuera > peor.fuera)) peor = { t, fuera, caja: [sx0, sy0, sx1, sy1].map(Math.round) };
  }
  if (peor) fallos++;
  console.log(`${peor ? "✗" : "✓"} ${nombre.padEnd(30)} ${t0.toFixed(2)}–${t1.toFixed(2)} s${peor ? `  se sale ${Math.round(peor.fuera)} px a los ${peor.t.toFixed(2)} s · caja ${peor.caja.join(", ")}` : ""}`);
}
console.log(fallos ? `\n${fallos} elemento(s) se salen de la zona segura` : "\nTodo lo importante está dentro de la zona segura.");
