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
