// Generador del vídeo de IronFuel Nutrition.
//
//   node tools/build.mjs
//
// Lee guion.txt + la transcripción de la voz, calcula cuándo empieza cada palabra
// con P("palabra", n) y escribe:
//   index.html                  raíz con subtítulos
//                               (sin subtítulos: render con --variables '{"subtitulos":false}')
//   compositions/mundo.html     el mundo 2D, los personajes y la cámara
//   compositions/subtitulos.html
//   tools/cues.json             cada aparición con su palabra y su segundo (sonido y comprobación)
// Si cambias una frase o la voz, vuelve a transcribir y a ejecutar esto: todo se recoloca solo.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { cargar, norm } from "./tiempos.mjs";

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
const D = Math.round(durVoz * FPS) / FPS; // la duración exacta de la voz, en fotogramas enteros

// ───────────── momentos clave: cuándo EMPIEZA cada palabra ─────────────
const T = {
  veinte: P("Veinte"), levantando: P("levantando"), rodillas: P("rodillas"), quejaban: P("quejaban"),
  medico: P("médico"), verde: P("verde"), asi1: P("así"), tienda: P("tienda"),
  dependiente: P("dependiente"), saco: P("sacó"), dos1: P("dos", 1), botes1: P("botes"),
  uno1: P("Uno", 1), aiflex: P("Aiflex"), mtxFin: E("MTX"),
  colageno1: P("Colágeno", 1), membrana: P("membrana"), glucosamina1: P("glucosamina", 1), condroitina1: P("condroitina", 1), hialuronico: P("hialurónico"),
  cacito: P("cacito"), agua: P("agua"),
  vitamina: P("vitamina"), colageno2: P("colágeno", 2), cartilagos: P("cartílagos"), normalidadFin: E("normalidad"),
  dos2: P("Dos", 2), glucosamina2: P("glucosamina", 2), condroitina2: P("condroitina", 2), msm: P("MSM"), vitobest: P("Vitobest"),
  capsulas1: P("cápsulas", 1), batidos: P("batidos"),
  siempre: P("siempre"), esto: P("esto"), no2: P("no", 2), calienta: P("Calienta"), tecnica1: P("técnica", 1),
  pago: P("Pagó"), volvio: P("volvió"),
  semana1: P("Semana", 1), uno2: P("uno", 2), diez: P("diez"),
  semana2: P("Semana", 2), cuatro: P("cuatro"), tecnica2: P("técnica", 2),
  semana3: P("Semana", 3), ocho: P("ocho"), clases: P("clases"), calentamiento2: P("calentamiento", 2),
  polvo: P("Polvo"), capsulas2: P("cápsulas", 2), pregunta: P("Pregunta"), encajaFin: E("encaja"),
  siguenos: P("Síguenos"), perderte: P("perderte"), siete: P("siete"),
};
for (const [k, v] of Object.entries(T)) if (!Number.isFinite(v)) throw new Error("tiempo raro: " + k);
// aviso: palabras repetidas que caen antes de lo esperado (el orden del bloque T es el del guion)
{
  const ks = Object.keys(T);
  for (let i = 1; i < ks.length; i++) if (T[ks[i]] + 0.05 < T[ks[i - 1]] && !ks[i].endsWith("Fin") && !ks[i - 1].endsWith("Fin")) console.log(`  ⚠ ${ks[i]} (${T[ks[i]].toFixed(2)} s) cae antes que ${ks[i - 1]} (${T[ks[i - 1]].toFixed(2)} s): ¿palabra repetida?`);
}

// ───────────── colores ─────────────
const C = {
  // marca: Iron Fuel Nutrition (azul eléctrico del logo y gama de acero)
  azul: "#1D6BFF", azulOsc: "#0B3FB3", azulTxt: "#1550D8", azulClaro: "#5AB0FF", acero: "#C9CED6",
  verde: "#22C55E", verdeTxt: "#15803D", rojo: "#EF4444",
  tinta: "#121317", blanco: "#FFFFFF", gris: "#8A8F98",
};
// iconos de Phosphor (assets/icons, licencia MIT)
const icono = (n, x, y, size, fill, extra = "") => {
  const s = rd(`assets/icons/${n}.svg`).replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const k = size / 256;
  return `<g transform="translate(${x - size / 2} ${y - size / 2}) scale(${k})" fill="${fill}" ${extra}>${s}</g>`;
};
// pseudoaleatorio determinista
let semilla = 7;
const rnd = () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const txt = (x, y, s, size, fill, w = 900, anchor = "middle", extra = "") =>
  `<text x="${x}" y="${y}" font-family="Inter" font-weight="${w}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" ${extra}>${esc(s)}</text>`;

