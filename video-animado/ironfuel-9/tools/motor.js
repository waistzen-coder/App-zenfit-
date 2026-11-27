// Motor del mundo de IronFuel · novena parte (qué toma el dependiente: NAD+ con resveratrol). build.mjs lo incrusta en compositions/mundo.html.
// Todo lo que se ve es una función pura del tiempo t: render(t). Una sola línea
// de tiempo de GSAP mueve el reloj, así que cada fotograma sale igual siempre.
//
// T  = segundos en que EMPIEZA cada palabra clave (los calcula build.mjs con P()).
// D  = duración del vídeo (la de la voz).
(function () {
  const T = window.__IF.T;
  const D = window.__IF.D;
  const CX = 540,
    CY = 960; // punto de la pantalla al que apunta la cámara (centro de la zona de acción)
  const SUELO = 1800;

  // ───────────────────────── utilidades ─────────────────────────
  const $ = (id) => {
    const e = document.getElementById(id);
    if (!e) throw new Error("falta #" + id);
    return e;
  };
  const pe = (n) => gsap.parseEase(n);
  const EZ = {
    io: pe("power2.inOut"),
    io3: pe("power3.inOut"),
    o: pe("power2.out"),
    o3: pe("power3.out"),
    i: pe("power2.in"),
    back: pe("back.out(1.8)"),
    backS: pe("back.out(1.2)"),
    expo: pe("expo.out"),
    s: pe("sine.inOut"),
    lin: (x) => x,
    step: (x) => (x < 1 ? 0 : 1),
  };
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, u) => a + (b - a) * u;
  const pr = (t, t0, d, e = EZ.io) => e(clamp((t - t0) / d));
  const TAU = Math.PI * 2;
  const rad = (d) => (d * Math.PI) / 180;
  const f2 = (v) => Math.round(v * 100) / 100;

  // fotogramas clave: [[t, valor, ease?], …]; valor = número u objeto de números
  function K(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, v0] = keys[i],
        [t1, v1, e] = keys[i + 1];
      if (t < t1) {
        const u = (EZ[e] || e || EZ.io)(clamp((t - t0) / Math.max(1e-6, t1 - t0)));
        if (typeof v0 === "number") return lerp(v0, v1, u);
        const o = {};
        for (const k in v1) o[k] = lerp(v0[k] ?? v1[k], v1[k], u);
        for (const k in v0) if (!(k in o)) o[k] = v0[k];
        return o;
      }
    }
    return keys[keys.length - 1][1];
  }
  // aparecer con rebote: escala 0→1 y opacidad
  function pop(t, t0, d = 0.38) {
    if (t < t0) return { s: 0, o: 0 };
    const u = clamp((t - t0) / d);
    return { s: lerp(0.55, 1, EZ.back(u)), o: clamp(u * 3) };
  }
  // desaparecer (solo bocadillos y avisos, que en los dibujos se cierran)
  function popOut(t, t1, d = 0.22) {
    if (t < t1) return 1;
    return 1 - EZ.i(clamp((t - t1) / d));
  }
  const tr = (el, x, y, s = 1, r = 0, sx = null) =>
    el.setAttribute(
      "transform",
      `translate(${f2(x)} ${f2(y)})${r ? ` rotate(${f2(r)})` : ""} scale(${f2((sx ?? 1) * s)} ${f2(s)})`,
    );
  // ruido determinista (sin Math.random)
  const ruido = (t, seed) => Math.sin(t * 12.9898 + seed * 78.233) * 0.5 + Math.sin(t * 7.13 + seed * 3.1) * 0.5;

  // ───────────────────────── cámara (novena parte: qué toma el dependiente) ─────────────────────────
  // [t, x, y, zoom, ease]: el punto (x, y) del mundo cae en (540, 960) de la pantalla
  const CAM = [
    [0, 1000, 1330, 0.95],
    [0.4, 1000, 1340, 1.2, "expo"],
    [T.hoy, 1000, 1342, 1.2, "s"],
    [T.ensena + 0.25, 1000, 1290, 1.12, "io"],
    [T.nad1 + 0.35, 920, 1300, 1.15, "io"],
    [T.nutrishonFin + 0.1, 920, 1302, 1.17, "s"],
    [T.nad2 + 0.3, 690, 1096, 1.4, "io3"],
    [T.uvaFin + 0.1, 690, 1094, 1.41, "s"],
    [T.dos1 + 0.2, 1290, 1096, 1.4, "io3"],
    [T.diasFin + 0.05, 1290, 1094, 1.41, "s"],
    [T.demas + 0.25, 1000, 1300, 1.15, "io3"],
    [T.siempre2 + 0.2, 1000, 1302, 1.15, "s"],
    [T.entrena + 0.25, 1460, 770, 0.55, "io3"],
    [T.asi - 0.05, 1460, 776, 0.56, "s"],
    [T.asi + 0.7, 3480, 1330, 0.95, "io3"],
    [T.ocho - 0.1, 3482, 1332, 0.95, "s"],
    [T.ocho + 0.35, 1080, 1360, 1.15, "io3"],
    [T.nueve1 - 0.1, 1080, 1362, 1.15, "s"],
    [T.nueve1 + 0.4, 1950, 1150, 0.7, "io3"],
    [T.ahora - 0.1, 1965, 1150, 0.7, "s"],
    [T.ahora + 0.55, 1270, 1280, 1.0, "io3"],
    [T.quierasFin, 1270, 1282, 1.02, "s"],
    [T.siguenos + 0.4, 1460, 1070, 0.51, "io3"],
    [D, 1460, 1065, 0.505, "s"],
  ];
  // sacudidas: [inicio, duración, amplitud px]
  const SACUDIDAS = [
    [0.0, 0.4, 12],
    [T.ensena, 0.25, 8],
    [T.puerta, 0.5, 16],
  ];
  function camara(t) {
    const c = K(
      t,
      CAM.map(([tt, x, y, z, e]) => [tt, { x, y, z }, e]),
    );
    // deriva muy suave para que nunca haya una imagen congelada
    c.x += Math.sin(t * 0.7) * 4;
    c.y += Math.sin(t * 0.53 + 1) * 3;
    let sx = 0,
      sy = 0;
    for (const [t0, d, a] of SACUDIDAS) {
      if (t >= t0 && t < t0 + d) {
        const k = 1 - (t - t0) / d;
        sx += ruido(t * 3, 1) * a * k;
        sy += ruido(t * 3, 2) * a * k;
      }
    }
    c.sx = sx;
    c.sy = sy;
    return c;
  }

  // ───────────────────────── personajes ─────────────────────────
  // Rig 2D: cabeza, tronco, brazos y piernas articulados, ojos que parpadean.
  const PJ = window.__IF.PJ; // datos de cada personaje (colores, complexión)
  const els = {};
  const PARTES = [
    "root", "cuerpo", "superior", "pelvis", "tronco", "detalle", "logo",
    "piernaL", "musloL", "espL", "tibiaL", "zapL", "piernaR", "musloR", "espR", "tibiaR", "zapR",
    "brazoL", "humL", "mangaL", "antL", "radL", "manoL", "brazoR", "humR", "mangaR", "antR", "radR", "manoR",
    "cuello", "cabeza", "ojoL", "ojoR", "pupL", "pupR", "cejaL", "cejaR", "boca", "pelo",
  ];
  function capsula(L, w, b = 0) {
    const h = w / 2;
    return `M${f2(-h)} 0Q${f2(-h - b)} ${f2(L / 2)} ${f2(-h)} ${f2(L)}A${f2(h)} ${f2(h)} 0 0 0 ${f2(h)} ${f2(L)}Q${f2(h + b)} ${f2(L / 2)} ${f2(h)} 0A${f2(h)} ${f2(h)} 0 0 0 ${f2(-h)} 0Z`;
  }
  function troncoPath(Ws, Ww, sy, hy, m) {
    const r = 18 + 12 * m,
      bul = 18 * m,
      H = hy - sy;
    return `M${f2(-Ws / 2)} ${f2(sy + r)}Q${f2(-Ws / 2)} ${f2(sy)} ${f2(-Ws / 2 + r)} ${f2(sy)}L${f2(Ws / 2 - r)} ${f2(sy)}Q${f2(Ws / 2)} ${f2(sy)} ${f2(Ws / 2)} ${f2(sy + r)}C${f2(Ws / 2 + bul)} ${f2(sy + H * 0.38)} ${f2(Ww / 2 + 4)} ${f2(hy - H * 0.32)} ${f2(Ww / 2)} ${f2(hy)}L${f2(-Ww / 2)} ${f2(hy)}C${f2(-Ww / 2 - 4)} ${f2(hy - H * 0.32)} ${f2(-Ws / 2 - bul)} ${f2(sy + H * 0.38)} ${f2(-Ws / 2)} ${f2(sy + r)}Z`;
  }
  // medidas según la musculatura m (0 = fideo, 1 = armario)
  function medidas(p, m) {
    const g = p.genero === "f" ? 1 : 0;
    return {
      muslo: 120,
      tibia: 118,
      Ht: 198 + 30 * m,
      Ws: 112 + 200 * m - g * 10,
      Ww: 92 + 54 * m + g * 16,
      hum: 108 + 10 * m,
      ant: 102 + 6 * m,
      aw: 25 + 48 * m,
      fw: 22 + 32 * m,
      mano: 16 + 8 * m,
      lw: 34 + 28 * m,
      sw: 29 + 17 * m,
      cw: 30 + 40 * m,
      R: p.R || 66,
    };
  }
  // posturas: a = cuánto se separa el brazo del cuerpo (º), e = cuánto dobla el codo (º, + hacia fuera/arriba)
  const POSES = {
    reposo: { aL: 8, eL: 6, aR: 8, eR: 6 },
    brazos: { aL: 14, eL: 14, aR: 14, eR: 14 },
    flex: { aL: 92, eL: 118, aR: 92, eR: 118 },
    flexR: { aL: 10, eL: 8, aR: 92, eR: 118 },
    senala: { aL: 10, eL: 8, aR: 86, eR: 4 },
    dedo: { aL: 10, eL: 8, aR: 112, eR: 58 },
    explica: { aL: 14, eL: 10, aR: 34, eR: 72 },
    suplica: { aL: 26, eL: -118, aR: 26, eR: -118 },
    manos: { aL: 72, eL: 10, aR: 72, eR: 10 },
    cargar: { aL: 40, eL: 126, aR: 40, eR: 126 },
    arriba: { aL: 158, eL: 18, aR: 158, eR: 18 },
    choca: { aL: 10, eL: 8, aR: 90, eR: 0 },
    pagar: { aL: 10, eL: 8, aR: 70, eR: 22 },
    bolsa: { aL: 16, eL: 10, aR: 8, eR: 6 },
    baston: { aL: 10, eL: 8, aR: 34, eR: 22 },
    bastonArriba: { aL: 10, eL: 8, aR: 150, eR: 30 },
  };
  const GESTOS = {
    neutro: { mw: 26, mc: 6, mo: 4, cy: 0, cr: 0 },
    sonrisa: { mw: 36, mc: 13, mo: 9, cy: -2, cr: 0 },
    esfuerzo: { mw: 36, mc: -3, mo: 15, cy: 6, cr: 14 },
    wow: { mw: 18, mc: -6, mo: 26, cy: -12, cr: -6 },
    serio: { mw: 24, mc: -3, mo: 3, cy: 4, cr: 10 },
    ceja: { mw: 26, mc: 2, mo: 3, cy: -10, cr: -14 },
    pena: { mw: 22, mc: -9, mo: 3, cy: -4, cr: -18 },
    orgullo: { mw: 38, mc: 15, mo: 12, cy: -6, cr: -4 },
  };
  function initPJ(id) {
    const o = {};
    for (const k of PARTES) {
      const e = document.getElementById(`${id}-${k}`);
      if (e) o[k] = e;
    }
    els[id] = o;
  }
  // transforma un punto local del personaje a coordenadas del mundo
  function aMundo(st, lx, ly) {
    return { x: st.x + st.face * st.s * lx, y: st.y + st.s * ly };
  }
  function dibujarPJ(id, st, t) {
    const p = PJ[id],
      e = els[id];
    const M = medidas(p, st.m);
    const hipY = -(M.muslo + M.tibia + 14);
    const sy = hipY - M.Ht;
    const pose = st.pose;
    // andar: fase según la distancia recorrida
    const amp = clamp(Math.abs(st.v) / 420) * (st.correr ? 1.35 : 1);
    const fase = ((st.face * st.x) / (230 * st.s)) * Math.PI;
    const sw = Math.sin(fase) * 30 * amp;
    const rodL = Math.max(0, Math.sin(fase + 1.4)) * 34 * amp,
      rodR = Math.max(0, Math.sin(fase + 1.4 + Math.PI)) * 34 * amp;
    const bob = -Math.abs(Math.cos(fase)) * 9 * amp;
    const resp = Math.sin(t * TAU * 0.31 + p.seed) * 2.6; // respiración
    const temblor = (st.temblor || 0) * ruido(t * 6, p.seed) * 5;
    const agache = st.agache || 0;
    tr(e.root, st.x, st.y, st.s, 0, st.face * (st.sqx ?? 1));
    e.root.setAttribute("opacity", st.oculto ? 0 : 1);
    e.cuerpo.setAttribute("transform", `translate(${f2(temblor)} ${f2(bob + agache)})`);
    e.superior.setAttribute(
      "transform",
      `rotate(${f2((st.lean || 0) + (st.correr ? 6 * amp : 0))} 0 ${f2(hipY)}) translate(0 ${f2(-resp)})`,
    );
    e.tronco.setAttribute("d", troncoPath(M.Ws, M.Ww, sy, hipY + 4, st.m));
    if (e.detalle) {
      e.detalle.setAttribute(
        "d",
        `M${f2(-M.Ws * 0.24)} ${f2(sy + M.Ht * 0.34)}Q0 ${f2(sy + M.Ht * 0.44)} ${f2(M.Ws * 0.24)} ${f2(sy + M.Ht * 0.34)}M0 ${f2(sy + M.Ht * 0.42)}L0 ${f2(sy + M.Ht * 0.9)}`,
      );
      e.detalle.setAttribute("opacity", f2(clamp((st.m - 0.3) * 1.6) * 0.5));
    }
    if (e.logo) e.logo.setAttribute("transform", `translate(${f2(M.Ws * 0.18)} ${f2(sy + M.Ht * 0.3)}) scale(${f2(0.8 + 0.4 * st.m)})`);
    e.pelvis.setAttribute("d", `M${f2(-M.Ww / 2 - 2)} ${f2(hipY - 18)}h${f2(M.Ww + 4)}v40q0 14 -14 14h${f2(-M.Ww + 24)}q-14 0 -14 -14Z`);
    // piernas
    const legX = M.Ww * 0.26;
    const lp = st.piernas || { L: 0, R: 0, kL: 0, kR: 0 };
    e.piernaL.setAttribute("transform", `translate(${f2(-legX)} ${f2(hipY + 6)}) rotate(${f2(-(sw + lp.L))})`);
    e.piernaR.setAttribute("transform", `translate(${f2(legX)} ${f2(hipY + 6)}) rotate(${f2(-(-sw + lp.R))})`);
    e.musloL.setAttribute("d", capsula(M.muslo, M.lw));
    e.musloR.setAttribute("d", capsula(M.muslo, M.lw));
    e.espL.setAttribute("transform", `translate(0 ${M.muslo}) rotate(${f2(rodL + lp.kL)})`);
    e.espR.setAttribute("transform", `translate(0 ${M.muslo}) rotate(${f2(rodR + lp.kR)})`);
    e.tibiaL.setAttribute("d", capsula(M.tibia, M.sw));
    e.tibiaR.setAttribute("d", capsula(M.tibia, M.sw));
    e.zapL.setAttribute("transform", `translate(0 ${M.tibia + 2})`);
    e.zapR.setAttribute("transform", `translate(0 ${M.tibia + 2})`);
    // brazos (R = el del lado hacia el que mira, delante del tronco)
    const shX = M.Ws / 2 - M.aw * 0.32,
      shY = sy + 18;
    const swA = st.v ? Math.sin(fase) * 16 * amp : 0;
    const aL = pose.aL - swA * 0.2,
      aR = pose.aR + swA * 0.2;
    e.brazoL.setAttribute("transform", `translate(${f2(-shX)} ${f2(shY)}) rotate(${f2(aL + swA)})`);
    e.brazoR.setAttribute("transform", `translate(${f2(shX)} ${f2(shY)}) rotate(${f2(-aR + swA)})`);
    const bic = 9 * st.m;
    e.humL.setAttribute("d", capsula(M.hum, M.aw, bic));
    e.humR.setAttribute("d", capsula(M.hum, M.aw, bic));
    if (e.mangaL) {
      const ml = p.mangaLarga ? M.hum : M.hum * 0.42;
      e.mangaL.setAttribute("d", capsula(ml, M.aw + 8, bic));
      e.mangaR.setAttribute("d", capsula(ml, M.aw + 8, bic));
    }
    e.antL.setAttribute("transform", `translate(0 ${f2(M.hum)}) rotate(${f2(pose.eL)})`);
    e.antR.setAttribute("transform", `translate(0 ${f2(M.hum)}) rotate(${f2(-pose.eR)})`);
    e.radL.setAttribute("d", capsula(M.ant, M.fw, 4 * st.m));
    e.radR.setAttribute("d", capsula(M.ant, M.fw, 4 * st.m));
    e.manoL.setAttribute("cx", 0);
    e.manoL.setAttribute("cy", f2(M.ant + 2));
    e.manoL.setAttribute("r", f2(M.mano));
    e.manoR.setAttribute("cx", 0);
    e.manoR.setAttribute("cy", f2(M.ant + 2));
    e.manoR.setAttribute("r", f2(M.mano));
    // cabeza
    const headY = sy - 20 - M.R + 10;
    e.cuello.setAttribute("d", `M${f2(-M.cw / 2)} ${f2(sy + 12)}V${f2(sy - 30)}h${f2(M.cw)}V${f2(sy + 12)}Z`);
    e.cabeza.setAttribute("transform", `translate(0 ${f2(headY - resp * 0.4)}) rotate(${f2(st.cabeza || 0)})`);
    // ojos: parpadeo y mirada
    const parp = parpadeo(t, p.seed);
    const ojo = st.ojos ?? 1;
    const fx = 10;
    const lx = clamp(st.mx ?? 0.6, -1, 1) * 5,
      ly = clamp(st.my ?? 0, -1, 1) * 5;
    const pa = parp * ojo * (st.parpado ?? 1);
    e.ojoL.setAttribute("transform", `translate(${fx - 23} -8) scale(${f2(ojo)} ${f2(pa)})`);
    e.ojoR.setAttribute("transform", `translate(${fx + 23} -8) scale(${f2(ojo)} ${f2(pa)})`);
    e.pupL.setAttribute("cx", f2(lx));
    e.pupL.setAttribute("cy", f2(ly));
    e.pupR.setAttribute("cx", f2(lx));
    e.pupR.setAttribute("cy", f2(ly));
    const g = st.gesto;
    e.cejaL.setAttribute("transform", `translate(${fx - 23} ${f2(-36 + g.cy)}) rotate(${f2(-g.cr)})`);
    e.cejaR.setAttribute("transform", `translate(${fx + 23} ${f2(-36 + g.cy + (st.cejaR || 0))}) rotate(${f2(g.cr)})`);
    const habla = st.habla ? Math.abs(Math.sin(t * TAU * 3.1 + p.seed)) * 12 : 0;
    const mo = g.mo + habla;
    e.boca.setAttribute(
      "d",
      `M${f2(-g.mw / 2)} 0Q0 ${f2(g.mc)} ${f2(g.mw / 2)} 0Q0 ${f2(g.mc + mo)} ${f2(-g.mw / 2)} 0Z`,
    );
    e.boca.setAttribute("transform", `translate(${fx * 0.7} 32)`);
    if (e.pelo && p.coleta) e.pelo.setAttribute("transform", `rotate(${f2(Math.sin(fase * 0.5 + t * 2) * 8 * (0.3 + amp))} -40 -40)`);
    // dónde quedan las manos en el mundo (para los objetos que sujetan)
    const mano = (lado) => {
      const s = lado === "R" ? -1 : 1;
      const a = lado === "R" ? -aR + swA : aL + swA;
      const el = lado === "R" ? -pose.eR : pose.eL;
      const px = lado === "R" ? shX : -shX;
      const rot = (x, y, d) => {
        const r = rad(d);
        return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
      };
      let [ex, ey] = rot(0, M.hum, a);
      let [hx, hy] = rot(0, M.ant + 2, a + el);
      let x = px + ex + hx,
        y = shY + ey + hy;
      // inclinación del tronco y respiración
      const lean = (st.lean || 0) + (st.correr ? 6 * amp : 0);
      y -= resp;
      [x, y] = (() => {
        const r = rad(lean);
        const yy = y - hipY;
        return [x * Math.cos(r) - yy * Math.sin(r), x * Math.sin(r) + yy * Math.cos(r) + hipY];
      })();
      x += temblor;
      y += bob + agache;
      void s;
      return aMundo(st, x, y);
    };
    return { manoL: mano("L"), manoR: mano("R"), alto: -headY + M.R, cabeza: aMundo(st, 0, headY) };
  }
  function parpadeo(t, seed) {
    // parpadea cada 2,6-4,2 s (determinista)
    const periodo = 2.6 + ((seed * 7) % 16) / 10;
    const fase = (t + seed * 0.37) % periodo;
    if (fase < 0.13) return Math.max(0.08, Math.abs(fase - 0.065) / 0.065);
    return 1;
  }
  // velocidad horizontal (para las piernas) a partir de los fotogramas clave de x
  function vel(keys, t) {
    return (K(t + 0.02, keys) - K(t - 0.02, keys)) / 0.04;
  }
  const P = (n) => POSES[n];
  const G = (n) => GESTOS[n];

  // ─────────────── coreografía de la novena parte (qué toma el dependiente) ───────────────
  const PUERTA = 2340;
  const GYM_X = 3440; // donde entrena él a las siete
  const FLACO_SITIO = 1560;
  const mezclaP = (a, b, u) => {
    const o = {};
    for (const k in a) o[k] = lerp(a[k], b[k], u);
    return o;
  };
  const rep = (t, periodo, fase = 0) => EZ.s((Math.sin(((t + fase) * TAU) / periodo - Math.PI / 2) + 1) / 2);
  const ALTO = { aL: 10, eL: 8, aR: 150, eR: 20 }; // el bote en alto

  // ── el dependiente: del mostrador al gimnasio (7:00) y de vuelta (8:00), siempre con la cámara lejos ──
  const DX = [
    [0, 1000],
    [T.asi + 0.35, 1000],
    [T.asi + 0.36, GYM_X, "step"],
    [T.ocho + 0.12, GYM_X],
    [T.ocho + 0.13, 1000, "step"],
  ];
  const enGym = (t) => t > T.asi + 0.36 && t < T.ocho + 0.12;
  function dependiente(t) {
    const x = K(t, DX);
    let pose = P("reposo"),
      gesto = G("sonrisa"),
      habla = false,
      agache = 0,
      lean = 0,
      mx = 0.8,
      my = 0,
      cejaR = 0;
    if (t < T.hoy) {
      // le preguntan de todas partes
      mx = Math.sin(t * 3) * 0.9;
      gesto = G("ceja");
      cejaR = -8;
    } else if (t < T.nad1 + 0.5) {
      pose = K(t, [
        [T.hoy, P("reposo")],
        [T.ensena, ALTO, "back"],
        [T.nad1 - 0.35, ALTO],
        [T.nad1, P("pagar"), "io"],
        [T.nad1 + 0.4, P("reposo"), "io"],
      ]);
      gesto = G("orgullo");
    } else if (enGym(t)) {
      // 7:00: entreno
      pose = mezclaP(P("brazos"), P("cargar"), rep(t, 1.3));
      gesto = rep(t, 1.3) > 0.5 ? G("esfuerzo") : G("orgullo");
    } else if (t < T.asi) {
      if (t > T.nad2) (mx = -0.2), (my = 0.4);
      if (t > T.dos1) mx = 0.6;
      if (t > T.demas - 0.1) {
        gesto = G("ceja");
        pose = K(t, [
          [T.demas - 0.1, P("reposo")],
          [T.demas + 0.2, P("manos"), "back"],
          [T.siempre2, P("manos")],
          [T.siempre2 + 0.3, P("explica"), "io"],
        ]);
        mx = 1;
      }
      if (t > T.siempre2) (gesto = G("sonrisa")), (lean = 6);
    } else if (t < T.ahora) {
      // 8:00: desayuno y sus dos cápsulas
      mx = -0.3;
      my = 0.5;
      gesto = G("sonrisa");
    } else {
      // «ahora ya sabes qué toma»: lo vuelve a levantar
      pose = K(t, [
        [T.ahora, P("reposo")],
        [T.toma2 - 0.1, ALTO, "back"],
        [T.preguntale - 0.1, ALTO],
        [T.preguntale + 0.2, P("explica"), "io"],
        [T.siguenos - 0.2, P("explica")],
        [T.siguenos + 0.15, P("flexR"), "back"],
      ]);
      gesto = G("orgullo");
      mx = 1;
    }
    return { x, y: SUELO, s: 1.04, face: 1, m: 0.78, v: 0, pose, gesto, habla, agache, lean, mx, my, cejaR };
  }

  // ── el flaco, a las 9:01 ya está en la puerta ──
  const FX = [
    [0, 3060],
    [T.flaco - 0.35, 3060],
    [T.puerta, 2460, "o"],
    [T.ahora + 0.1, 2460],
    [T.ahora + 0.9, FLACO_SITIO, "io"],
  ];
  function flaco(t) {
    const x = K(t, FX),
      v = vel(FX, t);
    let pose = P("brazos"),
      gesto = G("orgullo"),
      my = 0,
      mx = 0.9;
    if (t > T.puerta - 0.2 && t < T.ahora + 0.1) pose = K(t, [[T.puerta - 0.2, P("brazos")], [T.puerta + 0.1, P("arriba"), "back"]]);
    if (t > T.ahora + 0.9) (gesto = G("wow")), (my = -0.5), (mx = 0.4);
    return { x, y: SUELO, s: 1.04, face: -1, m: 1, v, pose, gesto, mx, my, correr: Math.abs(v) > 900, oculto: t < T.flaco - 0.4 };
  }
  const fuera = (id) => ({ x: 9000, y: SUELO, s: 1, face: 1, m: PJ[id].m0, v: 0, pose: P("reposo"), gesto: G("neutro"), oculto: true });

