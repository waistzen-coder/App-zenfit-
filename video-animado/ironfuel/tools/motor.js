// Motor del mundo de IronFuel. build.mjs lo incrusta en compositions/mundo.html.
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

  // ───────────────────────── cámara ─────────────────────────
  // [t, x, y, zoom, ease]: el punto (x, y) del mundo cae en (540, 960) de la pantalla
  const CAM = [
    [0, 2310, 1440, 0.9],
    [0.42, 2330, 1440, 1.25, "expo"],
    [T.salio + 0.3, 2400, 1430, 1.42, "io"],
    [T.asi2 + 0.05, 2470, 1440, 1.32, "io"],
    [T.esto + 0.78, 2440, 1440, 1.28, "s"],
    [T.dentro + 0.6, 1312, 1380, 1.09, "io3"],
    [T.rapido + 0.4, 1315, 1385, 1.1, "s"],
    [T.magia - 0.25, 1320, 1385, 1.06, "s"],
    [T.saco + 0.1, 1180, 1370, 1.0, "io"],
    [T.botes + 0.5, 1110, 1360, 0.95, "s"],
    [T.uno1 + 0.2, 680, 1120, 1.5, "io3"],
    [T.descanso, 680, 1115, 1.53, "s"],
    [T.intensos + 0.35, 680, 1120, 1.5, "s"],
    [T.dos2 - 0.05, 780, 1200, 1.05, "io"],
    [T.proteina + 0.1, 1310, 1120, 1.5, "io3"],
    [T.entrenar1 + 0.45, 1310, 1122, 1.53, "s"],
    [T.pero1 + 0.05, 1000, 1180, 0.98, "io"],
    [T.dijo + 0.05, 1000, 1250, 1.38, "io3"],
    [T.cosa + 0.5, 1010, 1250, 1.42, "s"],
    [T.sin + 0.05, 1060, 1260, 1.3, "io"],
    [T.entrenar2 + 0.5, 2120, 1180, 0.46, "io3"],
    [T.pago - 0.08, 2100, 1190, 0.47, "s"],
    [T.pago + 0.22, 1430, 1330, 1.0, "io3"],
    [T.fue, 1460, 1330, 1.0, "s"],
    [T.fue + 0.45, 2300, 1370, 0.9, "io"],
    [T.gimnasio + 0.45, 3420, 1300, 1.0, "io"],
    [T.semana1 + 0.15, 3450, 1260, 1.22, "io3"],
    [T.barra1 + 0.4, 3450, 1250, 1.25, "s"],
    [T.cuatro + 0.4, 3540, 1270, 1.08, "io"],
    [T.ocho + 0.25, 3760, 1290, 0.86, "io"],
    [T.lado + 0.4, 3770, 1290, 0.86, "s"],
    [T.doce + 0.15, 3450, 1220, 1.15, "io3"],
    [T.doblaba + 0.05, 3450, 1220, 1.2, "o"],
    [T.volvio - 0.05, 3560, 1270, 0.85, "io"],
    [T.tienda, 2500, 1350, 0.85, "io"],
    [T.mas4, 1450, 1300, 1.0, "io"],
    [T.pero2 + 0.15, 1460, 1290, 0.95, "s"],
    [T.solo + 0.05, 2195, 1340, 0.7, "io3"],
    [T.companero, 2190, 1340, 0.71, "s"],
    [T.abuelo + 0.6, 2060, 1330, 0.72, "s"],
    [T.comenta + 0.45, 1460, 1090, 0.56, "io3"],
    [D, 1460, 1085, 0.57, "s"],
  ];
  // sacudidas: [inicio, duración, amplitud px]
  const SACUDIDAS = [
    [0.0, 0.45, 14],
    [T.salio + 0.12, 0.35, 10],
    [T.doblaba, 0.5, 22],
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
    e.ojoL.setAttribute("transform", `translate(${fx - 23} -8) scale(${f2(ojo)} ${f2(parp * ojo)})`);
    e.ojoR.setAttribute("transform", `translate(${fx + 23} -8) scale(${f2(ojo)} ${f2(parp * ojo)})`);
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

  // ─────────────── coreografía del protagonista (el flaco) ───────────────
  const PUERTA = 2340;
  const SITIO = 1640; // donde se pone delante del mostrador
  const BARRA_X = 3450; // su sitio en el gimnasio
  const FX = [
    [0, 2640],
    [0.3, PUERTA, "lin"],
    [0.5, 1860, "o"], // entra disparado y sale de plano
    [0.51, PUERTA, "step"], // (ya grande, detrás de la puerta: fuera de plano)
    [T.salio, PUERTA],
    [T.salio + 0.34, 2600, "o"],
    [T.esto + 0.02, 2600],
    [T.esto + 0.3, PUERTA, "io"], // rebobina: vuelve hacia atrás
    [T.dentro + 0.25, SITIO, "io"],
    [T.fue + 0.02, SITIO],
    [T.fue + 0.5, PUERTA, "i"],
    [T.gimnasio + 0.4, BARRA_X, "o"],
    [T.volvio, BARRA_X],
    [T.volvio + 0.55, PUERTA, "i"],
    [T.mas4 - 0.08, SITIO, "o"],
  ];
  const FM = [
    [0, 0],
    [0.5, 0],
    [0.51, 1, "step"],
    [T.esto + 0.25, 1],
    [T.dentro + 0.15, 0, "io"],
    [T.semana2, 0],
    [T.cuatro + 0.5, 0.36, "io"],
    [T.semana3, 0.36],
    [T.ocho + 0.5, 0.68, "io"],
    [T.semana4, 0.68],
    [T.doce + 0.45, 1, "io"],
  ];
  const FCARA = [
    // 1 = mira a la derecha, -1 = a la izquierda (giro con un aplastamiento)
    [0, -1],
    [0.51, 1, "step"],
    [T.dentro + 0.3, 1],
    [T.dentro + 0.42, -1, "io"],
    [T.fue - 0.05, -1],
    [T.fue + 0.07, 1, "io"],
    [T.volvio - 0.05, 1],
    [T.volvio + 0.07, -1, "io"],
  ];
  function flaco(t) {
    const x = K(t, FX);
    const v = vel(FX, t);
    const m = K(t, FM);
    let face = K(t, FCARA);
    const s = 1 + 0.08 * m;
    let pose = P("brazos"),
      gesto = G("neutro"),
      habla = false,
      temblor = 0,
      agache = 0,
      cabeza = 0,
      mx = 0.6,
      my = 0,
      lean = 0,
      correr = Math.abs(v) > 900,
      piernas = null;
    if (t < 0.5) (gesto = G("sonrisa")), (correr = true);
    else if (t < T.esto) {
      // sale grande, se da con el marco y saca bíceps
      gesto = G("orgullo");
      const golpe = T.salio + 0.08;
      agache = t > golpe && t < golpe + 0.3 ? 60 * Math.sin(((t - golpe) / 0.3) * Math.PI) : 0;
      cabeza = t > golpe && t < golpe + 0.3 ? -10 * Math.sin(((t - golpe) / 0.3) * Math.PI) : 0;
      pose = K(t, [
        [T.salio + 0.2, P("brazos")],
        [T.asi2 + 0.12, P("flex"), "back"],
      ]);
    } else if (t < T.dentro + 0.3) {
      // rebobinado: anda hacia atrás deshinchándose
      pose = K(t, [
        [T.esto, P("flex")],
        [T.esto + 0.3, P("brazos"), "io"],
      ]);
      gesto = G("neutro");
      const g = T.esto + 0.22;
      agache = t > g && t < g + 0.3 ? 50 * Math.sin(((t - g) / 0.3) * Math.PI) : 0;
    } else if (t < T.dependiente2) {
      // pide algo para ponerse fuerte
      habla = t > T.pidio - 0.05 && t < T.rapidoFin;
      mx = 0.8;
      gesto = t < T.rapido ? G("sonrisa") : G("pena");
      pose = K(t, [
        [T.fuerte - 0.2, P("brazos")],
        [T.fuerte + 0.15, P("flexR"), "back"],
        [T.rapido - 0.15, P("flexR")],
        [T.rapido + 0.15, P("suplica"), "io"],
        [T.dependiente2 - 0.1, P("suplica")],
      ]);
    } else if (t < T.fue) {
      mx = 0.7;
      gesto = t < T.magia ? G("sonrisa") : t < T.botes ? G("pena") : G("sonrisa");
      pose = K(t, [
        [T.dependiente2, P("suplica")],
        [T.dependiente2 + 0.3, P("senala"), "io"],
        [T.magia + 0.1, P("senala")],
        [T.magia + 0.4, P("brazos"), "io"],
        [T.pago - 0.25, P("brazos")],
        [T.pago, P("pagar"), "io"],
        [T.pago + 0.4, P("pagar")],
        [T.llevo, P("bolsa"), "io"],
      ]);
      if (t > T.semana1 - 1) gesto = G("sonrisa");
      if (t > T.dos1 && t < T.botes + 0.6) (my = 0.5), (gesto = G("wow"));
      if (t > T.pero1 && t < T.pago) (gesto = G("serio")), (mx = 0.9);
    } else if (t < T.volvio) {
      // al gimnasio
      if (t < T.gimnasio + 0.4) (pose = P("bolsa")), (gesto = G("sonrisa"));
      else {
        const sem = t < T.semana2 ? 1 : t < T.semana3 ? 4 : t < T.semana4 ? 8 : 12;
        pose = K(t, [
          [T.gimnasio + 0.45, P("bolsa")],
          [T.semana1 + 0.2, P("cargar"), "io"],
          [T.semana4 + 0.1, P("cargar")],
          [T.barra2 - 0.05, P("arriba"), "back"],
        ]);
        gesto = sem === 1 ? G("esfuerzo") : sem === 4 ? G("sonrisa") : sem === 8 ? G("orgullo") : G("orgullo");
        temblor = sem === 1 ? 1 : 0;
        piernas = sem === 1 ? { L: -8, R: -8, kL: 14, kR: 14 } : { L: -6, R: -6, kL: 6, kR: 6 };
        agache = sem === 1 ? 12 + Math.sin(t * 9) * 4 : 0;
        if (sem === 12 && t > T.doblaba) gesto = G("orgullo");
        my = sem === 1 ? -0.6 : 0;
        mx = 0.2;
      }
    } else {
      // vuelve a la tienda a por más
      gesto = G("orgullo");
      const g = T.volvio + 0.5;
      agache = t > g - 0.12 && t < g + 0.25 ? 70 * Math.sin(((t - g + 0.12) / 0.37) * Math.PI) : 0;
      pose = K(t, [
        [T.mas4 - 0.35, P("brazos")],
        [T.mas4 - 0.05, P("choca"), "back"],
        [T.mas4 + 0.5, P("choca")],
        [T.mas4 + 0.9, P("brazos"), "io"],
        [T.comenta, P("brazos")],
        [T.comenta + 0.4, P("flex"), "back"],
      ]);
      mx = 0.8;
      if (t > T.pero2) (mx = -0.8), (cabeza = -4);
      if (t > T.comenta) mx = 0.3;
    }
    // aplastamiento al girar
    const giro = Math.abs(face);
    face = face >= 0 ? 1 : -1;
    const sq = 0.88 + 0.12 * giro;
    const oculto = t >= 0.5 && t < T.salio; // detrás de la puerta, «creciendo»
    return { x, y: SUELO, s, face, sqx: sq, m, v, pose, gesto, habla, temblor, agache, cabeza, mx, my, lean, correr, piernas, oculto };
  }

  // ─────────────── el dependiente ───────────────
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
    // lo mira de arriba abajo
    if (t > T.dependiente1 && t < T.fuerte + 0.4) my = Math.sin(((t - T.dependiente1) / 1.4) * Math.PI) * 0.9;
    if (t > T.rapido) (gesto = G("ceja")), (cejaR = -8);
    if (t > T.no1) {
      gesto = G("serio");
      cabeza = t < T.magia + 0.2 ? Math.sin((t - T.no1) * 18) * 7 * clamp((T.magia + 0.2 - t) * 4) : 0;
    }
    if (t > T.saco) {
      // se agacha y saca dos botes
      const u = (t - T.saco) / 0.55;
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
    if (t > T.pero1) {
      // «Pero le dijo una cosa más»: se inclina y levanta el dedo
      gesto = G("serio");
      habla = t < T.nadaFin;
      lean = K(t, [
        [T.pero1, 0],
        [T.dijo, 9, "io"],
        [T.nadaFin, 9],
        [T.nadaFin + 0.3, 0, "io"],
      ]);
      pose = K(t, [
        [T.pero1, P("reposo")],
        [T.cosa, P("explica"), "back"],
        [T.sin - 0.05, P("explica")],
        [T.sin + 0.25, P("senala"), "io"],
        [T.nadaFin, P("senala")],
        [T.nadaFin + 0.3, P("reposo"), "io"],
      ]);
      mx = 1;
    }
    if (t > T.pago - 0.35) {
      gesto = G("sonrisa");
      habla = false;
      pose = K(t, [
        [T.pago - 0.35, P("reposo")],
        [T.pago - 0.05, P("pagar"), "io"],
        [T.llevo, P("pagar")],
        [T.llevo + 0.35, P("reposo"), "io"],
      ]);
    }
    if (t > T.volvio) {
      gesto = G("wow");
      if (t > T.mas4 - 0.4) gesto = G("sonrisa");
      pose = K(t, [
        [T.mas4 - 0.4, P("reposo")],
        [T.mas4 - 0.05, P("choca"), "back"],
        [T.mas4 + 0.5, P("choca")],
        [T.mas4 + 0.9, P("reposo"), "io"],
        [T.comenta, P("reposo")],
        [T.comenta + 0.4, P("flexR"), "back"],
      ]);
      lean = K(t, [
        [T.mas4 - 0.4, 0],
        [T.mas4 - 0.05, 8, "io"],
        [T.mas4 + 0.6, 8],
        [T.mas4 + 0.9, 0, "io"],
      ]);
    }
    return { x: 1000, y: SUELO, s: 1.04, face: 1, m: 0.78, v: 0, pose, gesto, habla, agache, cabeza, lean, mx, my, cejaR };
  }

  // ─────────────── los que vienen detrás ───────────────
  function acompanante(id, t) {
    const cfg = {
      comp: { cola: 2540, dentro: 1850, palabra: T.companero, llega: 0.95, pose: "brazos", s: 1 },
      vec: { cola: 2660, dentro: 2010, palabra: T.vecina, llega: 0.95, pose: "brazos", s: 0.95 },
      abu: { cola: 2780, dentro: 2170, palabra: T.abuelo, llega: 0.75, pose: "baston", s: 0.9 },
    }[id];
    const xs = [
      [0, 3600],
      [T.pero2, 3600],
      [T.solo + 0.15, cfg.cola, "o"],
      [cfg.palabra, cfg.cola],
      [cfg.palabra + cfg.llega, cfg.dentro, "io"],
    ];
    const x = K(t, xs),
      v = vel(xs, t);
    let pose = P(cfg.pose),
      gesto = G("sonrisa"),
      mx = 0.6;
    if (id === "abu" && t > T.abuelo + cfg.llega - 0.05)
      pose = K(t, [
        [T.abuelo + cfg.llega - 0.05, P("baston")],
        [T.abuelo + cfg.llega + 0.3, P("bastonArriba"), "back"],
      ]);
    if (t > T.comenta) (mx = 0.2), (gesto = G("orgullo"));
    return { x, y: SUELO, s: cfg.s, face: -1, m: PJ[id].m0, v, pose, gesto, mx, lean: id === "abu" ? 5 : 0, oculto: t < T.pero2 };
  }
  // el del gimnasio de al lado
  function vecinoGym(t) {
    let gesto = G("neutro"),
      ojos = 1,
      mx = -0.4;
    let pose = P("cargar");
    if (t > T.quitaba) (gesto = G("wow")), (ojos = 1.25), (mx = -1);
    if (t > T.doblaba) gesto = G("wow");
    return { x: 4120, y: SUELO, s: 1, face: -1, m: 0.5, v: 0, pose, gesto, ojos, mx, my: 0 };
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
    const g = (id) => document.getElementById(id);
    R = {
      svg: $("mundo-svg"),
      cam: $("cam"),
      fondo: $("fondo-lejano"),
      puerta: $("puerta-hoja"),
      marco: $("puerta-marco"),
      cartel: $("cartel-tienda"),
      neonTienda: $("neon-tienda"),
      chipRebobina: $("chip-rebobina"),
      bocadillo: $("bocadillo"),
      bocFondo: $("bocadillo-fondo"),
      bocL1: $("boc-l1"),
      bocL2: $("boc-l2"),
      bocL3: $("boc-l3"),
      magia: $("bote-magia"),
      magiaColor: $("magia-color"),
      magiaGris: $("magia-gris"),
      magiaChispas: $("magia-chispas"),
      magiaX: $("magia-x"),
      creatina: $("bote-creatina"),
      proteina: $("bote-proteina"),
      badge1: $("badge-1"),
      badge2: $("badge-2"),
      subCrea: $("sub-creatina"),
      subProt: $("sub-proteina"),
      cardA: $("card-a"),
      cardAF: $("card-a-fondo"),
      cardBF: $("card-b-fondo"),
      a3g: $("a-3g"),
      aDia: $("a-dia"),
      aDias: [0, 1, 2, 3, 4, 5, 6].map((i) => $("a-d" + i)),
      aDiasF: [0, 1, 2, 3, 4, 5, 6].map((i) => $("a-df" + i)),
      aDiasL: [0, 1, 2, 3, 4, 5, 6].map((i) => $("a-dl" + i)),
      aDesc: $("a-descanso"),
      aBarras: [0, 1, 2, 3, 4, 5].map((i) => $("a-b" + i)),
      aRayo: $("a-rayo"),
      aLeyenda: $("a-leyenda"),
      cardB: $("card-b"),
      bBarra: $("b-barra"),
      bFlecha: $("b-flecha"),
      bEscudo: $("b-escudo"),
      bCacito: $("b-cacito"),
      bShaker: $("b-shaker"),
      bLiquido: $("b-liquido"),
      bDespues: $("b-despues"),
      bTxtAgua: $("b-agua"),
      bTxtLeche: $("b-leche"),
      datafono: $("datafono"),
      datPantalla: $("datafono-ok"),
      movil: $("movil"),
      bolsa: $("bolsa"),
      flecha: $("flecha-gym"),
      flechaPunta: $("flecha-punta"),
      neonGym: $("neon-gym"),
      neonGymOff: $("neon-gym-off"),
      linea: $("linea-suelo"),
      lineaBrillo: $("linea-brillo"),
      marcadorU: $("marcador-u"),
      marcadorD: $("marcador-d"),
      barraF: { root: $("barra-flaco"), bar: $("barra-flaco-bar"), discos: [0, 1, 2, 3, 4, 5].map((i) => $("barra-flaco-d" + i)) },
      barraV: { root: $("barra-vecino"), bar: $("barra-vecino-bar"), discos: [0, 1].map((i) => $("barra-vecino-d" + i)) },
      gotas: $("gotas"),
      choque: $("choque"),
      baston: $("baston"),
      comentario: $("comentario"),
      comTexto: $("com-texto"),
      comPlace: $("com-placeholder"),
      comCorazon: $("com-corazon"),
      comEnviar: $("com-enviar"),
      reflejo: $("reflejo"),
      estelas: $("estelas"),
    };
    void g;
  }

  // ─────────────── render(t) ───────────────
  function render(t) {
    if (!R) init();
    // cámara
    const c = camara(t);
    const tx = CX - c.x * c.z + c.sx,
      ty = CY - c.y * c.z + c.sy;
    R.cam.setAttribute("transform", `translate(${f2(tx)} ${f2(ty)}) scale(${c.z.toFixed(4)})`);
    // fondo lejano con paralaje (se mueve a un 30 %)
    const zf = 0.55 + c.z * 0.25;
    R.fondo.setAttribute("transform", `translate(${f2(CX - c.x * 0.3 * zf)} ${f2(CY - (c.y - 400) * 0.3 * zf - 600 * zf)}) scale(${f2(zf)})`);
    // desenfoque en los viajes largos (según la velocidad de la cámara)
    const c2 = camara(t - 1 / 30);
    const desp = Math.hypot((c.x - c2.x) * c.z, (c.y - c2.y) * c.z); // solo los viajes, no los zooms
    const blur = clamp((desp - 26) / 10, 0, 4);
    R.svg.style.filter = blur > 0.25 ? `blur(${blur.toFixed(2)}px)` : "none";

    // ── personajes ──
    const sf = flaco(t);
    const hf = dibujarPJ("flaco", sf, t);
    const sd = dependiente(t);
    const hd = dibujarPJ("dep", sd, t);
    for (const id of ["comp", "vec", "abu"]) {
      const st = acompanante(id, t);
      const h = dibujarPJ(id, st, t);
      if (id === "abu") {
        R.baston.setAttribute("transform", `translate(${f2(h.manoR.x)} ${f2(h.manoR.y)}) rotate(${f2(st.pose.aR > 90 ? -150 : 8)})`);
        setOp(R.baston, st.oculto ? 0 : 1);
      }
    }
    const sv = vecinoGym(t);
    const hv = dibujarPJ("gym", sv, t);
    // estelas de velocidad cuando corre
    const vabs = Math.abs(sf.v);
    R.estelas.setAttribute("transform", `translate(${f2(sf.x - sf.face * (150 + 90 * sf.m))} ${SUELO - 330}) scale(${-sf.face} 1)`);
    setOp(R.estelas, clamp((vabs - 900) / 700) * 0.9);

    // ── la tienda: puerta, cartel, reflejo ──
    // la puerta se abre cuando alguien pasa por ella
    const cerca = (x) => clamp(1 - (Math.abs(x - PUERTA) - 60) / 140);
    let abierta = Math.max(cerca(sf.x) * (Math.abs(sf.v) > 30 || (t > 0.51 && t < T.salio) ? 1 : 0), 0);
    if (t > 0.51 && t < T.salio) abierta = 0; // cerrada mientras «crece» detrás
    if (t >= T.salio && t < T.salio + 0.3) abierta = Math.max(abierta, 1);
    for (const id of ["comp", "vec", "abu"]) {
      const st = acompanante(id, t);
      if (Math.abs(st.v) > 30) abierta = Math.max(abierta, cerca(st.x));
    }
    const golpe = T.salio + 0.08;
    const tiembla = t > golpe && t < golpe + 0.5 ? Math.sin((t - golpe) * 40) * 2.2 * (1 - (t - golpe) / 0.5) : 0;
    R.puerta.setAttribute("transform", `translate(2470 0) scale(${f2(1 - 0.82 * EZ.o(abierta))} 1) translate(-2470 0)`);
    R.marco.setAttribute("transform", `rotate(${f2(tiembla * 0.6)} ${PUERTA} 1790)`);
    R.cartel.setAttribute("transform", `rotate(${f2(tiembla)} 1400 560)`);
    const brillo = 0.85 + 0.15 * Math.sin(t * 2.1) + (t > T.comenta ? 0.25 * pr(t, T.comenta, 0.4, EZ.o) : 0);
    setOp(R.neonTienda, clamp(brillo, 0, 1));
    setOp(R.reflejo, 0.5 - 0.3 * clamp((c.z - 0.9) / 0.6));

    // ── rebobinado ──
    {
      const p = pop(t, T.esto, 0.3);
      const o = p.o * popOut(t, T.dentro + 0.45);
      R.chipRebobina.setAttribute("transform", `translate(2470 1060) scale(${f2(p.s)})`);
      setOp(R.chipRebobina, o);
    }

    // ── bocadillo: «¿Tienes algo para ponerme fuerte?» ──
    {
      const p = pop(t, T.pidio - 0.04, 0.3);
      const o = p.o * popOut(t, T.dependiente2 - 0.05);
      const kb = p.s * (0.7 + 0.3 * popOut(t, T.dependiente2 - 0.05));
      R.bocadillo.setAttribute("transform", `translate(1480 1160) scale(${f2(kb)}) translate(-1480 -1160)`);
      setOp(R.bocadillo, o);
      const l1 = "¿Tienes algo para",
        l2 = "ponerme fuerte?";
      const total = l1.length + l2.length;
      const t0 = T.pidio,
        t1 = T.fuerteFin;
      const n = Math.round(clamp((t - t0) / (t1 - t0)) * total);
      const v1 = l1.slice(0, Math.min(n, l1.length)),
        v2 = l2.slice(0, Math.max(0, n - l1.length));
      if (R.bocL1.textContent !== v1) R.bocL1.textContent = v1;
      if (R.bocL2.textContent !== v2) R.bocL2.textContent = v2;
      escribir(R.bocL3, "…¡y rápido!", t, T.y2, T.rapidoFin);
      // el bocadillo crece en su sitio al añadir la tercera línea
      const crece = pr(t, T.y2 - 0.05, 0.25, EZ.backS);
      R.bocFondo.setAttribute("d", bocadilloPath(1220, 900, 520, 190 + 66 * crece));
    }

    // ── el bote mágico que no se vende ──
    {
      const g = pr(t, T.magia, 0.45, EZ.o);
      setOp(R.magiaColor, 1 - g);
      setOp(R.magiaGris, g);
      const ch = 1 - g;
      R.magiaChispas.setAttribute("transform", `translate(1465 1250) rotate(${f2(t * 40)}) scale(${f2(0.8 + 0.2 * Math.sin(t * 5)) * ch})`);
      setOp(R.magiaChispas, ch);
      popEl(R.magiaX, t, T.magia + 0.05, 1515, 1300, 0.35);
      // se hunde un poco al apagarse
      R.magia.setAttribute("transform", `translate(0 ${f2(g * 6)})`);
    }

    // ── dos botes que caen en el mostrador ──
    const caer = (t0) => {
      if (t < t0 - 0.32) return { y: -900, sq: 1, o: 0 };
      const u = clamp((t - (t0 - 0.32)) / 0.32);
      const y = lerp(-520, 0, EZ.i(u));
      const r = t - t0;
      const sq = r > 0 && r < 0.3 ? 1 - 0.18 * Math.sin((r / 0.3) * Math.PI) * (1 - r / 0.3) : 1;
      return { y, sq, o: 1 };
    };
    // se los lleva: vuelan a la bolsa
    const aLaBolsa = (t0, x0, y0) => {
      const u = pr(t, t0, 0.45, EZ.io);
      if (u <= 0) return null;
      const bx = hf.manoL.x,
        by = hf.manoL.y + 60;
      const x = lerp(x0, bx, u),
        y = lerp(y0, by, u) - Math.sin(u * Math.PI) * 220;
      return { x: x - x0, y: y - y0, s: lerp(1, 0.25, u), o: u > 0.92 ? 0 : 1 };
    };
    {
      const a = caer(T.dos1);
      const b = aLaBolsa(T.llevo, 700, 1470);
      const s = b ? b.s : 1;
      R.creatina.setAttribute(
        "transform",
        `translate(${f2(700 + (b ? b.x : 0))} ${f2(1470 + a.y + (b ? b.y : 0))}) scale(${f2((2 - a.sq) * s)} ${f2(a.sq * s)})`,
      );
      setOp(R.creatina, b ? b.o : a.o);
      const c2 = caer(T.botes);
      const b2 = aLaBolsa(T.llevo + 0.08, 1260, 1470);
      const s2 = b2 ? b2.s : 1;
      R.proteina.setAttribute(
        "transform",
        `translate(${f2(1260 + (b2 ? b2.x : 0))} ${f2(1470 + c2.y + (b2 ? b2.y : 0))}) scale(${f2((2 - c2.sq) * s2)} ${f2(c2.sq * s2)})`,
      );
      setOp(R.proteina, b2 ? b2.o : c2.o);
      popEl(R.badge1, t, T.uno1, 630, 1262, 0.35);
      popEl(R.badge2, t, T.dos2, 1182, 1242, 0.35);
      R.subCrea.setAttribute("transform", `scale(${f2(pr(t, T.creatina, 0.4, EZ.o))} 1)`);
      R.subProt.setAttribute("transform", `scale(${f2(pr(t, T.proteina, 0.4, EZ.o))} 1)`);
    }

    // ── tarjeta A: creatina ──
    {
      popEl(R.cardA, t, T.tres - 0.08, 660, 845, 0.4);
      R.cardAF.setAttribute(
        "height",
        f2(K(t, [[T.todos - 0.08, 130], [T.todos + 0.25, 205, "backS"], [T.descanso - 0.05, 205], [T.descanso + 0.25, 245, "backS"], [T.rendir - 0.12, 245], [T.rendir + 0.3, 420, "backS"]])),
      );
      popEl(R.a3g, t, T.tres, 530, 860, 0.35);
      popEl(R.aDia, t, T.dia, 740, 860, 0.35);
      const d0 = T.todos,
        d1 = T.tambien;
      R.aDias.forEach((el, i) => {
        popEl(el, t, d0 + i * 0.05, 470 + i * 64, 933, 0.3);
        let tick = i < 5 ? d0 + 0.1 + ((d1 - d0) * i) / 5 : T.descanso + (i - 5) * 0.12;
        const u = pr(t, tick, 0.22, EZ.o);
        setOp(R.aDiasF[i], u);
        setOp(R.aDiasL[i], 1 - u);
      });
      popEl(R.aDesc, t, T.descanso + 0.05, 822, 995, 0.35);
      // gráfica: series de esfuerzos cortos e intensos
      const hS = [100, 80, 60],
        hC = [108, 100, 93];
      R.aBarras.forEach((el, i) => {
        const serie = Math.floor(i / 2),
          con = i % 2 === 1;
        const h0 = con ? hS[serie] : hS[serie];
        const h1 = con ? hC[serie] : hS[serie];
        const crece = pr(t, T.rendir + serie * 0.08, 0.4, EZ.o);
        const mas = con ? pr(t, T.mas1 + serie * 0.06, 0.4, EZ.backS) : 0;
        const h = (h0 + (h1 - h0) * mas) * crece;
        const x = 452 + serie * 150 + (con ? 50 : 0);
        el.setAttribute("y", f2(1182 - h));
        el.setAttribute("height", f2(Math.max(0, h)));
        el.setAttribute("x", x);
      });
      setOp(R.aLeyenda, pr(t, T.rendir, 0.3));
      popEl(R.aRayo, t, T.cortos, 862, 1090, 0.35);
    }

    // ── tarjeta B: proteína ──
    {
      popEl(R.cardB, t, T.ayuda2 - 0.08, 1320, 845, 0.4);
      R.cardBF.setAttribute(
        "height",
        f2(K(t, [[T.cacito - 0.1, 135], [T.cacito + 0.2, 335, "backS"], [T.entrenar1 - 0.1, 335], [T.entrenar1 + 0.2, 420, "backS"]])),
      );
      const llena = pr(t, T.ganar, 0.6, EZ.o);
      R.bBarra.setAttribute("width", f2(300 * 0.86 * llena));
      popEl(R.bFlecha, t, T.ganar, 1470, 878, 0.35);
      popEl(R.bEscudo, t, T.perderlo, 1470, 878, 0.4);
      setOp(R.bFlecha, pr(t, T.ganar, 0.12) * (1 - pr(t, T.perderlo, 0.25)));
      // cacito al shaker, agua, leche y a agitar
      const pc = popEl(R.bCacito, t, T.cacito, 1150, 1010, 0.35);
      const vuelca = pr(t, T.cacito + 0.35, 0.4, EZ.io);
      if (pc.o > 0)
        R.bCacito.setAttribute(
          "transform",
          `translate(${f2(1150 + 125 * vuelca)} ${f2(1010 - 95 * vuelca)}) rotate(${f2(85 * vuelca)}) scale(${f2(pc.s)}) translate(-1150 -1010)`,
        );
      popEl(R.bShaker, t, T.cacito - 0.05, 1320, 1060, 0.35);
      const nivel = pr(t, T.agua, 0.5, EZ.o);
      const leche = pr(t, T.leche, 0.45, EZ.io);
      R.bLiquido.setAttribute("y", f2(1094 - 90 * nivel));
      R.bLiquido.setAttribute("height", f2(90 * nivel));
      R.bLiquido.setAttribute("fill", mezclaColor("#5AB8F0", "#F3EAD7", leche));
      popEl(R.bTxtAgua, t, T.agua, 1450, 1006, 0.3);
      popEl(R.bTxtLeche, t, T.leche, 1450, 1066, 0.3);
      const agita = t > T.despues && t < T.despues + 0.7 ? Math.sin((t - T.despues) * 38) * 14 * (1 - (t - T.despues) / 0.7) : 0;
      if (t > T.cacito + 0.4) R.bShaker.setAttribute("transform", `rotate(${f2(agita)} 1320 1100)`);
      popEl(R.bDespues, t, T.entrenar1, 1320, 1154, 0.35);
    }

    // ── señala el gimnasio: flecha y neón ──
    {
      const u = pr(t, T.esto2, Math.max(0.3, T.nada - T.esto2 + 0.2), EZ.io);
      R.flecha.setAttribute("stroke-dashoffset", f2(R.flecha.__len * (1 - u)));
      popEl(R.flechaPunta, t, T.nada + 0.05, 2980, 1150, 0.3);
      // cuando la línea del suelo toma el relevo, la flecha se apaga despacio
      const apaga = 1 - pr(t, T.gimnasio, 0.9, EZ.io);
      setOp(R.flecha, apaga);
      if (t > T.nada + 0.05) setOp(R.flechaPunta, apaga);
      const on = pr(t, T.entrenar2, 0.25, EZ.o);
      const parpadeo = t > T.entrenar2 && t < T.entrenar2 + 0.3 ? (Math.sin((t - T.entrenar2) * 60) > 0 ? 1 : 0.5) : 1;
      setOp(R.neonGym, on * parpadeo * (0.9 + 0.1 * Math.sin(t * 2.7)));
      setOp(R.neonGymOff, 1 - on);
    }

    // ── pagar, la bolsa y la línea del suelo ──
    {
      const pd = pr(t, T.pago - 0.3, 0.3, EZ.o) * (1 - pr(t, T.llevo + 0.3, 0.3, EZ.i));
      R.datafono.setAttribute("transform", `translate(${f2(hd.manoR.x)} ${f2(hd.manoR.y)}) scale(${f2(pd)})`);
      setOp(R.datafono, pd > 0.02 ? 1 : 0);
      setOp(R.datPantalla, pr(t, T.pago, 0.15));
      const pm = pr(t, T.pago - 0.25, 0.25, EZ.o) * (1 - pr(t, T.llevo, 0.25, EZ.i));
      R.movil.setAttribute("transform", `translate(${f2(hf.manoR.x)} ${f2(hf.manoR.y)}) scale(${f2(pm)})`);
      setOp(R.movil, pm > 0.02 ? 1 : 0);
      const pb = pop(t, T.llevo, 0.35);
      const suelta = t > T.semana1 - 0.3 ? 1 - pr(t, T.semana1 - 0.3, 0.3) : 1;
      const bx = t < T.gimnasio + 0.5 ? hf.manoL.x : BARRA_X - 260,
        by = t < T.gimnasio + 0.5 ? hf.manoL.y : SUELO - 10;
      R.bolsa.setAttribute("transform", `translate(${f2(bx)} ${f2(by)}) scale(${f2(pb.s * (t < T.gimnasio + 0.5 ? 1 : 1))})`);
      setOp(R.bolsa, pb.o * (t < T.gimnasio + 0.5 ? 1 : 1));
      void suelta;
      // la línea se dibuja detrás de él mientras va al gimnasio
      const x0 = SITIO,
        x1 = BARRA_X;
      const recorrido = t < T.fue ? 0 : clamp((Math.max(...[sf.x]) - x0) / (x1 - x0));
      const maxR = t > T.gimnasio + 0.4 ? 1 : recorrido;
      R.linea.setAttribute("stroke-dashoffset", f2(R.linea.__len * (1 - maxR)));
      // al volver, la línea brilla bajo sus pies
      const vuelta = t > T.volvio ? clamp((x1 - sf.x) / (x1 - x0)) : 0;
      R.lineaBrillo.setAttribute("stroke-dashoffset", f2(R.lineaBrillo.__len * (1 - vuelta)));
      setOp(R.lineaBrillo, t > T.volvio ? 1 : 0);
    }

    // ── gimnasio: marcador de semanas y barras ──
    {
      const semana = K(t, [
        [T.uno2 - 0.02, 0],
        [T.uno2 + 0.3, 1, "io"],
        [T.cuatro - 0.05, 1],
        [T.cuatro + 0.4, 4, "io"],
        [T.ocho - 0.05, 4],
        [T.ocho + 0.4, 8, "io"],
        [T.doce - 0.05, 8],
        [T.doce + 0.45, 12, "io"],
      ]);
      const u = semana % 10,
        d = Math.floor(semana / 10) + clamp((semana - 9) / 1) * 0;
      const decenas = semana < 9 ? 0 : semana >= 10 ? 1 : semana - 9;
      R.marcadorU.setAttribute("transform", `translate(0 ${f2(-u * 150)})`);
      R.marcadorD.setAttribute("transform", `translate(0 ${f2(-decenas * 150)})`);
      void d;
      // barra del flaco: discos que llegan según las semanas
      const enGym = t > T.gimnasio + 0.4 && t < T.volvio + 0.05;
      const flex = t > T.barra1 - 0.1 && t < T.semana2 ? 0.25 + 0.08 * Math.sin(t * 8) : t > T.doblaba ? pr(t, T.doblaba, 0.25, EZ.backS) * 1.0 : 0.06;
      const discosF = [0, 1, 2, 3, 4, 5].map((i) => {
        let t0 = i < 2 ? T.peso : i < 4 ? (i === 2 ? T.quitaba : T.pesas) : T.doce + 0.1;
        if (i >= 2 && i < 4) {
          // vuelan desde la barra del vecino
          const u2 = pr(t, t0 - 0.05, 0.45, EZ.io);
          if (u2 <= 0) return { s: 0, o: 0 };
          if (u2 >= 1) return { s: 1, o: 1 };
          const hvc = { x: (hv.manoL.x + hv.manoR.x) / 2, y: (hv.manoL.y + hv.manoR.y) / 2 };
          const de = { x: hvc.x + (i === 2 ? -260 : 260), y: hvc.y };
          const cx = (hf.manoL.x + hf.manoR.x) / 2,
            cy = (hf.manoL.y + hf.manoR.y) / 2;
          const lado = i % 2 === 0 ? -1 : 1;
          const hacia = { x: cx + lado * 226, y: cy };
          return {
            s: 1,
            o: 1,
            x: lerp(de.x, hacia.x, u2) - cx,
            y: lerp(de.y, hacia.y, u2) - cy - Math.sin(u2 * Math.PI) * 260,
          };
        }
        const p = pop(t, t0, 0.3);
        return { s: p.s, o: p.o };
      });
      if (enGym) {
        barra(R.barraF, t, hf.manoL, hf.manoR, flex, discosF);
        setOp(R.barraF.root, 1);
      } else {
        // en el soporte, esperando
        const rack = { x: BARRA_X - 300, y: SUELO - 520 },
          rack2 = { x: BARRA_X + 300, y: SUELO - 520 };
        barra(R.barraF, t, rack, rack2, 0, discosF.map(() => ({ s: 0, o: 0 })));
        setOp(R.barraF.root, t > T.volvio ? 0 : 1);
        if (t > T.volvio) {
          // la deja doblada en el soporte
          barra(R.barraF, t, rack, rack2, 1, discosF);
          setOp(R.barraF.root, 1);
        }
      }
      const discosV = [{ s: 1, o: t < T.quitaba - 0.05 ? 1 : 0 }, { s: 1, o: t < T.pesas - 0.05 ? 1 : 0 }];
      barra(R.barraV, t, hv.manoL, hv.manoR, 0.02, discosV);
      // gotas de sudor la primera semana
      setOp(R.gotas, t > T.semana1 && t < T.semana2 ? 1 : t > T.lado && t < T.semana4 + 0.4 ? 1 : 0);
      const gp = t > T.lado ? hv.cabeza : hf.cabeza;
      R.gotas.setAttribute("transform", `translate(${f2(gp.x + 70)} ${f2(gp.y - 40 + ((t * 120) % 60))})`);
    }

    // ── choque de manos ──
    {
      const mx = (hd.manoR.x + hf.manoR.x) / 2,
        my = (hd.manoR.y + hf.manoR.y) / 2;
      const p = pop(t, T.mas4, 0.3);
      R.choque.setAttribute("transform", `translate(${f2(mx)} ${f2(my)}) scale(${f2(p.s)})`);
      setOp(R.choque, p.o * popOut(t, T.mas4 + 0.6));
    }

    // ── comentario final ──
    {
      popEl(R.comentario, t, T.comenta - 0.05, 1460, 270, 0.45);
      escribir(R.comTexto, "FUERTE", t, T.fuerte2, T.fuerte2Fin + 0.1);
      setOp(R.comPlace, t < T.fuerte2 ? 1 : 0);
      const env = pr(t, T.botes2, 0.15);
      R.comEnviar.setAttribute("transform", `translate(2180 270) scale(${f2(1 - 0.18 * Math.sin(env * Math.PI))})`);
      popEl(R.comCorazon, t, T.botes2 + 0.02, 2180, 120, 0.4);
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
    for (const id of ["flecha-gym", "linea-suelo", "linea-brillo"]) {
      const el = document.getElementById(id);
      el.__len = el.getTotalLength();
      el.setAttribute("stroke-dasharray", `${el.__len} ${el.__len}`);
    }
  }

  window.__IF.render = render;
  window.__IF.medir = medirTrazos;
  window.__IF.camara = camara;
})();
