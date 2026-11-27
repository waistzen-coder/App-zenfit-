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
  ["chico con la barra", 0.5, T.pero1, 3150, 950, 3750, 1500],
  ["marcador (semana 12)", 0.5, T.mitad, 3180, 880, 3720, 1110],
  ["bocadillo", T.esta + 0.4, T.dependiente - 0.1, 1220, 900, 1740, 1150],
  ["dependiente", T.esta + 0.4, T.pilas2Fin, 880, 1150, 1130, 1470],
  ["chico delante del mostrador", T.esta + 0.4, T.pilas2Fin, 1420, 1110, 1780, 1800],
  ["tarjeta del omega-3", T.con + 0.4, T.normalidadFin + 0.1, 420, 780, 900, 1200],
  ["bote de omega-3", T.uno1 + 0.4, T.normalidadFin, 610, 1220, 790, 1470],
  ["tarjeta del multivitamínico", T.uno2 + 0.4, T.defensas + 0.4, 1080, 780, 1560, 1140],
  ["bote de multivitamínico", T.multi, T.defensas + 0.4, 1165, 1200, 1355, 1470],
  ["dependiente («lo de siempre»)", T.repitio + 0.3, T.esto1, 880, 1150, 1130, 1470],
  ["tarjeta botes + comida + sueño", T.comer + 0.1, T.magiaFin, 640, 140, 2280, 440],
  ["marcador de semanas", T.semana1 + 0.4, T.cuatro + 0.4, 3180, 880, 3720, 1110],
  ["chico con la pila llena", T.semana1 + 0.4, T.gimnasio3 + 0.4, 3250, 1000, 3650, 1500],
  ["el de al lado antes de irse", T.cuatro + 0.4, T.ultimo, 3990, 1180, 4250, 1800],
  ["abuelo con su caja", T.caja - 0.1, T.segunda2, 1960, 1250, 2160, 1800],
  ["tarjeta de seguir", T.segunda2 + 0.5, D, 540, 80, 2380, 480],
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
