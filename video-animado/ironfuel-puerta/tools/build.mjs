// Generador del vídeo de prueba de IronFuel Nutrition: «Cinco palabras en la puerta».
//
//   node tools/build.mjs
//
// Lee guion.txt + assets/audio/transcript.json (tools/alinear.py), calcula cuándo empieza
// cada palabra con P("palabra", n) y escribe:
//   index.html                  raíz con subtítulos (sin ellos: --variables '{"subtitulos":false}')
//   compositions/mundo.html     el mundo (la puerta real, el cartel, el mostrador, el rótulo) y la cámara
//   compositions/subtitulos.html
//   tools/cues.json             efectos de sonido, música y cada aparición con su segundo
// Un solo mundo en coordenadas del cartel de la puerta (1 u = 1 px con la cámara a zum 1):
// el cartel mide 1000 u de ancho; la foto real está a 5,52 u por píxel de la foto.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { cargar } from "./tiempos.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = (p) => fs.readFileSync(path.join(RAIZ, p), "utf8");
const wr = (p, s) => {
  fs.mkdirSync(path.dirname(path.join(RAIZ, p)), { recursive: true });
  fs.writeFileSync(path.join(RAIZ, p), s);
};

const V = cargar();
const { P, E } = V;
const durVoz = +spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(RAIZ, "assets/audio/voz.wav")], { encoding: "utf8" }).stdout.trim();
const FPS = 30;
const D = Math.round(durVoz * FPS) / FPS;
const M = JSON.parse(rd("tools/montaje.json"));

// ───────────── momentos clave: cuándo EMPIEZA cada palabra ─────────────
const T = {
  puerta: P("puerta"), cinco1: P("cinco", 1), palabras: P("palabras"),
  fuerza: P("Fuerza"), resistencia: P("Resistencia"), energia: P("Energía"), rendimiento: P("Rendimiento"), recuperacion: P("Recuperación"),
  cinco2: P("Cinco", 2), objetivos: P("objetivos"), distintos: P("distintos"),
  cada: P("cada"), plan: P("plan"), distinto: P("distinto"),
  por1: P("Por", 1), antes: P("antes"), venderte1: P("venderte", 1), nada1: P("nada", 1), preguntamos: P("preguntamos"),
  para2: P("para", 2), que1: P("qué", 1), entrenas: P("entrenas"),
  si1: P("Si", 1), algo: P("algo"), sirve: P("sirve"), explicamos: P("explicamos"), por2: P("por", 2), que2: P("qué", 2),
  si2: P("Si", 2), no1: P("no", 1), falta: P("falta"), lo: P("lo"), decimos: P("decimos"),
  aunque: P("Aunque"), eso2: P("eso", 2), signifique: P("signifique"), no2: P("no", 2), venderte2: P("venderte", 2), nada2: P("nada", 2),
  debajo: P("debajo"), cinco3: P("cinco", 3), una: P("una"), frase: P("frase"),
  construye: P("Construye"), tu: P("tu"), mejor: P("mejor"), version: P("versión"),
  airon: P("Áiron"), fiul: P("Fiul"), nutrishon: P("Nutríshon"),
  siguenos: P("Síguenos"), ven: P("ven"), vernos: P("vernos"), finVoz: E("vernos"),
};
for (const [k, v] of Object.entries(T)) if (!Number.isFinite(v)) throw new Error("tiempo raro: " + k);
const ON = [T.fuerza, T.resistencia, T.energia, T.rendimiento, T.recuperacion];
const TIEMPO = M.tiempo; // un tiempo de la música (s)

// ───────────── colores y materiales ─────────────
const C = {
  suelo: "#0A0D12", panel: "#0E1219", panelFoto: "#3A3531",
  azul: "#1D6BFF", azulClaro: "#5AB0FF", azulOsc: "#0B3FB3", hoja: "#1747B5",
  blanco: "#F4F6F8", acero: "#C9CED6", sol: "#E3EF6A", papel: "#F2F1EC", tinta: "#15171C",
};
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
// Saira 900 cursiva ancha (como «IRON FUEL»): altura de mayúscula 0,69 em
const CAP_S = 0.69,
  CAP_O = 0.81;
const saira = (inner, fs, extra = "") =>
  `<text x="0" y="${((CAP_S * fs) / 2).toFixed(1)}" text-anchor="middle" font-family="Saira" font-style="italic" font-weight="900" font-size="${fs.toFixed(1)}" style="font-stretch:125%" ${extra}>${inner}</text>`;
const oswald = (s, fs, extra = "") =>
  `<text x="0" y="${((CAP_O * fs) / 2).toFixed(1)}" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="${fs.toFixed(1)}" ${extra}>${esc(s)}</text>`;
// iconos de Phosphor (assets/icons, licencia MIT)
const icono = (n, x, y, size, fill, extra = "") => {
  const s = rd(`assets/icons/${n}.svg`).replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const k = size / 256;
  return `<g transform="translate(${(x - size / 2).toFixed(1)} ${(y - size / 2).toFixed(1)}) scale(${k.toFixed(4)})" fill="${fill}" ${extra}>${s}</g>`;
};
// pseudoaleatorio determinista
let semilla = 7;
const rnd = () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;

