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
  ["abuelo (rodillas que crujen)", 0.5, T.vieja, 2780, 1250, 2980, 1800],
  ["«¡yo también!»", T.apuntarse + 0.3, T.asi, 2600, 900, 3080, 1170],
  ["abuelo y chaval en el gimnasio", T.apuntarse + 0.3, T.asi - 0.05, 2780, 1100, 3720, 1800],
  ["bocadillo", T.pidio + 0.4, T.dependiente - 0.1, 1220, 900, 1740, 1150],
  ["dependiente", T.pidio + 0.4, T.chaval2Fin, 880, 1150, 1130, 1470],
  ["abuelo en el mostrador", T.pidio + 0.4, T.chaval2Fin, 1520, 1250, 1700, 1800],
  ["tarjeta del colágeno", T.una1 + 0.4, T.normalidadFin + 0.1, 420, 780, 900, 1200],
  ["bote de colágeno", T.uno1 + 0.4, T.normalidadFin, 610, 1220, 790, 1470],
  ["tarjeta de la vitamina D", T.una2 + 0.4, T.normalesFin, 1080, 780, 1560, 1140],
  ["bote de vitamina D", T.vitamina3, T.normalesFin, 1165, 1180, 1355, 1470],
  ["dependiente («versión abuelo»)", T.siempre + 0.3, T.duele, 880, 1150, 1130, 1470],
  ["tarjeta médico → entrenar → botes", T.medico + 0.1, T.pago - 0.2, 640, 140, 2280, 440],
  ["marcador de semanas", T.semana1 + 0.4, T.cuatro + 0.4, 3180, 880, 3720, 1110],
  ["abuelo haciendo sentadillas", T.sentadilla, T.chaval4, 3200, 1250, 3470, 1800],
  ["el chaval sentado en el banco", T.descanso + 0.5, T.vecina - 0.2, 3880, 1150, 4220, 1800],
  ["la vecina y su interrogación", T.pidio2 + 0.3, T.siguenos, 2080, 1150, 2250, 1800],
  ["tarjeta de seguir", T.siguenos + 0.5, D, 540, 80, 2380, 480],
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
