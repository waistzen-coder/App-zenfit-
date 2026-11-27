// Motor del mundo de IronFuel · quinta parte (el compañero: proteína vegetal y vitamina B12, y cierre de la serie). build.mjs lo incrusta en compositions/mundo.html.
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

  // ───────────────────────── cámara (quinta parte: el compañero) ─────────────────────────
  // [t, x, y, zoom, ease]: el punto (x, y) del mundo cae en (540, 960) de la pantalla
  const CAM = [
    [0, 3000, 1420, 0.95],
    [0.4, 3010, 1450, 1.3, "expo"],
    [T.vegano1 + 0.3, 3012, 1440, 1.34, "s"],
    [T.gimnasio1 + 0.35, 3220, 1330, 0.92, "io3"],
    [T.musculo1 + 0.1, 3225, 1325, 0.95, "s"],
    [T.asi2 + 0.05, 3220, 1330, 0.95, "s"],
    [T.asi2 + 0.45, 2800, 1360, 0.92, "io"],
    [T.tienda + 0.3, 2150, 1360, 0.9, "io"],
    [T.preguntar + 0.45, 1330, 1380, 1.03, "io3"],
    [T.saco - 0.05, 1330, 1385, 1.03, "s"],
    [T.dos1 + 0.05, 1160, 1370, 0.89, "io"],
    [T.botes1 + 0.4, 1150, 1360, 0.88, "s"],
    [T.uno1 + 0.2, 680, 1130, 1.5, "io3"],
    [T.venga2Fin + 0.1, 680, 1128, 1.52, "s"],
    [T.dos2 + 0.25, 1310, 1120, 1.5, "io3"],
    [T.normalidadFin + 0.1, 1310, 1122, 1.53, "s"],
    [T.siempre, 1300, 1140, 1.48, "s"],
    [T.sin + 0.15, 1460, 820, 0.55, "io3"],
    [T.nada + 0.35, 1460, 828, 0.56, "s"],
    [T.pago + 0.22, 1430, 1330, 1.0, "io3"],
    [T.fue2, 1460, 1330, 1.0, "s"],
    [T.fue2 + 0.45, 2200, 1370, 0.9, "io"],
    [T.semana1 + 0.25, 3660, 1300, 0.88, "io"],
    [T.semana3, 3660, 1305, 0.88, "s"],
    [T.pedian + 0.1, 3660, 1306, 0.88, "s"],
    [T.pedian + 0.5, 3660, 1310, 0.9, "io"],
    [T.lentejas, 3660, 1302, 0.905, "s"],
    [T.lentejas + 0.12, 3660, 1292, 0.935, "o"],
    [T.asi3, 3660, 1296, 0.93, "s"],
    [T.serie + 0.25, 3660, 1200, 0.7, "io3"],
    [T.consejo - 0.4, 3660, 1205, 0.71, "s"],
    [T.consejo + 0.3, 1460, 1000, 0.55, "io3"],
    [T.demas, 1460, 1005, 0.552, "s"],
    [T.encontrarlo - 0.05, 2180, 1630, 0.85, "io3"],
    [T.siguenos - 0.05, 2180, 1625, 0.87, "s"],
    [T.siguenos + 0.4, 1460, 1070, 0.51, "io3"],
    [D, 1460, 1065, 0.505, "s"],
  ];
  // sacudidas: [inicio, duración, amplitud px]
  const SACUDIDAS = [
    [0.0, 0.4, 12],
    [T.musculo1, 0.3, 8],
    [T.lentejas, 0.55, 20],
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

  // ─────────────── coreografía de la quinta parte (el compañero) ───────────────
  const PUERTA = 2340;
  const SITIO = 1600; // delante del mostrador
  const COMP_INI = 3000; // donde está al principio, en el gimnasio
  const COMP_GYM = 3440; // donde entrena, entre los soportes
  const BOLSA_X = 3300; // donde deja la bolsa
  const GYM_INI = 3420, GYM_X = 3850, GYM_CERCA = 3700; // el del gimnasio
  const FLACO_X = 4030, FLACO_CERCA = 3900;
  const ABU_X = 2880, ABU_CERCA = 3215;
  const VEC_X = 4440, VEC_CERCA = 4100;
  const mezclaP = (a, b, u) => {
    const o = {};
    for (const k in a) o[k] = lerp(a[k], b[k], u);
    return o;
  };
  const rep = (t, periodo, fase = 0) => EZ.s((Math.sin(((t + fase) * TAU) / periodo - Math.PI / 2) + 1) / 2);
  POSES.ofrece = { aL: 22, eL: -112, aR: 22, eR: -112 }; // sujeta su cuenco de lentejas con las dos manos
  // los cuatro clientes sacan músculo uno detrás de otro («cuatro clientes»)
  const celebra = (t, t0, base) => (t > t0 ? mezclaP(base, P("flex"), pr(t, t0, 0.32, EZ.back)) : base);
  // semanas uno y cuatro: [empieza, acaba, periodo, altura]
  const LEVANTA = [
    [T.uno2 + 0.45, T.semana2 - 0.05, 1.6, 0.85],
    [T.cuatro1 + 0.45, T.semana3 - 0.05, 1.2, 1],
  ];
  // 0 = la barra en el suelo · 1 = en sus manos
  function enManos(t) {
    if (t < T.semana1 + 0.05) return 0;
    if (t < T.pedian) return pr(t, T.semana1 + 0.05, 0.3, EZ.io);
    return 1 - pr(t, T.pedian, 0.35, EZ.io);
  }
  // 0 = barra al pecho · 1 = arriba del todo
  function levanta(t) {
    for (const [a, b, per, amp] of LEVANTA) if (t > a && t < b) return amp * rep(t - a, per) * (1 - pr(t, b - 0.3, 0.3));
    return 0;
  }

  // ── el compañero ──
  const CXK = [
    [0, COMP_INI],
    [T.asi2 - 0.1, COMP_INI],
    [T.tienda + 0.15, PUERTA, "i"],
    [T.preguntar + 0.5, SITIO, "o"],
    [T.fue2, SITIO],
    [T.fue2 + 0.35, PUERTA, "i"],
    [T.semana1 + 0.05, COMP_GYM, "o"],
  ];
  const CCARA = [
    [0, 1],
    [T.asi2 - 0.15, 1],
    [T.asi2, -1, "io"],
    [T.fue2 - 0.05, -1],
    [T.fue2 + 0.07, 1, "io"],
  ];
  // músculo: crece en su sitio cada vez que cambia la semana
  const CM = [
    [0, 0.22],
    [T.uno2, 0.22],
    [T.uno2 + 0.5, 0.3, "io"],
    [T.cuatro1 - 0.05, 0.3],
    [T.cuatro1 + 0.5, 0.58, "backS"],
    [T.ocho - 0.05, 0.58],
    [T.ocho + 0.5, 0.95, "backS"],
  ];
  function companero(t) {
    const x = K(t, CXK),
      v = vel(CXK, t);
    let face = K(t, CCARA);
    const giro = Math.abs(face);
    face = face >= 0 ? 1 : -1;
    const m = K(t, CM);
    let pose = P("brazos"),
      gesto = G("sonrisa"),
      habla = false,
      agache = 0,
      cabeza = 0,
      lean = 0,
      mx = 0.6,
      my = 0,
      temblor = 0;
    const correr = Math.abs(v) > 900;
    if (t < T.asi2 - 0.1) {
      // «se hizo vegano»: saca bíceps, orgulloso… hasta que le dicen lo del músculo
      pose = K(t, [
        [0, P("flex")],
        [T.dijeron - 0.2, P("flex")],
        [T.dijeron + 0.1, P("brazos"), "io"],
      ]);
      gesto = t < T.dijeron ? G("orgullo") : G("ceja");
      if (t > T.dijeron) mx = 1;
      if (t > T.musculo1 - 0.05) {
        gesto = G("pena");
        my = 0.6 * pr(t, T.musculo1, 0.3);
        agache = 16 * Math.sin(clamp((t - T.musculo1) / 0.5) * Math.PI);
      }
    } else if (t < T.fue2) {
      gesto = G("serio");
      if (t > T.preguntar - 0.1) {
        gesto = G("sonrisa");
        habla = t > T.preguntar - 0.05 && t < T.preguntarFin + 0.2;
        mx = 0.8;
        if (t > T.dos1 && t < T.botes1 + 0.6) (gesto = G("wow")), (my = 0.5);
        if (t > T.uno1 && t < T.siempre) (mx = 0.2), (my = -0.6);
        if (t > T.dos2 && t < T.siempre) mx = 0.7;
        if (t > T.siempre - 0.1 && t < T.pago) (gesto = G("serio")), (mx = 0.4), (my = -1), (cabeza = t > T.entrenar2 && t < T.nada + 0.5 ? Math.sin((t - T.entrenar2) * 9) * 5 : 0);
        if (t > T.pago - 0.3) gesto = G("sonrisa");
        pose = K(t, [
          [T.pago - 0.25, P("brazos")],
          [T.pago, P("pagar"), "io"],
          [T.pago + 0.4, P("pagar")],
          [T.pago + 0.65, P("bolsa"), "io"],
        ]);
      }
    } else if (t < T.semana1 + 0.05) {
      pose = P("bolsa");
      gesto = G("orgullo");
      lean = 6;
    } else {
      // en el gimnasio
      face = 1;
      mx = 0.9;
      const q = levanta(t);
      const manos = enManos(t);
      pose = mezclaP(P("brazos"), mezclaP(P("cargar"), P("arriba"), q), manos);
      if (t < T.semana2) (gesto = q > 0.3 ? G("esfuerzo") : G("serio")), (temblor = 0.6 * manos);
      else if (t < T.semana3) gesto = q > 0.4 ? G("esfuerzo") : G("sonrisa");
      else (gesto = G("orgullo")), (temblor = t < T.pedian ? 0.35 : 0);
      if (t > T.pedian + 0.3) {
        // le piden la receta: levanta su cuenco de lentejas
        pose = K(t, [
          [T.pedian + 0.3, P("brazos")],
          [T.lentejas - 0.15, P("brazos")],
          [T.lentejas + 0.1, POSES.ofrece, "back"],
          [T.serie, POSES.ofrece],
          [T.serie + 0.3, P("brazos"), "io"],
        ]);
        mx = 1;
        my = t > T.lentejas ? -0.4 : 0;
      }
      pose = celebra(t, T.cuatro2 + 0.36, pose);
    }
    const sq = 0.88 + 0.12 * giro;
    return { x, y: SUELO, s: 1, face, sqx: sq, m, v, pose, gesto, habla, agache, cabeza, lean, mx, my, correr, temblor };
  }

  // ── el del gimnasio: le dice que así no, y luego es el primero en pedirle la receta ──
  const GX = [
    [0, GYM_INI],
    [T.preguntar, GYM_INI],
    [T.preguntar + 0.01, GYM_X, "step"],
    [T.pedian - 0.1, GYM_X],
    [T.pedian + 0.4, GYM_CERCA, "io"],
  ];
  function gymGuy(t) {
    const x = K(t, GX),
      v = t > T.preguntar + 0.1 ? vel(GX, t) : 0;
    let pose = P("brazos"),
      gesto = G("neutro"),
      habla = false,
      mx = 0.8,
      my = 0,
      cejaR = 0,
      lean = 0;
    if (t < T.fue2) {
      if (t > T.dijeron - 0.05) {
        habla = t < T.musculo1Fin + 0.1;
        gesto = G("ceja");
        cejaR = -8;
        pose = K(t, [
          [T.dijeron - 0.05, P("brazos")],
          [T.dijeron + 0.2, P("explica"), "back"],
          [T.musculo1 - 0.1, P("explica")],
          [T.musculo1 + 0.15, P("flex"), "back"],
        ]);
        if (t > T.musculo1) (gesto = G("orgullo")), (cejaR = 0);
      }
    } else if (t < T.semana2) {
      gesto = t > T.raro ? G("ceja") : G("neutro");
      cejaR = t > T.raro ? -8 : 0;
    } else if (t < T.semana3) {
      habla = t > T.preguntaban && t < T.semana3 - 0.2;
      gesto = t > T.comia ? G("wow") : G("ceja");
      pose = K(t, [
        [T.preguntaban - 0.1, P("brazos")],
        [T.preguntaban + 0.2, P("explica"), "back"],
      ]);
    } else {
      gesto = G("wow");
      if (t > T.pedian - 0.1) {
        habla = t > T.pedian && t < T.lentejas;
        pose = K(t, [
          [T.pedian + 0.3, P("brazos")],
          [T.receta, P("suplica"), "back"],
        ]);
        my = t > T.lentejas ? -0.6 : 0;
        lean = t > T.receta ? 6 : 0;
      }
    }
    return { x, y: SUELO, s: 1, face: -1, m: PJ.gym.m0, v, pose, gesto, habla, mx, my, cejaR, lean };
  }

  // ── el flaco (el de la primera parte), ya el más fuerte del gimnasio ──
  const FXK = [
    [0, FLACO_X],
    [T.pedian - 0.1, FLACO_X],
    [T.pedian + 0.4, FLACO_CERCA, "io"],
  ];
  function flaco(t) {
    const x = K(t, FXK),
      v = vel(FXK, t);
    let pose = P("brazos"),
      gesto = G("orgullo"),
      cejaR = 0,
      my = 0;
    if (t > T.raro && t < T.semana2) (gesto = G("ceja")), (cejaR = -8);
    if (t > T.preguntaban) gesto = G("wow");
    if (t > T.receta - 0.1)
      pose = K(t, [
        [T.receta - 0.1, P("brazos")],
        [T.receta + 0.2, P("suplica"), "back"],
      ]);
    if (t > T.lentejas) my = -0.6;
    if (t > T.cuatro2 - 0.1) gesto = G("orgullo");
    pose = celebra(t, T.cuatro2, pose);
    return { x, y: SUELO, s: 1.04, face: -1, m: 1, v, pose, gesto, mx: 0.9, my, cejaR, oculto: t < T.fue2 };
  }
  // ── el abuelo (tercera parte) y la vecina (cuarta), que se acercan a pedir la receta ──
  const AXK = [
    [0, ABU_X],
    [T.pedian - 0.1, ABU_X],
    [T.pedian + 0.45, ABU_CERCA, "io"],
  ];
  function abuelo(t) {
    const x = K(t, AXK),
      v = vel(AXK, t);
    let pose = K(t, [
      [T.receta, P("brazos")],
      [T.receta + 0.3, P("suplica"), "back"],
    ]);
    pose = celebra(t, T.cuatro2 + 0.12, pose);
    const gesto = t > T.lentejas ? G("wow") : G("sonrisa");
    return { x, y: SUELO, s: 0.9, face: 1, m: 0.35, v, pose, gesto, mx: 0.9, my: t > T.lentejas ? -0.5 : 0, lean: 4, oculto: t < T.semana3 };
  }
  const VXK = [
    [0, VEC_X],
    [T.pedian - 0.1, VEC_X],
    [T.pedian + 0.45, VEC_CERCA, "io"],
  ];
  function vecina(t) {
    const x = K(t, VXK),
      v = vel(VXK, t);
    let pose = K(t, [
      [T.receta + 0.05, P("brazos")],
      [T.receta + 0.35, P("suplica"), "back"],
    ]);
    pose = celebra(t, T.cuatro2 + 0.24, pose);
    const gesto = t > T.lentejas ? G("wow") : G("sonrisa");
    return { x, y: SUELO, s: 0.95, face: -1, m: PJ.vec.m0, v, pose, gesto, mx: 0.9, my: t > T.lentejas ? -0.5 : 0, oculto: t < T.semana3 };
  }

  function dependiente(t) {
    let pose = P("reposo"),
      gesto = G("neutro"),
      habla = false,
      agache = 0,
      cabeza = 0,
      lean = 0,
      mx = 0.8,
      my = 0,
      cejaR = 0;
    if (t > T.preguntar && t < T.preguntarFin + 0.4) my = Math.sin(((t - T.preguntar) / 0.9) * Math.PI) * 0.6;
    if (t > T.preguntar + 0.25) gesto = G("sonrisa");
    if (t > T.saco - 0.05) {
      const u = (t - T.saco + 0.05) / 0.55;
      agache = u < 1 ? Math.sin(u * Math.PI) * 120 : 0;
      gesto = G("sonrisa");
      pose = K(t, [
        [T.saco, P("reposo")],
        [T.dos1 - 0.02, P("manos"), "io"],
        [T.botes1 + 0.4, P("manos")],
        [T.botes1 + 0.8, P("reposo"), "io"],
      ]);
    }
    if (t > T.uno1) (mx = -0.2), (my = 0.4);
    if (t > T.dos2) mx = 0.6;
    if (t > T.siempre - 0.25) {
      gesto = G("serio");
      habla = t < T.nada + 0.4;
      lean = K(t, [
        [T.siempre - 0.25, 0],
        [T.siempre + 0.1, 9, "io"],
        [T.nada + 0.4, 9],
        [T.nada + 0.7, 0, "io"],
      ]);
      pose = K(t, [
        [T.siempre - 0.25, P("reposo")],
        [T.siempre + 0.1, P("explica"), "back"],
        [T.nada + 0.4, P("explica")],
        [T.nada + 0.7, P("reposo"), "io"],
      ]);
      mx = 1;
    }
    if (t > T.pago - 0.35) {
      gesto = G("sonrisa");
      habla = false;
      pose = K(t, [
        [T.pago - 0.35, P("reposo")],
        [T.pago - 0.05, P("pagar"), "io"],
        [T.pago + 0.45, P("pagar")],
        [T.pago + 0.8, P("reposo"), "io"],
        [T.siguenos - 0.2, P("reposo")],
        [T.siguenos + 0.15, P("flexR"), "back"],
      ]);
    }
    return { x: 1000, y: SUELO, s: 1.04, face: 1, m: 0.78, v: 0, pose, gesto, habla, agache, cabeza, lean, mx, my, cejaR };
  }

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

  // ─────────────── referencias ───────────────
  let R = null;
  function init() {
    for (const id of Object.keys(PJ)) initPJ(id);
    R = {
      svg: $("mundo-svg"), cam: $("cam"), fondo: $("fondo-lejano"),
      puerta: $("puerta-hoja"), neonTienda: $("neon-tienda"), reflejo: $("reflejo"),
      bocadillo: $("bocadillo"), bocFondo: $("bocadillo-fondo"), bocL1: $("boc-l1"), bocL2: $("boc-l2"),
      magiaColor: $("magia-color"), magiaGris: $("magia-gris"), magiaChispas: $("magia-chispas"), magiaX: $("magia-x"),
      veg: $("bote-veg"), b12: $("bote-b12"), subVeg: $("sub-veg"), subB12: $("sub-b12"), badge1: $("badge-1"), badge2: $("badge-2"),
      cardA: $("card-a"), cardAF: $("card-a-fondo"), aHoja: $("a-hoja"), aGuisante: $("a-guisante"), aArroz: $("a-arroz"), aCacito: $("a-cacito"),
      aDespues: $("a-despues"), aMusculo: $("a-musculo"), aBarra: $("a-barra"), aFlecha: $("a-flecha"), aEscudo: $("a-escudo"), aVenga: $("a-venga"),
      cardB: $("card-b"), cardBF: $("card-b-fondo"), bPastilla: $("b-pastilla"), bVegano: $("b-vegano"), bFalta: $("b-falta"),
      bPila: $("b-pila"), bPilaNivel: $("b-pila-nivel"), bRayo: $("b-rayo"), bGlobulos: $("b-globulos"),
      regla: $("regla"), reglaFondo: $("regla-fondo"), rEntrenar: $("r-entrenar"), rMas: $("r-mas"), rBotes: $("r-botes"),
      consejo: $("consejo"), cEntrena: $("c-entrena"), cCome: $("c-come"), cDescansa: $("c-descansa"),
      minis: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => $("mini-" + i)), lentejas: $("lentejas"),
      gCarne: $("g-carne"), gRaro1: $("g-raro-1"), gRaro2: $("g-raro-2"), gCome: $("g-come"), gReceta: $("g-receta"),
      hoja: $("hoja"), logoGrande: $("logo-grande"),
      seguir: $("seguir"), chipP2: $("chip-p2"), chipP3: $("chip-p3"), botonFondo: $("boton-fondo"),
      botonSeguir: $("boton-seguir-txt"), botonSiguiendo: $("boton-siguiendo"), dedo: $("dedo-tap"),
      datafono: $("datafono"), datPantalla: $("datafono-ok"), movil: $("movil"), bolsa: $("bolsa"), bolsaAbu: $("bolsa-abu"),
      pila: $("pila"), estelas: $("estelas"), baston: $("baston"), gotas: $("gotas"), choque: $("choque"),
      neonGym: $("neon-gym"), neonGymOff: $("neon-gym-off"), luces: [0, 1, 2, 3].map((i) => $("luz-g" + i)), oscuro: $("gym-oscuro"),
      marcadorU: $("marcador-u"), marcadorD: $("marcador-d"),
      lineaBrillo: $("linea-brillo"), lineaIda: $("linea-ida"),
      barraF: { root: $("barra-flaco"), bar: $("barra-flaco-bar"), discos: [0, 1, 2, 3, 4, 5].map((i) => $("barra-flaco-d" + i)) },
      barraV: { root: $("barra-vecino"), bar: $("barra-vecino-bar"), discos: [0, 1].map((i) => $("barra-vecino-d" + i)) },
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
    const sc = companero(t);
    const hc = dibujarPJ("comp", sc, t);
    const sg = gymGuy(t);
    const hg = dibujarPJ("gym", sg, t);
    const sf = flaco(t);
    const hf = dibujarPJ("flaco", sf, t);
    const sa = abuelo(t);
    const ha = dibujarPJ("abu", sa, t);
    const sv = vecina(t);
    const hv = dibujarPJ("vec", sv, t);
    const sd = dependiente(t);
    const hd = dibujarPJ("dep", sd, t);
    // lo que no sale en esta parte
    setOp(R.baston, 0);
    setOp(R.bolsaAbu, 0);
    setOp(R.pila, 0);
    setOp(R.choque, 0);
    // bolsa del compañero: en la mano tras pagar; en el gimnasio, en el suelo
    {
      const pb = pop(t, T.pago + 0.4, 0.35);
      const u = pr(t, T.semana1 + 0.05, 0.25, EZ.io);
      const bx = lerp(hc.manoL.x, BOLSA_X, u),
        by = lerp(hc.manoL.y, SUELO - 150, u) - Math.sin(u * Math.PI) * 30;
      R.bolsa.setAttribute("transform", `translate(${f2(bx)} ${f2(by)}) scale(${f2(pb.s)})`);
      setOp(R.bolsa, pb.o);
    }
    // estelas: va corriendo a la tienda y vuelve corriendo al gimnasio
    R.estelas.setAttribute("transform", `translate(${f2(sc.x - sc.face * 140)} ${SUELO - 300}) scale(${-sc.face} 1)`);
    setOp(R.estelas, clamp((Math.abs(sc.v) - 900) / 700) * 0.9);
    // gotas de sudor en la primera semana
    {
      const sudor = t > T.semana1 + 0.4 && t < T.semana2 ? clamp(levanta(t) * 2 - 0.6) : 0;
      R.gotas.setAttribute("transform", `translate(${f2(hc.cabeza.x + 78)} ${f2(hc.cabeza.y - 40 + 10 * Math.sin(t * 5))}) scale(0.9)`);
      setOp(R.gotas, sudor);
    }

    // ── «vegano» ──
    {
      const p = pop(t, T.vegano1, 0.38);
      R.hoja.setAttribute("transform", `translate(${f2(hc.cabeza.x)} ${f2(hc.cabeza.y - 175)}) scale(${f2(p.s)})`);
      setOp(R.hoja, p.o * popOut(t, T.asi2 - 0.1));
    }
    // ── bocadillos del gimnasio ──
    const sobre = (el, h, s, t0, t1) => {
      const p = pop(t, t0, 0.35);
      el.setAttribute("transform", `translate(${f2(h.cabeza.x)} ${f2(h.cabeza.y - 66 * s - 100)}) scale(${f2(p.s)})`);
      setOp(el, p.o * popOut(t, t1));
    };
    sobre(R.gCarne, hg, 1, T.dijeron, T.asi2 + 0.1);
    sobre(R.gRaro1, hg, 1, T.raro, T.semana2);
    sobre(R.gRaro2, hf, 1.04, T.raro + 0.1, T.semana2);
    sobre(R.gCome, hg, 1, T.preguntaban, T.semana3);
    {
      const p = pop(t, T.receta, 0.35);
      R.gReceta.setAttribute("transform", `translate(3920 ${f2(925 + Math.sin(t * 3) * 4)}) scale(${f2(p.s)})`);
      setOp(R.gReceta, p.o * popOut(t, T.asi3));
    }
    // ── sus lentejas, en alto ──
    {
      const p = pop(t, T.lentejas, 0.35);
      R.lentejas.setAttribute("transform", `translate(${f2((hc.manoL.x + hc.manoR.x) / 2)} ${f2((hc.manoL.y + hc.manoR.y) / 2 - 40)}) scale(${f2(p.s)})`);
      setOp(R.lentejas, p.o * popOut(t, T.serie + 0.25));
    }
    // ── los diez botes de la serie, cada uno sobre su cliente ──
    {
      const DUENO = [[hf, 1.04], [hf, 1.04], [hf, 1.04], [hf, 1.04], [ha, 0.9], [ha, 0.9], [hv, 0.95], [hv, 0.95], [hc, 1], [hc, 1]];
      const OFF = [[-44, 0], [44, 0], [-44, -124], [44, -124], [-44, 0], [44, 0], [-44, 0], [44, 0], [-44, 0], [44, 0]];
      R.minis.forEach((el, i) => {
        const [h, s] = DUENO[i];
        const p = pop(t, T.diez + i * 0.045, 0.3);
        const x = h.cabeza.x + OFF[i][0],
          y = h.cabeza.y - 66 * s - 34 + OFF[i][1] + Math.sin(t * 3 + i) * 4;
        el.setAttribute("transform", `translate(${f2(x)} ${f2(y)}) scale(${f2(p.s)})`);
        setOp(el, p.o);
      });
    }

    // ── tienda ──
    const cerca = (x) => clamp(1 - (Math.abs(x - PUERTA) - 60) / 140);
    const abierta = Math.abs(sc.v) > 30 ? cerca(sc.x) : 0;
    R.puerta.setAttribute("transform", `translate(2470 0) scale(${f2(1 - 0.82 * EZ.o(abierta))} 1) translate(-2470 0)`);
    setOp(R.neonTienda, clamp(0.85 + 0.15 * Math.sin(t * 2.1) + (t > T.encontrarlo ? 0.2 : 0), 0, 1));
    setOp(R.reflejo, 0.5 - 0.3 * clamp((c.z - 0.9) / 0.6));
    setOp(R.magiaColor, 0);
    setOp(R.magiaGris, 1);
    setOp(R.magiaChispas, 0);
    setOp(R.magiaX, 1);

    // ── bocadillo: «¿Músculo siendo vegano?» ──
    {
      const p = pop(t, T.preguntar - 0.04, 0.3);
      const k = p.s * (0.7 + 0.3 * popOut(t, T.saco - 0.1));
      R.bocadillo.setAttribute("transform", `translate(1480 1160) scale(${f2(k)}) translate(-1480 -1160)`);
      setOp(R.bocadillo, p.o * popOut(t, T.saco - 0.1));
      const fin = T.preguntarFin + 0.25;
      const mitad = (T.preguntar + fin) / 2;
      escribir(R.bocL1, "¿Músculo", t, T.preguntar, mitad);
      escribir(R.bocL2, "siendo vegano?", t, mitad, fin);
      R.bocFondo.setAttribute("d", bocadilloPath(1220, 900, 520, 190));
    }

    // ── los dos últimos botes: caen en el mostrador y luego van a la bolsa ──
    const caer = (t0) => {
      if (t < t0 - 0.32) return { y: -900, sq: 1, o: 0 };
      const u = clamp((t - (t0 - 0.32)) / 0.32);
      const y = lerp(-520, 0, EZ.i(u));
      const r = t - t0;
      const sq = r > 0 && r < 0.3 ? 1 - 0.18 * Math.sin((r / 0.3) * Math.PI) * (1 - r / 0.3) : 1;
      return { y, sq, o: 1 };
    };
    const aLaBolsa = (t0, x0, y0) => {
      const u = pr(t, t0, 0.45, EZ.io);
      if (u <= 0) return null;
      const bx = hc.manoL.x,
        by = hc.manoL.y + 60;
      const x = lerp(x0, bx, u),
        y = lerp(y0, by, u) - Math.sin(u * Math.PI) * 220;
      return { x: x - x0, y: y - y0, s: lerp(1, 0.25, u), o: u > 0.92 ? 0 : 1 };
    };
    for (const [el, x0, t0, tb] of [[R.veg, 700, T.dos1, T.pago + 0.45], [R.b12, 1260, T.botes1, T.pago + 0.53]]) {
      const a = caer(t0),
        b = aLaBolsa(tb, x0, 1470);
      const s = b ? b.s : 1;
      el.setAttribute("transform", `translate(${f2(x0 + (b ? b.x : 0))} ${f2(1470 + a.y + (b ? b.y : 0))}) scale(${f2((2 - a.sq) * s)} ${f2(a.sq * s)})`);
      setOp(el, b ? b.o : a.o);
    }
    popEl(R.badge1, t, T.uno1, 630, 1262, 0.35);
    popEl(R.badge2, t, T.dos2, 1182, 1242, 0.35);
    R.subVeg.setAttribute("transform", `scale(${f2(pr(t, T.proteina1, 0.4, EZ.o))} 1)`);
    R.subB12.setAttribute("transform", `scale(${f2(pr(t, T.b, 0.4, EZ.o))} 1)`);

    // ── tarjeta A: proteína vegetal ──
    {
      popEl(R.cardA, t, T.vegetal - 0.05, 660, 836, 0.4);
      R.cardAF.setAttribute(
        "height",
        f2(K(t, [[T.guisante - 0.08, 110], [T.guisante + 0.25, 165, "backS"], [T.cacito - 0.08, 165], [T.cacito + 0.25, 285, "backS"], [T.ganar - 0.1, 285], [T.ganar + 0.3, 450, "backS"]])),
      );
      popEl(R.aHoja, t, T.vegetal, 560, 836, 0.35);
      popEl(R.aGuisante, t, T.guisante, 556, 906, 0.35);
      popEl(R.aArroz, t, T.arroz, 778, 906, 0.35);
      popEl(R.aCacito, t, T.cacito, 560, 966, 0.35);
      popEl(R.aDespues, t, T.despues, 620, 1030, 0.35);
      popEl(R.aMusculo, t, T.ganar, 600, 1128, 0.35);
      R.aBarra.setAttribute("width", f2(300 * pr(t, T.ganar + 0.05, 0.6, EZ.o)));
      // la flecha hacia arriba se convierte en escudo: ganar → no perderlo
      const pf = pop(t, T.ganar, 0.35);
      const sale = 1 - pr(t, T.perderlo - 0.02, 0.16, EZ.i);
      R.aFlecha.setAttribute("transform", `translate(820 1124) scale(${f2(pf.s * sale)}) translate(-820 -1124)`);
      setOp(R.aFlecha, pf.o * sale);
      popEl(R.aEscudo, t, T.perderlo, 820, 1124, 0.35);
      popEl(R.aVenga, t, T.venga1, 660, 1198, 0.35);
    }
    // ── tarjeta B: vitamina B12 ──
    {
      popEl(R.cardB, t, T.vitamina - 0.05, 1320, 832, 0.4);
      R.cardBF.setAttribute(
        "height",
        f2(K(t, [[T.vegano2 - 0.08, 105], [T.vegano2 + 0.25, 180, "backS"], [T.faltar - 0.08, 180], [T.faltar + 0.25, 262, "backS"], [T.cansancio - 0.1, 262], [T.cansancio + 0.3, 425, "backS"]])),
      );
      popEl(R.bPastilla, t, T.vitamina, 1300, 836, 0.35);
      popEl(R.bVegano, t, T.vegano2, 1300, 922, 0.35);
      popEl(R.bFalta, t, T.faltar, 1320, 993, 0.35);
      popEl(R.bPila, t, T.cansancio, 1200, 1100, 0.4);
      const nivel = lerp(0.15, 1, pr(t, T.cansancio + 0.15, 0.7, EZ.o));
      R.bPilaNivel.setAttribute("width", f2(152 * nivel));
      R.bPilaNivel.setAttribute("fill", mezclaColor("#EF4444", "#22C55E", clamp((nivel - 0.15) / 0.7)));
      setOp(R.bRayo, clamp((nivel - 0.85) / 0.15));
      popEl(R.bGlobulos, t, T.globulos, 1440, 1120, 0.4);
    }
    // ── «Y lo de siempre: sin entrenar, nada.» ──
    {
      const pg = pop(t, T.sin - 0.1, 0.4);
      // «un mismo consejo»: la tarjeta late… y con «Entrena» se convierte en la lista del consejo
      const latido = 1 + 0.07 * Math.sin(clamp((t - T.consejo) / 0.4) * Math.PI);
      R.regla.setAttribute("transform", `translate(1460 290) scale(${f2(pg.s * latido)}) translate(-1460 -290)`);
      setOp(R.regla, pg.o);
      const sale = popOut(t, T.entrena - 0.1, 0.15);
      for (const [el, t0, x, y] of [[R.rEntrenar, T.entrenar2, 1100, 290], [R.rMas, T.nada, 1460, 280], [R.rBotes, T.nada, 1820, 290]]) {
        const p = popEl(el, t, t0, x, y, 0.35);
        setOp(el, p.o * sale);
      }
      const f = K(t, [
        [T.entrena - 0.08, { x: 640, y: 140, w: 1640, h: 300 }],
        [T.entrena + 0.25, { x: 1000, y: 120, w: 920, h: 380 }, "backS"],
      ]);
      R.reglaFondo.setAttribute("x", f2(f.x));
      R.reglaFondo.setAttribute("y", f2(f.y));
      R.reglaFondo.setAttribute("width", f2(f.w));
      R.reglaFondo.setAttribute("height", f2(f.h));
    }

    // ── pagar ──
    {
      const pd = pr(t, T.pago - 0.3, 0.3, EZ.o) * (1 - pr(t, T.pago + 0.75, 0.3, EZ.i));
      R.datafono.setAttribute("transform", `translate(${f2(hd.manoR.x)} ${f2(hd.manoR.y)}) scale(${f2(pd)})`);
      setOp(R.datafono, pd > 0.02 ? 1 : 0);
      setOp(R.datPantalla, pr(t, T.pago, 0.15));
      // el móvil: paga con él
      if (t < T.semana1) {
        const pm = pr(t, T.pago - 0.25, 0.25, EZ.o) * (1 - pr(t, T.pago + 0.45, 0.25, EZ.i));
        R.movil.setAttribute("transform", `translate(${f2(hc.manoR.x)} ${f2(hc.manoR.y)}) scale(${f2(pm)})`);
        setOp(R.movil, pm > 0.02 ? 1 : 0);
      } else setOp(R.movil, 0);
      // la línea del suelo brilla bajo el compañero al ir y al volver
      const L1 = R.lineaBrillo.__len,
        L2 = R.lineaIda.__len;
      const vaA = t > T.asi2 - 0.1 && t < T.preguntar + 0.9;
      R.lineaBrillo.setAttribute("stroke-dashoffset", f2(L1 * (1 - (vaA ? clamp((COMP_INI - sc.x) / (COMP_INI - 1640)) : 0))));
      setOp(R.lineaBrillo, vaA ? 1 - pr(t, T.preguntar + 0.3, 0.6) : 0);
      const vuelve = t > T.fue2 && t < T.semana1 + 0.6;
      R.lineaIda.setAttribute("stroke-dashoffset", f2(L2 * (1 - (vuelve ? clamp((sc.x - 1640) / 1810) : 0))));
      setOp(R.lineaIda, vuelve ? 1 - pr(t, T.semana1, 0.6) : 0);
    }

    // ── gimnasio ──
    {
      const semana = K(t, [
        [T.uno2 - 0.02, 12],
        [T.uno2 + 0.45, 1, "io"],
        [T.cuatro1 - 0.05, 1],
        [T.cuatro1 + 0.4, 4, "io"],
        [T.ocho - 0.05, 4],
        [T.ocho + 0.4, 8, "io"],
      ]);
      const decenas = semana < 9 ? 0 : semana >= 10 ? 1 : semana - 9;
      R.marcadorU.setAttribute("transform", `translate(0 ${f2(-semana * 150)})`);
      R.marcadorD.setAttribute("transform", `translate(0 ${f2(-decenas * 150)})`);
      // la barra del compañero: en el suelo, en sus manos y, en la semana ocho, doblada
      const manos = enManos(t);
      const flex = pr(t, T.ocho + 0.05, 0.6, EZ.io);
      const suelo = { x: COMP_GYM, y: SUELO - 92 - 60 * flex };
      const mano = { x: (hc.manoL.x + hc.manoR.x) / 2, y: (hc.manoL.y + hc.manoR.y) / 2 };
      const bx = lerp(suelo.x, mano.x, manos),
        by = lerp(suelo.y, mano.y, manos);
      const disco = (t0) => {
        if (t0 === null) return { s: 1, o: 1 };
        const p = pop(t, t0, 0.3);
        return { s: p.s, o: p.o };
      };
      const discos = [null, null, T.cuatro1 + 0.1, T.cuatro1 + 0.1, T.ocho + 0.1, T.ocho + 0.1].map(disco);
      barra(R.barraF, t, { x: bx - 1, y: by }, { x: bx + 1, y: by }, flex, discos);
      setOp(R.barraF.root, 1);
      barra(R.barraV, t, { x: 9000, y: 0 }, { x: 9100, y: 0 }, 0, [{ s: 0, o: 0 }, { s: 0, o: 0 }]);
      setOp(R.barraV.root, 0);
      for (const l of R.luces) setOp(l, 1);
      setOp(R.oscuro, 0);
      setOp(R.neonGym, 0.9 + 0.1 * Math.sin(t * 2.7));
      setOp(R.neonGymOff, 0);
    }

    // ── un mismo consejo: entrena, come bien y descansa ──
    {
      setOp(R.consejo, t >= T.entrena - 0.08 ? 1 : 0);
      popEl(R.cEntrena, t, T.entrena, 1110, 190, 0.35);
      popEl(R.cCome, t, T.come, 1110, 310, 0.35);
      popEl(R.cDescansa, t, T.descansa, 1110, 430, 0.35);
    }
    // ── «ya sabes dónde encontrarlo»: el logo de la puerta crece en su sitio ──
    {
      const crece = pr(t, T.encontrarlo, 0.45, EZ.back);
      const vuelve = pr(t, T.siguenos - 0.05, 0.4, EZ.io);
      const late = t > T.encontrarlo + 0.45 && t < T.siguenos ? 1 + 0.035 * Math.sin((t - T.encontrarlo - 0.45) * 7) : 1;
      const r = lerp(lerp(74, 175, crece), 74, vuelve) * late;
      R.logoGrande.setAttribute("transform", `translate(2341 1400) scale(${f2(r / 100)})`);
      setOp(R.logoGrande, t >= T.encontrarlo && vuelve < 0.999 ? 1 : 0);
    }

    // ── tarjeta final: seguir ──
    {
      popEl(R.seguir, t, T.siguenos, 1460, 280, 0.45);
      popEl(R.chipP2, t, T.siguenos + 0.15, 830, 370, 0.35);
      popEl(R.chipP3, t, T.venga3, 1350, 370, 0.35);
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