// ───────────── geometría del cartel de la puerta (medida en la foto real) ─────────────
const K = 5.52; // unidades del mundo por píxel de la foto
const FOTO = { x: -251 * K, y: -560 * K, w: 560 * K, h: 1630 * K }; // la foto, con el cartel en (0,0)
const SESGO = 0.054; // la foto está tomada en diagonal: el cartel se inclina
// anchos de Saira (900, cursiva, 125 %) y Oswald (700) a 100 px, medidos en el navegador
const PAL = [
  { hero: "FUERZA", print: "FUERZA", xc: 504, yc: 425, wc: 491, capc: 138, w100: 439.2, yic: 166 },
  { hero: "RESISTENCIA", print: "RESISTENCIA", xc: 512, yc: 894, wc: 701, capc: 138, w100: 722.1, yic: 662 },
  { hero: "ENERGÍA", print: "ENERGIA", xc: 516, yc: 1391, wc: 431, capc: 110, w100: 487, yic: 1104 },
  { hero: "RENDIMIENTO", print: "RENDIMIENTO", xc: 527, yc: 1888, wc: 745, capc: 138, w100: 774.9, yic: 1628 },
  { hero: "RECUPERACIÓN", print: "RECUPERACIÓN", xc: 530, yc: 2661, wc: 872, capc: 138, w100: 845.5, yic: 2291 },
].map((p, i) => {
  const fsH = Math.min(200, (900 * 100) / p.w100);
  const wH = (p.w100 * fsH) / 100,
    capH = CAP_S * fsH;
  return {
    ...p, i, fsP: p.capc / CAP_O, fsH, wH, capH,
    ys: 425 + 1500 * i, // una palabra por plano
    yb: 5545 + 220 * i, // cinco franjas
    sB: Math.min(700 / wH, 120 / capH), // franja centrada
    sL: Math.min(570 / wH, 120 / capH), // franja con su plan a la derecha
    sR: Math.min(800 / wH, 130 / capH), // rodillo
  };
});
const YR = 6060; // centro de la ventana del rodillo
const PREG = [
  { id: "preg1", fs: 133, y: 5700, w100: 615.7 },
  { id: "preg2", fs: 126, y: 5850, w100: 652.1 },
];
// la frase de abajo del cartel: impresa (Oswald) y en grande (Saira)
const LEMA = [
  { print: "CONSTRUYE", hero: "CONSTRUYE", w100: 661.2, yp: 6705 },
  { print: "TU MEJOR", hero: "TU MEJOR", w100: 550.2, yp: 6815 },
  { print: "VERSION", hero: "VERSIÓN", w100: 489.9, yp: 6925 },
].map((l) => ({ ...l, fs: (900 * 100) / l.w100 }));
{
  // el bloque grande, centrado en la frase impresa (y = 6815), con 64 u entre líneas
  const caps = LEMA.map((l) => CAP_S * l.fs);
  let y = 6815 - (caps.reduce((a, b) => a + b, 0) + 160) / 2;
  LEMA.forEach((l, k) => {
    l.yh = y + caps[k] / 2;
    y += caps[k] + 80;
  });
}
// el mostrador (a la izquierda del cartel, dentro de la tienda) y el cierre (encima del cartel)
const XP = -1440,
  YP = 6150; // centro del pedestal y altura de su tapa
const PROD = { w: 602 * 0.75, h: 814 * 0.75 };
const FIN = { rotulo: 4175, logo: 4565, boton: 4872, ven: 5002 };

// ───────────── piezas ─────────────
function engranaje(n, R, r) {
  const pts = [];
  const paso = (2 * Math.PI) / n;
  for (let k = 0; k < n; k++) {
    const a = k * paso;
    pts.push([r, a], [R, a + paso * 0.12], [R, a + paso * 0.38], [r, a + paso * 0.5]);
  }
  return "M" + pts.map(([q, a]) => `${(q * Math.cos(a)).toFixed(1)} ${(q * Math.sin(a)).toFixed(1)}`).join(" L") + " Z";
}
// cada palabra grande: luz de canto azul, cromo con contorno azul, brillo que la recorre y destello blanco
function heroe(id, inner, fs, barrido) {
  return `<g id="${id}" opacity="0" display="none">
    ${saira(inner("g"), fs, `fill="none" stroke="${C.azul}" stroke-width="18" stroke-linejoin="round" filter="url(#led)" opacity="0.75" data-layout-ignore`)}
    ${saira(inner("c"), fs, `fill="url(#cromo)" stroke="${C.azul}" stroke-width="7" stroke-linejoin="round" paint-order="stroke"`)}
    ${saira(inner("b"), fs, `fill="url(#${barrido})" data-layout-ignore`)}
    ${saira(inner("w"), fs, `id="${id}-blanco" fill="#FFFFFF" opacity="0" data-layout-ignore`)}
  </g>`;
}
const simple = (s) => () => esc(s);

