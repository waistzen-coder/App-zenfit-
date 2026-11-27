// Tiempos de la voz: alinea el guion con la transcripción palabra a palabra
// y da P("palabra", n) = segundo en que EMPIEZA la n-ésima vez que se dice.
//
//   node tools/tiempos.mjs            → imprime la comparación guion / transcripción
//
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const norm = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]/g, "");

/** Silencios del audio con ffmpeg: [[inicio, fin], …] de al menos `min` segundos. */
function leerSilencios(audio, min, db = -36) {
  const r = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-i", audio, "-af", `silencedetect=n=${db}dB:d=${min}`, "-f", "null", "-"],
    { encoding: "utf8" },
  );
  const s = [...r.stderr.matchAll(/silence_start: ([0-9.]+)/g)].map((m) => +m[1]);
  const e = [...r.stderr.matchAll(/silence_end: ([0-9.]+)/g)].map((m) => +m[1]);
  return s.map((a, i) => [a, e[i] ?? Infinity]);
}

/**
 * Whisper pone el inicio de cada palabra donde acabó la anterior, así que se
 * traga las pausas y adelanta las palabras 0,2-0,4 s. Se corrige con el audio:
 *  1. cada tramo de voz entre pausas de ≥ 0,12 s se encaja en su tramo real;
 *  2. las palabras que empiezan por oclusiva (p, t, k, b, d, g) se pegan al
 *     microsilencio que esa consonante hace justo antes de sonar.
 */
function refinar(gw, audio) {
  for (const w of gw) (w.whisper = w.start), (w.whisperFin = w.end);
  const micro = leerSilencios(audio, 0.045);
  const dur = +spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio], {
    encoding: "utf8",
  }).stdout.trim();
  const nFrases = Math.max(...gw.map((w) => w.frase)) + 1;
  const de = (f) => gw.filter((w) => w.frase === f);
  // dónde empieza y acaba de verdad cada frase
  const ini = new Array(nFrases),
    fin = new Array(nFrases);
  ini[0] = micro.length && micro[0][0] <= 0.01 ? micro[0][1] : 0;
  const ultimo = micro.length ? micro[micro.length - 1] : null;
  fin[nFrases - 1] = ultimo && ultimo[1] >= dur - 0.01 ? ultimo[0] : dur;
  for (let f = 0; f < nFrases - 1; f++) {
    const a = de(f),
      b = de(f + 1);
    const est = (a[a.length - 1].end + b[0].start) / 2; // límite según whisper
    let mejor = null,
      nota = -Infinity;
    for (const s of micro) {
      const centro = (s[0] + s[1]) / 2;
      const dist = Math.abs(centro - est);
      if (dist > 0.5 || s[0] < (ini[f] ?? 0) + 0.15) continue;
      const v = s[1] - s[0] - dist * 0.25; // el silencio más largo, si está cerca
      if (v > nota) (nota = v), (mejor = s);
    }
    if (mejor) (fin[f] = mejor[0]), (ini[f + 1] = mejor[1]);
    else (fin[f] = est), (ini[f + 1] = est);
  }
  // las palabras de cada frase se reparten en su hueco real, con las proporciones de whisper
  for (let f = 0; f < nFrases; f++) {
    const ws = de(f);
    const s0 = ws[0].start,
      s1 = ws[ws.length - 1].end;
    const k = (fin[f] - ini[f]) / Math.max(0.05, s1 - s0);
    for (const w of ws) (w.start = ini[f] + (w.start - s0) * k), (w.end = ini[f] + (w.end - s0) * k);
    ws[0].inicioTramo = true;
  }
  // oclusivas: al final del microsilencio más cercano
  const oclusiva = (n) => /^(p|t|k|b|d|qu|c[aou]|c[^aeiouh]|g[aou]|g[^aeiou])/.test(n);
  for (let i = 0; i < gw.length; i++) {
    const w = gw[i];
    if (w.inicioTramo || !oclusiva(w.n)) continue;
    let mejor = null;
    for (const [, e] of micro) {
      const d = e - w.start;
      if (d >= -0.06 && d <= 0.22 && (mejor === null || Math.abs(d) < Math.abs(mejor - w.start))) mejor = e;
    }
    if (mejor === null) continue;
    const prev = gw[i - 1],
      next = gw[i + 1];
    if (prev && mejor <= prev.start + 0.04) continue;
    if (next && mejor >= next.start - 0.04) continue;
    if (prev) prev.end = Math.min(prev.end, mejor);
    w.start = mejor;
    w.ajustada = true;
  }
}

