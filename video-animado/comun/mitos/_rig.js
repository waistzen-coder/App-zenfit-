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
  function medidas(p, m, globo = 0) {
    const g = p.genero === "f" ? 1 : 0;
    return {
      muslo: 120,
      tibia: 118,
      Ht: 198 + 30 * m,
      Ws: 112 + 200 * m - g * 10 + 150 * globo,
      Ww: 92 + 54 * m + g * 16 + 300 * globo,
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
    telefono: { aL: 10, eL: 8, aR: 36, eR: 118 },
    batido: { aL: 10, eL: 8, aR: 62, eR: 96 },
    alto: { aL: 10, eL: 8, aR: 78, eR: 96 },
    miedo: { aL: 34, eL: -122, aR: 34, eR: -122 },
    cruzados: { aL: 46, eL: -128, aR: 46, eR: -128 },
    pecho: { aL: 40, eL: 126, aR: 40, eR: 126 },
    toalla: { aL: 30, eL: 150, aR: 30, eR: 150 },
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
    miedo: { mw: 22, mc: -8, mo: 20, cy: -14, cr: -10 },
    dormido: { mw: 20, mc: 6, mo: 2, cy: 4, cr: 0 },
    cansado: { mw: 22, mc: -4, mo: 6, cy: 6, cr: -12 },
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
    const M = medidas(p, st.m, st.globo || 0);
    const hipY = -(M.muslo + M.tibia + 14);
    const sy = hipY - M.Ht;
    const pose = st.pose;
    // andar: fase según la distancia recorrida
    const amp = clamp(Math.abs(st.v) / 420) * (st.correr ? 1.35 : 1);
    const fase = ((st.face * st.x) / (230 * st.s)) * Math.PI + (st.fase || 0);
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