// mundos de cada palabra (x de 0 a 1000; y relativa a la palabra)
function mundos() {
  let s = "";
  // 0 · FUERZA: chapa de acero lagrimada y una luz que la barre
  s += `<g id="w0" opacity="0" display="none" clip-path="url(#clip-w0)">
    <rect x="0" y="-950" width="1000" height="1900" fill="#151A21"/>
    <rect x="0" y="-950" width="1000" height="1900" fill="url(#pat-chapa)"/>
    <rect id="w0-luz" x="0" y="-950" width="1000" height="1900" fill="url(#g-luz0)"/></g>`;
  // 1 · RESISTENCIA: estelas de luz azul que no paran
  semilla = 21;
  let est = "";
  for (let k = 0; k < 18; k++) {
    const y = -880 + k * 88 + rnd() * 40,
      l = 220 + rnd() * 700,
      g = 3 + Math.round(rnd() * 7);
    est += `<rect id="w1-e${k}" x="0" y="${y.toFixed(0)}" width="${l.toFixed(0)}" height="${g}" rx="${g / 2}" fill="${k % 3 ? C.azul : C.azulClaro}" opacity="${(0.35 + rnd() * 0.55).toFixed(2)}"/>`;
  }
  s += `<g id="w1" opacity="0" display="none" clip-path="url(#clip-w1)">
    <rect x="0" y="-950" width="1000" height="1900" fill="#0F141C"/>
    <g filter="url(#led-suave)">${est}</g><g>${est.replace(/id="w1-e/g, 'id="w1-n')}</g></g>`;
  // 2 · ENERGÍA: un rayo cae a través de la palabra
  const rayo = "M640 -900 L730 -640 L665 -610 L790 -330 L715 -300 L810 40 L725 70 L850 640";
  const rama1 = "M730 -640 L850 -560 L910 -600";
  const rama2 = "M715 -300 L600 -200 L560 -230";
  s += `<g id="w2" opacity="0" display="none" clip-path="url(#clip-w2)">
    <rect x="0" y="-950" width="1000" height="1900" fill="#0E131B"/>
    <rect x="0" y="-950" width="1000" height="1900" fill="url(#g-energia)"/>
    <g id="w2-rayo" opacity="0">
      <path d="${rayo}" fill="none" stroke="${C.azulClaro}" stroke-width="46" stroke-linejoin="round" filter="url(#led)" opacity="0.9"/>
      <path d="${rama1}" fill="none" stroke="${C.azulClaro}" stroke-width="22" filter="url(#led)"/>
      <path d="${rama2}" fill="none" stroke="${C.azulClaro}" stroke-width="22" filter="url(#led)"/>
      <path d="${rayo}" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linejoin="round"/>
      <path d="${rama1}" fill="none" stroke="#FFFFFF" stroke-width="6"/>
      <path d="${rama2}" fill="none" stroke="#FFFFFF" stroke-width="6"/></g>
    <rect id="w2-flash" x="0" y="-950" width="1000" height="1900" fill="#DCEBFF" opacity="0"/></g>`;
  // 3 · RENDIMIENTO: dos engranajes de acero que engranan
  const ga = engranaje(18, 420, 372),
    gb = engranaje(13, 300, 254);
  s += `<g id="w3" opacity="0" display="none" clip-path="url(#clip-w3)">
    <rect x="0" y="-950" width="1000" height="1900" fill="#10151D"/>
    <g id="w3-a"><path d="${ga}" fill="#252D38" stroke="#56616F" stroke-width="6" stroke-linejoin="round"/><circle r="250" fill="#161C24" stroke="#3B4552" stroke-width="10"/><circle r="70" fill="#2C343F"/>
      ${[0, 1, 2, 3, 4, 5].map((k) => `<rect x="-14" y="-245" width="28" height="170" fill="#232A34" transform="rotate(${k * 60})"/>`).join("")}</g>
    <g id="w3-b"><path d="${gb}" fill="#252D38" stroke="#56616F" stroke-width="6" stroke-linejoin="round"/><circle r="170" fill="#161C24" stroke="#3B4552" stroke-width="10"/><circle r="50" fill="#2C343F"/>
      ${[0, 1, 2, 3, 4].map((k) => `<rect x="-11" y="-165" width="22" height="115" fill="#232A34" transform="rotate(${k * 72})"/>`).join("")}</g></g>`;
  // 4 · RECUPERACIÓN: amanece detrás de las hojas (el sol del cartel)
  s += `<g id="w4" opacity="0" display="none" clip-path="url(#clip-w4)">
    <rect x="0" y="-950" width="1000" height="1900" fill="url(#g-cielo)"/>
    <g clip-path="url(#clip-horizonte)"><circle id="w4-halo" cx="500" cy="300" r="400" fill="url(#g-halo)"/><circle id="w4-sol" cx="500" cy="300" r="185" fill="url(#g-sol)"/></g>
    <path d="M-40 -110 C 200 -140, 380 -125, 500 -95 C 620 -125, 800 -140, 1040 -110 L1040 950 L-40 950 Z" fill="#0B1A3A"/>
    <path id="w4-hojaI" d="M500 560 C 330 470, 120 400, 30 150 C 260 160, 440 300, 500 560 Z" fill="${C.hoja}" stroke="${C.azulClaro}" stroke-width="6" opacity="0.85"/>
    <path id="w4-hojaD" d="M500 560 C 670 470, 880 400, 970 150 C 740 160, 560 300, 500 560 Z" fill="${C.hoja}" stroke="${C.azulClaro}" stroke-width="6" opacity="0.85"/></g>`;
  return s;
}
// iconos del cartel, dibujados con su línea (como en la puerta)
function iconosCartel() {
  const gr = (n, R, r) => `<path d="${engranaje(n, R, r)}" fill="none" stroke="${C.acero}" stroke-width="9" stroke-linejoin="round"/><circle r="${(r * 0.45).toFixed(0)}" fill="none" stroke="${C.acero}" stroke-width="9"/>`;
  return `
  <g id="ic0" opacity="0" display="none"><path id="ic0-brazo" d="" fill="none" stroke="${C.acero}" stroke-width="11" stroke-linejoin="round" stroke-linecap="round"/></g>
  <g id="ic1" opacity="0" display="none">
    <g id="ic1-lineas">${[0, 1, 2].map((k) => `<rect id="ic1-l${k}" x="-170" y="${-40 + k * 42}" width="${90 - k * 18}" height="11" rx="5.5" fill="${C.azulClaro}"/>`).join("")}</g>
    <g id="ic1-corredor">${icono("person-simple-run", 30, 0, 270, C.azulClaro)}</g></g>
  <g id="ic2" opacity="0" display="none"><g id="ic2-rayo">${icono("lightning", 0, 0, 260, C.acero)}</g></g>
  <g id="ic3" opacity="0" display="none"><g id="ic3-a" transform="translate(-55 15)">${gr(12, 100, 82)}</g><g id="ic3-b" transform="translate(88 -62)">${gr(9, 66, 52)}</g></g>
  <g id="ic4" opacity="0" display="none">
    <circle r="150" fill="#0E1219" stroke="#8FA3BF" stroke-width="10"/>
    <g clip-path="url(#clip-insignia)"><circle id="ic4-sol" cx="0" cy="40" r="58" fill="${C.sol}"/></g>
    <path d="M0 105 C -30 70, -95 60, -112 5 C -60 5, -18 40, 0 105 Z" fill="${C.hoja}" stroke="${C.azulClaro}" stroke-width="5"/>
    <path d="M0 105 C 30 70, 95 60, 112 5 C 60 5, 18 40, 0 105 Z" fill="${C.hoja}" stroke="${C.azulClaro}" stroke-width="5"/></g>`;
}
// el plan de cada franja: tres iconos distintos
const PLANES = [
  ["barbell", "bowl-food", "bed"],
  ["sneaker-move", "drop", "timer"],
  ["sun", "coffee", "clock"],
  ["trend-up", "calendar-check", "heartbeat"],
  ["moon", "leaf", "drop-half-bottom"],
];
function planes() {
  return PLANES.map((ics, i) => `<g id="plan${i}">${ics.map((n, k) => `<g id="plan${i}-${k}" opacity="0">${icono(n, 0, 0, 84, C.blanco)}</g>`).join("")}</g>`).join("");
}

