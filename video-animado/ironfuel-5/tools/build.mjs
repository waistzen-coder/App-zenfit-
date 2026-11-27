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
  companero: P("compañero"), vegano1: P("vegano", 1), gimnasio1: P("gimnasio", 1), dijeron: P("dijeron"), coger: P("coger"),
  musculo1: P("músculo", 1), musculo1Fin: E("músculo", 1),
  asi2: P("Así", 2), tienda: P("tienda"), preguntar: P("preguntar"), preguntarFin: E("preguntar"),
  dependiente: P("dependiente"), saco: P("sacó"), dos1: P("dos", 1), botes1: P("botes", 1),
  uno1: P("Uno", 1), proteina1: P("proteína", 1), vegetal: P("vegetal"), guisante: P("guisante"), arroz: P("arroz"),
  cacito: P("cacito"), despues: P("después"),
  proteina2: P("proteína", 2), ganar: P("ganar"), perderlo: P("perderlo"), venga1: P("venga", 1), venga2Fin: E("venga", 2),
  dos2: P("Dos", 2), vitamina: P("vitamina"), b: P("B"), vegano2: P("vegano", 2), faltar: P("faltar"),
  ayuda2: P("Ayuda", 2), cansancio: P("cansancio"), globulos: P("glóbulos"), normalidadFin: E("normalidad"),
  siempre: P("siempre"), sin: P("sin"), entrenar2: P("entrenar", 2), nada: P("nada"),
  pago: P("Pagó"), fue2: P("fue", 2), gimnasio2: P("gimnasio", 2),
  semana1: P("Semana", 1), uno2: P("uno", 2), raro: P("raro"),
  semana2: P("Semana", 2), cuatro1: P("cuatro", 1), preguntaban: P("preguntaban"), comia: P("comía"),
  semana3: P("Semana", 3), ocho: P("ocho"), pedian: P("pedían"), receta: P("receta"), lentejas: P("lentejas"),
  asi3: P("así", 3), serie: P("serie"), cuatro2: P("cuatro", 2), clientes: P("clientes"), diez: P("diez"), botes2: P("botes", 2), consejo: P("consejo"),
  entrena: P("Entrena"), come: P("come"), descansa: P("descansa"),
  demas: P("demás"), donde: P("dónde", 2), encontrarlo: P("encontrarlo"), encontrarloFin: E("encontrarlo"),
  siguenos: P("Síguenos"), para: P("para"), perderte: P("perderte"), venga3: P("venga", 3),
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