// ───────────── fondo lejano (paralaje) ─────────────
function fondoLejano() {
  let s = `<rect x="-4000" y="-5000" width="14000" height="9000" fill="url(#cielo)"/>`;
  semilla = 11;
  for (let x = -2600; x < 6200; ) {
    const w = 160 + rnd() * 260,
      h = 380 + rnd() * 900;
    const top = 1500 - h;
    s += `<rect x="${x.toFixed(0)}" y="${top.toFixed(0)}" width="${w.toFixed(0)}" height="${(h + 2400).toFixed(0)}" fill="${rnd() > 0.5 ? "#141A26" : "#18202E"}"/>`;
    for (let wy = top + 40; wy < 1460; wy += 70)
      for (let wx = x + 24; wx < x + w - 30; wx += 52)
        if (rnd() > 0.72) s += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="22" height="30" fill="#E9B872" opacity="${(0.18 + rnd() * 0.3).toFixed(2)}"/>`;
    x += w + 10 + rnd() * 40;
  }
  return s;
}

// ───────────── calle ─────────────
function calle() {
  let s = "";
  // acera, bordillo, asfalto
  s += `<rect x="-3000" y="1790" width="11000" height="120" fill="#4B4F56"/>`;
  for (let x = -3000; x < 8000; x += 110) s += `<rect x="${x}" y="1790" width="2" height="120" fill="#3E4248"/>`;
  s += `<rect x="-3000" y="1906" width="11000" height="18" fill="#71757C"/>`;
  s += `<rect x="-3000" y="1924" width="11000" height="2600" fill="#1C1F24"/>`;
  for (let x = -3000; x < 8000; x += 260) s += `<rect x="${x}" y="2190" width="140" height="14" rx="7" fill="#C9CCD1" opacity="0.45"/>`;
  s += `<rect x="-3000" y="2460" width="11000" height="40" fill="#2A2E34"/>`;
  // farolas con su charco de luz
  for (const fx of [-420, 2640, 4980]) {
    s += `<ellipse cx="${fx}" cy="1850" rx="260" ry="40" fill="url(#charco)"/>`;
    s += `<rect x="${fx - 9}" y="980" width="18" height="925" fill="#2C3138"/>`;
    s += `<path d="M${fx} 990 Q${fx} 930 ${fx + 70} 930 L${fx + 110} 930" stroke="#2C3138" stroke-width="16" fill="none"/>`;
    s += `<path d="M${fx + 70} 922 h80 l-14 30 h-52 Z" fill="#3A4048"/><rect x="${fx + 82}" y="950" width="56" height="8" rx="4" fill="#FFE3A3"/>`;
  }
  // papelera y banco junto a la tienda
  s += `<rect x="2560" y="1690" width="60" height="100" rx="8" fill="#2F6B45"/><rect x="2552" y="1684" width="76" height="14" rx="6" fill="#255738"/>`;
  return s;
}

// ───────────── la tienda (basada en la fachada real de Iron Fuel Nutrition) ─────────────
// Común a todas las partes: aplicar_marca.py la mete en cada tools/build.mjs.
const logo = (x, y, r, extra = "") => `<image href="assets/brand/logo.png" x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" ${extra}/>`;
function tienda() {
  let s = "";
  // edificio de ladrillo con balcones blancos y un aire acondicionado
  s += `<rect x="260" y="-340" width="2280" height="900" fill="#7A4A3A"/>`;
  for (let y = -340, f = 0; y < 560; y += 34, f++) {
    s += `<rect x="260" y="${y}" width="2280" height="3" fill="#A08C80" opacity="0.55"/>`;
    for (let x = 260 + (f % 2 ? 45 : 0); x < 2540; x += 90) s += `<rect x="${x}" y="${y}" width="3" height="34" fill="#A08C80" opacity="0.45"/>`;
  }
  for (const y of [-250, 140]) {
    for (let x = 420; x < 2400; x += 520) {
      s += `<rect x="${x}" y="${y}" width="260" height="300" rx="4" fill="#ECEBE7"/><rect x="${x + 16}" y="${y + 16}" width="228" height="268" fill="#1A2230"/>`;
      s += `<rect x="${x + 16}" y="${y + 16}" width="228" height="268" fill="#E9B872" opacity="${(x / 520) % 2 ? 0.35 : 0}"/>`;
      s += `<rect x="${x - 30}" y="${y + 200}" width="320" height="14" fill="#F2F1ED"/>`;
      for (let bx = x - 24; bx < x + 290; bx += 26) s += `<rect x="${bx}" y="${y + 214}" width="6" height="90" fill="#F2F1ED"/>`;
      s += `<rect x="${x - 30}" y="${y + 300}" width="320" height="12" fill="#F2F1ED"/>`;
    }
  }
  // aire acondicionado (como en la foto)
  s += `<g transform="translate(2180 300)"><rect width="260" height="190" rx="12" fill="#E6E7E9"/><circle cx="160" cy="95" r="70" fill="#C9CCD1"/><circle cx="160" cy="95" r="58" fill="none" stroke="#9EA3AA" stroke-width="6"/><circle cx="160" cy="95" r="16" fill="#9EA3AA"/>${[0, 1, 2, 3, 4].map((i) => `<rect x="20" y="${30 + i * 28}" width="56" height="8" rx="4" fill="#B5B9BF"/>`).join("")}</g>`;
  s += `<rect x="240" y="540" width="2320" height="44" fill="#ECEAE4"/>`;
  // interior: pared oscura, luz blanca, estanterías blancas con tira LED azul
  s += `<rect x="300" y="840" width="2200" height="960" fill="url(#pared-tienda)"/>`;
  for (const lx of [600, 1000, 1400, 1800, 2200]) {
    s += `<path d="M${lx - 40} 860 L${lx + 40} 860 L${lx + 220} 1790 L${lx - 220} 1790 Z" fill="url(#cono)" opacity="0.5"/>`;
    s += `<rect x="${lx - 60}" y="848" width="120" height="14" rx="7" fill="#F5F9FF"/>`;
  }
  const colores = [["#0E1013", "#1D6BFF"], ["#F1F2F4", "#1D6BFF"], ["#1B2433", "#C9CED6"], ["#B3261E", "#F1F1F1"], ["#2B2F36", "#5AB0FF"], ["#26834A", "#F1F1F1"], ["#F1F2F4", "#111317"], ["#3A3F47", "#C9CED6"], ["#7B2FBE", "#F1F1F1"]];
  semilla = 21;
  for (const sy of [1080, 1300, 1520]) {
    s += `<rect x="330" y="${sy}" width="2140" height="20" fill="#EEF0F3"/><rect x="330" y="${sy + 20}" width="2140" height="6" fill="#3D8BFF"/><rect x="330" y="${sy + 26}" width="2140" height="14" fill="#3D8BFF" opacity="0.18"/>`;
    for (let x = 350; x < 2440; ) {
      const w = 62 + Math.floor(rnd() * 46),
        h = 96 + Math.floor(rnd() * 70);
      const [cb, cl] = colores[Math.floor(rnd() * colores.length)];
      s += `<g><rect x="${x}" y="${sy - h}" width="${w}" height="${h}" rx="10" fill="${cb}"/><rect x="${x - 3}" y="${sy - h - 12}" width="${w + 6}" height="22" rx="7" fill="${cl}"/><rect x="${x + 8}" y="${sy - h * 0.62}" width="${w - 16}" height="${h * 0.34}" rx="4" fill="${cl}" opacity="0.85"/><rect x="${x + 6}" y="${sy - h + 8}" width="8" height="${h - 20}" rx="4" fill="#FFFFFF" opacity="0.2"/></g>`;
      x += w + 10 + Math.floor(rnd() * 14);
    }
  }
  // suelo de hormigón pulido
  s += `<rect x="300" y="1760" width="2200" height="40" fill="#4A4F57"/>`;
  for (let x = 300; x < 2500; x += 200) s += `<rect x="${x}" y="1760" width="2" height="40" fill="#3C4047"/>`;
  return s;
}
function fachada() {
  let s = "";
  // escaparate y su marco gris oscuro
  s += `<rect id="reflejo" x="360" y="860" width="1820" height="930" fill="url(#vidrio)" opacity="0.4"/>`;
  s += `<rect x="340" y="840" width="20" height="960" fill="#24272C"/><rect x="2180" y="840" width="30" height="960" fill="#24272C"/>`;
  s += `<rect x="340" y="840" width="2160" height="22" fill="#24272C"/><rect x="2470" y="840" width="30" height="960" fill="#24272C"/>`;
  s += `<rect x="2500" y="560" width="40" height="1240" fill="#24272C"/><rect x="260" y="560" width="40" height="1240" fill="#24272C"/>`;
  // puerta: transom con el lema y hoja de cristal con marco blanco
  s += `<g id="puerta-marco"><rect x="2210" y="862" width="260" height="290" fill="#14181F"/>${txt(2340, 952, "CONSTRUYE", 40, "#EAF0FA", 900)}${txt(2340, 1004, "TU MEJOR", 40, "#EAF0FA", 900)}${txt(2340, 1056, "VERSIÓN", 40, C.azulClaro, 900)}<rect x="2200" y="1140" width="280" height="22" fill="#24272C"/></g>`;
  s += `<rect x="2212" y="1162" width="256" height="628" fill="#0F1012"/>`;
  s += `<g id="puerta-hoja"><rect x="2216" y="1166" width="250" height="620" rx="4" fill="#B9C6D2" opacity="0.88"/><rect x="2216" y="1166" width="250" height="620" rx="4" fill="none" stroke="#E6E8EB" stroke-width="14"/>${logo(2341, 1400, 74)}<rect x="2240" y="1440" width="16" height="170" rx="8" fill="#1A1C20"/></g>`;
  // cartel: «IF» cromado, IRON FUEL en cursiva, NUTRITION en azul y la raya diagonal
  s += `<g id="cartel-tienda"><rect x="300" y="580" width="2200" height="258" fill="#0E1219"/><rect x="300" y="580" width="2200" height="6" fill="#1D2532"/><rect x="300" y="832" width="2200" height="6" fill="#1D2532"/>`;
  s += `<g transform="translate(330 0) skewX(-14)">${txt(320, 822, "IF", 280, C.azul, 900, "start")}${txt(306, 812, "IF", 280, "url(#acero)", 900, "start")}</g>`;
  s += `<g transform="translate(0 0) skewX(-12)">${txt(1040, 746, "IRON FUEL", 150, "url(#acero-claro)", 900, "start")}</g>`;
  s += `<g id="neon-tienda" filter="url(#neon)"><rect x="870" y="790" width="150" height="12" fill="${C.azul}"/><rect x="1680" y="790" width="150" height="12" fill="${C.azul}"/>${txt(1350, 820, "NUTRITION", 62, C.azul, 900, "middle", 'letter-spacing="16"')}<path d="M1880 806 L2010 680 H2470" stroke="${C.azul}" stroke-width="12" fill="none" stroke-linejoin="round"/></g></g>`;
  return s;
}
function mostrador() {
  let s = "";
  s += `<rect x="520" y="1470" width="1000" height="330" fill="#121418"/><rect x="520" y="1470" width="1000" height="330" fill="url(#sombra-mostrador)"/>`;
  s += `<rect x="520" y="1496" width="1000" height="10" fill="#3D8BFF"/><rect x="520" y="1506" width="1000" height="22" fill="#3D8BFF" opacity="0.18"/>`;
  s += logo(700, 1650, 96);
  s += `<g transform="skewX(-12)">${txt(1180, 1668, "IRON FUEL", 86, "url(#acero-claro)", 900, "start")}</g>${txt(1100, 1728, "NUTRITION", 40, C.azulClaro, 900, "middle", 'letter-spacing="10"')}`;
  s += `<rect x="500" y="1448" width="1040" height="30" rx="8" fill="#A8AFB8"/><rect x="500" y="1470" width="1040" height="10" fill="#6B727C"/>`;
  return s;
}

// bote: origen abajo en el centro
function bote(id, w, h, cuerpo, tapa, etiqueta, texto, colorTexto, sub, extra = "", texto2 = "") {
  const y0 = -h * 0.72;
  return `<g id="${id}"><ellipse cx="0" cy="0" rx="${w * 0.55}" ry="16" fill="#000" opacity="0.35"/>
  <rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="18" fill="${cuerpo}"/>
  <rect x="${-w / 2 - 6}" y="${-h - 22}" width="${w + 12}" height="38" rx="10" fill="${tapa}"/>
  <rect x="${-w / 2}" y="${y0}" width="${w}" height="${h * 0.5}" fill="${etiqueta}"/>
  ${txt(0, y0 + 32, "IRON FUEL", 22, etiqueta === "#111317" || etiqueta === "#0E1013" ? C.azulClaro : C.azulTxt, 900, "middle", 'letter-spacing="2" data-layout-ignore')}
  ${txt(0, y0 + (texto2 ? 66 : 72), texto, texto2 ? 32 : 30, colorTexto, 900)}
  ${texto2 ? txt(0, y0 + 92, texto2, 20, colorTexto, 900, "middle", 'letter-spacing="1" data-layout-ignore') : ""}
  <rect id="${sub}" x="${-w / 2 + 16}" y="${y0 + (texto2 ? 100 : 84)}" width="${w - 32}" height="8" rx="4" fill="${C.azul}" transform="scale(0 1)"/>
  <rect x="${-w / 2 + 10}" y="${-h + 12}" width="12" height="${h - 30}" rx="6" fill="#fff" opacity="0.22"/>${extra}</g>`;
}
function boteMagia() {
  const w = 150,
    h = 210,
    x = 1465,
    y = 1470;
  const cuerpo = (fill, lab, tinta = "#fff") => `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="18" fill="${fill}"/><rect x="${x - w / 2 - 6}" y="${y - h - 22}" width="${w + 12}" height="38" rx="10" fill="${lab}"/><rect x="${x - w / 2}" y="${y - h * 0.68}" width="${w}" height="${h * 0.48}" fill="${lab}"/>${txt(x, y - h * 0.68 + 44, "MÚSCULO", 30, tinta, 900)}${txt(x, y - h * 0.68 + 84, "EN 24 H", 30, tinta, 900)}`;
  return `<g id="bote-magia"><ellipse cx="${x}" cy="${y}" rx="90" ry="16" fill="#000" opacity="0.35"/>
  <g id="magia-color">${cuerpo("url(#oro)", "#7B2FBE")}</g><g id="magia-gris" opacity="0">${cuerpo("#6E7179", "#D1D5DB", "#2B2F36")}</g></g>
  <g id="magia-chispas">${icono("sparkle", -100, -40, 70, "#FFE27A")}${icono("sparkle", 95, 20, 56, "#FFE27A")}${icono("sparkle", 20, -110, 44, "#FFF3B0")}</g>
  <g id="magia-x" opacity="0">${icono("x-circle", 1515, 1300, 110, C.rojo)}</g>`;
}

// ───────────── kit común de las partes 6 en adelante (lo copia cada tools/build.mjs) ─────────────
// Réplicas de los productos de la tienda (origen: centro de la base del bote) y tarjetas «por datos».

// sombra de apoyo
const apoyo = (rx) => `<ellipse cx="0" cy="0" rx="${rx}" ry="16" fill="#000" opacity="0.35"/>`;
// IFLEX PRIME, de MTX: bote blanco, tapa metálica y franja verde
function iflex(id, sub) {
  return `<g id="${id}">${apoyo(115)}
  <rect x="-100" y="-205" width="200" height="205" rx="20" fill="#F7F7F7"/>
  <rect x="-106" y="-240" width="212" height="44" rx="10" fill="url(#acero)"/>
  ${[0, 1, 2, 3].map((i) => `<rect x="-100" y="${-232 + i * 9}" width="200" height="2" fill="#7E8691" opacity="0.5"/>`).join("")}
  ${txt(0, -166, "MTX", 26, "#111317", 900, "middle", 'letter-spacing="3" data-layout-ignore')}
  ${txt(0, -114, "IFLEX", 52, "#111317", 900)}
  ${txt(0, -76, "PRIME", 34, "#15803D", 900)}
  <rect id="${sub}" x="-70" y="-64" width="140" height="8" rx="4" fill="${C.azul}" transform="scale(0 1)"/>
  <rect x="-100" y="-50" width="200" height="30" fill="#1F8A3E"/>
  <rect x="-90" y="-193" width="12" height="176" rx="6" fill="#fff" opacity="0.5"/></g>`;
}
// Glucosamina, condroitina y MSM, de VitoBest: caja crema
function vitobest(id, sub) {
  return `<g id="${id}">${apoyo(95)}
  <path d="M75 -250 l26 -16 v250 l-26 16 Z" fill="#D6CBB4"/><path d="M-75 -250 l26 -16 h150 l-26 16 Z" fill="#F7F1E5"/>
  <rect x="-75" y="-250" width="150" height="250" fill="#EFE7D7"/>
  <path d="M-75 -70 Q0 -60 75 -150 V0 H-75 Z" fill="#E2D3B6"/>
  ${txt(0, -218, "vitOBest", 26, "#2A2A2A", 900)}
  <g transform="translate(6 -112) rotate(-90)">${txt(0, -26, "GLUCOSAMINE", 23, "#1B1B1B", 900)}${txt(0, 2, "CHONDROITIN", 23, "#1B1B1B", 900)}${txt(0, 30, "& MSM", 23, "#7A5A22", 900)}</g>
  <rect id="${sub}" x="-55" y="-26" width="110" height="8" rx="4" fill="${C.azul}" transform="scale(0 1)"/></g>`;
}
// Glutamina Pro Tella (Kyowa Quality): bote ancho gris
function protella(id, sub) {
  return `<g id="${id}">${apoyo(125)}
  <rect x="-110" y="-190" width="220" height="190" rx="22" fill="#E6E8EB"/>
  <rect x="-115" y="-222" width="230" height="40" rx="12" fill="#FAFAFB" stroke="#C9CDD3" stroke-width="4"/>
  <rect x="-110" y="-168" width="220" height="130" fill="#D5D9DE"/>
  ${txt(0, -138, "pro tella", 26, "#1B1B1B", 900, "middle", 'font-style="italic"')}
  ${txt(0, -96, "GLUTAMINE", 30, "#111317", 900)}
  <circle cx="-58" cy="-62" r="18" fill="#fff"/>${txt(-58, -54, "KQ", 22, "#111317", 900, "middle", "data-layout-ignore")}
  ${txt(34, -55, "100% PURE", 20, "#111317", 900, "middle", "data-layout-ignore")}
  <rect id="${sub}" x="-80" y="-84" width="160" height="7" rx="4" fill="${C.azul}" transform="scale(0 1)"/>
  <rect x="-98" y="-180" width="12" height="168" rx="6" fill="#fff" opacity="0.45"/></g>`;
}
// Berberina (QualityMax): bote rojo con forma de cápsula
function berberina(id, sub) {
  return `<g id="${id}">${apoyo(80)}
  <path d="M-65 0 V-205 A65 65 0 0 1 65 -205 V0 Z" fill="#C8202A"/>
  ${[[-30, -60, 30], [10, -40, -20], [30, -110, 40], [-20, -140, -30], [20, -160, 10]].map(([x, y, r]) => `<rect x="${x - 26}" y="${y - 11}" width="52" height="22" rx="11" fill="#E8434A" opacity="0.65" transform="rotate(${r} ${x} ${y})"/>`).join("")}
  <path d="M-65 -190 V-205 A65 65 0 0 1 65 -205 V-190 Z" fill="#9E141C"/><rect x="-65" y="-192" width="130" height="7" fill="#7E0F15"/>
  <path d="M-25 -252 L25 -212 M25 -252 L-25 -212" stroke="#7E0F15" stroke-width="8" stroke-linecap="round"/>
  <g transform="translate(4 -95) rotate(-90)">${txt(0, 10, "BERBERINE", 30, "#fff", 900)}${txt(0, -22, "QUALITYMAX", 15, "#FFE1E1", 900, "middle", 'letter-spacing="2" data-layout-ignore')}</g>
  <rect id="${sub}" x="-45" y="-22" width="90" height="7" rx="4" fill="#fff" transform="scale(0 1)"/>
  <rect x="-54" y="-180" width="10" height="166" rx="5" fill="#fff" opacity="0.3"/></g>`;
}
// NAD+ Resveratrol, de Applied Nutrition: bote blanco, tapa azul
function nad(id, sub) {
  return `<g id="${id}">${apoyo(90)}
  <rect x="-75" y="-220" width="150" height="220" rx="18" fill="#F4F5F7"/>
  <rect x="-71" y="-262" width="142" height="48" rx="10" fill="#1E4FA8"/>
  ${[0, 1, 2].map((i) => `<rect x="-71" y="${-252 + i * 12}" width="142" height="3" fill="#163B80"/>`).join("")}
  ${txt(0, -188, "APPLIED", 17, "#1E4FA8", 900, "middle", 'letter-spacing="2" data-layout-ignore')}
  ${txt(0, -134, "NAD+", 46, "#1B2340", 900)}
  ${txt(0, -104, "RESVERATROL", 18, "#1E4FA8", 900, "middle", "data-layout-ignore")}
  <rect id="${sub}" x="-55" y="-92" width="110" height="7" rx="4" fill="${C.azul}" transform="scale(0 1)"/>
  <rect x="-64" y="-206" width="10" height="190" rx="5" fill="#fff" opacity="0.6"/></g>`;
}

// ───────────── tarjetas por datos ─────────────
// Cada tarjeta: { id, x, y, w, h0, t0, hasta, filas: [{ id, t, cx, cy, abajo, svg }] }
//   t / t0: clave del bloque T (o [clave, desfase en s]); la fila aparece cuando EMPIEZA esa palabra.
//   abajo: hasta dónde llega la fila (la tarjeta crece en su sitio para abarcarla).
// Ayudas para filas: icono + texto, y pastillas.
const fila = (x, y, icon, color, texto, size = 40, tinta = C.tinta) => `${icono(icon, x + 46, y, size + 14, color)}${txt(x + 86, y + size * 0.36, texto, size, tinta, 900, "start")}`;
const pastilla = (x, y, w, texto, fondo = "#E3F5EA", tinta = C.verdeTxt, size = 30) => `<rect x="${x}" y="${y - 26}" width="${w}" height="52" rx="26" fill="${fondo}"/>${txt(x + w / 2, y + size * 0.36, texto, size, tinta, 900)}`;
function tarjetaSVG(c) {
  return `<g id="${c.id}" opacity="0"><rect id="${c.id}-fondo" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h0}" rx="30" fill="#fff" filter="url(#sombra)"/>${c.filas.map((f) => `<g id="${f.id}" opacity="0">${f.svg}</g>`).join("")}</g>`;
}
const sinSVG = (c) => ({ ...c, filas: c.filas.map(({ svg, ...f }) => f) });
// si una tarjeta usa una palabra que no está en el bloque T, se para aquí
function validarTarjetas(cards) {
  for (const c of cards)
    for (const k of [c.t0, c.hasta, ...c.filas.map((f) => f.t)]) {
      const n = Array.isArray(k) ? k[0] : k;
      if (!Number.isFinite(T[n])) throw new Error(`tarjeta ${c.id}: no existe T.${n}`);
    }
  return cards;
}


// ───────────── tarjetas de la sexta parte (crecen fila a fila, cada fila en su palabra) ─────────────
const CARDS = [
  {
    // IFLEX PRIME: ingredientes, cómo se toma y la vitamina C
    id: "card-a", x: 400, y: 700, w: 520, h0: 92, t0: "colageno1", hasta: "normalidadFin",
    filas: [
      { id: "a-colageno", t: "colageno1", cx: 600, cy: 750, abajo: 780, svg: fila(400, 750, "drop", C.azul, "COLÁGENO", 34) },
      { id: "a-huevo", t: "membrana", cx: 640, cy: 804, abajo: 834, svg: fila(400, 804, "egg", "#C8901E", "MEMBRANA DE HUEVO", 34) },
      { id: "a-gluco", t: "glucosamina1", cx: 600, cy: 858, abajo: 888, svg: fila(400, 858, "flask", C.azul, "GLUCOSAMINA", 34) },
      { id: "a-condro", t: "condroitina1", cx: 600, cy: 912, abajo: 942, svg: fila(400, 912, "flask", C.azul, "CONDROITINA", 34) },
      { id: "a-hialu", t: "hialuronico", cx: 640, cy: 966, abajo: 996, svg: fila(400, 966, "drop-half-bottom", "#2F8FE0", "ÁCIDO HIALURÓNICO", 34) },
      { id: "a-cacito", t: "cacito", cx: 620, cy: 1036, abajo: 1066, svg: `<rect x="426" y="1000" width="468" height="3" fill="#E5E7EB"/>${fila(400, 1036, "calendar-check", C.azul, "1 CACITO AL DÍA", 36)}` },
      { id: "a-agua", t: "agua", cx: 600, cy: 1090, abajo: 1120, svg: fila(400, 1090, "drop", "#2F8FE0", "EN AGUA", 36) },
      { id: "a-vitc", t: "vitamina", cx: 620, cy: 1158, abajo: 1188, svg: `<rect x="426" y="1122" width="468" height="3" fill="#E5E7EB"/>${fila(400, 1158, "orange-slice", "#E58A00", "VITAMINA C", 36)}` },
      { id: "a-forma", t: "colageno2", cx: 660, cy: 1210, abajo: 1236, svg: txt(486, 1222, "→ FORMA COLÁGENO", 34, C.azulTxt, 900, "start") },
      { id: "a-cartilagos", t: "cartilagos", cx: 660, cy: 1258, abajo: 1284, svg: txt(486, 1270, "→ CARTÍLAGOS", 34, C.verdeTxt, 900, "start") },
    ],
  },
  {
    // Glucosamina, condroitina y MSM de VitoBest
    id: "card-b", x: 1060, y: 700, w: 520, h0: 92, t0: "glucosamina2", hasta: "batidos",
    filas: [
      { id: "b-gluco", t: "glucosamina2", cx: 1260, cy: 750, abajo: 780, svg: fila(1060, 750, "flask", C.azul, "GLUCOSAMINA", 34) },
      { id: "b-condro", t: "condroitina2", cx: 1260, cy: 804, abajo: 834, svg: fila(1060, 804, "flask", C.azul, "CONDROITINA", 34) },
      { id: "b-msm", t: "msm", cx: 1200, cy: 858, abajo: 888, svg: fila(1060, 858, "flask", C.azul, "MSM", 34) },
      { id: "b-capsulas", t: "capsulas1", cx: 1280, cy: 928, abajo: 958, svg: `<rect x="1086" y="892" width="468" height="3" fill="#E5E7EB"/>${fila(1060, 928, "pill", C.azul, "EN CÁPSULAS", 38)}` },
      { id: "b-batidos", t: "batidos", cx: 1280, cy: 984, abajo: 1014, svg: fila(1060, 984, "prohibit", C.rojo, "SIN BATIDOS", 38) },
    ],
  },
  {
    // «Y lo de siempre: esto no hace milagros. Calienta bien y cuida la técnica.»
    id: "regla", x: 880, y: 120, w: 1160, h0: 120, t0: "esto", hasta: ["pago", -0.05],
    filas: [
      { id: "r-milagros", t: "no2", cx: 1460, cy: 190, abajo: 230, svg: fila(880, 190, "prohibit", C.rojo, "NO HACE MILAGROS", 84) },
      { id: "r-calienta", t: "calienta", cx: 1300, cy: 300, abajo: 340, svg: fila(880, 300, "fire", "#EA580C", "CALIENTA BIEN", 84) },
      { id: "r-tecnica", t: "tecnica1", cx: 1460, cy: 410, abajo: 440, svg: fila(880, 410, "check-circle", C.verde, "CUIDA LA TÉCNICA", 84) },
    ],
  },
];
// píldoras que flotan sobre la cabeza de alguien (centro en 0,0)
const pildora = (id, w, contenido, h = 120) => `<g id="${id}" opacity="0"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#fff" filter="url(#sombra)"/>${contenido}</g>`;
function pildoras() {
  return (
    pildora("p-anos", 360, `${icono("medal", -112, 0, 76, "#D4A017")}${txt(42, 20, "20 AÑOS", 56, C.tinta, 900)}`) +
    pildora("p-medico", 450, `${icono("stethoscope", -168, 0, 72, C.rojo)}${txt(-14, 19, "MÉDICO", 52, C.tinta, 900)}<g id="p-verde" opacity="0">${icono("check-circle", 168, 0, 78, C.verde)}</g>`) +
    pildora("p-diez", 330, `${icono("timer", -100, 0, 72, C.azul)}${txt(40, 20, "10 MIN", 56, C.tinta, 900)}`) +
    pildora("p-tecnica", 380, `${icono("check-circle", -124, 0, 74, C.verde)}${txt(36, 20, "TÉCNICA", 56, C.tinta, 900)}`) +
    pildora("p-profe", 330, `${icono("users-three", -100, 0, 76, C.azul)}${txt(42, 20, "PROFE", 56, C.tinta, 900)}`) +
    pildora("p-polvo", 230, `${txt(0, 17, "POLVO", 48, C.tinta, 900)}`, 100) +
    pildora("p-capsulas", 300, `${txt(0, 17, "CÁPSULAS", 48, C.tinta, 900)}`, 100) +
    pildora("p-pregunta", 420, `${icono("chat-circle-dots", -140, 0, 76, C.azul)}${txt(36, 20, "PREGUNTA", 56, C.tinta, 900)}`)
  );
}
// crujidos en las rodillas
function crujidos() {
  const zz = (x, y, s) => `<path d="M${x} ${y} l${14 * s} -10 l-6 18 l${16 * s} -12" stroke="#FFE27A" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<g id="crujidos" opacity="0">${zz(-60, 0, -1)}${zz(-80, -30, -1)}${zz(60, 0, 1)}${zz(80, -30, 1)}</g>`;
}
// la pila que lleva encima de la cabeza
function pila() {
  return `<g id="pila" opacity="0"><rect x="-80" y="-40" width="150" height="80" rx="16" fill="#0E1013" stroke="#fff" stroke-width="8"/><rect x="70" y="-16" width="16" height="32" rx="5" fill="#fff"/><rect id="pila-nivel" x="-68" y="-28" width="126" height="56" rx="8" fill="${C.verde}"/><g id="pila-rayo">${icono("lightning", -5, 0, 52, "#fff")}</g></g>`;
}
// tarjeta final: seguir a la tienda
function seguir() {
  return `<g id="seguir" opacity="0"><rect x="540" y="80" width="1840" height="400" rx="56" fill="#fff" filter="url(#sombra)"/>
  ${logo(700, 200, 96)}
  ${txt(830, 238, "IRON FUEL NUTRITION", 100, C.tinta, 900, "start")}
  <g id="chip-p2" opacity="0"><rect x="600" y="305" width="460" height="130" rx="65" fill="${C.tinta}"/>${txt(830, 400, "PARTE 6", 88, "#fff", 900)}</g>
  <g id="chip-p3" opacity="0"><rect x="1090" y="305" width="520" height="130" rx="65" fill="#E5E7EB"/>${icono("clock", 1160, 370, 70, "#4B515B")}${txt(1385, 400, "PARTE 7", 88, "#4B515B", 900)}</g>
  <g id="boton-seguir"><rect id="boton-fondo" x="1660" y="305" width="660" height="130" rx="65" fill="${C.azul}"/><g id="boton-seguir-txt">${txt(1990, 400, "SEGUIR", 88, "#fff", 900)}</g><g id="boton-siguiendo" opacity="0">${icono("check-circle", 1720, 370, 70, C.verdeTxt)}${txt(2030, 398, "SIGUIENDO", 80, C.tinta, 900)}</g></g>
  <g id="dedo-tap" opacity="0">${icono("hand-tap", 0, 0, 170, C.tinta)}</g></g>`;
}
function bocadillo() {
  return `<g id="bocadillo" opacity="0"><path id="bocadillo-fondo" d="" fill="#fff" filter="url(#sombra)"/>
  <text id="boc-l1" x="1480" y="972" font-family="Inter" font-weight="900" font-size="50" fill="${C.tinta}" text-anchor="middle"></text>
  <text id="boc-l2" x="1480" y="1032" font-family="Inter" font-weight="900" font-size="50" fill="${C.tinta}" text-anchor="middle"></text>
  <text id="boc-l3" x="1480" y="1098" font-family="Inter" font-weight="900" font-size="50" fill="${C.azul}" text-anchor="middle"></text></g>`;
}

// ───────────── gimnasio ─────────────
function gimnasio() {
  let s = "";
  s += `<rect x="2760" y="-120" width="1780" height="700" fill="#222831"/>`;
  for (let y = -100; y < 560; y += 46) s += `<rect x="2760" y="${y}" width="1780" height="2" fill="#1B2028"/>`;
  for (let x = 2860; x < 4460; x += 330) s += `<rect x="${x}" y="40" width="220" height="380" rx="6" fill="#9FD3FF" opacity="0.16"/>`;
  // interior
  s += `<rect x="2800" y="840" width="1700" height="960" fill="url(#pared-gym)"/>`;
  [3050, 3450, 3850, 4250].forEach((lx, i) => (s += `<g id="luz-g${i}"><rect x="${lx - 90}" y="850" width="180" height="16" rx="8" fill="#DDF3FF" opacity="0.9"/><path d="M${lx - 90} 866 h180 l160 920 h-500 Z" fill="url(#cono-frio)" opacity="0.45"/></g>`));
  // espejo
  s += `<rect x="3820" y="930" width="640" height="560" rx="10" fill="#33404E"/><path d="M3880 1490 L4080 930 h50 L3930 1490 Z" fill="#fff" opacity="0.06"/><path d="M4120 1490 L4320 930 h24 L4144 1490 Z" fill="#fff" opacity="0.06"/>`;
  // cuando «se apaga el gimnasio»
  s += `<rect id="gym-oscuro" x="2800" y="840" width="1700" height="960" fill="#030406" opacity="0"/>`;
  // marcador de semanas
  s += `<g><rect x="3180" y="880" width="540" height="230" rx="18" fill="#08090B" stroke="#2C3138" stroke-width="8"/>${txt(3345, 1018, "SEMANA", 64, C.azul, 900)}
  <clipPath id="clip-marcador"><rect x="3500" y="905" width="200" height="180" rx="10"/></clipPath>
  <g clip-path="url(#clip-marcador)"><rect x="3500" y="905" width="200" height="180" fill="#101317"/>
  <g id="marcador-d">${[0, 1].map((d, i) => txt(3552, 1052 + i * 150, String(d), 150, "#3CFF8F", 900)).join("")}</g>
  <g id="marcador-u">${Array.from({ length: 13 }, (_, i) => txt(3648, 1052 + i * 150, String(i % 10), 150, "#3CFF8F", 900)).join("")}</g></g></g>`;
  // soporte de la barra
  s += `<rect x="3140" y="1180" width="22" height="620" fill="#9AA3AD"/><rect x="3740" y="1180" width="22" height="620" fill="#9AA3AD"/><rect x="3130" y="1270" width="50" height="14" rx="4" fill="#C4CBD2"/><rect x="3722" y="1270" width="50" height="14" rx="4" fill="#C4CBD2"/>`;
  // suelo de caucho
  s += `<rect x="2800" y="1760" width="1700" height="40" fill="#15181C"/>`;
  for (let x = 2800; x < 4500; x += 200) s += `<rect x="${x}" y="1760" width="3" height="40" fill="#0E1013"/>`;
  // mancuernas al fondo
  for (let i = 0; i < 6; i++) s += `<g transform="translate(${3900 + i * 80} 1700)"><rect x="-26" y="-30" width="16" height="60" rx="5" fill="#2A2E34"/><rect x="10" y="-30" width="16" height="60" rx="5" fill="#2A2E34"/><rect x="-14" y="-6" width="28" height="12" fill="#8A929C"/></g>`;
  s += `<rect x="3880" y="1730" width="500" height="12" fill="#3A3F47"/>`;
  return s;
}
function fachadaGym() {
  let s = `<rect x="2760" y="560" width="60" height="1240" fill="#1B2028"/><rect x="4480" y="560" width="60" height="1240" fill="#1B2028"/>`;
  s += `<rect x="2760" y="580" width="1780" height="250" rx="18" fill="#0C0E11"/>`;
  s += `<g id="neon-gym-off">${icono("barbell", 3010, 705, 160, "#2E3A33")}${txt(3330, 775, "GYM", 200, "#2E3A33", 900, "middle", 'letter-spacing="12"')}</g>`;
  s += `<g id="neon-gym" opacity="0" filter="url(#neon)">${icono("barbell", 3010, 705, 160, "#3CFF8F")}${txt(3330, 775, "GYM", 200, "#3CFF8F", 900, "middle", 'letter-spacing="12"')}</g>`;
  s += txt(4050, 752, "ABIERTO 24 H", 70, "#C9D4DE", 900, "middle", 'letter-spacing="4"');
  return s;
}

// ───────────── personajes ─────────────
const PJ = {
  flaco: { piel: "#F2C6A0", ropa: "#F7C948", pantalon: "#3A3F47", tibia: "piel", zapato: "#F5F5F5", raya: "#D6453D", pelo: "#5B3A24", m0: 0, seed: 1.3 },
  dep: { piel: "#C68B5E", ropa: "#17191C", pantalon: "#2F4A6B", tibia: "pantalon", zapato: "#222", pelo: "#2A1C14", m0: 0.78, seed: 2.7 },
  comp: { piel: "#E8B98F", ropa: "#3D7BD9", pantalon: "#C9B79C", tibia: "pantalon", zapato: "#333", pelo: "#4A3020", m0: 0.25, seed: 4.1, mangaLarga: true },
  vec: { piel: "#8D5A3B", ropa: "#8E5BD9", pantalon: "#8E5BD9", tibia: "pantalon", zapato: "#EEE", pelo: "#1C1412", m0: 0.15, seed: 5.9, mangaLarga: true, genero: "f", coleta: true },
  abu: { piel: "#F0C9A8", ropa: "#8A5A3C", pantalon: "#6F7378", tibia: "pantalon", zapato: "#3A2A20", pelo: "#F2F2F2", m0: 0.2, seed: 7.3, mangaLarga: true },
  gym: { piel: "#D9A27A", ropa: "#8C939C", pantalon: "#202327", tibia: "piel", zapato: "#E74C3C", pelo: "#2B1E16", m0: 0.5, seed: 8.8, sinMangas: true },
};
function oscurece(hex, k) {
  const c = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}
function cabezaExtras(id, p) {
  const R = 66,
    fx = 10;
  let atras = "",
    delante = "";
  if (id === "flaco") {
    // gorra hacia atrás
    delante += `<path d="M-64 -14 Q-64 -78 0 -80 Q60 -78 64 -18 Z" fill="#D6453D"/><path d="M-60 -24 Q-110 -26 -118 -6 Q-90 -2 -58 -8 Z" fill="#B53A33"/><circle cx="0" cy="-80" r="7" fill="#B53A33"/>`;
  } else if (id === "dep") {
    delante += `<path d="M-58 0 Q-60 72 0 80 Q60 72 58 0 Q44 46 0 50 Q-44 46 -58 0 Z" fill="${p.pelo}"/><path d="M-14 22 Q${fx * 0.7} 12 ${fx * 0.7 + 30} 22 Q${fx * 0.7} 28 -14 22 Z" fill="${p.pelo}"/><ellipse cx="-14" cy="-44" rx="26" ry="12" fill="#fff" opacity="0.22"/>`;
  } else if (id === "comp") {
    delante += `<path d="M-66 -6 Q-72 -84 6 -86 Q74 -84 66 -10 Q50 -50 20 -52 Q30 -40 4 -44 Q-10 -62 -40 -46 Q-56 -40 -66 -6 Z" fill="${p.pelo}"/>`;
    delante += `<circle cx="${fx - 23}" cy="-8" r="21" fill="none" stroke="#141414" stroke-width="6"/><circle cx="${fx + 23}" cy="-8" r="21" fill="none" stroke="#141414" stroke-width="6"/><path d="M${fx - 2} -10 h4" stroke="#141414" stroke-width="6"/>`;
    delante += `<path d="M-50 70 Q0 110 50 70" stroke="#222" stroke-width="12" fill="none"/><rect x="-62" y="56" width="22" height="34" rx="9" fill="#222"/><rect x="40" y="56" width="22" height="34" rx="9" fill="#222"/>`;
  } else if (id === "vec") {
    atras += `<g id="vec-pelo"><path d="M-40 -40 Q-120 -10 -96 70 Q-70 30 -50 -10 Z" fill="${p.pelo}"/></g>`;
    delante += `<path d="M-66 -4 Q-68 -82 4 -84 Q70 -82 66 -6 Q40 -46 -10 -48 Q-46 -46 -66 -4 Z" fill="${p.pelo}"/><circle cx="-34" cy="-70" r="22" fill="${p.pelo}"/>`;
    delante += `<circle cx="${fx + 56}" cy="22" r="7" fill="#FFD24A"/>`;
  } else if (id === "abu") {
    delante += `<ellipse cx="0" cy="-58" rx="74" ry="26" fill="#2B2B33"/><circle cx="0" cy="-84" r="9" fill="#2B2B33"/>`;
    delante += `<path d="M${fx * 0.7 - 34} 22 Q${fx * 0.7} 6 ${fx * 0.7 + 34} 22 Q${fx * 0.7} 32 ${fx * 0.7 - 34} 22 Z" fill="#F4F4F4"/>`;
  } else if (id === "gym") {
    delante += `<path d="M-64 -16 Q-62 -80 2 -82 Q66 -80 64 -18 Q34 -50 -2 -52 Q-36 -50 -64 -16 Z" fill="${p.pelo}"/><rect x="-66" y="-40" width="132" height="18" rx="9" fill="#34C759"/>`;
  }
  return { atras, delante };
}
function personaje(id) {
  const p = PJ[id];
  const tib = p.tibia === "piel" ? p.piel : p.pantalon;
  const brazoCol = p.mangaLarga ? p.ropa : p.piel;
  const { atras, delante } = cabezaExtras(id, p);
  const zap = (lado) =>
    `<g id="${id}-zap${lado}"><path d="M-18 -8 Q-20 18 0 20 L58 20 Q70 20 68 6 Q64 -10 32 -12 L-12 -14 Z" fill="${p.zapato}"/><rect x="-18" y="14" width="86" height="8" rx="4" fill="${oscurece(p.zapato, 0.7)}"/>${p.raya ? `<path d="M8 2 L40 -2" stroke="${p.raya}" stroke-width="6" stroke-linecap="round"/>` : ""}</g>`;
  const pierna = (lado) =>
    `<g id="${id}-pierna${lado}"><path id="${id}-muslo${lado}" fill="${p.pantalon}"/><g id="${id}-esp${lado}"><path id="${id}-tibia${lado}" fill="${tib}"/>${zap(lado)}</g></g>`;
  const brazo = (lado) =>
    `<g id="${id}-brazo${lado}"><path id="${id}-hum${lado}" fill="${brazoCol}"/>${p.sinMangas ? "" : `<path id="${id}-manga${lado}" fill="${p.ropa}"/>`}<g id="${id}-ant${lado}"><path id="${id}-rad${lado}" fill="${p.mangaLarga ? p.ropa : p.piel}"/><circle id="${id}-mano${lado}" fill="${p.piel}"/></g></g>`;
  const ojo = (lado) =>
    `<g id="${id}-ojo${lado}"><ellipse rx="13" ry="16" fill="#fff"/><circle id="${id}-pup${lado}" r="7.5" fill="#1B1B1F"/></g>`;
  const ceja = (lado) => `<g id="${id}-ceja${lado}"><rect x="-15" y="-4" width="30" height="9" rx="4.5" fill="${p.pelo}"/></g>`;
  const logo = id === "dep" ? `<g id="dep-logo">${txt(0, 14, "IF", 38, C.azulClaro, 900, "middle", 'font-style="italic"')}</g>` : "";
  const detalle = id === "flaco" ? `<path id="flaco-detalle" fill="none" stroke="${oscurece(p.ropa, 0.75)}" stroke-width="6" stroke-linecap="round"/>` : "";
  return `<g id="${id}-root"><g id="${id}-cuerpo">${pierna("L")}${pierna("R")}<path id="${id}-pelvis" fill="${p.pantalon}"/>
  <g id="${id}-superior">${brazo("L")}<path id="${id}-cuello" fill="${p.piel}"/><path id="${id}-tronco" fill="${p.ropa}"/>${detalle}${logo}
  <g id="${id}-cabeza">${atras}<circle r="66" fill="${p.piel}"/><circle cx="-52" cy="6" r="14" fill="${oscurece(p.piel, 0.9)}"/><ellipse cx="32" cy="10" rx="10" ry="12" fill="${oscurece(p.piel, 0.88)}"/>
  ${ojo("L")}${ojo("R")}${ceja("L")}${ceja("R")}<path id="${id}-boca" fill="#4A1E1E" stroke="#4A1E1E" stroke-width="3" stroke-linejoin="round"/>${delante}</g>
  ${brazo("R")}</g></g></g>`;
}

// ───────────── objetos sueltos ─────────────
function objetos() {
  let s = "";
  s += `<g id="datafono" opacity="0"><rect x="-44" y="-70" width="88" height="130" rx="14" fill="#23262B"/><rect x="-32" y="-58" width="64" height="44" rx="6" fill="#0E1418"/><g id="datafono-ok" opacity="0"><rect x="-32" y="-58" width="64" height="44" rx="6" fill="${C.verde}"/>${icono("check-circle", 0, -36, 34, "#fff")}</g><rect x="-30" y="0" width="60" height="44" rx="6" fill="#3A3E45"/></g>`;
  s += `<g id="movil" opacity="0"><rect x="-26" y="-50" width="52" height="96" rx="12" fill="#111"/><rect x="-20" y="-42" width="40" height="76" rx="6" fill="#3D7BD9"/></g>`;
  s += `<g id="bolsa" opacity="0"><path d="M-30 0 Q-30 -40 0 -40 Q30 -40 30 0" stroke="#1A1C20" stroke-width="8" fill="none"/><rect x="-70" y="0" width="140" height="150" rx="10" fill="#121418"/><rect x="-70" y="0" width="140" height="14" fill="${C.azul}"/>${logo(0, 80, 54)}</g>`;
  s += `<g id="bolsa-abu" opacity="0"><path d="M-26 0 Q-26 -34 0 -34 Q26 -34 26 0" stroke="#1A1C20" stroke-width="7" fill="none"/><rect x="-60" y="0" width="120" height="128" rx="10" fill="#121418"/><rect x="-60" y="0" width="120" height="12" fill="${C.azul}"/>${logo(0, 68, 46)}</g>`;
  s += pila();
  // estelas de velocidad
  s += `<g id="estelas" opacity="0">${[0, 1, 2, 3].map((i) => `<rect x="${-40 - i * 30}" y="${i * 90}" width="${180 - i * 20}" height="12" rx="6" fill="#fff" opacity="${0.5 - i * 0.08}"/>`).join("")}</g>`;
  // barra del flaco y del vecino del gimnasio
  const disco = (id, r) => `<g id="${id}" opacity="0"><rect x="-17" y="${-r}" width="34" height="${2 * r}" rx="8" fill="#111317"/><rect x="-9" y="${-r + 12}" width="18" height="${2 * r - 24}" rx="5" fill="#2E333A"/></g>`;
  s += `<g id="barra-flaco"><path id="barra-flaco-bar" d="" stroke="#B9C0C8" stroke-width="16" stroke-linecap="round" fill="none"/>${[0, 1, 2, 3, 4, 5].map((i) => disco("barra-flaco-d" + i, i < 2 ? 92 : i < 4 ? 80 : 104)).join("")}</g>`;
  s += `<g id="barra-vecino"><path id="barra-vecino-bar" d="" stroke="#B9C0C8" stroke-width="16" stroke-linecap="round" fill="none"/>${[0, 1].map((i) => disco("barra-vecino-d" + i, 80)).join("")}</g>`;
  s += `<g id="gotas" opacity="0">${icono("drop", 0, 0, 40, "#8FD3FF")}${icono("drop", 30, 40, 30, "#8FD3FF")}</g>`;
  s += `<g id="choque" opacity="0">${icono("sparkle", 0, 0, 150, "#FFE27A")}</g>`;
  s += `<g id="baston"><rect x="-8" y="0" width="16" height="250" rx="8" fill="#6B4A2E"/><path d="M0 0 Q0 -40 40 -40" stroke="#6B4A2E" stroke-width="16" fill="none" stroke-linecap="round"/></g>`;
  return s;
}
function trazos() {
  // línea del suelo que une el mostrador con el gimnasio (la del primer vídeo, ya pintada)
  let s = `<path id="linea-suelo" d="M1640 1808 H3450" stroke="${C.azul}" stroke-width="14" stroke-linecap="round" fill="none"/>`;
  s += `<path id="linea-brillo" d="M3000 1808 H1640" stroke="#A9D0FF" stroke-width="8" stroke-linecap="round" fill="none" opacity="0"/>`;
  s += `<path id="linea-ida" d="M1640 1808 H3450" stroke="#A9D0FF" stroke-width="8" stroke-linecap="round" fill="none" opacity="0"/>`;
  return s;
}
// ───────────── el mundo entero ─────────────
const defs = `<defs>
<linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070B"/><stop offset="0.6" stop-color="#0F1522"/><stop offset="1" stop-color="#1B1626"/></linearGradient>
<linearGradient id="pared-tienda" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#30343B"/><stop offset="1" stop-color="#1F2228"/></linearGradient>
<linearGradient id="acero" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F6F8"/><stop offset="0.45" stop-color="#9AA2AD"/><stop offset="0.55" stop-color="#E3E7EC"/><stop offset="1" stop-color="#6E7681"/></linearGradient>
<linearGradient id="acero-claro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#E4E8EE"/><stop offset="1" stop-color="#AEB5BF"/></linearGradient>
<linearGradient id="pared-gym" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E3A46"/><stop offset="1" stop-color="#1D242C"/></linearGradient>
<linearGradient id="cono" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF2FF" stop-opacity="0.5"/><stop offset="1" stop-color="#EAF2FF" stop-opacity="0"/></linearGradient>
<linearGradient id="cono-frio" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D8F1FF" stop-opacity="0.5"/><stop offset="1" stop-color="#D8F1FF" stop-opacity="0"/></linearGradient>
<linearGradient id="vidrio" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.42" stop-color="#fff" stop-opacity="0"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/><stop offset="0.62" stop-color="#fff" stop-opacity="0.1"/><stop offset="0.66" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="oro" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E39B12"/><stop offset="0.5" stop-color="#F9D45C"/><stop offset="1" stop-color="#D88A0C"/></linearGradient>
<linearGradient id="sombra-mostrador" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.18"/><stop offset="0.3" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.12"/></linearGradient>
<radialGradient id="charco"><stop offset="0" stop-color="#FFD98A" stop-opacity="0.35"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/></radialGradient>
<radialGradient id="brillo-suelo" cx="0.5" cy="1" r="0.7"><stop offset="0" stop-color="${C.azul}" stop-opacity="0.28"/><stop offset="1" stop-color="${C.azul}" stop-opacity="0"/></radialGradient>
<filter id="sombra" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000" flood-opacity="0.38"/></filter>
<filter id="neon" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>`;

const mundo = `<svg id="mundo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">${defs}
<g id="fondo-lejano">${fondoLejano()}</g>
<g id="cam">
  ${calle()}
  ${tienda()}
  ${gimnasio()}
  ${personaje("dep")}
  ${mostrador()}
  ${boteMagia()}
  <g id="capa-botes">${iflex("bote-iflex", "sub-iflex")}${vitobest("bote-vito", "sub-vito")}</g>
  <g id="badge-1" opacity="0"><circle cx="630" cy="1262" r="36" fill="${C.azul}" stroke="#fff" stroke-width="6"/>${txt(630, 1283, "1", 56, "#fff", 900)}</g>
  <g id="badge-2" opacity="0"><circle cx="1172" cy="1190" r="36" fill="${C.azul}" stroke="#fff" stroke-width="6"/>${txt(1172, 1211, "2", 56, "#fff", 900)}</g>
  ${fachada()}
  ${fachadaGym()}
  <rect x="300" y="1760" width="4200" height="60" fill="url(#brillo-suelo)"/>
  ${trazos()}
  ${personaje("flaco")}
  ${personaje("vec")}
  ${personaje("gym")}
  ${personaje("abu")}
  ${personaje("comp")}
  ${objetos()}
  <g id="capa-frente"></g>
  ${bocadillo()}
  ${crujidos()}
  ${CARDS.map(tarjetaSVG).join("")}
  ${pildoras()}
  ${seguir()}
</g></svg>`;

const motor = rd("tools/motor.js");
const IF = { T, D, PJ, CARDS: validarTarjetas(CARDS).map(sinSVG) };
const mundoHtml = `<template>
<style>
  #root { position: absolute; inset: 0; background: #07090D; overflow: hidden; }
  #mundo-svg { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }
</style>
<div id="root" data-composition-id="mundo" data-width="1080" data-height="1920" data-layout-allow-overflow data-layout-allow-overlap>
${mundo}
</div>
<script>
window.__IF = ${JSON.stringify(IF)};
${motor}
window.__IF.medir();
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

// ───────────── subtítulos palabra a palabra ─────────────
const CLAVE = new Set(
  "veinte rodillas medico verde tienda botes aiflex mtx colageno huevo glucosamina condroitina hialuronico cacito agua vitamina cartilagos msm vitobest capsulas batidos milagros calienta tecnica gimnasio diez cuatro ocho clases polvo pregunta siguenos"
    .split(" "),
);
// cómo se escribe en pantalla lo que la voz lee «como suena»
const DISPLAY = { aiflex: "IFLEX", praim: "PRIME", vitobest: "VITOBEST" };
function grupos() {
  const ws = [];
  V.palabras.forEach((w, i) => {
    const sig = V.palabras[i + 1];
    if (w.n === "b" && sig && sig.n === "doce") ws.push({ ...w, text: "B12.", n: "b12", end: sig.end });
    else if (w.n === "doce" && i > 0 && V.palabras[i - 1].n === "b") return;
    else ws.push(DISPLAY[w.n] ? { ...w, text: DISPLAY[w.n] + (w.text.match(/[.,:;?!]+$/) || [""])[0] } : w);
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
    const pausa = sig ? sig.start - w.end >= 0.15 : true;
    const largo = g.reduce((a, x) => a + x.text.length, 0);
    if (!sig || fin || pausa || g.length >= 4 || (g.length >= 3 && largo > 14) || largo > 18) cerrar();
  });
  return out;
}
const G = grupos();
let subs = "";
let subsJs = "";
G.forEach((g, gi) => {
  const ini = Math.max(0.1, g[0].start - 0.04);
  const sig = G[gi + 1];
  const fin = sig ? Math.max(ini + 0.3, sig[0].start - 0.04) : D - 0.02;
  const clave = g.find((w) => CLAVE.has(w.n)) || [...g].sort((a, b) => b.text.length - a.text.length).find((w) => w.text.length >= 5);
  const palabras = g
    .map((w, wi) => {
      const t = w.text.replace(/[.,:]$/, "").toUpperCase();
      const k = w === clave;
      return `<span id="s${gi}w${wi}" class="pal${k ? " clave" : ""}">${esc(t)}</span>`;
    })
    .join(" ");
  const chars = g.reduce((a, w) => a + w.text.length + 1, 0);
  const fs_ = Math.max(58, Math.min(84, Math.floor(940 / (chars * 0.66))));
  subs += `<div id="s${gi}" class="grupo clip" data-start="${ini.toFixed(3)}" data-duration="${(fin - ini).toFixed(3)}" data-track-index="0" style="font-size:${fs_}px"><div id="s${gi}i" class="caja">${palabras}</div></div>\n`;
  g.forEach((w, wi) => {
    const t = Math.max(ini, w.start) - ini; // tiempos locales del grupo… pero la línea de tiempo es de la composición
    void t;
    subsJs += `tl.fromTo("#s${gi}w${wi}", { opacity: 0, y: 18, scale: 0.86 }, { opacity: 1, y: 0, scale: 1, duration: 0.14, ease: "back.out(2)" }, ${Math.max(ini, w.start - 0.02).toFixed(3)});\n`;
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

// ───────────── raíces ─────────────
const raiz = () => `<!doctype html>
<html lang="es" data-composition-variables='[{"id":"subtitulos","type":"boolean","label":"Subtítulos","default":true}]'>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>IronFuel Nutrition</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: #07090D; }
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

// ───────────── sonido: dónde cae cada efecto ─────────────
// [segundo, archivo, ganancia dB, qué lo provoca]
const SFX = [
  [0.0, "whoosh-1", -9, "golpe de cámara inicial"],
  [T.veinte, "pop-1", -10, "20 años"],
  [T.levantando, "disco-metal", -14, "la barra"],
  [T.rodillas, "crujido", -9, "crujen las rodillas"],
  [T.quejaban, "crujido", -11, "se quejan"],
  [T.medico, "pop-3", -11, "médico"],
  [T.verde, "pop-2", -10, "luz verde"],
  [T.asi1, "whoosh-3", -11, "va a la tienda"],
  [T.tienda + 0.1, "campanilla", -14, "entra"],
  [T.dos1, "golpe-madera", -6, "cae IFLEX PRIME"],
  [T.botes1, "golpe-madera", -7, "cae la caja de VitoBest"],
  [T.uno1 - 0.2, "whoosh-1", -12, "viaje a IFLEX"],
  [T.uno1, "pop-3", -10, "1"],
  [T.colageno1 - 0.05, "pop-1", -9, "tarjeta de IFLEX"],
  [T.membrana, "pop-2", -14, "membrana de huevo"],
  [T.glucosamina1, "pop-3", -14, "glucosamina"],
  [T.condroitina1, "pop-2", -14, "condroitina"],
  [T.hialuronico, "pop-3", -14, "ácido hialurónico"],
  [T.cacito, "pop-1", -12, "1 cacito"],
  [T.agua, "pop-3", -12, "en agua"],
  [T.vitamina, "pop-2", -11, "vitamina C"],
  [T.colageno2, "pop-3", -12, "forma colágeno"],
  [T.cartilagos, "pop-2", -11, "cartílagos"],
  [T.dos2 - 0.1, "whoosh-2", -12, "viaje a VitoBest"],
  [T.dos2 + 0.02, "pop-3", -10, "2"],
  [T.glucosamina2 - 0.05, "pop-1", -9, "tarjeta de VitoBest"],
  [T.condroitina2, "pop-2", -14, "condroitina"],
  [T.msm, "pop-3", -13, "MSM"],
  [T.capsulas1, "pop-1", -12, "en cápsulas"],
  [T.batidos, "pop-2", -12, "sin batidos"],
  [T.siempre, "whoosh-3", -12, "la cámara se aleja"],
  [T.no2, "pop-1", -10, "no hace milagros"],
  [T.calienta, "pop-3", -11, "calienta bien"],
  [T.tecnica1, "pop-2", -11, "cuida la técnica"],
  [T.pago - 0.1, "whoosh-1", -13, "vuelta al mostrador"],
  [T.pago, "datafono", -10, "pago aceptado"],
  [T.volvio + 0.25, "campanilla", -14, "sale por la puerta"],
  [T.semana1 - 0.05, "golpe-madera", -13, "deja la bolsa"],
  [T.uno2, "click-2", -11, "marcador: 1"],
  [T.diez, "pop-3", -12, "10 min"],
  [T.cuatro, "click-2", -11, "marcador: 4"],
  [T.tecnica2, "pop-2", -12, "técnica"],
  [T.ocho, "click-2", -11, "marcador: 8"],
  [T.clases, "golpe-climax", -8, "el profe es él (clímax)", 2.2],
  [T.polvo, "pop-3", -11, "polvo"],
  [T.capsulas2, "pop-2", -11, "cápsulas"],
  [T.pregunta, "pop-1", -11, "pregunta"],
  [T.encajaFin - 0.1, "whoosh-2", -12, "vuelta a la tienda"],
  [T.siguenos - 0.03, "pop-1", -9, "tarjeta final"],
  [T.siguenos + 0.15, "pop-3", -12, "parte 6"],
  [T.perderte, "click-1", -8, "seguir"],
  [T.perderte + 0.05, "pop-2", -11, "siguiendo"],
  [T.siete, "pop-3", -11, "parte 7"],
];
const cues = {
  duracion: D,
  voz: "assets/audio/voz.wav",
  musica: { archivo: "assets/music/basketball-training.mp3", desde: 20.0, db: -27 },
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