// el mostrador: pedestal, foco, bote real, etiquetas, bocadillo y tique
function mostrador() {
  const px = XP - PROD.w / 2,
    py = YP - PROD.h;
  // dónde señalan las etiquetas (sobre la etiqueta real del bote) y dónde están
  const TAGS = [
    { id: "tag0", ax: XP - 113, ay: 5973, ty: 5660, lineas: ["COLÁGENO"] },
    { id: "tag1", ax: XP + 22, ay: 5967, ty: 5850, lineas: ["GLUCOSAMINA", "+ CONDROITINA"] },
    { id: "tag2", ax: XP + 127, ay: 5967, ty: 6062, lineas: ["ÁCIDO", "HIALURÓNICO"] },
  ];
  const TX = -1170;
  const tags = TAGS.map((g) => {
    const h = 30 + g.lineas.length * 64;
    const linea = `M${g.ax} ${g.ay} L${g.ax} ${g.ty} L${TX} ${g.ty}`;
    return `<g id="${g.id}" opacity="0">
      <path id="${g.id}-linea" d="${linea}" fill="none" stroke="${C.azulClaro}" stroke-width="5" stroke-linejoin="round" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110"/>
      <circle id="${g.id}-punto" cx="${g.ax}" cy="${g.ay}" r="13" fill="${C.blanco}" stroke="${C.azul}" stroke-width="6"/>
      <g id="${g.id}-caja"><rect x="${TX}" y="${g.ty - h / 2}" width="${g.lineas.length > 1 ? 380 : 270}" height="${h}" rx="12" fill="#0E1219" stroke="#2A3340" stroke-width="3"/>
      <rect x="${TX}" y="${g.ty - h / 2}" width="8" height="${h}" rx="4" fill="${C.azul}"/>
      ${g.lineas.map((l, k) => `<text x="${TX + 30}" y="${(g.ty - h / 2 + 15 + 54 + k * 64).toFixed(0)}" font-family="Oswald" font-weight="700" font-size="56" fill="${C.blanco}">${esc(l)}</text>`).join("")}</g></g>`;
  }).join("");
  // tique térmico (se imprime hacia arriba desde la ranura del pedestal)
  const RW = 560,
    rx0 = XP - RW / 2;
  const fila = (y, a, b, fs = 46) =>
    `<text x="${rx0 + 34}" y="${y}" font-family="Oswald" font-weight="700" font-size="${fs}" fill="${C.tinta}">${esc(a)}</text><text x="${rx0 + RW - 34}" y="${y}" text-anchor="end" font-family="Oswald" font-weight="700" font-size="${fs}" fill="${C.tinta}">${esc(b)}</text>`;
  const puntos = (y) => `<line x1="${rx0 + 34}" y1="${y}" x2="${rx0 + RW - 34}" y2="${y}" stroke="${C.tinta}" stroke-width="4" stroke-dasharray="10 9"/>`;
  let diente = `M${rx0} 0`;
  for (let k = 0; k <= 28; k++) diente += ` L${rx0 + (k * RW) / 28} ${k % 2 ? -14 : 0}`;
  const tique = `<g id="tique-papel">
    <path d="${diente} L${rx0 + RW} 690 L${rx0} 690 Z" fill="${C.papel}" filter="url(#sombra)"/>
    <g id="tl0"><text x="${XP}" y="78" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="46" fill="${C.tinta}">IRON FUEL NUTRITION</text>
    ${puntos(112)}</g>
    <g id="tl1">${fila(180, "CONSEJO", "0,00 €")}</g>
    <g id="tl2">${fila(250, "PREGUNTAS", "0,00 €")}</g>
    <g id="tl3">${fila(320, "COMPRA", "0,00 €")}
    ${puntos(356)}</g>
    <g id="tl4">${fila(468, "TOTAL", "0,00 €", 84)}</g>
    <g id="tique-sello" opacity="0"><g transform="translate(${XP} 590) rotate(-6)">
      <rect x="-250" y="-46" width="500" height="92" rx="14" fill="none" stroke="${C.azul}" stroke-width="7"/>
      <text x="0" y="16" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="46" fill="${C.azul}">GRACIAS POR PREGUNTAR</text></g></g></g>`;
  return `<g id="mostrador">
    <rect x="-3200" y="4700" width="3200" height="2600" fill="url(#g-pared)"/>
    <rect x="-3200" y="${YP + 330}" width="3200" height="700" fill="#07090C"/>
    <rect id="camino" x="-3200" y="${YP + 8}" width="3200" height="7" fill="${C.azulClaro}"/>
    <rect x="-3200" y="${YP + 2}" width="3200" height="19" fill="${C.azul}" filter="url(#led)" opacity="0.6"/>
    <g id="foco" opacity="0"><path d="M${XP - 70} 4650 L${XP + 70} 4650 L${XP + 330} ${YP} L${XP - 330} ${YP} Z" fill="url(#g-foco)"/>
      <ellipse cx="${XP}" cy="${YP}" rx="330" ry="34" fill="#FFFFFF" opacity="0.16"/></g>
    <g clip-path="url(#clip-tapa)"><g id="producto"><ellipse cx="${XP}" cy="${YP - 4}" rx="210" ry="18" fill="#000" opacity="0.55"/>
      <image href="assets/img/iflex-recorte.png" x="${px}" y="${py}" width="${PROD.w}" height="${PROD.h}"/>
      <rect id="producto-sombra" x="${px}" y="${py}" width="${PROD.w}" height="${PROD.h}" fill="#05070A" opacity="0" mask="url(#m-prod)"/></g></g>
    <g clip-path="url(#clip-tapa)"><g id="tique">${tique}</g></g>
    <rect x="${XP - 290}" y="${YP}" width="580" height="620" fill="#141922"/>
    <rect x="${XP - 290}" y="${YP}" width="580" height="620" fill="url(#g-pedestal)"/>
    <rect x="${XP - 300}" y="${YP - 6}" width="600" height="18" rx="4" fill="url(#cromo-h)"/>
    <rect x="${XP - 300}" y="${YP + 14}" width="600" height="6" fill="${C.azulClaro}"/>
    <rect x="${XP - 230}" y="${YP - 3}" width="460" height="8" rx="4" fill="#020304"/>
    ${tags}
    <g id="bocadillo" opacity="0"><g transform="translate(${XP} 5790)">
      <path d="M-380 -95 Q-380 -120 -355 -120 L355 -120 Q380 -120 380 -95 L380 95 Q380 120 355 120 L-60 120 L-150 210 L-140 120 L-355 120 Q-380 120 -380 95 Z" fill="#161B24" stroke="${C.blanco}" stroke-width="5" stroke-linejoin="round"/>
      <text x="0" y="-12" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="64" fill="${C.blanco}">ESTO NO</text>
      <text x="0" y="66" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="64" fill="${C.blanco}">TE HACE <tspan fill="${C.azulClaro}">FALTA</tspan></text></g></g>
  </g>`;
}
// el cierre: el rótulo real de la fachada, el logo y la llamada
function cierre() {
  return `<g id="cierre">
    <rect x="-60" y="${FIN.rotulo - 200}" width="1120" height="400" fill="#0B0E13"/>
    <g id="rotulo"><image href="assets/img/rotulo-foto.png" x="20" y="${FIN.rotulo - 170.75}" width="1080" height="341.5"/>
      <rect id="rotulo-apagado" x="20" y="${FIN.rotulo - 170.75}" width="1080" height="341.5" fill="#05070A" opacity="0.8"/></g>
    <rect x="-40" y="${FIN.rotulo + 178}" width="1080" height="8" fill="${C.azul}"/>
    <g clip-path="url(#clip-luz-rotulo)"><rect id="rotulo-luz" x="0" y="${FIN.rotulo + 172}" width="260" height="20" rx="10" fill="${C.azulClaro}" filter="url(#led)"/></g>
    <g id="logo" opacity="0"><circle cx="500" cy="${FIN.logo}" r="206" fill="#000" stroke="${C.azul}" stroke-width="7"/>
      <image href="assets/brand/logo.png" x="${500 - 200}" y="${FIN.logo - 200}" width="400" height="400"/></g>
    <g id="boton" opacity="0"><g id="boton-in">
      <rect x="-230" y="-52" width="460" height="104" rx="52" fill="${C.azul}"/>
      <rect id="boton-luz" x="-230" y="-52" width="460" height="104" rx="52" fill="#FFFFFF" opacity="0"/>
      ${icono("user-circle", -150, 0, 62, C.blanco)}
      <text x="30" y="24" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="64" fill="${C.blanco}">SÍGUENOS</text></g></g>
    <g id="ven" opacity="0">${icono("door-open", 316, FIN.ven, 64, C.azulClaro)}
      <text x="549" y="${FIN.ven + 21}" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="58" fill="${C.blanco}">VEN A VERNOS</text></g>
  </g>`;
}