// ───────────── tarjetas (crecen en su sitio a medida que se nombra cada cosa) ─────────────
function tarjetaA() {
  // proteína vegetal: guisante + arroz · un cacito tras entrenar · ganar músculo y no perderlo
  let s = `<g id="card-a" opacity="0"><rect id="card-a-fondo" x="420" y="780" width="480" height="165" rx="30" fill="#fff" filter="url(#sombra)"/>`;
  s += `<g id="a-hoja" opacity="0">${icono("leaf", 466, 836, 60, C.verdeTxt)}${txt(506, 852, "VEGETAL", 40, C.tinta, 900, "start")}</g>`;
  s += `<g id="a-guisante" opacity="0"><rect x="446" y="880" width="220" height="52" rx="26" fill="#E3F5EA"/>${txt(556, 917, "GUISANTE", 30, C.verdeTxt, 900)}</g>`;
  s += `<g id="a-arroz" opacity="0"><rect x="682" y="880" width="192" height="52" rx="26" fill="#E3F5EA"/>${txt(778, 917, "+ ARROZ", 30, C.verdeTxt, 900)}</g>`;
  s += `<g id="a-cacito" opacity="0">${icono("drop", 466, 966, 50, C.azul)}${txt(506, 982, "1 CACITO", 40, C.tinta, 900, "start")}</g>`;
  s += `<g id="a-despues" opacity="0">${icono("barbell", 466, 1030, 50, C.azul)}${txt(506, 1046, "TRAS ENTRENAR", 38, C.tinta, 900, "start")}</g>`;
  s += `<g id="a-musculo" opacity="0">${txt(450, 1108, "MÚSCULO", 36, C.tinta, 900, "start")}<rect x="450" y="1122" width="300" height="32" rx="16" fill="#E9EBEF"/><rect id="a-barra" x="450" y="1122" width="0" height="32" rx="16" fill="${C.verde}"/></g>`;
  s += `<g id="a-flecha" opacity="0">${icono("arrow-fat-up", 820, 1124, 70, C.verde)}</g>`;
  s += `<g id="a-escudo" opacity="0">${icono("shield-check", 820, 1124, 74, C.verdeTxt)}</g>`;
  s += `<g id="a-venga" opacity="0">${txt(660, 1208, "VENGA DE DONDE VENGA", 32, C.verdeTxt, 900)}</g>`;
  return s + `</g>`;
}
function tarjetaB() {
  // vitamina B12: imprescindible si eres vegano · cansancio y glóbulos rojos
  let s = `<g id="card-b" opacity="0"><rect id="card-b-fondo" x="1080" y="780" width="480" height="105" rx="30" fill="#fff" filter="url(#sombra)"/>`;
  s += `<g id="b-pastilla" opacity="0">${icono("pill", 1126, 836, 62, C.azul)}${txt(1172, 856, "VITAMINA B12", 42, C.tinta, 900, "start")}</g>`;
  s += `<g id="b-vegano" opacity="0">${icono("leaf", 1126, 922, 52, C.verdeTxt)}${txt(1172, 938, "SI ERES VEGANO", 38, C.tinta, 900, "start")}</g>`;
  s += `<g id="b-falta" opacity="0"><rect x="1110" y="964" width="420" height="58" rx="29" fill="${C.tinta}"/>${txt(1320, 1005, "IMPRESCINDIBLE", 34, "#fff", 900)}</g>`;
  s += `<g id="b-pila" opacity="0"><rect x="1112" y="1046" width="176" height="80" rx="16" fill="none" stroke="${C.tinta}" stroke-width="8"/><rect x="1288" y="1069" width="16" height="34" rx="5" fill="${C.tinta}"/><rect id="b-pila-nivel" x="1124" y="1058" width="0" height="56" rx="8" fill="${C.rojo}"/><g id="b-rayo" opacity="0">${icono("lightning", 1200, 1086, 52, "#fff")}</g>${txt(1200, 1170, "CANSANCIO", 32, C.tinta, 900)}</g>`;
  s += `<g id="b-globulos" opacity="0">${icono("drop", 1440, 1080, 84, C.rojo)}${txt(1440, 1148, "GLÓBULOS", 32, C.tinta, 900)}${txt(1440, 1184, "ROJOS", 32, C.tinta, 900)}</g>`;
  return s + `</g>`;
}
// «y lo de siempre: sin entrenar, nada»
function regla() {
  const slot = (x, dentro, label, id) => `<g id="${id}" opacity="0">${dentro}${txt(x, 400, label, 84, C.tinta, 900)}</g>`;
  const botes = `<g transform="translate(1820 260)"><rect x="-92" y="-70" width="80" height="110" rx="14" fill="#0E1013"/><rect x="-98" y="-86" width="92" height="26" rx="8" fill="${C.azul}"/><rect x="-92" y="-40" width="80" height="40" fill="#2E9E57"/><rect x="12" y="-60" width="80" height="100" rx="14" fill="#F4F4F4" stroke="#C9CDD3" stroke-width="4"/><rect x="6" y="-76" width="92" height="26" rx="8" fill="${C.azul}"/><rect x="12" y="-30" width="80" height="36" fill="#E0465B"/></g>`;
  let s = `<g id="regla" opacity="0"><rect id="regla-fondo" x="640" y="140" width="1640" height="300" rx="44" fill="#fff" filter="url(#sombra)"/>`;
  s += slot(1100, icono("barbell", 1100, 255, 160, C.azul), "ENTRENAR", "r-entrenar");
  s += slot(1820, botes, "BOTES", "r-botes");
  s += `<g id="r-mas" opacity="0">${txt(1460, 330, "+", 150, C.verdeTxt, 900)}</g>`;
  return s + `</g>`;
}
// «entrena, come bien y descansa»: una lista que se va marcando
function consejo() {
  const fila = (y, icon, color, label, id) => `<g id="${id}" opacity="0">${icono(icon, 1110, y, 96, color)}${txt(1190, y + 30, label, 84, C.tinta, 900, "start")}</g>`;
  // sin fondo propio: es la tarjeta de «entrenar + botes», que se transforma en esta
  let s = `<g id="consejo" opacity="0">`;
  s += fila(190, "barbell", C.azul, "ENTRENA", "c-entrena");
  s += fila(310, "bowl-food", "#D97706", "COME BIEN", "c-come");
  s += fila(430, "bed", "#6D5BD0", "DESCANSA", "c-descansa");
  return s + `</g>`;
}
// los diez botes de la serie, en miniatura (cada uno se coloca sobre la cabeza de su cliente)
function diezBotes() {
  // 1.ª creatina y proteína · 2.ª omega-3 y multivitamínico · 3.ª colágeno y vitamina D · 4.ª isotónica y magnesio · 5.ª proteína vegetal y B12
  const b = [["#F4F4F4", "#111317"], ["#151515", "#F4F4F4"], ["#0E3A6B", "#F4F4F4"], ["#F4F4F4", "#111317"], ["#F4F4F4", "#0E1013"], ["#0E1013", "#F2C230"], ["#F4F4F4", "#5AB0FF"], ["#0E1013", "#8E5BD9"], ["#0E1013", "#2E9E57"], ["#F4F4F4", "#E0465B"]];
  let s = "";
  b.forEach(([cuerpo, etiqueta], i) => {
    s += `<g id="mini-${i}" opacity="0"><rect x="-38" y="-100" width="76" height="100" rx="12" fill="${cuerpo}" stroke="#2B2F36" stroke-width="3"/><rect x="-42" y="-112" width="84" height="20" rx="7" fill="${C.azul}"/><rect x="-38" y="-70" width="76" height="40" fill="${etiqueta}"/></g>`;
  });
  return `<g id="diez-botes">${s}</g>`;
}
// bocadillos del gimnasio: «¿sin carne?», «?», «¿qué comes?», «¡receta!»
function bocGym() {
  const b = (id, w, contenido) => `<g id="${id}" opacity="0"><rect x="${-w / 2}" y="-60" width="${w}" height="120" rx="60" fill="#fff" filter="url(#sombra)"/>${contenido}</g>`;
  return (
    b("g-carne", 420, `${txt(0, 19, "¿SIN CARNE?", 52, C.tinta, 900)}`) +
    b("g-raro-1", 120, `${icono("question", 0, 0, 80, C.azul)}`) +
    b("g-raro-2", 120, `${icono("question", 0, 0, 80, C.azul)}`) +
    b("g-come", 330, `${icono("bowl-food", -92, 0, 70, "#D97706")}${txt(40, 19, "¿QUÉ?", 52, C.tinta, 900)}`) +
    b("g-receta", 400, `${icono("heart", -132, 0, 60, C.rojo)}${txt(40, 19, "¡RECETA!", 52, C.tinta, 900)}`)
  );
}
// «vegano»
function hoja5() {
  return `<g id="hoja" opacity="0"><rect x="-190" y="-62" width="380" height="124" rx="62" fill="#fff" filter="url(#sombra)"/>${icono("leaf", -112, 0, 80, C.verde)}${txt(40, 19, "VEGANO", 52, C.verdeTxt, 900)}</g>`;
}
// sus lentejas, en un cuenco
function lentejas() {
  return `<g id="lentejas" opacity="0"><circle r="80" fill="#fff" filter="url(#sombra)"/>${icono("bowl-steam", 0, 0, 112, "#9A5A26")}</g>`;
}
// el logo de la puerta, que crece en su sitio
function logoGrande() {
  return `<g id="logo-grande" opacity="0"><circle r="108" fill="none" stroke="${C.azulClaro}" stroke-width="10" filter="url(#neon)"/>${logo(0, 0, 100)}</g>`;
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
  <g id="chip-p2" opacity="0"><rect x="600" y="305" width="460" height="130" rx="65" fill="${C.tinta}"/>${txt(830, 400, "5 DE 5", 88, "#fff", 900)}</g>
  <g id="chip-p3" opacity="0"><rect x="1090" y="305" width="520" height="130" rx="65" fill="#E5E7EB"/>${icono("question", 1150, 370, 64, "#4B515B")}${txt(1395, 396, "¿PARTE 6?", 70, "#4B515B", 900)}</g>
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
  ${bote("bote-veg", 180, 200, "#0E1013", C.azul, "#2E9E57", "PROTEÍNA", "#fff", "sub-veg", `${icono("leaf", 0, -186, 50, "#2E9E57")}`, "VEGETAL")}
  ${bote("bote-b12", 190, 220, "#F4F4F4", C.azul, "#E0465B", "B12", "#fff", "sub-b12")}
  <g id="badge-1" opacity="0"><circle cx="630" cy="1262" r="36" fill="${C.azul}" stroke="#fff" stroke-width="6"/>${txt(630, 1283, "1", 56, "#fff", 900)}</g>
  <g id="badge-2" opacity="0"><circle cx="1182" cy="1242" r="36" fill="${C.azul}" stroke="#fff" stroke-width="6"/>${txt(1182, 1263, "2", 56, "#fff", 900)}</g>
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
  ${bocadillo()}
  ${tarjetaA()}
  ${tarjetaB()}
  ${regla()}
  ${diezBotes()}
  ${lentejas()}
  ${bocGym()}
  ${hoja5()}
  ${consejo()}
  ${logoGrande()}
  ${seguir()}
</g></svg>`;

const motor = rd("tools/motor.js");
const IF = { T, D, PJ };
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
  "companero vegano gimnasio musculo tienda preguntar dependiente botes proteina vegetal guisante arroz cacito entrenar ganar perderlo b12 faltar cansancio globulos siempre nada uno cuatro ocho raro comia receta lentejas serie clientes diez consejo entrena come descansa encontrarlo siguenos"
    .split(" "),
);
function grupos() {
  const ws = [];
  V.palabras.forEach((w, i) => {
    const sig = V.palabras[i + 1];
    if (w.n === "b" && sig && sig.n === "doce") ws.push({ ...w, text: "B12.", n: "b12", end: sig.end });
    else if (w.n === "doce" && i > 0 && V.palabras[i - 1].n === "b") return;
    else ws.push(w);
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
  [T.vegano1, "pop-1", -10, "vegano"],
  [T.gimnasio1, "whoosh-2", -11, "en el gimnasio"],
  [T.musculo1, "boing", -11, "¿sin carne?"],
  [T.asi2, "whoosh-3", -11, "va a la tienda"],
  [T.semana1 + 0.05, "golpe-madera", -12, "deja la bolsa"],
  [T.pedian, "disco-metal", -12, "deja la barra en el soporte"],
  [T.tienda + 0.1, "campanilla", -14, "entra"],
  [T.preguntar, "teclado-1", -16, "escribe la pregunta", T.preguntarFin - T.preguntar + 0.4],
  [T.dos1, "golpe-madera", -6, "cae la proteína vegetal"],
  [T.botes1, "golpe-madera", -6, "cae la B12"],
  [T.uno1 - 0.2, "whoosh-1", -12, "viaje a la proteína"],
  [T.uno1, "pop-3", -10, "1"],
  [T.vegetal - 0.05, "pop-1", -9, "tarjeta de la proteína"],
  [T.guisante, "pop-2", -13, "guisante"],
  [T.arroz, "pop-3", -13, "arroz"],
  [T.cacito, "pop-3", -12, "1 cacito"],
  [T.despues, "pop-3", -12, "tras entrenar"],
  [T.ganar, "pop-2", -11, "músculo"],
  [T.perderlo, "pop-3", -11, "escudo"],
  [T.dos2 - 0.1, "whoosh-2", -12, "viaje a la B12"],
  [T.dos2 + 0.02, "pop-3", -10, "2"],
  [T.vitamina - 0.05, "pop-1", -9, "tarjeta de la B12"],
  [T.vegano2, "pop-3", -12, "si eres vegano"],
  [T.faltar, "pop-2", -11, "imprescindible"],
  [T.cansancio, "pop-3", -11, "cansancio"],
  [T.globulos, "pop-2", -11, "glóbulos rojos"],
  [T.siempre, "whoosh-3", -12, "la cámara se aleja"],
  [T.entrenar2, "pop-1", -10, "entrenar"],
  [T.nada, "pop-3", -11, "botes"],
  [T.pago - 0.1, "whoosh-1", -13, "vuelta al mostrador"],
  [T.pago, "datafono", -10, "pago aceptado"],
  [T.fue2 + 0.3, "campanilla", -14, "sale por la puerta"],
  [T.uno2, "click-2", -11, "marcador: 1"],
  [T.raro, "pop-3", -12, "le miran raro"],
  [T.cuatro1, "click-2", -11, "marcador: 4"],
  [T.preguntaban, "pop-2", -12, "¿qué comes?"],
  [T.ocho, "click-2", -11, "marcador: 8"],
  [T.pedian, "whoosh-1", -15, "se acercan todos"],
  [T.receta, "pop-1", -10, "¡receta!"],
  [T.lentejas, "golpe-climax", -7, "le piden la receta (clímax)", 2.4],
  [T.serie - 0.2, "whoosh-2", -11, "vuelta a la tienda"],
  [T.cuatro2, "pop-1", -12, "cuatro clientes"],
  [T.diez, "pop-3", -12, "diez botes"],
  [T.diez + 0.25, "pop-2", -13, "diez botes"],
  [T.consejo, "whoosh-3", -12, "un mismo consejo"],
  [T.entrena, "pop-1", -10, "entrena"],
  [T.come, "pop-3", -11, "come bien"],
  [T.descansa, "pop-2", -11, "descansa"],
  [T.demas, "whoosh-2", -12, "a la puerta"],
  [T.encontrarlo, "punch", -9, "el logo de la puerta"],
  [T.siguenos - 0.03, "pop-1", -9, "tarjeta final"],
  [T.siguenos + 0.15, "pop-3", -12, "5 de 5"],
  [T.perderte, "click-1", -8, "seguir"],
  [T.perderte + 0.05, "pop-2", -11, "siguiendo"],
  [T.venga3, "pop-3", -11, "¿parte 6?"],
];
const cues = {
  duracion: D,
  voz: "assets/audio/voz.wav",
  musica: { archivo: "assets/music/basketball-training.mp3", desde: 12.0, db: -27 },
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
