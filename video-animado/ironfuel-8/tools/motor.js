// Motor del mundo de IronFuel · octava parte (la madre del flaco: berberina, lo que es y lo que no es). build.mjs lo incrusta en compositions/mundo.html.
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

  // ───────────────────────── cámara (octava parte: berberina) ─────────────────────────
  // [t, x, y, zoom, ease]: el punto (x, y) del mundo cae en (540, 960) de la pantalla
  const CAM = [
    [0, 2620, 1380, 0.95],
    [0.4, 2620, 1400, 1.2, "expo"],
    [T.movil - 0.1, 2625, 1400, 1.2, "s"],
    [T.movil + 0.3, 2720, 1360, 1.12, "io"],
    [T.asi1, 2720, 1362, 1.12, "s"],
    [T.asi1 + 0.6, 2300, 1370, 0.95, "io"],
    [T.tienda + 0.4, 1900, 1370, 0.92, "io"],
    [T.preguntar + 0.45, 1330, 1380, 1.03, "io3"],
    [T.dependiente + 0.2, 1330, 1385, 1.03, "s"],
    [T.conto + 0.25, 1180, 1360, 0.95, "io"],
    [T.es1 + 0.3, 690, 1096, 1.4, "io3"],
    [T.despues1, 690, 1094, 1.41, "s"],
    [T.es2 + 0.15, 1290, 1096, 1.4, "io3"],
    [T.moverteFin + 0.1, 1290, 1094, 1.41, "s"],
    [T.medicacion + 0.1, 1460, 770, 0.55, "io3"],
    [T.pago - 0.05, 1460, 778, 0.56, "s"],
    [T.pago + 0.35, 1430, 1330, 1.0, "io3"],
    [T.fue + 0.3, 1600, 1330, 1.0, "s"],
    [T.semana1 + 0.3, 4800, 1400, 0.9, "io3"],
    [T.semana2, 5300, 1400, 0.9, "lin"],
    [T.unio + 0.3, 5560, 1390, 0.85, "s"],
    [T.semana3, 5760, 1380, 0.85, "lin"],
    [T.grupo + 0.3, 5850, 1330, 0.7, "io"],
    [T.barrioFin, 6000, 1330, 0.7, "lin"],
    [T.primero + 0.6, 1460, 780, 0.55, "io3"],
    [T.siguenos - 0.05, 1460, 785, 0.56, "s"],
    [T.siguenos + 0.4, 1460, 1070, 0.51, "io3"],
    [D, 1460, 1065, 0.505, "s"],
  ];
  // sacudidas: [inicio, duración, amplitud px]
  const SACUDIDAS = [
    [0.0, 0.4, 12],
    [T.todo2, 0.25, 8],
    [T.grupo, 0.5, 18],
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

  // ─────────────── coreografía de la octava parte (berberina) ───────────────
  const PUERTA = 2340;
  const SITIO = 1600; // delante del mostrador
  const mezclaP = (a, b, u) => {
    const o = {};
    for (const k in a) o[k] = lerp(a[k], b[k], u);
    return o;
  };
  const MOVIL_POSE = { aL: 14, eL: 14, aR: 40, eR: 112 }; // el móvil a la altura del pecho

  // ── la madre del flaco ──
  const MX = [
    [0, 2620],
    [T.asi1 - 0.05, 2620],
    [T.tienda + 0.2, PUERTA, "i"],
    [T.preguntar + 0.6, SITIO, "o"],
    [T.fue + 0.05, SITIO],
    [T.fue + 0.65, PUERTA, "i"],
    // sale por la puerta y la volvemos a ver de paseo, calle abajo
    [T.fue + 0.66, 4650, "step"],
    [T.semana2, 5350, "lin"],
    [T.semana3, 5850, "lin"],
    [T.barrioFin + 0.1, 6300, "lin"],
  ];
  const madreX = (t) => K(t, MX);
  const MCARA = [
    [0, 1],
    [T.asi1 - 0.15, 1],
    [T.asi1, -1, "io"],
    [T.fue - 0.05, -1],
    [T.fue + 0.07, 1, "io"],
  ];
  function madre(t) {
    const x = madreX(t),
      v = t > T.fue + 0.6 && t < T.fue + 0.72 ? 0 : vel(MX, t);
    let face = K(t, MCARA);
    const giro = Math.abs(face);
    face = face >= 0 ? 1 : -1;
    let pose = P("brazos"),
      gesto = G("sonrisa"),
      habla = false,
      cabeza = 0,
      mx = 0.6,
      my = 0;
    if (t < T.asi1 - 0.1) {
      // mirando el móvil
      pose = MOVIL_POSE;
      my = 0.5;
      mx = 0.8;
      gesto = t > T.prometian ? G("wow") : G("ceja");
    } else if (t < T.fue + 0.1) {
      gesto = G("serio");
      if (t > T.preguntar - 0.1) {
        gesto = G("sonrisa");
        habla = t > T.preguntar - 0.05 && t < T.preguntarFin + 0.2;
        mx = 0.8;
        if (t > T.conto && t < T.es1) (gesto = G("wow")), (my = 0.5);
        if (t > T.es1 && t < T.tomas) (mx = 0.2), (my = -0.6);
        if (t > T.es2 && t < T.tomas) mx = 0.7;
        if (t > T.tomas - 0.1 && t < T.pago) (gesto = G("serio")), (mx = 0.4), (my = -1), (cabeza = t > T.pregunta && t < T.medico + 0.5 ? Math.sin((t - T.pregunta) * 9) * 5 : 0);
        if (t > T.pago - 0.3) gesto = G("sonrisa");
        pose = K(t, [
          [T.pago - 0.25, P("brazos")],
          [T.pago, P("pagar"), "io"],
          [T.pago + 0.4, P("pagar")],
          [T.pago + 0.65, P("bolsa"), "io"],
        ]);
      }
    } else {
      // de paseo
      face = 1;
      pose = P("brazos");
      gesto = G("sonrisa");
      mx = 0.9;
      if (t > T.unio) mx = -0.3;
      if (t > T.grupo) (gesto = G("orgullo")), (mx = 0);
    }
    const sq = 0.88 + 0.12 * giro;
    // invisible mientras cruza la puerta y salta calle abajo
    const oculto = t > T.fue + 0.5 && t < T.fue + 0.67;
    return { x, y: SUELO, s: 0.97, face, sqx: sq, m: PJ.madre.m0, v, pose, gesto, habla, cabeza, mx, my, oculto };
  }

  // ── los que se van uniendo al paseo: la vecina (semana cuatro) y medio barrio (semana ocho) ──
  // [segundo en que llegan, separación final respecto a la madre]
  const UNEN = { vec: ["unio", -170], comp: ["grupo", -350], abu: ["grupo", -520], flaco: ["grupo", 180], gym: ["grupo", 350] };
  function paseante(id, t) {
    const [k, dx] = UNEN[id];
    const t1 = T[k] + (id === "vec" ? 0 : 0.15 + 0.08 * Math.abs(dx / 170));
    const u = pr(t, t1 - 0.7, 0.7, EZ.o);
    const x = madreX(t) + lerp(-950, dx, u);
    const v = u > 0 && u < 1 ? 1200 : 330;
    const s = id === "abu" ? 0.9 : id === "vec" ? 0.95 : id === "flaco" ? 1.04 : 1;
    const m = id === "flaco" ? 1 : id === "gym" ? 0.85 : PJ[id].m0;
    const gesto = t > T.barrio ? G("orgullo") : G("sonrisa");
    return { x, y: SUELO, s, face: 1, m, v, pose: P("brazos"), gesto, mx: 0.9, my: 0, correr: u > 0 && u < 0.9, oculto: t < t1 - 0.75 };
  }

  function dependiente(t) {
    let pose = P("reposo"),
      gesto = G("neutro"),
      habla = false,
      agache = 0,
      lean = 0,
      mx = 0.8,
      my = 0;
    if (t > T.preguntar + 0.2) gesto = G("sonrisa");
    if (t > T.dependiente - 0.05 && t < T.es1) {
      const u = (t - T.dependiente + 0.05) / 0.6;
      agache = u < 1 ? Math.sin(u * Math.PI) * 110 : 0;
      pose = K(t, [
        [T.dependiente, P("reposo")],
        [T.conto - 0.02, P("manos"), "io"],
        [T.conto + 0.4, P("manos")],
        [T.conto + 0.8, P("reposo"), "io"],
      ]);
    }
    if (t > T.es1) (mx = -0.2), (my = 0.4);
    if (t > T.es2) mx = 0.6;
    if (t > T.tomas - 0.25) {
      gesto = G("serio");
      habla = t < T.medico + 0.4;
      lean = K(t, [
        [T.tomas - 0.25, 0],
        [T.tomas + 0.1, 9, "io"],
        [T.medico + 0.4, 9],
        [T.medico + 0.7, 0, "io"],
      ]);
      pose = K(t, [
        [T.tomas - 0.25, P("reposo")],
        [T.tomas + 0.1, P("explica"), "back"],
        [T.medico + 0.4, P("explica")],
        [T.medico + 0.7, P("reposo"), "io"],
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
    return { x: 1000, y: SUELO, s: 1.04, face: 1, m: 0.78, v: 0, pose, gesto, habla, agache, lean, mx, my };
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
      popEl(r.card, t, tk(c.t0) - 0.05, c.x + c.w / 2, c.y + 50, 0.4);
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
      puerta: $("puerta-hoja"), neonTienda: $("neon-tienda"), reflejo: $("reflejo"),
      bocadillo: $("bocadillo"), bocFondo: $("bocadillo-fondo"), bocL1: $("boc-l1"), bocL2: $("boc-l2"),
      magiaColor: $("magia-color"), magiaGris: $("magia-gris"), magiaChispas: $("magia-chispas"), magiaX: $("magia-x"),
      ber: $("bote-ber"), subBer: $("sub-ber"),
      chats: [1, 2, 3].map((i) => $("p-chat-" + i)), telefono: $("telefono"), telFuego: $("tel-fuego"), telTodo: $("tel-todo"),
      pDespues: $("p-despues"), pBarrio: $("p-barrio"), pSemana: $("p-semana"), sem: [1, 4, 8].map((n) => $("p-sem-" + n)),
      seguir: $("seguir"), chipP2: $("chip-p2"), chipP3: $("chip-p3"), botonFondo: $("boton-fondo"),
      botonSeguir: $("boton-seguir-txt"), botonSiguiendo: $("boton-siguiendo"), dedo: $("dedo-tap"),
      datafono: $("datafono"), datPantalla: $("datafono-ok"), movil: $("movil"), bolsa: $("bolsa"), bolsaAbu: $("bolsa-abu"),
      pila: $("pila"), estelas: $("estelas"), baston: $("baston"), gotas: $("gotas"), choque: $("choque"),
      neonGym: $("neon-gym"), neonGymOff: $("neon-gym-off"), luces: [0, 1, 2, 3].map((i) => $("luz-g" + i)), oscuro: $("gym-oscuro"),
      lineaBrillo: $("linea-brillo"), lineaIda: $("linea-ida"),
      barraF: $("barra-flaco"), barraV: $("barra-vecino"),
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
    const sm = madre(t);
    const hm = dibujarPJ("madre", sm, t);
    const sd = dependiente(t);
    const hd = dibujarPJ("dep", sd, t);
    const otros = {};
    for (const id of ["vec", "comp", "abu", "flaco", "gym"]) otros[id] = dibujarPJ(id, paseante(id, t), t);
    for (const el of [R.baston, R.bolsaAbu, R.pila, R.choque, R.gotas, R.barraF, R.barraV, R.estelas, R.lineaBrillo]) setOp(el, 0);
    // bolsa: en la mano tras pagar (y se va con ella)
    {
      const pb = pop(t, T.pago + 0.4, 0.35);
      R.bolsa.setAttribute("transform", `translate(${f2(hm.manoL.x)} ${f2(hm.manoL.y)}) scale(${f2(pb.s * 0.85)})`);
      setOp(R.bolsa, pb.o * (sm.oculto || t > T.fue + 0.6 ? 0 : 1));
    }

    // ── «todo el mundo habla de la berberina» ──
    const CHATS = [[2440, 1080, T.todo1 + 0.05], [2800, 1080, T.mundo], [2620, 960, T.habla]];
    R.chats.forEach((el, i) => {
      const [x, y, t0] = CHATS[i];
      const p = pop(t, t0, 0.32);
      el.setAttribute("transform", `translate(${x} ${f2(y + Math.sin(t * 3 + i) * 6)}) scale(${f2(p.s)})`);
      setOp(el, p.o * popOut(t, T.movil - 0.1));
    });
    // su móvil (en la mano) y la pantalla grande al lado
    {
      const enMano = t < T.asi1 + 0.1;
      const pm = enMano ? 1 : pr(t, T.pago - 0.25, 0.25, EZ.o) * (1 - pr(t, T.pago + 0.45, 0.25, EZ.i));
      R.movil.setAttribute("transform", `translate(${f2(hm.manoR.x)} ${f2(hm.manoR.y)}) scale(${f2(pm)})`);
      setOp(R.movil, pm > 0.02 ? 1 : 0);
      const pt = pop(t, T.movil, 0.38);
      R.telefono.setAttribute("transform", `translate(2870 1180) scale(${f2(pt.s)})`);
      setOp(R.telefono, pt.o * popOut(t, T.asi1 + 0.1));
      popEl(R.telFuego, t, T.prometian, 0, 120, 0.35);
      popEl(R.telTodo, t, T.todo2, 0, 170, 0.35);
    }

    // ── tienda ──
    const cerca = (x) => clamp(1 - (Math.abs(x - PUERTA) - 60) / 140);
    const abierta = Math.abs(sm.v) > 30 && t < T.fue + 0.7 ? cerca(sm.x) : 0;
    R.puerta.setAttribute("transform", `translate(2470 0) scale(${f2(1 - 0.82 * EZ.o(abierta))} 1) translate(-2470 0)`);
    setOp(R.neonTienda, clamp(0.85 + 0.15 * Math.sin(t * 2.1) + (t > T.siguenos ? 0.2 : 0), 0, 1));
    setOp(R.reflejo, 0.5 - 0.3 * clamp((c.z - 0.9) / 0.6));
    setOp(R.magiaColor, 0);
    setOp(R.magiaGris, 1);
    setOp(R.magiaChispas, 0);
    setOp(R.magiaX, 1);

    // ── bocadillo: «¿Qué es la berberina?» ──
    {
      const p = pop(t, T.preguntar - 0.04, 0.3);
      const k = p.s * (0.7 + 0.3 * popOut(t, T.conto - 0.1));
      R.bocadillo.setAttribute("transform", `translate(1480 1160) scale(${f2(k)}) translate(-1480 -1160)`);
      setOp(R.bocadillo, p.o * popOut(t, T.conto - 0.1));
      const fin = T.preguntarFin + 0.25;
      const mitad = (T.preguntar + fin) / 2;
      escribir(R.bocL1, "¿Qué es la", t, T.preguntar, mitad);
      escribir(R.bocL2, "berberina?", t, mitad, fin);
      R.bocFondo.setAttribute("d", bocadilloPath(1220, 900, 520, 190));
    }

    // ── el bote: cae en el mostrador y va a la bolsa ──
    {
      const t0 = T.conto;
      let y = 1470,
        sx = 1,
        sy = 1,
        o = 0,
        x = 900;
      if (t >= t0 - 0.32) {
        const u = clamp((t - (t0 - 0.32)) / 0.32);
        y = 1470 + lerp(-520, 0, EZ.i(u));
        const r = t - t0;
        sy = r > 0 && r < 0.3 ? 1 - 0.18 * Math.sin((r / 0.3) * Math.PI) * (1 - r / 0.3) : 1;
        sx = 2 - sy;
        o = 1;
      }
      const b = pr(t, T.pago + 0.45, 0.45, EZ.io);
      if (b > 0) {
        x = lerp(900, hm.manoL.x, b);
        y = lerp(1470, hm.manoL.y + 60, b) - Math.sin(b * Math.PI) * 220;
        sx = sy = lerp(1, 0.25, b);
        o = b > 0.92 ? 0 : 1;
      }
      R.ber.setAttribute("transform", `translate(${f2(x)} ${f2(y)}) scale(${f2(sx)} ${f2(sy)})`);
      setOp(R.ber, o);
      R.subBer.setAttribute("transform", `scale(${f2(pr(t, T.berberina2, 0.4, EZ.o))} 1)`);
    }

    // ── tarjetas: lo que es, lo que no es, el aviso y «primero la información» ──
    tarjetas(t);

    // ── pagar ──
    {
      const pd = pr(t, T.pago - 0.3, 0.3, EZ.o) * (1 - pr(t, T.pago + 0.75, 0.3, EZ.i));
      R.datafono.setAttribute("transform", `translate(${f2(hd.manoR.x)} ${f2(hd.manoR.y)}) scale(${f2(pd)})`);
      setOp(R.datafono, pd > 0.02 ? 1 : 0);
      setOp(R.datPantalla, pr(t, T.pago, 0.15));
      setOp(R.lineaIda, 0);
    }

    // ── de paseo: la semana (siempre a la vista), «tras comer» y «medio barrio» ──
    {
      const ps = pop(t, T.semana1, 0.35);
      const sy = c.y + (520 - 960) / c.z;
      R.pSemana.setAttribute("transform", `translate(${f2(c.x)} ${f2(sy)}) scale(${f2((ps.s * 1) / c.z)})`);
      setOp(R.pSemana, ps.o * popOut(t, T.primero - 0.05));
      const cambios = [T.uno, T.cuatro, T.ocho, 1e9];
      R.sem.forEach((el, i) => {
        const p = popEl(el, t, cambios[i], 150, 0, 0.3);
        setOp(el, p.o * (t < cambios[i + 1] ? 1 : 0));
      });
      const pd = pop(t, T.despues2, 0.35);
      R.pDespues.setAttribute("transform", `translate(${f2(hm.cabeza.x)} ${f2(hm.cabeza.y - 66 * 0.97 - 100)}) scale(${f2(pd.s)})`);
      setOp(R.pDespues, pd.o * popOut(t, T.semana2));
      const pb = pop(t, T.barrio, 0.35);
      R.pBarrio.setAttribute("transform", `translate(${f2(hm.cabeza.x - 90)} ${f2(hm.cabeza.y - 66 - 150)}) scale(${f2(pb.s)})`);
      setOp(R.pBarrio, pb.o * popOut(t, T.primero));
    }

    // ── gimnasio (de fondo) ──
    for (const l of R.luces) setOp(l, 1);
    setOp(R.oscuro, 0);
    setOp(R.neonGym, 0.9 + 0.1 * Math.sin(t * 2.7));
    setOp(R.neonGymOff, 0);

    // ── tarjeta final: seguir ──
    {
      popEl(R.seguir, t, T.siguenos, 1460, 280, 0.45);
      popEl(R.chipP2, t, T.siguenos + 0.15, 830, 370, 0.35);
      popEl(R.chipP3, t, T.nueve, 1350, 370, 0.35);
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
  window.__IF.madreX = madreX;
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