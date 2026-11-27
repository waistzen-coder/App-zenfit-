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
  const usadas = JSON.stringify([EP.cam, EP.actores, EP.objetos, EP.tarjeta, EP.producto, EP.veredicto, EP.cta, EP.sfx, EP.sacudidas]);
  for (const m of usadas.matchAll(/\["([a-zA-Z0-9]+)"(?=[,\]])/g)) if (!(m[1] in T) && !/^[A-Z]/.test(m[1]) && !["dep", "rep"].includes(m[1]) && EP.actores[m[1]] === undefined && !/^(reposo|brazos|flex|flexR|senala|dedo|explica|suplica|manos|cargar|arriba|choca|pagar|bolsa|baston|bastonArriba|telefono|batido|alto|miedo|cruzados|pecho|toalla|neutro|sonrisa|esfuerzo|wow|serio|ceja|pena|orgullo|dormido|cansado|s|io|io3|o|o3|i|i3|back|backS|expo|lin|step)$/.test(m[1])) console.log(`  ⚠ ¿«${m[1]}» es una palabra del bloque T?`);

/*@base*/

/*@kit*/
/*@pildora*/

/*@gym*/

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
/*@oscurece*/
/*@personaje*/

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
    return `<g id="o${o.i}" opacity="0"><path d="M${-W / 2 + 34} ${top} H${W / 2 - 34} Q${W / 2} ${top} ${W / 2} ${top + 34} V${-74} Q${W / 2} ${-40} ${W / 2 - 34} ${-40} H${-W * 0.05} L${-W * 0.22} 0 L${-W * 0.2} ${-40} H${-W / 2 + 34} Q${-W / 2} ${-40} ${-W / 2} ${-74} V${top + 34} Q${-W / 2} ${top} ${-W / 2 + 34} ${top} Z" fill="#fff" filter="url(#sombra)"/>${lineas}${tacha}${etq}${sello}</g>`;
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
    const filas = [
      { id: "r-titulo", t: tj.t0, cx: x + 170, cy: y + 62, abajo: y + 104, svg: `<rect x="${x + 34}" y="${y + 26}" width="350" height="76" rx="38" fill="${C.verdeTxt}"/>${icono("check-circle", x + 84, y + 64, 50, "#fff")}${txt(x + 236, y + 81, "REALIDAD", 44, "#fff", 900)}` },
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
    ${icono("chat-circle-dots", -370, -170, 70, C.azul)}${txt(55, -150, "¿QUÉ MITO DESMONTAMOS?", 52, C.tinta, 900)}
    <rect x="-400" y="-90" width="800" height="110" rx="55" fill="#F1F3F6"/>${logo(-345, -35, 38)}
    <text id="cta-escribe" x="-290" y="-20" font-family="Inter" font-weight="700" font-size="44" fill="#4B515B"></text><rect id="cta-cursor" x="-290" y="-62" width="5" height="52" fill="${C.azul}"/>
    ${logo(-350, 160, 62)}${txt(-275, 150, "IRON FUEL", 52, C.tinta, 900, "start")}${txt(-275, 194, "NUTRITION", 28, C.azulTxt, 900, "start", 'letter-spacing="6"')}
    <rect id="boton-fondo" x="80" y="100" width="340" height="110" rx="55" fill="${C.azul}"/>
    <g id="boton-seguir-txt">${txt(250, 174, "SEGUIR", 56, "#fff", 900)}</g>
    <g id="boton-siguiendo" opacity="0">${icono("check-circle", 122, 155, 52, C.verdeTxt)}${txt(280, 171, "SIGUIENDO", 44, C.tinta, 900)}</g>
    <g id="dedo-tap" opacity="0">${icono("hand-tap", 0, 0, 140, C.tinta)}</g></g>`;
  }

/*@defs*/

  const CARDS = tarjetaReal();
  const mundo = `<svg id="mundo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">${defs}
<g id="fondo-lejano">${fondoLejano()}</g>
<g id="cam">
  ${calle()}
  ${tienda()}
  ${gimnasio()}
  ${E_.filter((o) => o.tipo === "cinta" || o.tipo === "noche").map(objetoSVG).join("")}
  ${Object.keys(EP.actores).filter((id) => EP.actores[id].detras).map(personaje).join("")}
  ${mostrador()}
  ${productoSVG()}
  ${fachada()}
  ${fachadaGym()}
  <rect x="300" y="1760" width="4200" height="60" fill="url(#brillo-suelo)"/>
  ${E_.filter((o) => o.tipo === "estelas").map(objetoSVG).join("")}
  ${Object.keys(EP.actores).filter((id) => !EP.actores[id].detras).map(personaje).join("")}
  ${E_.filter((o) => !["cinta", "noche", "estelas"].includes(o.tipo)).map(objetoSVG).join("")}
  ${validarTarjetas(CARDS).map(tarjetaSVG).join("")}
  ${veredictoSVG()}
  ${ctaSVG()}
</g></svg>`;
  // (el veredicto y la llamada van dentro de la cámara, en el cielo, encima de la tienda)
  const mundoFinal = mundo;

  const VER = { x: 1350, y: -850, ...EP.veredicto };
  const CTAd = { x: 1350, y: 450, ejemplo: "tu mito aquí…", ...EP.cta };
  const IF = { T, D, PJ, CARDS: CARDS.map(sinSVG), EP: { ...EP, veredicto: VER, cta: CTAd } };
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

/*@subs*/

/*@raiz*/

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
