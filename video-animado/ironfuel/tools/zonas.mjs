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
  ["chico grande sacando bíceps", T.asi2 + 0.15, T.esto, 2460, 1120, 2740, 1800],
  ["aviso «12 semanas antes»", T.esto + 0.3, T.esto + 0.75, 2170, 1014, 2770, 1106],
  ["bocadillo", T.pidio + 0.5, T.dependiente2 - 0.1, 1220, 900, 1740, 1210],
  ["dependiente", T.pidio + 0.5, T.magia, 880, 1150, 1130, 1470],
  ["chico delante del mostrador", T.pidio + 0.5, T.magia, 1540, 1200, 1740, 1800],
  ["bote mágico tachado", T.magia + 0.3, T.saco, 1390, 1240, 1570, 1470],
  ["tarjeta de la creatina", T.tres + 0.4, T.intensos + 0.3, 420, 780, 900, 1200],
  ["bote de creatina", T.uno1 + 0.4, T.intensos + 0.3, 610, 1220, 790, 1470],
  ["tarjeta de la proteína", T.ayuda2 + 0.4, T.entrenar1 + 0.4, 1080, 780, 1560, 1200],
  ["bote de proteína", T.proteina + 0.3, T.entrenar1 + 0.4, 1165, 1200, 1355, 1470],
  ["dependiente («una cosa más»)", T.dijo + 0.3, T.sin, 880, 1150, 1130, 1470],
  ["marcador de semanas", T.semana1 + 0.4, T.cuatro + 0.4, 3180, 880, 3720, 1110],
  ["el de al lado sin pesas", T.lado, T.semana4, 3990, 1180, 4250, 1800],
  ["barra doblada y marcador", T.doblaba + 0.1, T.volvio - 0.2, 3150, 880, 3750, 1450],
  ["choque de manos", T.mas4, T.mas4 + 0.5, 1150, 1100, 1800, 1800],
  ["los tres en la cola", T.solo + 0.2, T.companero, 2460, 1180, 2850, 1800],
  ["caja de comentario", T.comenta + 0.55, D, 620, 150, 2300, 390],
  ["los cinco en la tienda", T.comenta + 0.55, D, 880, 1100, 2240, 1800],
];
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