// ───────────── el mundo entero ─────────────
const barridos = ["b0", "b1", "b2", "b3", "b4", "bq1", "bq2", "bl0", "bl1", "bl2"];
const defs = `<defs>
<linearGradient id="cromo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.45" stop-color="#C9CED6"/><stop offset="0.52" stop-color="#5E6671"/><stop offset="0.62" stop-color="#E8ECF1"/><stop offset="1" stop-color="#9AA2AD"/></linearGradient>
<linearGradient id="cromo-azul" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DCEBFF"/><stop offset="0.45" stop-color="#5AB0FF"/><stop offset="0.52" stop-color="#0B3FB3"/><stop offset="0.62" stop-color="#7CC0FF"/><stop offset="1" stop-color="#1D6BFF"/></linearGradient>
<linearGradient id="cromo-h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F6F8"/><stop offset="0.5" stop-color="#8A929D"/><stop offset="1" stop-color="#D8DDE3"/></linearGradient>
${barridos.map((b) => `<linearGradient id="${b}" x1="0" y1="0" x2="1" y2="0.35" gradientTransform="translate(-1 0)"><stop offset="0.38" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.85"/><stop offset="0.62" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>`).join("\n")}
<linearGradient id="g-luz0" x1="0" y1="0" x2="1" y2="0.6" gradientTransform="translate(-1 0)"><stop offset="0.3" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.5" stop-color="#9CC8FF" stop-opacity="0.35"/><stop offset="0.7" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
<radialGradient id="g-energia" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="#1D6BFF" stop-opacity="0.22"/><stop offset="1" stop-color="#1D6BFF" stop-opacity="0"/></radialGradient>
<linearGradient id="g-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1219"/><stop offset="0.45" stop-color="#14223F"/><stop offset="0.55" stop-color="#22365E"/><stop offset="1" stop-color="#0B1A3A"/></linearGradient>
<radialGradient id="g-sol" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stop-color="#FBFDE0"/><stop offset="0.6" stop-color="${C.sol}"/><stop offset="1" stop-color="#C9D85A"/></radialGradient>
<radialGradient id="g-halo"><stop offset="0.45" stop-color="${C.sol}" stop-opacity="0.35"/><stop offset="1" stop-color="${C.sol}" stop-opacity="0"/></radialGradient>
<linearGradient id="g-pared" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B0E13"/><stop offset="0.55" stop-color="#111722"/><stop offset="0.6" stop-color="#0B0E13"/><stop offset="1" stop-color="#07090C"/></linearGradient>
<linearGradient id="g-foco" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.2"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.05"/></linearGradient>
<linearGradient id="g-pedestal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.35"/><stop offset="0.35" stop-color="#FFF" stop-opacity="0.04"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></linearGradient>
<linearGradient id="g-panel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.025"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.03"/></linearGradient>
<pattern id="pat-cepillado" width="400" height="6" patternUnits="userSpaceOnUse"><rect width="400" height="2" fill="#FFFFFF" opacity="0.035"/></pattern>
<pattern id="pat-chapa" width="72" height="72" patternUnits="userSpaceOnUse">
  <rect x="-15" y="-4.5" width="30" height="9" rx="4.5" fill="#2B323C" stroke="#46505D" stroke-width="1.6" transform="translate(18 18) rotate(-45)"/>
  <rect x="-15" y="-4.5" width="30" height="9" rx="4.5" fill="#2B323C" stroke="#46505D" stroke-width="1.6" transform="translate(54 54) rotate(45)"/></pattern>