/**
 * Vídeos con la voz montada frase a frase (tools/montar_voz.py): el montaje sabe
 * exactamente dónde empieza y acaba cada frase, así que manda sobre whisper en los bordes.
 */
function encajarMontaje(gw) {
  const mj = path.join(RAIZ, "tools/montaje.json");
  if (!fs.existsSync(mj)) return;
  const M = JSON.parse(fs.readFileSync(mj, "utf8"));
  M.frases.forEach((f, fi) => {
    const ws = gw.filter((w) => w.frase === fi);
    if (!ws.length) return;
    ws[0].start = f.inicio;
    ws[ws.length - 1].end = f.fin;
    let prev = f.inicio;
    for (const w of ws) {
      w.start = Math.min(Math.max(w.start, prev), f.fin - 0.06);
      w.end = Math.min(Math.max(w.end, w.start + 0.06), f.fin);
      prev = w.start + 0.04;
      w.montaje = true;
    }
  });
}

export function cargar({
  guion = path.join(RAIZ, "guion.txt"),
  transcripcion = path.join(RAIZ, "assets/audio/transcript.json"),
  audio = path.join(RAIZ, "assets/audio/voz.wav"),
} = {}) {
  const frases = fs
    .readFileSync(guion, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  // palabras del guion, con la frase a la que pertenecen
  const gw = [];
  frases.forEach((f, fi) => {
    f.split(/\s+/).forEach((w) => {
      if (norm(w)) gw.push({ text: w, n: norm(w), frase: fi });
    });
  });
  const raw = JSON.parse(fs.readFileSync(transcripcion, "utf8"));
  const tw = (Array.isArray(raw) ? raw : raw.words)
    .map((w) => ({ text: w.text, n: norm(w.text), start: w.start, end: w.end }))
    .filter((w) => w.n);

  // alineación por programación dinámica (Needleman-Wunsch)
  const A = gw.length,
    B = tw.length;
  const M = Array.from({ length: A + 1 }, () => new Int32Array(B + 1));
  const T = Array.from({ length: A + 1 }, () => new Uint8Array(B + 1));
  for (let i = 1; i <= A; i++) (M[i][0] = -i), (T[i][0] = 1);
  for (let j = 1; j <= B; j++) (M[0][j] = -j), (T[0][j] = 2);
  for (let i = 1; i <= A; i++)
    for (let j = 1; j <= B; j++) {
      const igual = gw[i - 1].n === tw[j - 1].n;
      const d = M[i - 1][j - 1] + (igual ? 2 : -1);
      const u = M[i - 1][j] - 1; // falta en la transcripción
      const l = M[i][j - 1] - 1; // sobra en la transcripción
      if (d >= u && d >= l) (M[i][j] = d), (T[i][j] = 0);
      else if (u >= l) (M[i][j] = u), (T[i][j] = 1);
      else (M[i][j] = l), (T[i][j] = 2);
    }
  const ops = [];
  let i = A,
    j = B;
  while (i > 0 || j > 0) {
    const t = i > 0 && j > 0 ? T[i][j] : i > 0 ? 1 : 2;
    if (t === 0) ops.push({ g: i - 1, t: j - 1 }), i--, j--;
    else if (t === 1) ops.push({ g: i - 1, t: null }), i--;
    else ops.push({ g: null, t: j - 1 }), j--;
  }
  ops.reverse();

  const diferencias = [];
  for (const o of ops) {
    if (o.g !== null && o.t !== null) {
      gw[o.g].start = tw[o.t].start;
      gw[o.g].end = tw[o.t].end;
      if (gw[o.g].n !== tw[o.t].n)
        diferencias.push(`cambiada: guion «${gw[o.g].text}» → voz «${tw[o.t].text}» (${tw[o.t].start.toFixed(2)} s)`);
    } else if (o.g !== null) {
      diferencias.push(`falta en la voz: «${gw[o.g].text}» (frase ${gw[o.g].frase + 1})`);
    } else {
      diferencias.push(`sobra en la voz: «${tw[o.t].text}» (${tw[o.t].start.toFixed(2)} s)`);
    }
  }
  // palabras que el transcriptor juntó en una («Yrápido» = «Y» + «rápido»):
  // se reparte el tiempo de la palabra pegada según el número de letras
  for (const o of ops) {
    if (o.g === null || o.t === null) continue;
    const g = gw[o.g],
      t = tw[o.t];
    if (g.n === t.n || !t.n.endsWith(g.n)) continue;
    const grupo = [g];
    let k = o.g - 1,
      unido = g.n;
    while (k >= 0 && gw[k].start === undefined && unido.length < t.n.length) {
      grupo.unshift(gw[k]);
      unido = gw[k].n + unido;
      k--;
    }
    if (unido !== t.n) continue;
    let c = 0;
    const total = unido.length,
      dur = t.end - t.start;
    for (const w of grupo) {
      w.start = t.start + (dur * c) / total;
      c += w.n.length;
      w.end = t.start + (dur * c) / total;
      w.separada = true;
    }
    for (let d = diferencias.length - 1; d >= 0; d--)
      if (grupo.some((w) => diferencias[d].includes(`«${w.text}»`)) && diferencias[d].includes(t.text) || grupo.slice(0, -1).some((w) => diferencias[d] === `falta en la voz: «${w.text}» (frase ${w.frase + 1})`))
        diferencias[d] = diferencias[d] + "  → la voz la dice; el transcriptor la pegó a la siguiente";
  }
  // palabras sin tiempo (la voz se las comió o el transcriptor no las vio): interpolar
  for (let k = 0; k < gw.length; k++) {
    if (gw[k].start !== undefined) continue;
    let a = k - 1;
    while (a >= 0 && gw[a].start === undefined) a--;
    let b = k + 1;
    while (b < gw.length && gw[b].start === undefined) b++;
    const t0 = a >= 0 ? gw[a].end : 0;
    const t1 = b < gw.length ? gw[b].start : t0 + 0.3;
    const huecos = b - a - 1,
      pos = k - a;
    gw[k].start = t0 + ((t1 - t0) * (pos - 1)) / huecos;
    gw[k].end = t0 + ((t1 - t0) * pos) / huecos;
    gw[k].interpolada = true;
  }

  refinar(gw, audio);
  encajarMontaje(gw);

  const fin = Math.max(...tw.map((w) => w.end));
  const fraseIni = frases.map((_, fi) => gw.find((w) => w.frase === fi).start);
  const fraseFin = frases.map((_, fi) => [...gw].reverse().find((w) => w.frase === fi).end);

  /** Segundo en que empieza la n-ésima vez (1, 2…) que se dice `palabra` en el guion. */
  function P(palabra, n = 1) {
    const q = norm(palabra);
    let c = 0;
    for (const w of gw) if (w.n === q && ++c === n) return w.start;
    throw new Error(`P("${palabra}", ${n}): esa palabra no sale ${n} vez/veces en el guion`);
  }
  /** Igual que P, pero devuelve el final de la palabra. */
  function E(palabra, n = 1) {
    const q = norm(palabra);
    let c = 0;
    for (const w of gw) if (w.n === q && ++c === n) return w.end;
    throw new Error(`E("${palabra}", ${n}): no existe`);
  }
  return { frases, palabras: gw, transcritas: tw, diferencias, P, E, fraseIni, fraseFin, fin };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = cargar();
  console.log(`Guion: ${t.palabras.length} palabras · Voz transcrita: ${t.transcritas.length} palabras`);
  if (!t.diferencias.length) console.log("El guion y la voz coinciden palabra por palabra.");
  else t.diferencias.forEach((d) => console.log("  · " + d));
  t.frases.forEach((f, i) => console.log(`${String(i + 1).padStart(2)}  ${t.fraseIni[i].toFixed(2)}–${t.fraseFin[i].toFixed(2)}  ${f}`));
  if (process.argv.includes("--palabras"))
    for (const w of t.palabras)
      console.log(
        `   ${w.start.toFixed(2)}  (whisper ${w.whisper.toFixed(2)})  ${w.text}${w.ajustada ? "  ·oclusiva" : ""}${w.inicioTramo ? "  ·tramo" : ""}${w.separada ? "  ·separada" : ""}${w.interpolada ? "  ·interpolada" : ""}`,
      );
}
