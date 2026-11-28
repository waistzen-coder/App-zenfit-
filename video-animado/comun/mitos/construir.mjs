// Generador común de la serie «Mitos del gimnasio» de IronFuel Nutrition.
// Cada episodio lo llama desde su tools/build.mjs con sus datos (tools/episodio.mjs):
//   node tools/build.mjs
// Escribe index.html, compositions/mundo.html, compositions/subtitulos.html y tools/cues.json.
// El mundo (calle, tienda, gimnasio y personajes) es el de las partes 1 a 9; lo que pasa sale de los datos.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export async function construir(RAIZ, EP) {
  const { cargar } = await import(pathToFileURL(path.join(RAIZ, "tools/tiempos.mjs")).href);
  const rd = (p) => fs.readFileSync(path.join(RAIZ, p), "utf8");
  const rdC = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
  const wr = (p, s) => {
    fs.mkdirSync(path.dirname(path.join(RAIZ, p)), { recursive: true });
    fs.writeFileSync(path.join(RAIZ, p), s);
  };
  const V = cargar();
  const { P, E } = V;
  const durVoz = +spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(RAIZ, "assets/audio/voz.wav")], { encoding: "utf8" }).stdout.trim();
  const FPS = 30;
  const D = Math.round(durVoz * FPS) / FPS;

  // ───────────── momentos clave: cuándo EMPIEZA cada palabra (o acaba, con "fin") ─────────────
  const T = {};
  for (const [k, [w, n = 1, fin]] of Object.entries(EP.palabras)) T[k] = fin ? E(w, n) : P(w, n);
  for (const [k, v] of Object.entries(T)) if (!Number.isFinite(v)) throw new Error("tiempo raro: " + k);
  const tk = (k) => (k == null ? null : typeof k === "number" ? k : Array.isArray(k) ? (typeof k[0] === "number" ? k[0] : T[k[0]]) + (k[1] || 0) : T[k]);
  // comprueba que todo lo que usa el episodio existe en T
  const usadas = JSON.stringify([EP.cam, EP.actores, EP.objetos, EP.tarjeta, EP.producto, EP.veredicto || null, EP.cta, EP.sfx, EP.sacudidas]);
  for (const m of usadas.matchAll(/\["([a-zA-Z0-9]+)"(?=[,\]])/g)) if (!(m[1] in T) && !/^[A-Z]/.test(m[1]) && !["dep", "rep"].includes(m[1]) && EP.actores[m[1]] === undefined && !/^(reposo|brazos|flex|flexR|senala|dedo|explica|suplica|manos|cargar|arriba|choca|pagar|bolsa|baston|bastonArriba|telefono|batido|alto|miedo|cruzados|pecho|toalla|neutro|sonrisa|esfuerzo|wow|serio|ceja|pena|orgullo|dormido|cansado|s|io|io3|o|o3|i|i3|back|backS|expo|lin|step)$/.test(m[1])) console.log(`  ⚠ ¿«${m[1]}» es una palabra del bloque T?`);

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
    s += `<g transform="translate(330 0) skewX(-14)">${txt(320, 822, "IF", 280, C.azul, 900, "start", "data-layout-ignore")}${txt(306, 812, "IF", 280, "url(#acero)", 900, "start", "data-layout-ignore")}</g>`;
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

  // iconos de Lucide (de trazo, ISC)
  const iconoL = (n, x, y, size, color) => {
    const s = rd(`assets/icons/${n}.svg`).replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    const k = size / 24;
    return `<g transform="translate(${x - size / 2} ${y - size / 2}) scale(${k})" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${s}</g>`;
  };
  const pildora = (id, w, contenido, h = 120) => `<g id="${id}" opacity="0"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#fff" filter="url(#sombra)"/>${contenido}</g>`;

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
    s += `<g id="neon-gym-off">${icono("barbell", 3010, 705, 160, "#2E3A33")}${txt(3330, 775, "GYM", 200, "#2E3A33", 900, "middle", 'letter-spacing="12" data-layout-ignore')}</g>`;
    s += `<g id="neon-gym" opacity="0" filter="url(#neon)">${icono("barbell", 3010, 705, 160, "#3CFF8F")}${txt(3330, 775, "GYM", 200, "#3CFF8F", 900, "middle", 'letter-spacing="12"')}</g>`;
    s += txt(4050, 752, "ABIERTO 24 H", 70, "#C9D4DE", 900, "middle", 'letter-spacing="4"');
    return s;
  }


  // ───────────── personajes de la serie (el dependiente y los clientes de cada episodio) ─────────────
  const PJS = {
    dep: { piel: "#C68B5E", ropa: "#17191C", pantalon: "#2F4A6B", tibia: "pantalon", zapato: "#222", pelo: "#2A1C14", m0: 0.78, seed: 2.7, peinado: "dep" },
    flaco: { piel: "#F2C6A0", ropa: "#F7C948", pantalon: "#3A3F47", tibia: "piel", zapato: "#F5F5F5", raya: "#D6453D", pelo: "#5B3A24", m0: 0, seed: 1.3, peinado: "gorra" },
    laura: { piel: "#F1C7A5", ropa: "#E85D75", pantalon: "#2B2F3A", tibia: "pantalon", zapato: "#F5F5F5", raya: "#E85D75", pelo: "#6B3A1E", m0: 0.1, seed: 3.3, genero: "f", coleta: true, peinado: "coleta" },
    antonio: { piel: "#F0C9A8", ropa: "#2F7D5B", pantalon: "#6F7378", tibia: "pantalon", zapato: "#3A2A20", pelo: "#E8E8E8", m0: 0.2, seed: 7.3, peinado: "abuelo" },
    ruben: { piel: "#D9A27A", ropa: "#D64545", pantalon: "#202327", tibia: "piel", zapato: "#F2F2F2", pelo: "#2B1E16", m0: 0.45, seed: 8.8, sinMangas: true, peinado: "cinta", cinta: "#F7C948" },
    marta: { piel: "#8D5A3B", ropa: "#1FA39A", pantalon: "#1F2430", tibia: "pantalon", zapato: "#EEE", raya: "#1FA39A", pelo: "#1C1412", m0: 0.1, seed: 5.9, genero: "f", coleta: true, peinado: "coleta" },
    comp: { piel: "#E8B98F", ropa: "#3D7BD9", pantalon: "#C9B79C", tibia: "pantalon", zapato: "#333", pelo: "#4A3020", m0: 0.25, seed: 4.1, mangaLarga: true, peinado: "gafas" },
    vec: { piel: "#8D5A3B", ropa: "#8E5BD9", pantalon: "#8E5BD9", tibia: "pantalon", zapato: "#EEE", pelo: "#1C1412", m0: 0.15, seed: 5.9, mangaLarga: true, genero: "f", coleta: true, peinado: "coleta" },
    gym: { piel: "#D9A27A", ropa: "#8C939C", pantalon: "#202327", tibia: "piel", zapato: "#E74C3C", pelo: "#2B1E16", m0: 0.5, seed: 8.8, sinMangas: true, peinado: "cinta", cinta: "#34C759" },
  };
  const PJ = {};
  for (const id of Object.keys(EP.actores)) PJ[id] = PJS[EP.actores[id].base || id];
  for (const o of EP.objetos) if (o.tipo === "nube") PJ[o.mini] = PJS[EP.actores[o.quien].base || o.quien];
  for (const [id, p] of Object.entries(PJ)) if (!p) throw new Error("personaje sin dibujo: " + id);
  function cabezaExtras(id, p) {
    const fx = 10;
    let atras = "",
      delante = "";
    if (p.peinado === "gorra") {
      delante += `<path d="M-64 -14 Q-64 -78 0 -80 Q60 -78 64 -18 Z" fill="#D6453D"/><path d="M-60 -24 Q-110 -26 -118 -6 Q-90 -2 -58 -8 Z" fill="#B53A33"/><circle cx="0" cy="-80" r="7" fill="#B53A33"/>`;
    } else if (p.peinado === "dep") {
      delante += `<path d="M-58 0 Q-60 72 0 80 Q60 72 58 0 Q44 46 0 50 Q-44 46 -58 0 Z" fill="${p.pelo}"/><path d="M-14 22 Q${fx * 0.7} 12 ${fx * 0.7 + 30} 22 Q${fx * 0.7} 28 -14 22 Z" fill="${p.pelo}"/><ellipse cx="-14" cy="-44" rx="26" ry="12" fill="#fff" opacity="0.22"/>`;
    } else if (p.peinado === "gafas") {
      delante += `<path d="M-66 -6 Q-72 -84 6 -86 Q74 -84 66 -10 Q50 -50 20 -52 Q30 -40 4 -44 Q-10 -62 -40 -46 Q-56 -40 -66 -6 Z" fill="${p.pelo}"/>`;
      delante += `<circle cx="${fx - 23}" cy="-8" r="21" fill="none" stroke="#141414" stroke-width="6"/><circle cx="${fx + 23}" cy="-8" r="21" fill="none" stroke="#141414" stroke-width="6"/><path d="M${fx - 2} -10 h4" stroke="#141414" stroke-width="6"/>`;
    } else if (p.peinado === "coleta") {
      atras += `<g id="${id}-pelo"><path d="M-40 -40 Q-120 -10 -96 70 Q-70 30 -50 -10 Z" fill="${p.pelo}"/></g>`;
      delante += `<path d="M-66 -4 Q-68 -82 4 -84 Q70 -82 66 -6 Q40 -46 -10 -48 Q-46 -46 -66 -4 Z" fill="${p.pelo}"/><circle cx="-34" cy="-70" r="22" fill="${p.pelo}"/>`;
      delante += `<circle cx="${fx + 56}" cy="22" r="7" fill="#FFD24A"/>`;
    } else if (p.peinado === "abuelo") {
      delante += `<path d="M-62 -10 Q-66 -40 -40 -52 M62 -10 Q66 -40 40 -52" stroke="${p.pelo}" stroke-width="16" stroke-linecap="round" fill="none"/><ellipse cx="0" cy="-58" rx="74" ry="26" fill="#2B2B33"/><circle cx="0" cy="-84" r="9" fill="#2B2B33"/>`;
      delante += `<path d="M${fx * 0.7 - 34} 22 Q${fx * 0.7} 6 ${fx * 0.7 + 34} 22 Q${fx * 0.7} 32 ${fx * 0.7 - 34} 22 Z" fill="${p.pelo}"/>`;
    } else if (p.peinado === "cinta") {
      delante += `<path d="M-64 -16 Q-62 -80 2 -82 Q66 -80 64 -18 Q34 -50 -2 -52 Q-36 -50 -64 -16 Z" fill="${p.pelo}"/><rect x="-66" y="-40" width="132" height="18" rx="9" fill="${p.cinta || "#34C759"}"/>`;
    }
    return { atras, delante };
  }
  function oscurece(hex, k) {
    const c = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k));
    return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
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


  // ───────────── piezas de la serie ─────────────
  const E_ = EP.objetos.map((o, i) => ({ ...o, i }));
  const ancho = (s, fs) => s.length * fs * 0.62;
  function bocadilloSVG(o) {
    const fs = o.size || 56;
    const W = Math.max(...o.lineas.map((l) => ancho(l, fs))) + 110,
      Hh = o.lineas.length * (fs + 12) + 56;
    const top = -Hh - 40;
    const lineas = o.lineas.map((l, k) => txt(0, top + 36 + fs * 0.82 + k * (fs + 12), l, fs, k === o.lineas.length - 1 && o.ultimaAzul ? C.azulTxt : C.tinta, 900)).join("");
    const tacha = `<path id="o${o.i}-tacha" d="${o.lineas.map((l, k) => { const y = top + 36 + fs * 0.45 + k * (fs + 12); const w = ancho(l, fs) / 2 + 14; return `M${-w} ${y + 6} L${w} ${y - 6}`; }).join(" ")}" stroke="${C.rojo}" stroke-width="12" stroke-linecap="round" fill="none" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110"/>`;
    const etq = o.etiqueta ? `<g transform="translate(${-W / 2 + 140} ${top - 4})"><rect x="-120" y="-36" width="240" height="72" rx="36" fill="${C.rojo}"/>${txt(0, 15, o.etiqueta, 42, "#fff", 900)}</g>` : "";
    const sello = o.sello != null ? `<g transform="translate(${W * 0.14} ${top + Hh / 2 + 10})"><g id="o${o.i}-sello" opacity="0"><g transform="rotate(-12)"><rect x="-170" y="-72" width="340" height="144" rx="18" fill="#FFFFFF" fill-opacity="0.82" stroke="${C.rojo}" stroke-width="10"/>${txt(0, 36, "MITO", 104, C.rojo, 900, "middle", 'letter-spacing="6"')}</g></g></g>` : "";
    return `<g id="o${o.i}" opacity="0"><path d="M${-W / 2 + 34} ${top} H${W / 2 - 34} Q${W / 2} ${top} ${W / 2} ${top + 34} V${-74} Q${W / 2} ${-40} ${W / 2 - 34} ${-40} ${o.cola === "der" ? `H${W * 0.16} L${W * 0.2} 0 L${W * 0.0} ${-40}` : `H${-W * 0.05} L${-W * 0.22} 0 L${-W * 0.2} ${-40}`} H${-W / 2 + 34} Q${-W / 2} ${-40} ${-W / 2} ${-74} V${top + 34} Q${-W / 2} ${top} ${-W / 2 + 34} ${top} Z" fill="#fff" filter="url(#sombra)"/>${lineas}${tacha}${etq}${sello}</g>`;
  }
  function nubeSVG(o) {
    const bultos = [[-200, -40, 150], [-60, -150, 170], [120, -130, 160], [240, -10, 140], [90, 100, 150], [-120, 100, 140], [0, 0, 210]];
    const nube = `<g id="o${o.i}-nube"><g filter="url(#sombra)">${bultos.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join("")}</g><circle cx="-170" cy="300" r="38" fill="#fff"/><circle cx="-215" cy="372" r="24" fill="#fff"/></g>`;
    const fx = `<g id="o${o.i}-fx" opacity="0">${[[-150, -40, -30], [150, -50, 30], [-160, 80, -160], [160, 80, 160]].map(([x, y, r]) => `<path d="M${x} ${y} l${f2(Math.cos((r * Math.PI) / 180) * -40)} ${f2(Math.sin((r * Math.PI) / 180) * -40)}" stroke="${C.tinta}" stroke-width="10" stroke-linecap="round"/>`).join("")}</g>`;
    const panza = o.gag === "globo" ? `<ellipse id="o${o.i}-panza" cx="0" cy="0" rx="1" ry="1" fill="${PJ[o.mini].ropa}" stroke="${oscurece(PJ[o.mini].ropa, 0.78)}" stroke-width="6"/><ellipse id="o${o.i}-brillo" cx="0" cy="0" rx="1" ry="1" fill="#fff" opacity="0.35"/>` : "";
    return `<g id="o${o.i}" opacity="0">${nube}${personaje(o.mini)}${panza}${fx}</g>`;
  }
  const f2 = (v) => Math.round(v * 100) / 100;
  function pildoraSVG(o) {
    const fs = o.size || 50;
    const w = o.w || ancho(o.texto, fs) + (o.icono ? 150 : 90);
    const tx = o.icono ? 40 : 0;
    return `<g id="o${o.i}" opacity="0"><rect x="${-w / 2}" y="-60" width="${w}" height="120" rx="60" fill="${o.fondo || "#fff"}" filter="url(#sombra)"/>${o.icono ? icono(o.icono, -w / 2 + 70, 0, 70, o.color || C.azul) : ""}${txt(tx, fs * 0.36, o.texto, fs, o.tinta || C.tinta, 900)}</g>`;
  }
  function relojSVG(o) {
    return `<g id="o${o.i}" opacity="0"><rect x="-190" y="-62" width="380" height="124" rx="62" fill="${C.tinta}" filter="url(#sombra)"/>${icono("timer", -118, 0, 76, "#F2C230")}<text id="o${o.i}-txt" x="44" y="26" font-family="Inter" font-weight="900" font-size="72" fill="#fff" text-anchor="middle">30:00</text></g>`;
  }
  const cacito = (color) => `<path d="M-46 -10 Q-46 40 0 40 Q46 40 46 -10 Z" fill="#F4F5F7" stroke="#C9CDD3" stroke-width="5"/><ellipse cx="0" cy="-12" rx="46" ry="14" fill="${color}"/><rect x="40" y="-22" width="64" height="16" rx="8" fill="#F4F5F7" stroke="#C9CDD3" stroke-width="4"/>`;
  function objetoSVG(o) {
    const items = (arr) => arr.map((s, k) => `<g id="o${o.i}-k${k}" opacity="0">${s}</g>`).join("");
    switch (o.tipo) {
      case "bocadillo": return bocadilloSVG(o);
      case "nube": return nubeSVG(o);
      case "pildora": return pildoraSVG(o);
      case "reloj": return relojSVG(o);
      case "noche": return `<g id="o${o.i}" opacity="0">${icono("moon", 3900, 950, 170, "#F5F0C8")}<g transform="translate(3450 995)"><rect x="-285" y="-125" width="570" height="250" rx="24" fill="#08090B" stroke="#2C3138" stroke-width="8"/>${icono("clock", -175, 0, 110, "#8FD3FF")}${txt(60, 42, o.hora || "3:00", 120, "#fff", 900)}</g></g>`;
      case "zzz": return `<g id="o${o.i}" opacity="0">${items(["Z", "Z", "Z"].map((z) => txt(0, 0, z, 70, "#fff", 900, "middle", `stroke="${C.tinta}" stroke-width="5" paint-order="stroke"`)))}</g>`;
      case "gotas": return `<g id="o${o.i}" opacity="0">${items([icono("drop", 0, 0, 44, "#8FD3FF"), icono("drop", 0, 0, 34, "#8FD3FF")])}</g>`;
      case "rayos": return `<g id="o${o.i}" opacity="0">${items([[-160, -60], [160, -80], [-180, 90], [170, 70]].map(([x, y]) => icono("lightning", x, y, 80, "#FFD23F")))}</g>`;
      case "brillos": return `<g id="o${o.i}" opacity="0">${items([0, 1, 2].map(() => icono("sparkle", 0, 0, 80, "#FFE27A")))}</g>`;
      case "cacitos": return `<g id="o${o.i}" opacity="0">${items(Array.from({ length: o.n || 3 }, () => cacito(o.color || "#E4572E")))}</g>`;
      case "marcador": return `<g id="o${o.i}"/>`;
      case "barra": {
        const disco = (k, r) => `<g id="o${o.i}-d${k}" opacity="0"><rect x="-17" y="${-r}" width="34" height="${2 * r}" rx="8" fill="#111317"/><rect x="-9" y="${-r + 12}" width="18" height="${2 * r - 24}" rx="5" fill="#2E333A"/></g>`;
        return `<g id="o${o.i}" opacity="0"><path id="o${o.i}-bar" d="" stroke="#B9C0C8" stroke-width="16" stroke-linecap="round" fill="none"/>${[0, 1, 2, 3, 4, 5].map((k) => disco(k, k < 2 ? 92 : k < 4 ? 80 : 104)).join("")}</g>`;
      }
      case "cinta": {
        const x = o.x;
        let rayas = "";
        for (let k = -8; k < 14; k++) rayas += `<rect x="${x - 320 + k * 60}" y="1738" width="26" height="12" fill="#3A3F47"/>`;
        return `<g id="o${o.i}" opacity="0"><rect x="${x - 340}" y="1730" width="680" height="60" rx="20" fill="#24282E"/><clipPath id="clip-cinta${o.i}"><rect x="${x - 320}" y="1734" width="640" height="20"/></clipPath><rect x="${x - 320}" y="1734" width="640" height="20" fill="#14171B"/><g clip-path="url(#clip-cinta${o.i})"><g id="o${o.i}-cinta">${rayas}</g></g><rect x="${x + 250}" y="1330" width="22" height="420" rx="8" fill="#3A3F47"/><rect x="${x + 180}" y="1300" width="160" height="70" rx="14" fill="#24282E"/><rect x="${x + 196}" y="1314" width="128" height="40" rx="8" fill="#3CFF8F" opacity="0.65"/><rect x="${x + 60}" y="1400" width="220" height="16" rx="8" fill="#3A3F47"/></g>`;
      }
      case "pulgares": return `<g id="o${o.i}" opacity="0">${items(o.puntos.map(() => `<circle r="64" fill="#fff" filter="url(#sombra)"/>${icono("thumbs-up", 0, 0, 80, C.verde)}`))}</g>`;
      case "estelas": return `<g id="o${o.i}" opacity="0">${[0, 1, 2, 3].map((k) => `<rect x="${-40 - k * 30}" y="${k * 90}" width="${180 - k * 20}" height="12" rx="6" fill="#fff" opacity="${0.5 - k * 0.08}"/>`).join("")}</g>`;
      case "prop": {
        const que = {
          movil: `<rect x="-28" y="-54" width="56" height="104" rx="12" fill="#111"/><rect x="-22" y="-46" width="44" height="82" rx="6" fill="#3D7BD9"/><rect x="-16" y="-38" width="32" height="8" rx="4" fill="#fff" opacity="0.8"/><rect x="-16" y="-24" width="24" height="6" rx="3" fill="#fff" opacity="0.6"/>`,
          batido: `<rect x="-30" y="-120" width="60" height="120" rx="12" fill="${C.azul}"/><rect x="-34" y="-138" width="68" height="26" rx="8" fill="#111317"/><rect x="-6" y="-156" width="12" height="22" rx="4" fill="#111317"/>${txt(0, -48, "IF", 30, "#fff", 900, "middle", 'font-style="italic" data-layout-ignore')}`,
          bolsa: `<path d="M-30 0 Q-30 -40 0 -40 Q30 -40 30 0" stroke="#1A1C20" stroke-width="8" fill="none"/><rect x="-70" y="0" width="140" height="150" rx="10" fill="#121418"/><rect x="-70" y="0" width="140" height="14" fill="${C.azul}"/>${logo(0, 80, 54)}`,
          toalla: `<path d="M-70 -30 Q0 30 70 -30 L82 40 Q70 70 56 40 L50 0 Q0 40 -50 0 L-56 40 Q-70 70 -82 40 Z" fill="#F4F6F8" stroke="#C9CED6" stroke-width="5"/><path d="M-62 30 h20 M42 30 h20" stroke="${C.azul}" stroke-width="8"/>`,
        }[o.que];
        return `<g id="o${o.i}" opacity="0">${que}</g>`;
      }
      case "cocina": {
        const x0 = o.x;
        let azulejos = "";
        for (let y = 1188; y < 1500; y += 52) for (let x = x0 + 80; x < x0 + 1380; x += 52) azulejos += `<rect x="${x + 2}" y="${y + 2}" width="48" height="48" rx="4" fill="#3E4A5C"/>`;
        let tablas = "";
        for (let x = x0; x < x0 + 1800; x += 150) tablas += `<rect x="${x}" y="1804" width="4" height="900" fill="#4E3828"/>`;
        return `<g id="o${o.i}">
          <rect x="${x0}" y="-900" width="1800" height="2700" fill="#2B3442"/>
          <rect x="${x0 + 80}" y="1188" width="1300" height="312" fill="#364253"/>${azulejos}
          <g><rect x="${x0 + 760}" y="560" width="560" height="300" rx="10" fill="#3B4556"/><rect x="${x0 + 772}" y="572" width="262" height="276" rx="6" fill="#444F62"/><rect x="${x0 + 1046}" y="572" width="262" height="276" rx="6" fill="#444F62"/><rect x="${x0 + 1010}" y="810" width="10" height="30" rx="5" fill="#C9CED6"/><rect x="${x0 + 1060}" y="810" width="10" height="30" rx="5" fill="#C9CED6"/></g>
          <rect x="${x0 + 60}" y="1500" width="1340" height="30" rx="6" fill="#B07A52"/><rect x="${x0 + 60}" y="1526" width="1340" height="8" fill="#8A5B3A"/>
          <rect x="${x0 + 80}" y="1534" width="1300" height="270" fill="#262C36"/>
          ${[0, 1, 2, 3].map((k) => `<rect x="${x0 + 96 + k * 322}" y="1550" width="306" height="238" rx="8" fill="#2F3744"/><rect x="${x0 + 230 + k * 322}" y="1570" width="38" height="10" rx="5" fill="#C9CED6"/>`).join("")}
          <g><rect x="${x0 + 1440}" y="1000" width="330" height="804" rx="24" fill="#DDE2E8"/><rect x="${x0 + 1440}" y="1290" width="330" height="8" fill="#B9C0C8"/><rect x="${x0 + 1470}" y="1060" width="16" height="170" rx="8" fill="#9AA2AD"/><rect x="${x0 + 1470}" y="1340" width="16" height="220" rx="8" fill="#9AA2AD"/></g>
          <rect x="${x0}" y="1764" width="1800" height="940" fill="#5E4532"/><rect x="${x0}" y="1764" width="1800" height="40" fill="#7A5A3E"/>${tablas}
        </g>`;
      }
      case "calendario":
        return `<g id="o${o.i}"><g transform="translate(${o.x} ${o.y})"><rect x="-115" y="-140" width="230" height="290" rx="16" fill="#F4F6F8" filter="url(#sombra)"/><rect x="-115" y="-140" width="230" height="78" rx="16" fill="${C.rojo}"/><rect x="-115" y="-90" width="230" height="28" fill="${C.rojo}"/>${txt(0, -84, "DÍA", 50, "#fff", 900)}<circle cx="-60" cy="-140" r="10" fill="#555"/><circle cx="60" cy="-140" r="10" fill="#555"/><g id="o${o.i}-hoja"><text id="o${o.i}-num" x="0" y="100" text-anchor="middle" font-family="Inter" font-weight="900" font-size="130" fill="${C.tinta}">1</text></g></g></g>`;
      case "botevivo": {
        const cap = (L, w) => `M${-w / 2} 0 Q${-w / 2} ${L / 2} ${-w / 2} ${L} A${w / 2} ${w / 2} 0 0 0 ${w / 2} ${L} Q${w / 2} ${L / 2} ${w / 2} 0 A${w / 2} ${w / 2} 0 0 0 ${-w / 2} 0 Z`;
        const ojo = (l, x) => `<g transform="translate(${x} -262)"><g id="o${o.i}-ojo${l}"><ellipse rx="38" ry="44" fill="#fff" stroke="#1B1E24" stroke-width="5"/><g id="o${o.i}-p${l}"><circle r="18" fill="#1B1E24"/><circle cx="7" cy="-9" r="6" fill="#fff"/></g></g></g>`;
        const ceja = (l, x) => `<g transform="translate(${x} -322)"><g id="o${o.i}-ceja${l}"><rect x="-32" y="-7" width="64" height="14" rx="7" fill="#1B1E24"/></g></g>`;
        const brazo = (l, x) => `<g transform="translate(${x} -170)"><g id="o${o.i}-brazo${l}"><path d="${cap(120, 40)}" fill="#F4F5F7" stroke="#C9CDD3" stroke-width="5"/><circle cy="122" r="26" fill="#F4F5F7" stroke="#C9CDD3" stroke-width="5"/></g></g>`;
        const tela = (x, y, a0, r = 95) => {
          let d = "";
          for (let k = 0; k <= 3; k++) { const a = a0 + (k / 3) * (Math.PI / 2); d += `M${x} ${y} L${f2(x + Math.cos(a) * r)} ${f2(y + Math.sin(a) * r)} `; }
          for (const q of [0.4, 0.7, 1]) { d += `M${f2(x + Math.cos(a0) * r * q)} ${f2(y + Math.sin(a0) * r * q)} `; for (let k = 1; k <= 3; k++) { const a = a0 + (k / 3) * (Math.PI / 2), am = a - Math.PI / 12; d += `Q${f2(x + Math.cos(am) * r * q * 0.82)} ${f2(y + Math.sin(am) * r * q * 0.82)} ${f2(x + Math.cos(a) * r * q)} ${f2(y + Math.sin(a) * r * q)} `; } }
          return `<path d="${d}" fill="none" stroke="#E5E7EB" stroke-width="3.5" opacity="0.85"/>`;
        };
        let polvo = "";
        for (let k = 0; k < 26; k++) polvo += `<circle cx="${(((k * 97) % 280) - 140).toFixed(0)}" cy="${(-20 - ((k * 61) % 380)).toFixed(0)}" r="${4 + (k % 4) * 3}" fill="#8A8F98" opacity="0.55"/>`;
        polvo += `<path d="M-150 -380 Q-60 -400 20 -372 Q90 -400 160 -380 L160 -350 Q60 -368 -10 -348 Q-90 -366 -150 -350 Z" fill="#9AA0A8" opacity="0.6"/>`;
        return `<g id="o${o.i}"><ellipse id="o${o.i}-sombra" cx="0" cy="4" rx="190" ry="22" fill="#000" opacity="0.35"/><g id="o${o.i}-cuerpo">
          ${brazo("L", -150)}${brazo("R", 150)}
          <rect x="-152" y="-348" width="304" height="348" rx="36" fill="#F4F5F7" stroke="#D5D9DE" stroke-width="6"/>
          <rect x="-164" y="-412" width="328" height="74" rx="20" fill="${C.azul}"/><rect x="-164" y="-350" width="328" height="6" fill="#1550D8"/>${txt(0, -362, "IRON FUEL", 34, "#fff", 900, "middle", 'letter-spacing="3" data-layout-ignore')}
          <rect x="-152" y="-170" width="304" height="124" fill="#111317"/>${txt(0, -110, "CREATINA", 54, "#fff", 900, "middle", "data-layout-ignore")}${txt(0, -68, "MONOHIDRATO", 26, C.azulClaro, 900, "middle", 'letter-spacing="3" data-layout-ignore')}
          <ellipse cx="-104" cy="-208" rx="26" ry="15" fill="#FF8FA3" opacity="0.6"/><ellipse cx="104" cy="-208" rx="26" ry="15" fill="#FF8FA3" opacity="0.6"/>
          ${ojo("L", -62)}${ojo("R", 62)}${ceja("L", -62)}${ceja("R", 62)}
          <path id="o${o.i}-boca" d="" fill="#4A1E1E" stroke="#1B1E24" stroke-width="5" stroke-linejoin="round" transform="translate(0 -205)"/>
          <rect x="-134" y="-330" width="20" height="290" rx="10" fill="#fff" opacity="0.55"/>
          <g id="o${o.i}-telas" opacity="0">${tela(-164, -412, 0)}${tela(164, -412, Math.PI / 2)}<path d="M-150 -400 Q-80 -350 -40 -412 M150 -400 Q90 -345 50 -412 M-20 -412 Q0 -372 25 -412" stroke="#E5E7EB" stroke-width="3" fill="none" opacity="0.75"/></g><g id="o${o.i}-polvo" opacity="0"><rect x="-164" y="-412" width="328" height="412" rx="30" fill="#6F757E" opacity="0.4"/>${polvo}</g></g></g>`;
      }
      case "cereales": {
        const caja = (x, h, c1, c2, tx, r) => `<g id="o${o.i}-k${r}"><rect x="${x - 85}" y="${-h}" width="170" height="${h}" rx="8" fill="${c1}" stroke="#00000022" stroke-width="4"/><rect x="${x - 85}" y="${-h + 30}" width="170" height="70" fill="${c2}"/>${txt(x, -h + 78, tx, 34, "#fff", 900, "middle", "data-layout-ignore")}<circle cx="${x}" cy="${-h * 0.42}" r="48" fill="#F7C948"/><circle cx="${x - 14}" cy="${-h * 0.45}" r="10" fill="#B9771E"/><circle cx="${x + 16}" cy="${-h * 0.38}" r="8" fill="#B9771E"/></g>`;
        return `<g id="o${o.i}" opacity="0"><g transform="translate(${o.x} ${o.y}) scale(${o.s || 1})">${caja(-170, 300, "#E4572E", "#B83A1A", "CHOCO", 0)}${caja(0, 336, "#F2A93B", "#C47A12", "CRUNCH", 1)}${caja(170, 290, "#2FB36C", "#1E7A48", "FIBRA", 2)}</g></g>`;
      }
      case "flash":
        return `<g id="o${o.i}" opacity="0"><rect id="o${o.i}-in" x="-4000" y="-4000" width="8000" height="8000" fill="#fff" opacity="0"/><circle r="90" fill="url(#o${o.i}-g)"/><radialGradient id="o${o.i}-g"><stop offset="0" stop-color="#fff"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></g>`;
      case "telarana": {
        const r = o.r || 150;
        let d = "";
        for (let k = 0; k <= 4; k++) { const a = (k / 4) * (Math.PI / 2); d += `M0 0 L${(Math.cos(a) * r).toFixed(0)} ${(Math.sin(a) * r).toFixed(0)} `; }
        for (const q of [0.35, 0.6, 0.85]) { d += `M${(r * q).toFixed(0)} 0 `; for (let k = 1; k <= 4; k++) { const a = (k / 4) * (Math.PI / 2); d += `Q${(Math.cos(a - 0.2) * r * q * 0.8).toFixed(0)} ${(Math.sin(a - 0.2) * r * q * 0.8).toFixed(0)} ${(Math.cos(a) * r * q).toFixed(0)} ${(Math.sin(a) * r * q).toFixed(0)} `; } }
        return `<g id="o${o.i}" opacity="0"><g transform="translate(${o.x} ${o.y}) scale(${o.sx || 1} 1)"><path d="${d}" fill="none" stroke="#E5E7EB" stroke-width="4" opacity="0.8"/></g></g>`;
      }
      default:
        throw new Error("objeto desconocido: " + o.tipo);
    }
  }
  // el producto: bote genérico de la tienda
  function productoSVG() {
    const pr = EP.producto;
    if (!pr) return "";
    const tipos = {
      creatina: () => bote("producto", 160, 210, "#F4F5F7", C.azul, "#111317", "CREATINA", "#FFFFFF", "sub-prod", "", "MONOHIDRATO"),
      proteina: () => bote("producto", 180, 240, "#111317", C.azul, C.azul, "PROTEÍNA", "#FFFFFF", "sub-prod", "", "DE SUERO"),
      preentreno: () => bote("producto", 190, 210, "#B3261E", "#111317", "#111317", "PRE-WORK", "#FFFFFF", "sub-prod", "", "CON CAFEÍNA"),
    };
    return tipos[pr.tipo]();
  }
  // la tarjeta REALIDAD, por datos: crece fila a fila, cada fila en su palabra
  function tarjetaReal() {
    const tj = EP.tarjeta;
    if (!tj) return [];
    const x = tj.x,
      y = tj.y,
      w = tj.w || 820;
    const tituloT = tj.titulo || "REALIDAD";
    const wT = Math.round(116 + tituloT.length * 29.5);
    const filas = [
      { id: "r-titulo", t: tj.t0, cx: x + 170, cy: y + 62, abajo: y + 104, svg: `<rect x="${x + 34}" y="${y + 26}" width="${wT}" height="76" rx="38" fill="${C.verdeTxt}"/>${icono(tj.iconoTitulo || "check-circle", x + 84, y + 64, 50, "#fff")}${txt(x + 109 + (wT - 95) / 2, y + 81, tituloT, 44, "#fff", 900)}` },
    ];
    let yy = y + 160;
    tj.filas.forEach((f, k) => {
      const lineas = Array.isArray(f.texto) ? f.texto : [f.texto];
      const fs = f.size || 48;
      const svg = `${icono(f.icono, x + 74, yy, 64, f.color || C.azul)}${lineas.map((l, j) => txt(x + 124, yy + fs * 0.36 + j * (fs + 8), l, fs, f.tinta || C.tinta, 900, "start")).join("")}`;
      filas.push({ id: `r-f${k}`, t: f.t, cx: x + w / 2, cy: yy, abajo: yy + (lineas.length - 1) * (fs + 8) + 40, svg });
      yy += 92 + (lineas.length - 1) * (fs + 8);
    });
    return [{ id: "card-r", x, y, w, h0: 128, t0: tj.t0, hasta: tj.hasta, cierra: tj.cierra, filas }];
  }
  // veredicto: el mito tachado y el sello rojo
  function veredictoSVG() {
    const v = EP.veredicto;
    const fs = v.size || 84;
    const n = v.mito.length;
    const y0 = -40 - ((n - 1) * (fs + 14)) / 2;
    const lineas = v.mito.map((l, k) => txt(0, y0 + k * (fs + 14) + fs * 0.36, l, fs, C.tinta, 900)).join("");
    const tacha = v.mito.map((l, k) => { const y = y0 + k * (fs + 14); const w = ancho(l, fs) / 2 + 16; return `M${-w} ${y + 8} L${w} ${y - 8}`; }).join(" ");
    return `<g id="veredicto" opacity="0"><rect x="-450" y="-330" width="900" height="660" rx="48" fill="#fff" filter="url(#sombra)"/>
    <rect x="-300" y="-290" width="600" height="88" rx="44" fill="${C.tinta}"/>${txt(0, -232, `MITOS DEL GIMNASIO · Nº ${EP.numero}`, 38, "#fff", 900)}
    ${lineas}<path id="veredicto-tacha" d="${tacha}" stroke="${C.rojo}" stroke-width="14" stroke-linecap="round" fill="none" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110"/>
    <g transform="translate(30 190)"><g id="veredicto-sello" opacity="0"><rect x="-230" y="-95" width="460" height="190" rx="22" fill="#fff" fill-opacity="0.85" stroke="${C.rojo}" stroke-width="14"/>${txt(0, 50, "MITO", 140, C.rojo, 900, "middle", 'letter-spacing="10"')}</g></g></g>`;
  }
  // la llamada: «¿qué mito desmontamos?», el comentario que se escribe y SEGUIR
  function ctaSVG() {
    return `<g id="cta" opacity="0"><rect x="-450" y="-270" width="900" height="540" rx="48" fill="#fff" filter="url(#sombra)"/>
    ${icono(EP.cta.icono || "chat-circle-dots", -370, -170, 70, C.azul)}${txt(55, -150, EP.cta.titulo || "¿QUÉ MITO DESMONTAMOS?", 52, C.tinta, 900)}
    <rect x="-400" y="-90" width="800" height="110" rx="55" fill="#F1F3F6"/>${logo(-345, -35, 38)}
    <text id="cta-escribe" x="-290" y="-20" font-family="Inter" font-weight="700" font-size="44" fill="#4B515B"></text><rect id="cta-cursor" x="-290" y="-62" width="5" height="52" fill="${C.azul}"/>
    ${logo(-350, 160, 62)}${txt(-275, 150, "IRON FUEL", 52, C.tinta, 900, "start")}${txt(-275, 194, "NUTRITION", 28, C.azulTxt, 900, "start", 'letter-spacing="6"')}
    <rect id="boton-fondo" x="80" y="100" width="340" height="110" rx="55" fill="${C.azul}"/>
    <g id="boton-seguir-txt">${txt(250, 174, (EP.cta.boton || [])[0] || "SEGUIR", 56, "#fff", 900)}</g>
    <g id="boton-siguiendo" opacity="0">${icono("check-circle", 122, 155, 52, C.verdeTxt)}${txt(280, 171, (EP.cta.boton || [])[1] || "SIGUIENDO", 44, C.tinta, 900)}</g>
    <g id="dedo-tap" opacity="0">${icono("hand-tap", 0, 0, 140, C.tinta)}</g></g>`;
  }

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

  const CARDS = tarjetaReal();
  const mundo = `<svg id="mundo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">${defs}
<g id="fondo-lejano">${fondoLejano()}</g>
<g id="cam">
  ${calle()}
  ${tienda()}
  ${gimnasio()}
  ${E_.filter((o) => ["cinta", "noche", "cocina", "calendario"].includes(o.tipo)).map(objetoSVG).join("")}
  ${Object.keys(EP.actores).filter((id) => EP.actores[id].detras).map(personaje).join("")}
  ${mostrador()}
  ${productoSVG()}
  ${fachada()}
  ${fachadaGym()}
  <rect x="300" y="1760" width="4200" height="60" fill="url(#brillo-suelo)"/>
  ${E_.filter((o) => o.tipo === "estelas").map(objetoSVG).join("")}
  ${Object.keys(EP.actores).filter((id) => !EP.actores[id].detras).map(personaje).join("")}
  ${E_.filter((o) => !["cinta", "noche", "estelas", "cocina", "calendario"].includes(o.tipo)).map(objetoSVG).join("")}
  ${validarTarjetas(CARDS).map(tarjetaSVG).join("")}
  ${EP.veredicto ? veredictoSVG() : ""}
  ${ctaSVG()}
</g></svg>`;
  // (el veredicto y la llamada van dentro de la cámara, en el cielo, encima de la tienda)
  const mundoFinal = mundo;

  const VER = EP.veredicto ? { x: 1350, y: -850, ...EP.veredicto } : null;
  const CTAd = { x: 1350, y: 450, ejemplo: "tu mito aquí…", ...EP.cta };
  const IF = { T, D, PJ, CARDS: CARDS.map(sinSVG), EP: { ...EP, veredicto: VER, cta: CTAd }, W: V.palabras.filter((w) => Number.isFinite(w.start)).map((w) => [+w.start.toFixed(3), +w.end.toFixed(3)]) };
  const motor = ["_util.js", "_rig.js", "_obj.js", "serie.js"].map(rdC).join("\n");
  const mundoHtml = `<template>
<style>
  #root { position: absolute; inset: 0; background: #07090D; overflow: hidden; }
  #mundo-svg { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }
</style>
<div id="root" data-composition-id="mundo" data-width="1080" data-height="1920" data-layout-allow-overflow data-layout-allow-overlap>
${mundoFinal}
</div>
<script>
window.__IF = ${JSON.stringify(IF)};
(function () {
  const IF = window.__IF;
  const T = IF.T;
  const D = IF.D;
  const CX = 540,
    CY = 960;
  const SUELO = 1800;
${motor}
})();
(function () {
  const D = window.__IF.D;
  const tl = gsap.timeline({ paused: true });
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
  const CLAVE = new Set(EP.clave || []);
  // cómo se escribe en pantalla lo que la voz lee «como suena»
  const DISPLAY = EP.display || {};
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
      // una palabra corta suelta («la», «el»…) no forma grupo propio si la siguiente llega enseguida
      const pausa = sig ? sig.start - w.end >= 0.15 && !(g.length === 1 && w.text.length <= 3 && sig.start - w.end < 0.4) : true;
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
      // la primera palabra ya está cuando aparece la caja (nunca una caja vacía); las demás saltan en su palabra
      if (wi === 0) subsJs += `tl.fromTo("#s${gi}w${wi}", { opacity: 1, y: 8, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.14, ease: "back.out(2)" }, ${ini.toFixed(3)});\n`;
      else subsJs += `tl.fromTo("#s${gi}w${wi}", { opacity: 0, y: 18, scale: 0.86 }, { opacity: 1, y: 0, scale: 1, duration: 0.14, ease: "back.out(2)" }, ${Math.max(ini, w.start - 0.02).toFixed(3)});\n`;
    });
    subsJs += `tl.fromTo("#s${gi}i", { opacity: 1 }, { opacity: 0, duration: 0.08, ease: "power2.in", immediateRender: false }, ${(fin - 0.08).toFixed(3)});\n`;
  });
  const subtitulosHtml = `<template>
  <style>
    #root { position: absolute; inset: 0; pointer-events: none; }
    #root .grupo { position: absolute; left: 0; top: 236px; width: 1080px; padding: 0 70px; box-sizing: border-box; text-align: center;
      font-family: Inter; font-weight: 900; line-height: 1.18; color: #fff; overflow: visible;
      text-shadow: 0 4px 0 rgba(0,0,0,0.55), 0 0 18px rgba(0,0,0,0.65); letter-spacing: 0.5px; }
    #root .caja { display: inline-block; max-width: 960px; background: rgba(10,11,15,0.92); border-radius: 30px; padding: 12px 20px 16px; }
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

  // ───────────── sonido ─────────────
  const SFX = (EP.sfx || []).map(([k, f, db, que, dur]) => [tk(k), f, db, que, dur]);
  for (const s of SFX) if (!Number.isFinite(s[0])) throw new Error("efecto sin momento: " + s[3]);
  const cues = {
    duracion: D,
    voz: "assets/audio/voz.wav",
    musica: { archivo: "assets/music/basketball-training.mp3", desde: 60.0, db: -27 },
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
  return { T, D };
}
