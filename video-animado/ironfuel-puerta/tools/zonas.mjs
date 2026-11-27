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
const { T, D, ON, PAL, PREG, LEMA, XP, YP, FIN, YR } = IF;
const ZONA = { x0: 60, x1: 1020, y0: 220, y1: 1500 };
// [nombre, desde, hasta, caja del mundo x0, y0, x1, y1]
const COSAS = [
  ["las cinco palabras de la foto", 0, 2.2, 0, 300, 1150, 2760],
];
PAL.forEach((p, i) => {
  const hasta = i < 4 ? ON[i + 1] - 0.3 : T.cinco2;
  COSAS.push([`${["FUERZA", "RESISTENCIA", "ENERGÍA", "RENDIMIENTO", "RECUPERACIÓN"][i]} y su icono`, ON[i] + 0.36, hasta, 500 - p.wH / 2, p.ys - 480, 500 + p.wH / 2, p.ys + p.capH / 2 + 60]);
});
COSAS.push(
  ["cinco franjas con su plan", T.cinco2 + 0.9, T.por1, 60, PAL[0].yb - 70, 958, PAL[4].yb + 70],
  ["¿PARA QUÉ ENTRENAS? y el rodillo", T.entrenas + 0.3, T.si1 - 0.4, 40, PREG[0].y - PREG[0].cap / 2 - 20, 960, YR + 130],
  ["el bote y sus etiquetas", T.por2 + 0.4, T.no1, XP - 226, YP - 611, -790, YP],
  ["bocadillo", T.lo + 0.3, T.aunque - 0.2, XP - 380, 5670, XP + 380, 6000],
  ["tique", T.nada2 + 0.45, T.debajo - 0.36, XP - 280, YP - 706, XP + 280, YP],
  ["las cinco y la frase de abajo", T.debajo + 0.1, T.una - 0.1, 60, PAL[0].yb - 70, 990, LEMA[2].yp + 40],
  ["CONSTRUYE TU MEJOR VERSIÓN", T.version + 0.45, T.airon - 0.4, 50, LEMA[0].yh - 50, 950, LEMA[2].yh + 66],
  ["rótulo real (letras)", T.airon + 0.2, D, 20 + 9, FIN.rotulo - 150, 20 + 0.923 * 730, FIN.rotulo + 150],
  ["logo", T.nutrishon + 0.5, D, 294, FIN.logo - 206, 706, FIN.logo + 206],
  ["SÍGUENOS y VEN A VERNOS", T.ven + 0.4, D, 270, FIN.boton - 52, 730, FIN.ven + 30],
);
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
  console.log(`${peor ? "✗" : "✓"} ${nombre.padEnd(34)} ${t0.toFixed(2)}–${t1.toFixed(2)} s${peor ? `  se sale ${Math.round(peor.fuera)} px a los ${peor.t.toFixed(2)} s · caja ${peor.caja.join(", ")}` : ""}`);
}
console.log(fallos ? `\n${fallos} elemento(s) se salen de la zona segura` : "\nTodo lo importante está dentro de la zona segura.");
