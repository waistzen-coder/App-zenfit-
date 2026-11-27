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
  ["el compañero y su hoja", T.vegano1 + 0.3, T.dijeron, 2800, 1020, 3200, 1800],
  ["«¿sin carne?» y el del gimnasio", T.dijeron + 0.3, T.asi2, 3200, 1030, 3640, 1800],
  ["bocadillo", T.preguntar + 0.45, T.saco - 0.15, 1180, 900, 1780, 1150],
  ["dependiente", T.preguntar + 0.45, T.uno1 - 0.3, 880, 1150, 1130, 1470],
  ["compañero en el mostrador", T.preguntar + 0.5, T.uno1 - 0.3, 1520, 1230, 1690, 1800],
  ["tarjeta de la proteína", T.vegetal + 0.4, T.venga2Fin + 0.1, 420, 780, 900, 1230],
  ["bote de proteína vegetal", T.uno1 + 0.4, T.venga2Fin, 600, 1220, 800, 1470],
  ["tarjeta de la B12", T.vitamina + 0.4, T.normalidadFin, 1080, 780, 1560, 1205],
  ["bote de B12", T.vitamina, T.normalidadFin, 1165, 1180, 1355, 1470],
  ["tarjeta entrenar + botes", T.entrenar2, T.pago - 0.2, 640, 140, 2280, 440],
  ["marcador de semanas", T.uno2, T.pedian, 3180, 880, 3720, 1110],
  ["el compañero entrenando", T.semana1 + 0.4, T.pedian, 3125, 1000, 3760, 1800],
  ["el del gimnasio y el flaco", T.semana1 + 0.4, T.pedian, 3740, 930, 4195, 1800],
  ["la receta y los que la piden", T.receta, T.asi3, 3150, 860, 4165, 1800],
  ["los cuatro clientes y sus botes", T.cuatro2, T.consejo - 0.4, 3150, 880, 4170, 1800],
  ["tarjeta del consejo", T.entrena, T.demas, 1000, 120, 1920, 500],
  ["logo de la puerta", T.encontrarlo + 0.3, T.siguenos - 0.05, 2166, 1225, 2516, 1575],
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