<filter id="led" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="10"/></filter>
<filter id="led-suave" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="sombra" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000" flood-opacity="0.38"/></filter>
<filter id="mblur" filterUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1920"><feGaussianBlur id="mblur-g" stdDeviation="0 0"/></filter>
<filter id="rblur" filterUnits="userSpaceOnUse" x="-200" y="${YR - 400}" width="1400" height="800"><feGaussianBlur id="rblur-g" stdDeviation="0 0"/></filter>
${[0, 1, 2, 3, 4].map((i) => `<clipPath id="clip-w${i}"><rect id="clip-w${i}-r" x="0" y="-870" width="1000" height="1500"/></clipPath>`).join("")}
<clipPath id="clip-rodillo"><rect id="clip-rodillo-r" x="0" y="${YR - 120}" width="1000" height="240"/></clipPath>
<clipPath id="clip-horizonte"><rect x="0" y="-950" width="1000" height="845"/></clipPath>
<clipPath id="clip-insignia"><rect x="-150" y="-150" width="300" height="168"/></clipPath>
<mask id="m-prod" style="mask-type:alpha"><image href="assets/img/iflex-recorte.png" x="${XP - PROD.w / 2}" y="${YP - PROD.h}" width="${PROD.w}" height="${PROD.h}"/></mask>
<clipPath id="clip-luz-rotulo"><rect x="-40" y="${FIN.rotulo + 150}" width="1080" height="70"/></clipPath>
<clipPath id="clip-tapa"><rect x="-3200" y="3000" width="3200" height="${YP - 3000}"/></clipPath>
</defs>`;

const cartel = `<g id="cartel">
  <rect id="panel" x="0" y="0" width="1000" height="7400" fill="${C.panelFoto}"/>
  <rect id="panel-veta" x="0" y="-450" width="1000" height="7850" fill="url(#pat-cepillado)"/>
  <rect id="panel-luz" x="0" y="-450" width="1000" height="7850" fill="url(#g-panel)"/>
  ${mundos()}
  <g id="bordes">
    <rect id="borde-gI" x="-10" y="-450" width="20" height="7850" fill="${C.azul}" filter="url(#led)" opacity="0.7"/>
    <rect id="borde-gD" x="990" y="-450" width="20" height="7850" fill="${C.azul}" filter="url(#led)" opacity="0.7"/>
    <rect id="borde-I" x="-3" y="-450" width="6" height="7850" fill="${C.azulClaro}"/>
    <rect id="borde-D" x="997" y="-450" width="6" height="7850" fill="${C.azulClaro}"/></g>
  ${iconosCartel()}
  ${planes()}
  <g id="rodillo-marco" opacity="0" display="none">
    <rect id="rodillo-marco-r" x="40" y="${YR - 130}" width="920" height="260" rx="26" fill="#0A0D12" stroke="url(#cromo-h)" stroke-width="12"/>
    <rect id="rodillo-marco-l" x="58" y="${YR - 112}" width="884" height="224" rx="18" fill="none" stroke="${C.azulClaro}" stroke-width="4"/></g>
  <g id="palabras">
    ${PAL.map((p) => `<g id="pp${p.i}" opacity="0">${oswald(p.print, p.fsP, `fill="${C.blanco}" textLength="${p.wc}" lengthAdjust="spacingAndGlyphs"`)}</g>`).join("\n")}
    ${PAL.map((p) => heroe(`ph${p.i}`, simple(p.hero), p.fsH, `b${p.i}`)).join("\n")}
  </g>
  ${PAL.map((p) => `<g id="sub${p.i}" opacity="0"><rect id="sub${p.i}-g" x="-200" y="-11" width="400" height="22" rx="11" fill="${C.azul}" filter="url(#led)"/><rect id="sub${p.i}-c" x="-200" y="-5" width="400" height="10" rx="5" fill="${C.azulClaro}"/></g>`).join("")}
  ${heroe("preg1", (k) => `¿PARA <tspan id="q1-${k}">QUÉ</tspan>`, PREG[0].fs, "bq1")}
  ${heroe("preg2", simple("ENTRENAS?"), PREG[1].fs, "bq2")}
  ${LEMA.map((l, k) => `<g id="lp${k}" opacity="0">${oswald(l.print, 86, `fill="${C.blanco}"`)}</g>`).join("")}
  ${LEMA.map((l, k) => heroe(`lh${k}`, k === 1 ? (c) => (c === "c" ? `TU <tspan fill="url(#cromo-azul)">MEJOR</tspan>` : "TU MEJOR") : simple(l.hero), l.fs, `bl${k}`)).join("\n")}
</g>`;

const mundo = `<svg id="mundo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">${defs}
<rect x="0" y="0" width="1080" height="1920" fill="${C.suelo}"/>
<g id="pantalla"><g id="cam">
  <rect x="-6000" y="-6000" width="14000" height="20000" fill="${C.suelo}"/>
  <rect x="-6000" y="-6000" width="14000" height="20000" fill="url(#pat-cepillado)"/>
  ${mostrador()}
  ${cartel}
  ${cierre()}
  <g id="foto"><image href="assets/img/fachada-foto.png" x="${FOTO.x.toFixed(1)}" y="${FOTO.y.toFixed(1)}" width="${FOTO.w.toFixed(1)}" height="${FOTO.h.toFixed(1)}" preserveAspectRatio="none"/>
    <g id="subrayados">${PAL.map((p) => `<g transform="translate(${p.xc + SESGO * (p.yc + p.capc / 2 + 34)} ${p.yc + p.capc / 2 + 34})"><line id="hs${p.i}-g" x1="${-p.wc / 2 - 10}" y1="0" x2="${p.wc / 2 + 10}" y2="0" stroke="${C.azul}" stroke-width="44" stroke-linecap="round" filter="url(#led)" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110"/><line id="hs${p.i}" x1="${-p.wc / 2 - 10}" y1="0" x2="${p.wc / 2 + 10}" y2="0" stroke="${C.azulClaro}" stroke-width="20" stroke-linecap="round" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110"/></g>`).join("")}</g></g>
</g></g>
<rect id="flash" x="0" y="0" width="1080" height="1920" fill="#FFFFFF" opacity="0"/>
</svg>`;

const IF = {
  T, D, ON, TIEMPO, K, SESGO, YR, XP, YP, FIN,
  PAL: PAL.map(({ i, xc, yc, wc, capc, fsH, wH, capH, ys, yb, sB, sL, sR, yic }) => ({ i, xc, yc, wc, capc, fsH, wH, capH, ys, yb, sB, sL, sR, yic })),
  PREG: PREG.map((p) => ({ ...p, w: (p.w100 * p.fs) / 100, cap: CAP_S * p.fs })),
  LEMA: LEMA.map((l) => ({ yp: l.yp, yh: l.yh, fs: l.fs, w: (l.w100 * l.fs) / 100 })),
};
const motor = rd("tools/motor.js");
const mundoHtml = `<template>
<style>
  @font-face { font-family: "Saira"; src: url("assets/fonts/saira-italic.woff2") format("woff2"); font-style: italic; font-weight: 100 900; font-stretch: 50% 125%; }
  @font-face { font-family: "Oswald"; src: url("assets/fonts/oswald.woff2") format("woff2"); font-weight: 200 700; }
  #root { position: absolute; inset: 0; background: ${C.suelo}; overflow: hidden; }
  #mundo-svg { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }
