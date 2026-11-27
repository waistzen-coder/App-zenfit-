// Motor del mundo de IronFuel · tercera parte (el abuelo: colágeno con vitamina C y vitamina D). build.mjs lo incrusta en compositions/mundo.html.
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

  // ───────────────────────── cámara (tercera parte: el abuelo) ─────────────────────────
  // [t, x, y, zoom, ease]: el punto (x, y) del mundo cae en (540, 960) de la pantalla
  const CAM = [
    [0, 2690, 1390, 0.95],
    [0.4, 2750, 1430, 1.25, "expo"],
    [T.puerta + 0.1, 2870, 1470, 1.42, "io"],
    [T.pero + 0.15, 3150, 1300, 0.85, "io"],
    [T.apuntarse + 0.4, 3060, 1250, 0.92, "s"],
    [T.asi + 0.05, 2900, 1320, 0.95, "s"],
    [T.tienda + 0.3, 2150, 1360, 0.9, "io"],
    [T.pidio + 0.3, 1330, 1380, 1.03, "io3"],
    [T.chaval2Fin, 1330, 1385, 1.03, "s"],
    [T.saco + 0.1, 1180, 1370, 1.0, "io"],
    [T.botes + 0.4, 1110, 1360, 0.95, "s"],
    [T.uno1 + 0.2, 680, 1120, 1.5, "io3"],
    [T.normalidadFin + 0.1, 680, 1118, 1.52, "s"],
    [T.dos2 + 0.25, 1310, 1120, 1.5, "io3"],
    [T.normalesFin + 0.3, 1310, 1122, 1.53, "s"],
    [T.dijo + 0.05, 1000, 1180, 0.98, "io"],
    [T.siempre + 0.1, 1000, 1250, 1.36, "io3"],
    [T.abuelo2 + 0.3, 1010, 1250, 1.4, "s"],
    [T.medico, 1460, 820, 0.55, "io3"],
    [T.nada + 0.4, 1460, 828, 0.56, "s"],
    [T.pago + 0.22, 1430, 1330, 1.0, "io3"],
    [T.fue, 1460, 1330, 1.0, "s"],
    [T.fue + 0.45, 2200, 1370, 0.9, "io"],
    [T.ritmo + 0.55, 3300, 1310, 0.95, "io"],
    [T.semana1 + 0.15, 3480, 1300, 1.0, "io3"],
    [T.cuatro + 0.3, 3500, 1300, 1.0, "s"],
    [T.descanso, 3600, 1300, 0.95, "io"],
    [T.chaval4 + 0.05, 3620, 1310, 1.02, "o"],
    [T.vecina - 0.15, 3560, 1300, 0.98, "s"],
    [T.vecina + 0.45, 2200, 1360, 0.9, "io3"],
    [T.pidio2Fin, 2200, 1350, 0.92, "s"],
    [T.siguenos + 0.25, 1460, 1070, 0.51, "io3"],
    [D, 1460, 1065, 0.505, "s"],
  ];
  // sacudidas: [inicio, duración, amplitud px]
  const SACUDIDAS = [
    [0.0, 0.4, 12],
    [T.descanso, 0.3, 10],
    [T.chaval4, 0.55, 22],
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

  // ─────────────── coreografía de la tercera parte (el abuelo) ───────────────
  const PUERTA = 2340;
  const SITIO = 1600; // delante del mostrador
  const BARRA_X = 3450; // donde levanta el chaval al principio
  const ABU_GYM = 3330; // donde hace las sentadillas el abuelo
  const COACH = 3640; // el chaval, enseñándole
  const BANCO = 3900; // donde acaba sentado el chaval
  const mezclaP = (a, b, u) => {
    const o = {};
    for (const k in a) o[k] = lerp(a[k], b[k], u);
    return o;
  };
  const rep = (t, periodo, fase = 0) => EZ.s((Math.sin(((t + fase) * TAU) / periodo - Math.PI / 2) + 1) / 2);
  POSES.frente = { aL: 84, eL: 0, aR: 84, eR: 0 };
  // sentadilla: q = 0 de pie, 1 abajo del todo
  const sentadilla = (q) => ({ L: 72 * q, R: 72 * q, kL: 108 * q, kR: 108 * q });

  // ── el abuelo ──
  const AX = [
    [0, 2600],
    [T.puerta + 0.2, 2880, "o"],
    [T.asi - 0.05, 2880],
    [T.tienda + 0.25, PUERTA, "io"],
    [T.pidio - 0.1, SITIO, "o"],
    [T.fue, SITIO],
    [T.fue + 0.45, PUERTA, "i"],
    [T.ritmo, 2520, "lin"],
    [T.ritmo + 0.5, ABU_GYM, "o"],
  ];
  const ACARA = [
    [0, 1],
    [T.asi - 0.08, 1],
    [T.asi + 0.05, -1, "io"],
    [T.fue - 0.05, -1],
    [T.fue + 0.07, 1, "io"],
  ];
  function abuelo(t) {
    const x = K(t, AX),
      v = vel(AX, t);
    let face = K(t, ACARA);
    const giro = Math.abs(face);
    face = face >= 0 ? 1 : -1;
    let pose = P("baston"),
      gesto = G("sonrisa"),
      habla = false,
      agache = 0,
      cabeza = 0,
      lean = 5,
      mx = 0.6,
      my = 0,
      piernas = null,
      ojos = 1,
      correr = Math.abs(v) > 900;
    // las rodillas crujen
    for (const tc of [T.crujian, T.puerta]) {
      if (t > tc && t < tc + 0.45) {
        const u = Math.sin(((t - tc) / 0.45) * Math.PI);
        agache = Math.max(agache, 22 * u);
        gesto = G("pena");
      }
    }
    if (t > T.visto && t < T.asi) (mx = 1), (gesto = t > T.chaval1 ? G("wow") : G("sonrisa")), (ojos = t > T.chaval1 && t < T.apuntarse ? 1.2 : 1);
    if (t > T.apuntarse - 0.1 && t < T.asi)
      (pose = K(t, [
        [T.apuntarse - 0.1, P("baston")],
        [T.apuntarse + 0.2, P("bastonArriba"), "back"],
      ])),
        (gesto = G("orgullo"));
    if (t > T.pidio - 0.1 && t < T.fue) {
      mx = 0.8;
      habla = t > T.pidio - 0.05 && t < T.chaval2Fin + 0.1;
      gesto = G("sonrisa");
      if (t > T.dos1 && t < T.botes + 0.6) (gesto = G("wow")), (my = 0.5);
      if (t > T.uno1 && t < T.dijo) (mx = 0.2), (my = -0.6);
      if (t > T.dijo && t < T.pago) (gesto = G("serio")), (mx = 0.9), (cabeza = t > T.duele && t < T.nada + 0.5 ? Math.sin((t - T.duele) * 9) * 5 : 0);
      if (t > T.medico - 0.2 && t < T.pago) (mx = 0), (my = -1);
      pose = K(t, [
        [T.pago - 0.25, P("baston")],
        [T.pago, P("pagar"), "io"],
        [T.pago + 0.4, P("pagar")],
        [T.pago + 0.65, P("baston"), "io"],
      ]);
    }
    if (t > T.ritmo - 0.05 && t < T.semana1) (gesto = G("orgullo")), (lean = 12);
    if (t > T.semana1) {
      // en el gimnasio: sentadillas
      face = 1;
      mx = 0.9;
      lean = 0;
      let q = 0;
      if (t < T.semana2) {
        q = t > T.sentadilla - 0.1 ? 0.55 * rep(t - T.sentadilla, 1.7) : 0;
        pose = P("baston");
        gesto = q > 0.3 ? G("esfuerzo") : G("sonrisa");
      } else if (t < T.semana3) {
        q = t > T.agarrarse - 0.15 ? 0.85 * rep(t - T.agarrarse, 1.4) : 0.3 * rep(t, 1.6);
        pose = mezclaP(P("brazos"), POSES.frente, t > T.agarrarse - 0.15 ? 1 : 0.4);
        gesto = G("orgullo");
      } else {
        q = 0.95 * rep(t, 0.95);
        pose = POSES.frente;
        gesto = G("orgullo");
      }
      piernas = sentadilla(q);
      agache = 118 * q;
      lean = 14 * q;
    }
    const sq = 0.88 + 0.12 * giro;
    return { x, y: SUELO, s: 0.9, face, sqx: sq, m: PJ.abu.m0, v, pose, gesto, habla, agache, cabeza, lean, mx, my, piernas, ojos, correr };
  }

  // ── el chaval: levanta al principio, le enseña la sentadilla y acaba en el banco ──
  const FX = [
    [0, BARRA_X],
    [T.semana1 - 0.5, BARRA_X],
    [T.semana1 - 0.49, COACH, "step"],
    [T.descanso - 0.05, COACH],
    [T.descanso + 0.4, BANCO, "io"],
  ];
  function flaco(t) {
    const x = K(t, FX),
      v = t > T.semana1 ? vel(FX, t) : 0;
    let face = t < T.semana1 ? 1 : -1;
    let pose = P("brazos"),
      gesto = G("orgullo"),
      agache = 0,
      lean = 0,
      mx = 0.6,
      my = 0,
      piernas = null,
      parpado = 1,
      habla = false;
    if (t < T.semana1) {
      pose = mezclaP(P("cargar"), P("arriba"), rep(t, 1.2));
      piernas = { L: -6, R: -6, kL: 6, kR: 6 };
      mx = 0.2;
      my = -0.3;
    } else if (t < T.descanso) {
      // le enseña: hace la sentadilla con él
      const q = t > T.sentadilla - 0.1 && t < T.semana2 ? 0.8 * rep(t - T.sentadilla, 1.7) : 0;
      piernas = sentadilla(q);
      agache = 118 * q;
      lean = 14 * q;
      pose = q > 0 ? POSES.frente : t > T.agarrarse ? P("manos") : P("brazos");
      habla = t > T.chaval3 && t < T.sentadilla + 0.6;
      gesto = t > T.agarrarse ? G("wow") : G("sonrisa");
      mx = 0.9;
    } else {
      // pide descanso: se sienta en el banco, sin pilas
      face = t < T.descanso + 0.4 ? 1 : -1;
      const u = pr(t, T.descanso + 0.3, 0.35, EZ.io);
      piernas = { L: 90 * u, R: 90 * u, kL: 90 * u, kR: 90 * u };
      agache = 126 * u;
      lean = 12 * u;
      parpado = lerp(1, 0.5, u);
      gesto = G("pena");
      my = 0.6 * u;
      mx = 0.8;
    }
    return { x, y: SUELO, s: 1.08, face, m: 1, v, pose, gesto, agache, lean, mx, my, piernas, parpado, habla, correr: false };
  }
  // la pila del pecho: llena al principio, en rojo cuando pide descanso
  const PILA = [
    [T.descanso, 1],
    [T.descanso + 0.6, 0.12, "io"],
  ];
  function pilaVisible(t) {
    return t < T.asi ? 1 : pop(t, T.descanso, 0.3).o;
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
    if (t > T.pidio && t < T.chaval2Fin + 0.3) my = Math.sin(((t - T.pidio) / 1.2) * Math.PI) * 0.6;
    if (t > T.chaval2) (gesto = G("ceja")), (cejaR = -8);
    if (t > T.saco - 0.05) {
      const u = (t - T.saco + 0.05) / 0.55;
      agache = u < 1 ? Math.sin(u * Math.PI) * 120 : 0;
      gesto = G("sonrisa");
      pose = K(t, [
        [T.saco, P("reposo")],
        [T.dos1 - 0.02, P("manos"), "io"],
        [T.botes + 0.4, P("manos")],
        [T.botes + 0.8, P("reposo"), "io"],
      ]);
    }
    if (t > T.uno1) (mx = -0.2), (my = 0.4);
    if (t > T.dos2) mx = 0.6;
    if (t > T.dijo) {
      gesto = G("serio");
      habla = t < T.nada + 0.5;
      lean = K(t, [
        [T.dijo, 0],
        [T.siempre, 9, "io"],
        [T.nada + 0.5, 9],
        [T.nada + 0.8, 0, "io"],
      ]);
      pose = K(t, [
        [T.dijo, P("reposo")],
        [T.siempre, P("explica"), "back"],
        [T.nada + 0.5, P("explica")],
        [T.nada + 0.8, P("reposo"), "io"],
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

  // la vecina del quinto asoma por la puerta
  const VEX = [
    [0, PUERTA],
    [T.vecina - 0.05, PUERTA],
    [T.quinto + 0.35, 2160, "o"],
  ];
  function vecina(t) {
    const x = K(t, VEX),
      v = vel(VEX, t);
    const pose = K(t, [
      [T.pidio2 - 0.15, P("brazos")],
      [T.pidio2 + 0.15, P("manos"), "back"],
    ]);
    return { x, y: SUELO, s: 0.95, face: -1, m: PJ.vec.m0, v, pose, gesto: t > T.pidio2 ? G("ceja") : G("sonrisa"), mx: -0.6, my: -0.2, cejaR: t > T.pidio2 ? -8 : 0, oculto: t < T.vecina - 0.05 };
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

  // ─────────────── referencias ───────────────
  let R = null;
  function init() {
    for (const id of Object.keys(PJ)) initPJ(id);
    R = {
      svg: $("mundo-svg"), cam: $("cam"), fondo: $("fondo-lejano"),
      puerta: $("puerta-hoja"), neonTienda: $("neon-tienda"), reflejo: $("reflejo"),
      bocadillo: $("bocadillo"), bocFondo: $("bocadillo-fondo"), bocL1: $("boc-l1"), bocL2: $("boc-l2"),
      magiaColor: $("magia-color"), magiaGris: $("magia-gris"), magiaChispas: $("magia-chispas"), magiaX: $("magia-x"),
      colageno: $("bote-colageno"), vitd: $("bote-vitd"), subColageno: $("sub-colageno"), subVitd: $("sub-vitd"), badge1: $("badge-1"), badge2: $("badge-2"),
      cardA: $("card-a"), cardAF: $("card-a-fondo"), aToma: $("a-toma"), aDia: $("a-dia"), aAgua: $("a-agua"), aAguaNivel: $("a-agua-nivel"),
      aRodilla: $("a-rodilla"), aCartilago: $("a-cartilago"), aVitc: $("a-vitc"), aColageno: $("a-colageno"), aCartilagos: $("a-cartilagos"),
      cardB: $("card-b"), cardBF: $("card-b-fondo"), bPastilla: $("b-pastilla"), bCapsula: $("b-capsula"), bComida: $("b-comida"), bHuesos: $("b-huesos"), bMusculos: $("b-musculos"),
      regla: $("regla"), rMedico: $("r-medico"), rEntrenar: $("r-entrenar"), rBotes: $("r-botes"), rFl1: $("r-fl1"), rFl2: $("r-fl2"),
      pensamiento: $("pensamiento"), crujidos: $("crujidos"), pregunta: $("pregunta"),
      seguir: $("seguir"), chipP2: $("chip-p2"), chipP3: $("chip-p3"), botonFondo: $("boton-fondo"),
      botonSeguir: $("boton-seguir-txt"), botonSiguiendo: $("boton-siguiendo"), dedo: $("dedo-tap"),
      datafono: $("datafono"), datPantalla: $("datafono-ok"), movil: $("movil"), bolsa: $("bolsa"), bolsaAbu: $("bolsa-abu"),
      pila: $("pila"), pilaNivel: $("pila-nivel"), pilaRayo: $("pila-rayo"), estelas: $("estelas"), baston: $("baston"),
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
    const sa = abuelo(t);
    const ha = dibujarPJ("abu", sa, t);
    const sf = flaco(t);
    const hf = dibujarPJ("flaco", sf, t);
    const sd = dependiente(t);
    const hd = dibujarPJ("dep", sd, t);
    const sv = vecina(t);
    const hv = dibujarPJ("vec", sv, t);
    dibujarPJ("comp", fuera("comp"), t);
    dibujarPJ("gym", fuera("gym"), t);
    // bastón: en la mano; en el gimnasio, apoyado en el soporte cuando ya no se agarra
    if (t < T.cuatro) R.baston.setAttribute("transform", `translate(${f2(ha.manoR.x)} ${f2(ha.manoR.y)}) rotate(${f2(sa.pose.aR > 90 ? -150 : 8)})`);
    else R.baston.setAttribute("transform", "translate(3110 1560) rotate(14)");
    setOp(R.baston, 1);
    // bolsa del abuelo: en la mano tras pagar; en el gimnasio, en el suelo
    {
      const pb = pop(t, T.pago + 0.4, 0.35);
      const enMano = t < T.semana1;
      R.bolsaAbu.setAttribute("transform", enMano ? `translate(${f2(ha.manoL.x)} ${f2(ha.manoL.y)}) scale(${f2(pb.s)})` : `translate(3050 ${SUELO - 128})`);
      setOp(R.bolsaAbu, pb.o);
      setOp(R.bolsa, 0);
    }
    // estelas: el abuelo «a su ritmo»
    R.estelas.setAttribute("transform", `translate(${f2(sa.x - sa.face * 140)} ${SUELO - 300}) scale(${-sa.face} 1)`);
    setOp(R.estelas, clamp((Math.abs(sa.v) - 900) / 700) * 0.9);

    // ── la pila del pecho del chaval ──
    {
      const nivel = K(t, PILA);
      R.pila.setAttribute("transform", `translate(${f2(hf.cabeza.x + 4 * sf.face)} ${f2(hf.cabeza.y + 215 + sf.agache * 0.7)}) scale(0.85)`);
      setOp(R.pila, pilaVisible(t));
      R.pilaNivel.setAttribute("width", f2(126 * nivel));
      R.pilaNivel.setAttribute("fill", mezclaColor("#EF4444", "#22C55E", clamp((nivel - 0.15) / 0.7)));
      setOp(R.pilaRayo, clamp((nivel - 0.85) / 0.15));
    }

    // ── crujidos en las rodillas ──
    {
      const k1 = pop(t, T.crujian, 0.2).o * popOut(t, T.crujian + 0.5, 0.2);
      const k2 = pop(t, T.puerta, 0.2).o * popOut(t, T.vieja + 0.5, 0.25);
      const o = Math.max(k1, k2) * (0.7 + 0.3 * Math.sin(t * 40));
      R.crujidos.setAttribute("transform", `translate(${f2(sa.x)} ${f2(SUELO - 135 * 0.9 + sa.agache)})`);
      setOp(R.crujidos, o);
    }
    // ── «¡yo también!» ──
    {
      const p = pop(t, T.apuntarse - 0.05, 0.35);
      R.pensamiento.setAttribute("transform", `translate(2960 1050) scale(${f2(p.s)}) translate(-2960 -1050)`);
      setOp(R.pensamiento, p.o * popOut(t, T.asi + 0.1));
    }

    // ── tienda ──
    const cerca = (x) => clamp(1 - (Math.abs(x - PUERTA) - 60) / 140);
    let abierta = Math.abs(sa.v) > 30 ? cerca(sa.x) : 0;
    if (!sv.oculto && Math.abs(sv.v) > 30) abierta = Math.max(abierta, cerca(sv.x));
    R.puerta.setAttribute("transform", `translate(2470 0) scale(${f2(1 - 0.82 * EZ.o(abierta))} 1) translate(-2470 0)`);
    setOp(R.neonTienda, clamp(0.85 + 0.15 * Math.sin(t * 2.1) + (t > T.siguenos ? 0.2 : 0), 0, 1));
    setOp(R.reflejo, 0.5 - 0.3 * clamp((c.z - 0.9) / 0.6));
    setOp(R.magiaColor, 0);
    setOp(R.magiaGris, 1);
    setOp(R.magiaChispas, 0);
    setOp(R.magiaX, 1);

    // ── bocadillo: «Lo mismo que el chaval» ──
    {
      const p = pop(t, T.pidio - 0.04, 0.3);
      const k = p.s * (0.7 + 0.3 * popOut(t, T.dependiente - 0.05));
      R.bocadillo.setAttribute("transform", `translate(1480 1160) scale(${f2(k)}) translate(-1480 -1160)`);
      setOp(R.bocadillo, p.o * popOut(t, T.dependiente - 0.05));
      const mitad = (T.pidio + T.chaval2Fin) / 2;
      escribir(R.bocL1, "Lo mismo que", t, T.pidio, mitad);
      escribir(R.bocL2, "el chaval.", t, mitad, T.chaval2Fin);
      R.bocFondo.setAttribute("d", bocadilloPath(1220, 900, 520, 190));
    }

    // ── dos botes que caen y luego van a la bolsa del abuelo ──
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
      const bx = ha.manoL.x,
        by = ha.manoL.y + 60;
      const x = lerp(x0, bx, u),
        y = lerp(y0, by, u) - Math.sin(u * Math.PI) * 220;
      return { x: x - x0, y: y - y0, s: lerp(1, 0.25, u), o: u > 0.92 ? 0 : 1 };
    };
    for (const [el, x0, t0, tb] of [[R.colageno, 700, T.dos1, T.pago + 0.45], [R.vitd, 1260, T.botes, T.pago + 0.53]]) {
      const a = caer(t0),
        b = aLaBolsa(tb, x0, 1470);
      const s = b ? b.s : 1;
      el.setAttribute("transform", `translate(${f2(x0 + (b ? b.x : 0))} ${f2(1470 + a.y + (b ? b.y : 0))}) scale(${f2((2 - a.sq) * s)} ${f2(a.sq * s)})`);
      setOp(el, b ? b.o : a.o);
    }
    popEl(R.badge1, t, T.uno1, 630, 1262, 0.35);
    popEl(R.badge2, t, T.dos2, 1182, 1242, 0.35);
    R.subColageno.setAttribute("transform", `scale(${f2(pr(t, T.colageno1, 0.4, EZ.o))} 1)`);
    R.subVitd.setAttribute("transform", `scale(${f2(pr(t, T.vitamina3, 0.4, EZ.o))} 1)`);

    // ── tarjeta A: colágeno con vitamina C ──
    {
      popEl(R.cardA, t, T.una1 - 0.05, 660, 845, 0.4);
      R.cardAF.setAttribute("height", f2(K(t, [[T.agua - 0.08, 120], [T.agua + 0.25, 240, "backS"], [T.vitamina2 - 0.1, 240], [T.vitamina2 + 0.3, 420, "backS"]])));
      popEl(R.aToma, t, T.una1, 466, 840, 0.35);
      popEl(R.aDia, t, T.dia, 650, 840, 0.35);
      popEl(R.aAgua, t, T.agua, 560, 960, 0.35);
      const n = pr(t, T.agua + 0.1, 0.5, EZ.o);
      R.aAguaNivel.setAttribute("y", f2(1003 - 80 * n));
      R.aAguaNivel.setAttribute("height", f2(80 * n));
      popEl(R.aRodilla, t, T.vitamina2, 480, 1117, 0.35);
      popEl(R.aVitc, t, T.vitamina2, 700, 1060, 0.35);
      popEl(R.aColageno, t, T.colageno2, 680, 1120, 0.35);
      popEl(R.aCartilagos, t, T.cartilagos, 690, 1175, 0.35);
      const u = pr(t, T.cartilagos, 0.45, EZ.backS);
      R.aCartilago.setAttribute("transform", `translate(480 1125) scale(${f2(lerp(0.35, 1, u))} 1) translate(-480 -1125)`);
      R.aCartilago.setAttribute("fill", mezclaColor("#C9CED6", "#5AB0FF", clamp(u)));
    }
    // ── tarjeta B: vitamina D ──
    {
      popEl(R.cardB, t, T.una2 - 0.05, 1320, 845, 0.4);
      R.cardBF.setAttribute("height", f2(K(t, [[T.comida - 0.08, 105], [T.comida + 0.25, 180, "backS"], [T.huesos - 0.1, 180], [T.huesos + 0.3, 360, "backS"]])));
      popEl(R.bPastilla, t, T.una2, 1126, 836, 0.35);
      popEl(R.bCapsula, t, T.capsula, 1260, 840, 0.35);
      popEl(R.bComida, t, T.comida, 1300, 916, 0.35);
      popEl(R.bHuesos, t, T.huesos, 1200, 1040, 0.4);
      popEl(R.bMusculos, t, T.musculos, 1440, 1040, 0.4);
    }
    // ── «Si algo te duele, primero al médico. Y sin entrenar, nada.» ──
    {
      popEl(R.regla, t, T.medico - 0.05, 1460, 290, 0.4);
      popEl(R.rMedico, t, T.medico, 980, 290, 0.35);
      popEl(R.rFl1, t, T.entrenar - 0.05, 1220, 270, 0.3);
      popEl(R.rEntrenar, t, T.entrenar, 1460, 290, 0.35);
      popEl(R.rFl2, t, T.nada - 0.05, 1700, 270, 0.3);
      popEl(R.rBotes, t, T.nada, 1940, 290, 0.35);
    }

    // ── pagar ──
    {
      const pd = pr(t, T.pago - 0.3, 0.3, EZ.o) * (1 - pr(t, T.pago + 0.75, 0.3, EZ.i));
      R.datafono.setAttribute("transform", `translate(${f2(hd.manoR.x)} ${f2(hd.manoR.y)}) scale(${f2(pd)})`);
      setOp(R.datafono, pd > 0.02 ? 1 : 0);
      setOp(R.datPantalla, pr(t, T.pago, 0.15));
      const pm = pr(t, T.pago - 0.25, 0.25, EZ.o) * (1 - pr(t, T.pago + 0.45, 0.25, EZ.i));
      R.movil.setAttribute("transform", `translate(${f2(ha.manoR.x)} ${f2(ha.manoR.y)}) scale(${f2(pm)})`);
      setOp(R.movil, pm > 0.02 ? 1 : 0);
      // la línea del suelo brilla bajo el abuelo al ir y volver
      const L = R.lineaBrillo.__len;
      const ida1 = t > T.asi && t < T.pidio + 0.6 ? clamp((3450 - sa.x) / 1810) : 0;
      R.lineaBrillo.setAttribute("stroke-dashoffset", f2(L * (1 - ida1)));
      setOp(R.lineaBrillo, t > T.asi && t < T.pidio + 0.6 ? 1 - pr(t, T.pidio, 0.6) : 0);
      const ida2 = t > T.fue && t < T.semana1 + 0.6 ? clamp((sa.x - 1640) / 1810) : 0;
      R.lineaIda.setAttribute("stroke-dashoffset", f2(L * (1 - ida2)));
      setOp(R.lineaIda, t > T.fue && t < T.semana1 + 0.6 ? 1 - pr(t, T.semana1, 0.6) : 0);
    }

    // ── gimnasio ──
    {
      const semana = K(t, [
        [T.uno2 - 0.02, 12],
        [T.uno2 + 0.45, 1, "io"],
        [T.cuatro - 0.05, 1],
        [T.cuatro + 0.4, 4, "io"],
        [T.ocho - 0.05, 4],
        [T.ocho + 0.4, 8, "io"],
      ]);
      const decenas = semana < 9 ? 0 : semana >= 10 ? 1 : semana - 9;
      R.marcadorU.setAttribute("transform", `translate(0 ${f2(-semana * 150)})`);
      R.marcadorD.setAttribute("transform", `translate(0 ${f2(-decenas * 150)})`);
      const discos = [0, 1, 2, 3, 4, 5].map(() => ({ s: 1, o: 1 }));
      // la barra (doblada desde la primera parte): en sus manos al principio; luego, en el suelo
      if (t < T.asi) barra(R.barraF, t, hf.manoL, hf.manoR, 1, discos);
      else barra(R.barraF, t, { x: 4130, y: SUELO - 104 }, { x: 4390, y: SUELO - 104 }, 1, discos);
      barra(R.barraV, t, { x: 9000, y: 0 }, { x: 9100, y: 0 }, 0, [{ s: 0, o: 0 }, { s: 0, o: 0 }]);
      setOp(R.barraV.root, 0);
      for (const l of R.luces) setOp(l, 1);
      setOp(R.oscuro, 0);
      setOp(R.neonGym, 0.9 + 0.1 * Math.sin(t * 2.7));
      setOp(R.neonGymOff, 0);
    }

    // ── la vecina se pregunta qué pidió ──
    {
      const p = pop(t, T.pidio2, 0.35);
      R.pregunta.setAttribute("transform", `translate(${f2(hv.cabeza.x)} ${f2(hv.cabeza.y - 150)}) scale(${f2(p.s)})`);
      setOp(R.pregunta, p.o);
    }

    // ── tarjeta final: seguir ──
    {
      popEl(R.seguir, t, T.pidio2Fin + 0.05, 1460, 280, 0.45);
      popEl(R.chipP2, t, T.pidio2Fin + 0.2, 830, 370, 0.35);
      popEl(R.chipP3, t, T.cuarta, 1350, 370, 0.35);
      const pulsa = pr(t, T.siguenos, 0.2, EZ.o);
      R.botonFondo.setAttribute("fill", mezclaColor("#1D6BFF", "#E5E7EB", pulsa));
      setOp(R.botonSeguir, 1 - pulsa);
      setOp(R.botonSiguiendo, pulsa);
      const llega = pr(t, T.siguenos - 0.4, 0.38, EZ.io);
      const toque = t > T.siguenos - 0.02 && t < T.siguenos + 0.25 ? 1 - 0.18 * Math.sin(((t - T.siguenos + 0.02) / 0.27) * Math.PI) : 1;
      R.dedo.setAttribute("transform", `translate(${f2(lerp(2360, 2010, llega))} ${f2(lerp(660, 450, llega))}) scale(${f2(toque)})`);
      setOp(R.dedo, pr(t, T.siguenos - 0.4, 0.15) * (1 - pr(t, T.siguenos + 0.6, 0.3)));
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