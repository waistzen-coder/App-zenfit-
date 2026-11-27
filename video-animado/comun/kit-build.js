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