</style>
<div id="root" data-composition-id="mundo" data-width="1080" data-height="1920" data-layout-allow-overflow data-layout-allow-overlap>
${mundo}
</div>
<script>
window.__IF = ${JSON.stringify(IF)};
${motor}
(function () {
  const D = window.__IF.D;
  const tl = gsap.timeline({ paused: true });
  // el reloj: GSAP mueve t y cada valor de t pinta su fotograma
  const reloj = {
    _t: 0,
    get t() { return this._t; },
    set t(v) { this._t = v; window.__IF.render(v); },
  };
  tl.fromTo(reloj, { t: 0 }, { t: D, duration: D, ease: "none" }, 0);
  window.__timelines = window.__timelines || {};
  window.__timelines["mundo"] = tl;
})();
</script>
</template>
`;

// ───────────── subtítulos palabra a palabra (arriba) ─────────────
// Las frases que ya se escriben en grande en el mundo (las cinco palabras, la frase final, el
// nombre y la llamada) y «para qué entrenas» (el titular) no se repiten en los subtítulos.
const EN_EL_MUNDO = new Set([2, 3, 4, 5, 6, 14, 15, 16]);
const CLAVE = new Set("puerta cinco objetivos plan distinto antes nada preguntamos sirve explicamos falta decimos signifique debajo frase".split(" "));
function grupos() {
  const ws = V.palabras.filter((w, i) => {
    if (EN_EL_MUNDO.has(w.frase + 1)) return false;
    if (w.frase === 8 && ["para", "que", "entrenas"].includes(w.n) && w.start >= T.para2 - 0.01) return false;
    return true;
  });
  const out = [];
  let g = [];
  const cerrar = () => {
    if (g.length) out.push(g);
    g = [];
  };
  ws.forEach((w, i) => {
    g.push(w);
    const sig = ws[i + 1];
    const fin = /[.:?!,]$/.test(w.text);
    const pausa = sig ? sig.start - w.end >= 0.15 && !(g.length === 1 && w.text.length <= 3 && sig.start - w.end < 0.4) : true;
    const largo = g.reduce((a, x) => a + x.text.length, 0);
    // la última palabra corta de una frase («qué», «nada») no se queda sola en pantalla
    const otra = ws[i + 2];
    const ultimaCorta = sig && sig.frase === w.frase && (!otra || otra.frase !== w.frase) && sig.text.replace(/\W/g, "").length <= 4 && g.length < 5 && !pausa;
    if (!sig || fin || pausa || sig.frase !== w.frase || (!ultimaCorta && (g.length >= 4 || (g.length >= 3 && largo > 14) || largo > 18))) cerrar();
  });
  return out;
}
const G = grupos();
let subs = "";
let subsJs = "";
G.forEach((g, gi) => {
  const ini = gi === 0 ? 0 : Math.max(0.1, g[0].start - 0.04);
  const sig = G[gi + 1];
  const finFrase = M.frases[g[0].frase].fin + 0.25;
  const fin = Math.min(sig ? Math.max(ini + 0.3, sig[0].start - 0.04) : D - 0.02, Math.max(ini + 0.5, finFrase));
  const clave = g.find((w) => CLAVE.has(w.n)) || [...g].sort((a, b) => b.text.length - a.text.length).find((w) => w.text.length >= 5);
  const palabras = g
    .map((w, wi) => `<span id="s${gi}w${wi}" class="pal${w === clave ? " clave" : ""}">${esc(w.text.replace(/[.,:]$/, "").toUpperCase())}</span>`)
    .join(" ");
  const chars = g.reduce((a, w) => a + w.text.length + 1, 0);
  const fs_ = Math.max(58, Math.min(84, Math.floor(940 / (chars * 0.66))));
  subs += `<div id="s${gi}" class="grupo clip" data-start="${ini.toFixed(3)}" data-duration="${(fin - ini).toFixed(3)}" data-track-index="0" style="font-size:${fs_}px"><div id="s${gi}i" class="caja">${palabras}</div></div>\n`;
  g.forEach((w, wi) => {
    // el gancho: la primera línea ya está entera en el fotograma 0 (es la miniatura)
    if (gi === 0) {
      subsJs += `tl.set("#s${gi}w${wi}", { opacity: 1, y: 0, scale: 1 }, 0);\n`;
      return;
    }
    const t0 = Math.max(ini, w.start - 0.02);
    subsJs += `tl.fromTo("#s${gi}w${wi}", { opacity: 0, y: 18, scale: 0.86 }, { opacity: 1, y: 0, scale: 1, duration: 0.14, ease: "back.out(2)" }, ${t0.toFixed(3)});\n`;
  });
  subsJs += `tl.fromTo("#s${gi}i", { opacity: 1 }, { opacity: 0, duration: 0.08, ease: "power2.in", immediateRender: false }, ${(fin - 0.08).toFixed(3)});\n`;
});
const subtitulosHtml = `<template>
<style>
  #root { position: absolute; inset: 0; pointer-events: none; }
  #root .grupo { position: absolute; left: 0; top: 236px; width: 1080px; padding: 0 70px; box-sizing: border-box; text-align: center;
    font-family: Inter; font-weight: 900; line-height: 1.18; color: #fff; overflow: visible;
    text-shadow: 0 4px 0 rgba(0,0,0,0.55), 0 0 18px rgba(0,0,0,0.65); letter-spacing: 0.5px; }
  #root .caja { display: inline-block; max-width: 960px; background: rgba(10,11,15,0.8); border-radius: 30px; padding: 12px 20px 16px; }
  #root .pal { display: inline-block; padding: 2px 6px; }
  #root .clave { background: ${C.azul}; color: #fff; border-radius: 16px; padding: 2px 18px; text-shadow: none; box-shadow: 0 6px 0 rgba(0,0,0,0.35); }
</style>
<div id="root" data-composition-id="subtitulos" data-width="1080" data-height="1920">
${subs}</div>
<script>
  const tl = gsap.timeline({ paused: true });
${subsJs}
  window.__timelines = window.__timelines || {};
  window.__timelines["subtitulos"] = tl;
</script>
</template>
`;

// ───────────── raíz ─────────────
const raiz = () => `<!doctype html>
<html lang="es" data-composition-variables='[{"id":"subtitulos","type":"boolean","label":"Subtítulos","default":true}]'>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>IronFuel · Cinco palabras en la puerta</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Saira"; src: url("assets/fonts/saira-italic.woff2") format("woff2"); font-style: italic; font-weight: 100 900; font-stretch: 50% 125%; }
      @font-face { font-family: "Oswald"; src: url("assets/fonts/oswald.woff2") format("woff2"); font-weight: 200 700; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${C.suelo}; }
      #root { position: relative; width: 1080px; height: 1920px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${D.toFixed(3)}" data-width="1080" data-height="1920">
      <div id="mundo" data-composition-id="mundo" data-composition-src="compositions/mundo.html" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="0" data-track-kind="graphics" data-width="1080" data-height="1920"></div>
      <div id="subtitulos" data-composition-id="subtitulos" data-composition-src="compositions/subtitulos.html" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1" data-track-kind="captions" data-width="1080" data-height="1920"></div>
      <audio id="mezcla" class="clip" src="assets/audio/mezcla.wav" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="2" data-volume="1"></audio>
    </div>
    <script>
      // render sin subtítulos: --variables '{"subtitulos":false}'
      const vars = (window.__hyperframes && window.__hyperframes.getVariables && window.__hyperframes.getVariables()) || {};
      if (vars.subtitulos === false) document.getElementById("subtitulos").style.opacity = "0";
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;