// ─────────────── objetos del mundo ───────────────
  function setOp(el, o) {
    el.setAttribute("opacity", f2(o));
  }
  function popEl(el, t, t0, cx, cy, d) {
    const p = pop(t, t0, d);
    el.setAttribute("transform", `translate(${cx} ${cy}) scale(${f2(p.s)}) translate(${-cx} ${-cy})`);
    setOp(el, p.o);
    return p;
  }
  function escribir(el, texto, t, t0, t1) {
    const n = Math.round(clamp((t - t0) / Math.max(0.05, t1 - t0)) * texto.length);
    const v = texto.slice(0, n);
    if (el.textContent !== v) el.textContent = v;
  }
  function barra(el, t, mano1, mano2, flex, discos) {
    // barra entre las dos manos; flex = cuánto se dobla (0-1)
    const cx = (mano1.x + mano2.x) / 2,
      cy = (mano1.y + mano2.y) / 2;
    el.root.setAttribute("transform", `translate(${f2(cx)} ${f2(cy)})`);
    const L = 300,
      caida = 70 * flex;
    el.bar.setAttribute("d", `M${-L} ${f2(caida)}Q0 ${f2(-caida * 1.2)} ${L} ${f2(caida)}`);
    discos.forEach((d, i) => {
      const lado = i % 2 === 0 ? -1 : 1;
      const k = Math.floor(i / 2);
      const x = lado * (L - 40 - k * 34);
      const y = caida * 0.9 - (flex ? 6 * k * flex : 0);
      el.discos[i].setAttribute(
        "transform",
        `translate(${f2(d.x ?? x)} ${f2(d.y ?? y)}) rotate(${f2(lado * flex * 12)}) scale(${f2(d.s)})`,
      );
      setOp(el.discos[i], d.o);
    });
  }

  // ─────────────── kit común: tarjetas por datos (partes 6 en adelante) ───────────────
  const CARDS = window.__IF.CARDS || [];
  const tk = (k) => (Array.isArray(k) ? T[k[0]] + k[1] : T[k]);
  const RC = {};
  function initTarjetas() {
    for (const c of CARDS) {
      RC[c.id] = { card: $(c.id), fondo: $(c.id + "-fondo"), filas: c.filas.map((f) => $(f.id)) };
      // alturas: la tarjeta crece en su sitio cuando aparece una fila que queda por debajo
      const filas = [...c.filas].sort((a, b) => tk(a.t) - tk(b.t));
      const keys = [[0, c.h0]];
      let h = c.h0,
        fin = 0;
      for (const f of filas) {
        const nh = Math.max(h, f.abajo - c.y + 26);
        if (nh > h) {
          const a = Math.max(tk(f.t) - 0.08, fin);
          fin = Math.max(tk(f.t) + 0.25, a + 0.12);
          keys.push([a, h], [fin, nh, "backS"]);
          h = nh;
        }
      }
      RC[c.id].alturas = keys;
    }
  }
  function tarjetas(t) {
    for (const c of CARDS) {
      const r = RC[c.id];
      const pc = popEl(r.card, t, tk(c.t0) - 0.05, c.x + c.w / 2, c.y + 50, 0.4);
      if (c.cierra) setOp(r.card, pc.o * popOut(t, tk(c.cierra), 0.25));
      r.fondo.setAttribute("height", f2(K(t, r.alturas)));
      c.filas.forEach((f, i) => popEl(r.filas[i], t, tk(f.t), f.cx, f.cy, 0.35));
    }
  }

  // ─────────────── referencias ───────────────
  let R = null;
  function init() {
    for (const id of Object.keys(PJ)) initPJ(id);
    initTarjetas();
    R = {
      svg: $("mundo-svg"), cam: $("cam"), fondo: $("fondo-lejano"),
      puerta: $("puerta-hoja"), neonTienda: $("neon-tienda"), reflejo: $("reflejo"), bocadillo: $("bocadillo"),
      magiaColor: $("magia-color"), magiaGris: $("magia-gris"), magiaChispas: $("magia-chispas"), magiaX: $("magia-x"),
      nad: $("bote-nad"), subNad: $("sub-nad"), taza: $("taza"), capsulas: $("capsulas"),
      qs: [1, 2, 3].map((i) => $("p-q" + i)), pDemas: $("p-demas"), pToma: $("p-toma"), pPregunta: $("p-pregunta"),
      pReloj: $("p-reloj"), horas: [0, 1, 2, 3].map((i) => $("p-hora-" + i)), pAbierto: $("p-abierto"),
      seguir: $("seguir"), chipP2: $("chip-p2"), chipP3: $("chip-p3"), botonFondo: $("boton-fondo"),
      botonSeguir: $("boton-seguir-txt"), botonSiguiendo: $("boton-siguiendo"), dedo: $("dedo-tap"),
      datafono: $("datafono"), movil: $("movil"), bolsa: $("bolsa"), bolsaAbu: $("bolsa-abu"),
      pila: $("pila"), estelas: $("estelas"), baston: $("baston"), gotas: $("gotas"), choque: $("choque"),
      neonGym: $("neon-gym"), neonGymOff: $("neon-gym-off"), luces: [0, 1, 2, 3].map((i) => $("luz-g" + i)), oscuro: $("gym-oscuro"),
      lineaBrillo: $("linea-brillo"), lineaIda: $("linea-ida"), marcadorU: $("marcador-u"), marcadorD: $("marcador-d"),
      barraF: { root: $("barra-flaco"), bar: $("barra-flaco-bar"), discos: [0, 1, 2, 3, 4, 5].map((i) => $("barra-flaco-d" + i)) },
      barraV: $("barra-vecino"),
    };
  }

  // ─────────────── render(t) ───────────────
  function render(t) {
    if (!R) init();
    const c = camara(t);
    const tx = CX - c.x * c.z + c.sx,
      ty = CY - c.y * c.z + c.sy;
    R.cam.setAttribute("transform", `translate(${f2(tx)} ${f2(ty)}) scale(${c.z.toFixed(4)})`);
    const zf = 0.55 + c.z * 0.25;
    R.fondo.setAttribute("transform", `translate(${f2(CX - c.x * 0.3 * zf)} ${f2(CY - (c.y - 400) * 0.3 * zf - 600 * zf)}) scale(${f2(zf)})`);
    const c2 = camara(t - 1 / 30);
    const desp = Math.hypot((c.x - c2.x) * c.z, (c.y - c2.y) * c.z);
    const blur = clamp((desp - 26) / 10, 0, 4);
    R.svg.style.filter = blur > 0.25 ? `blur(${blur.toFixed(2)}px)` : "none";

    // ── personajes ──
    const sd = dependiente(t);
    const hd = dibujarPJ("dep", sd, t);
    const sf = flaco(t);
    const hf = dibujarPJ("flaco", sf, t);
    for (const id of ["comp", "vec", "abu", "gym"]) dibujarPJ(id, fuera(id), t);
    for (const el of [R.baston, R.bolsaAbu, R.pila, R.choque, R.gotas, R.bocadillo, R.barraV, R.lineaBrillo, R.lineaIda, R.bolsa, R.datafono, R.movil]) setOp(el, 0);
    R.estelas.setAttribute("transform", `translate(${f2(sf.x - sf.face * 140)} ${SUELO - 300}) scale(${-sf.face} 1)`);
    setOp(R.estelas, clamp((Math.abs(sf.v) - 900) / 700) * 0.9);

    // ── «¿qué tomas?» de todas partes ──
    const QS = [[805, 1100, T.nos], [1195, 1100, T.preguntais], [1000, 940, T.toma1]];
    R.qs.forEach((el, i) => {
      const [x, y, t0] = QS[i];
      const p = pop(t, t0, 0.32);
      el.setAttribute("transform", `translate(${x} ${f2(y + Math.sin(t * 3 + i) * 6)}) scale(${f2(p.s)})`);
      setOp(el, p.o * popOut(t, T.ensena - 0.1));
    });
    const encima = (el, h, s, t0, t1, dy = 0) => {
      const p = pop(t, t0, 0.35);
      el.setAttribute("transform", `translate(${f2(h.cabeza.x)} ${f2(h.cabeza.y - 66 * s - 100 + dy)}) scale(${f2(p.s)})`);
      setOp(el, p.o * popOut(t, t1));
    };
    encima(R.pDemas, hd, 1.04, T.demas, T.entrena);
    encima(R.pPregunta, hd, 1.04, T.preguntale, T.siguenos - 0.1, -40);

    // ── su bote: en alto, al mostrador y otra vez en alto ──
    {
      const mano = { x: hd.manoR.x, y: hd.manoR.y + 70 };
      const mostrador = { x: 900, y: 1470 };
      let p = mano,
        s = 0.7,
        o = 0;
      if (t >= T.ensena) {
        o = 1;
        const pe = pop(t, T.ensena, 0.3);
        s = 0.7 * pe.s;
        const baja = pr(t, T.nad1 - 0.3, 0.3, EZ.io);
        if (baja > 0) p = { x: lerp(mano.x, mostrador.x, baja), y: lerp(mano.y, mostrador.y, baja) - Math.sin(baja * Math.PI) * 60 };
        if (baja > 0) s = lerp(0.7, 1, baja);
        const sube = pr(t, T.toma2 - 0.35, 0.3, EZ.io);
        if (sube > 0) {
          p = { x: lerp(mostrador.x, mano.x, sube), y: lerp(mostrador.y, mano.y, sube) - Math.sin(sube * Math.PI) * 60 };
          s = lerp(1, 0.7, sube);
        }
      }
      R.nad.setAttribute("transform", `translate(${f2(p.x)} ${f2(p.y)}) scale(${f2(s)})`);
      setOp(R.nad, o);
      R.subNad.setAttribute("transform", `scale(${f2(pr(t, T.nad1, 0.4, EZ.o))} 1)`);
      const pt = pop(t, T.toma2, 0.35);
      R.pToma.setAttribute("transform", `translate(${f2(p.x)} ${f2(p.y - 330 * s)}) scale(${f2(pt.s)})`);
      setOp(R.pToma, pt.o * popOut(t, T.preguntale));
    }
    // 8:00: el café y sus dos cápsulas
    popEl(R.taza, t, T.desayuno, 0, 0, 0.35);
    R.taza.setAttribute("transform", `translate(1160 1470) scale(${f2(pop(t, T.desayuno, 0.35).s)})`);
    R.capsulas.setAttribute("transform", `translate(1040 1470) scale(${f2(pop(t, T.dos2, 0.35).s)})`);
    setOp(R.capsulas, pop(t, T.dos2, 0.35).o);

    // ── tarjetas ──
    tarjetas(t);

    // ── su mañana: el reloj (siempre a la vista) ──
    {
      const pr0 = pop(t, T.asi + 0.1, 0.35);
      const sy = K(t, [[T.nueve1 - 0.1, 470], [T.nueve1 + 0.4, 1400, "io3"]]);
      R.pReloj.setAttribute("transform", `translate(${f2(c.x)} ${f2(c.y + (sy - 960) / c.z)}) scale(${f2(pr0.s / c.z)})`);
      setOp(R.pReloj, pr0.o * popOut(t, T.ahora));
      const cambios = [T.siete, T.ocho, T.nueve1, T.minuto, 1e9];
      R.horas.forEach((el, i) => {
        const p = popEl(el, t, cambios[i], 48, 0, 0.3);
        setOp(el, p.o * (t < cambios[i + 1] ? 1 : 0));
      });
      popEl(R.pAbierto, t, T.abre, 2341, 1290, 0.35);
      R.pAbierto.setAttribute("transform", `translate(2341 1290) scale(${f2(pop(t, T.abre, 0.35).s)})`);
    }

    // ── tienda: el neón se apaga de madrugada y se enciende a las nueve ──
    const cerca = (x) => clamp(1 - (Math.abs(x - PUERTA) - 60) / 140);
    const abierta = Math.abs(sf.v) > 30 ? cerca(sf.x) : 0;
    R.puerta.setAttribute("transform", `translate(2470 0) scale(${f2(1 - 0.82 * EZ.o(abierta))} 1) translate(-2470 0)`);
    const apagado = t > T.asi + 0.3 && t < T.abre ? 1 : 0;
    const enciende = pr(t, T.abre, 0.25);
    setOp(R.neonTienda, apagado ? 0.12 : clamp((0.85 + 0.15 * Math.sin(t * 2.1)) * (t > T.abre && t < T.abre + 0.25 ? 0.12 + 0.88 * enciende : 1) + (t > T.siguenos ? 0.2 : 0), 0, 1));
    setOp(R.reflejo, 0.5 - 0.3 * clamp((c.z - 0.9) / 0.6));
    setOp(R.magiaColor, 0);
    setOp(R.magiaGris, 1);
    setOp(R.magiaChispas, 0);
    setOp(R.magiaX, 1);

    // ── gimnasio: su barra (curl a las siete; si no, en el suelo) ──
    {
      const enMano = enGym(t);
      const m = { x: (hd.manoL.x + hd.manoR.x) / 2, y: (hd.manoL.y + hd.manoR.y) / 2 };
      const bx = enMano ? m.x : GYM_X,
        by = enMano ? m.y : SUELO - 98;
      barra(R.barraF, t, { x: bx - 1, y: by }, { x: bx + 1, y: by }, 0, [0, 1, 2, 3, 4, 5].map((i) => ({ s: 1, o: i < 4 ? 1 : 0 })));
      setOp(R.barraF.root, 1);
      // el marcador del gimnasio, en su semana doce de siempre
      R.marcadorU.setAttribute("transform", "translate(0 -1800)");
      R.marcadorD.setAttribute("transform", "translate(0 -150)");
      for (const l of R.luces) setOp(l, 1);
      setOp(R.oscuro, 0);
      setOp(R.neonGym, 0.9 + 0.1 * Math.sin(t * 2.7));
      setOp(R.neonGymOff, 0);
    }

    // ── tarjeta final: seguir ──
    {
      popEl(R.seguir, t, T.siguenos, 1460, 280, 0.45);
      popEl(R.chipP2, t, T.siguenos + 0.15, 830, 370, 0.35);
      popEl(R.chipP3, t, T.siguiente, 1350, 370, 0.35);
      const pulsa = pr(t, T.perderte, 0.2, EZ.o);
      R.botonFondo.setAttribute("fill", mezclaColor("#1D6BFF", "#E5E7EB", pulsa));
      setOp(R.botonSeguir, 1 - pulsa);
      setOp(R.botonSiguiendo, pulsa);
      const llega = pr(t, T.perderte - 0.4, 0.38, EZ.io);
      const toque = t > T.perderte - 0.02 && t < T.perderte + 0.25 ? 1 - 0.18 * Math.sin(((t - T.perderte + 0.02) / 0.27) * Math.PI) : 1;
      R.dedo.setAttribute("transform", `translate(${f2(lerp(2360, 2010, llega))} ${f2(lerp(660, 450, llega))}) scale(${f2(toque)})`);
      setOp(R.dedo, pr(t, T.perderte - 0.4, 0.15) * (1 - pr(t, T.perderte + 0.6, 0.3)));
    }
  }
  function bocadilloPath(x, y, w, h) {
    const r = 40,
      tx = x + w * 0.62,
      b = y + h;
    return `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${b - r}Q${x + w} ${b} ${x + w - r} ${b}H${tx + 40}L${tx + 10} ${b + 54}L${tx - 20} ${b}H${x + r}Q${x} ${b} ${x} ${b - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
  }
  function mezclaColor(a, b, u) {
    const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    const c = pa.map((v, i) => Math.round(lerp(v, pb[i], u)));
    return `rgb(${c.join(",")})`;
  }

  // longitudes de los trazos que se dibujan
  function medirTrazos() {
    for (const id of ["linea-suelo", "linea-brillo", "linea-ida"]) {
      const el = document.getElementById(id);
      el.__len = el.getTotalLength();
      el.setAttribute("stroke-dasharray", `${el.__len} ${el.__len}`);
    }
  }

  window.__IF.render = render;
  window.__IF.medir = medirTrazos;
  window.__IF.camara = camara;
})();