// ───────────── sonido: dónde cae cada efecto (solo donde algo se ve) ─────────────
// [segundo, archivo, ganancia dB, qué lo provoca, duración opcional]
const SFX = [
  ...PAL.map((p, i) => [T.cinco1 + 0.1 * i, i % 2 ? "click-2" : "click-1", -15, `se enciende la tira de ${p.hero}`]),
  [ON[0] - 0.42, "whoosh-1", -10, "zum a través del cartel"],
  [ON[0], "disco-metal", -8, "FUERZA: golpe de acero"],
  [ON[0], "punch", -11, "FUERZA: la palabra cae"],
  [ON[1] - 0.3, "whoosh-2", -14, "barrido a RESISTENCIA"],
  [ON[1], "whoosh-3", -11, "RESISTENCIA: estelas"],
  [ON[1], "punch", -15, "RESISTENCIA: la palabra cae"],
  [ON[2] - 0.3, "whoosh-2", -14, "barrido a ENERGÍA"],
  [ON[2], "golpe-climax", -15, "ENERGÍA: el rayo", 1.0],
  [ON[2] + 0.04, "click-2", -10, "ENERGÍA: chispazo"],
  [ON[3] - 0.3, "whoosh-2", -14, "barrido a RENDIMIENTO"],
  [ON[3], "disco-metal", -13, "RENDIMIENTO: engranajes"],
  [ON[3] + 0.16, "click-1", -17, "RENDIMIENTO: diente"],
  [ON[3] + 0.32, "click-1", -18, "RENDIMIENTO: diente"],
  [ON[4] - 0.3, "whoosh-2", -15, "barrido a RECUPERACIÓN"],
  [ON[4], "pop-2", -13, "RECUPERACIÓN: amanece"],
  [T.cinco2 + 0.05, "rebobinado", -13, "las cinco caen en franjas"],
  [T.cada, "whoosh-3", -16, "las palabras se apartan"],
  ...[0, 1, 2, 3, 4].map((i) => [T.plan + i * 0.07, ["pop-1", "pop-3", "pop-2", "pop-1", "pop-3"][i], -15, `plan de la franja ${i + 1}`]),
  [T.por1, "whoosh-1", -12, "las franjas se funden en el rodillo"],
  ...[0.45, 0.6, 0.75, 0.9, 1.05, 1.2, 1.4, 1.65, 1.95, 2.3].map((d, k) => [T.por1 + d, k % 2 ? "click-2" : "click-1", -21, "el rodillo gira"]),
  [T.para2, "punch", -10, "¿PARA QUÉ"],
  [T.entrenas, "disco-metal", -13, "ENTRENAS?"],
  [T.si1 - 0.32, "whoosh-2", -11, "barrido al mostrador"],
  [T.algo, "click-2", -10, "se enciende el foco"],
  [T.sirve, "whoosh-3", -15, "sube el bote"],
  [T.explicamos, "pop-1", -13, "etiqueta: colágeno"],
  [T.explicamos + 0.3, "pop-3", -13, "etiqueta: glucosamina"],
  [T.por2, "pop-2", -13, "etiqueta: ácido hialurónico"],
  [T.no1, "click-1", -8, "se apaga el foco"],
  [T.falta, "whoosh-3", -14, "el bote baja"],
  [T.lo - 0.1, "pop-1", -11, "bocadillo: esto no te hace falta"],
  [T.aunque, "teclado-2", -17, "imprime el tique", 2.2],
  [T.nada2, "datafono", -10, "TOTAL 0,00 €"],
  [T.nada2 + 0.42, "golpe-madera", -11, "sello: gracias por preguntar"],
  [T.debajo - 0.32, "whoosh-1", -11, "vuelta al cartel"],
  ...PAL.map((p, i) => [T.cinco3 + 0.06 * i, i % 2 ? "click-2" : "click-1", -16, `tira de ${p.hero}`]),
  [T.construye, "golpe-climax", -6, "CONSTRUYE (la música vuelve)", 2.4],
  [T.tu, "punch", -10, "TU MEJOR"],
  [T.version, "disco-metal", -10, "VERSIÓN"],
  [T.airon - 0.34, "whoosh-2", -10, "barrido hasta el rótulo"],
  [T.airon, "click-2", -11, "se enciende el rótulo"],
  [T.nutrishon, "pop-2", -12, "logo"],
  [T.siguenos, "pop-3", -10, "botón SÍGUENOS"],
  [T.siguenos + 0.28, "click-1", -8, "pulsa SÍGUENOS"],
  [T.ven, "pop-1", -12, "VEN A VERNOS"],
];
const cues = {
  duracion: D,
  voz: "assets/audio/voz.wav",
  // la pista entra en su segundo 53,032: su compás fuerte (82,0 s) cae en «Construye»
  musica: {
    archivo: "assets/music/a-game.mp3", desde: +M.desfase_musica.toFixed(3), db: -24,
    curva: [[0, -23], [M.bajon[0], -23], [M.bajon[0] + 0.6, -27], [T.construye - 0.05, -27], [T.construye, -20], [T.airon, -21], [D, -21]],
  },
  efectos: SFX.map(([t, f, db, que, dur]) => ({ t: +t.toFixed(3), archivo: `assets/sfx/${f}.mp3`, db, que, dur: dur ? +dur.toFixed(3) : null })),
  apariciones: Object.fromEntries(Object.entries(T).map(([k, v]) => [k, +v.toFixed(3)])),
};

wr("compositions/mundo.html", mundoHtml);
wr("compositions/subtitulos.html", subtitulosHtml);
wr("index.html", raiz());
wr("tools/cues.json", JSON.stringify(cues, null, 2));
console.log(`Voz ${durVoz.toFixed(3)} s → vídeo ${D.toFixed(3)} s (${Math.round(D * FPS)} fotogramas a ${FPS} fps)`);
console.log(`${G.length} grupos de subtítulos · ${SFX.length} efectos · ${Object.keys(T).length} momentos clave`);
if (V.diferencias.length) {
  console.log("Diferencias guion / voz:");
  V.diferencias.forEach((d) => console.log("  · " + d));
}
