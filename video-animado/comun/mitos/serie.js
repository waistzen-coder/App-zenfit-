  // ───────────────── serie «Mitos del gimnasio»: lo que pasa en cada episodio sale de IF.EP ─────────────────
  const EP = IF.EP;
  // un momento: "clave" (cuándo empieza esa palabra), ["clave", desfase] o un número de segundos
  const tkx = (k) => (k == null ? null : typeof k === "number" ? k : Array.isArray(k) ? (typeof k[0] === "number" ? k[0] : T[k[0]]) + (k[1] || 0) : T[k]);
  const resolver = (keys) => (keys || []).map((k) => [tkx(k[0]), ...k.slice(1)]);
  const rangos = (rs) => (rs || []).map(([a, b]) => [tkx(a), b == null ? 1e9 : tkx(b)]);
  const dentro = (rs, t) => rs.some(([a, b]) => t >= a && t < b);
  const ultimo = (keys, t) => {
    let r = null;
    for (const k of keys) if (t >= k[0]) r = k;
    return r;
  };
  const Kd = (t, keys, def) => (keys.length ? K(t, keys) : def);

  // ── cámara: [momento, x, y, zum, curva] ──
  const CAM = EP.cam.map(([k, x, y, z, e]) => [tkx(k), { x, y, z }, e]);
  const SACUDIDAS = (EP.sacudidas || []).map(([k, d, a]) => [tkx(k), d, a]);
  function camara(t) {
    const c = { ...K(t, CAM) };
    c.x += Math.sin(t * 0.7) * 4;
    c.y += Math.sin(t * 0.53 + 1) * 3;
    let sx = 0,
      sy = 0;
    for (const [t0, d, a] of SACUDIDAS)
      if (t >= t0 && t < t0 + d) {
        const k = 1 - (t - t0) / d;
        sx += ruido(t * 3, 1) * a * k;
        sy += ruido(t * 3, 2) * a * k;
      }
    c.sx = sx;
    c.sy = sy;
    return c;
  }

  // ── personajes: x, mirada, postura, gesto, habla… por fotogramas clave ──
  const ACT = {};
  for (const [id, a] of Object.entries(EP.actores)) {
    ACT[id] = {
      s: a.s || 1.04,
      m: a.m ?? PJ[id].m0,
      x: resolver(a.x),
      y: resolver(a.y),
      face: resolver(a.face),
      pose: resolver(a.pose).map(([t, n, e]) => [t, typeof n === "string" ? POSES[n] : n, e]),
      gesto: resolver(a.gesto),
      mira: resolver(a.mira),
      mK: resolver(a.mK),
      temblor: resolver(a.temblor),
      ojos: resolver(a.ojos),
      globo: resolver(a.globo),
      lean: resolver(a.lean),
      habla: rangos(a.habla),
      oculto: rangos(a.oculto),
      trota: rangos(a.trota),
    };
    for (const [k, v] of Object.entries(ACT[id])) if (Array.isArray(v) && v.some((q) => q[0] == null || Number.isNaN(q[0]))) throw new Error(`actor ${id}: momento raro en ${k}`);
  }
  function actor(id, t) {
    const A = ACT[id];
    const x = Kd(t, A.x, 0);
    let v = A.x.length ? vel(A.x, t) : 0;
    const trota = dentro(A.trota, t);
    if (trota) v = 650;
    const mi = ultimo(A.mira, t);
    const fa = ultimo(A.face, t);
    const ge = ultimo(A.gesto, t);
    return {
      x, y: Kd(t, A.y, SUELO), s: A.s, face: fa ? fa[1] : 1, m: Kd(t, A.mK, A.m), v,
      fase: trota ? t * 9 : 0, correr: trota || Math.abs(v) > 700,
      pose: A.pose.length ? K(t, A.pose) : POSES.reposo, gesto: GESTOS[ge ? ge[1] : "neutro"],
      habla: dentro(A.habla, t), mx: mi ? mi[1] : 0.6, my: mi ? mi[2] ?? 0 : 0,
      temblor: Kd(t, A.temblor, 0), ojos: Kd(t, A.ojos, 1), globo: Kd(t, A.globo, 0), lean: Kd(t, A.lean, 0),
      oculto: dentro(A.oculto, t),
    };
  }

  // ── objetos de la escena (bocadillos, nube, relojes, barra…): uno por entrada de EP.objetos ──
  const OBJ = EP.objetos.map((o, i) => {
    const r = { ...o, i, t0: tkx(o.t0), t1: o.t1 == null ? 1e9 : tkx(o.t1) };
    if (o.sello != null) r.sello = tkx(o.sello);
    if (o.reps) r.reps = resolver(o.reps);
    if (r.t0 == null || Number.isNaN(r.t0) || Number.isNaN(r.t1)) throw new Error(`objeto ${i} (${o.tipo}): momento raro`);
    return r;
  });
  const visible = (o, t, dEnt = 0.3, dSal = 0.22) => pop(t, o.t0, dEnt).o * popOut(t, o.t1, dSal);

  // ── la tarjeta REALIDAD, el producto, el veredicto y la llamada ──
  const PROD = EP.producto ? { ...EP.producto, t: tkx(EP.producto.t), t1: EP.producto.t1 == null ? 1e9 : tkx(EP.producto.t1) } : null;
  const VER = { ...EP.veredicto, t: tkx(EP.veredicto.t), sello: tkx(EP.veredicto.sello) };
  const CTA = { ...EP.cta, t: tkx(EP.cta.t), siguenos: tkx(EP.cta.siguenos) };

  let R = null;
  function init() {
    for (const id of Object.keys(PJ)) initPJ(id);
    initTarjetas();
    R = {
      svg: $("mundo-svg"), cam: $("cam"), fondo: $("fondo-lejano"), puerta: $("puerta-hoja"), neonTienda: $("neon-tienda"),
      neonGym: $("neon-gym"), oscuro: $("gym-oscuro"), marcadorU: $("marcador-u"), marcadorD: $("marcador-d"),
      o: OBJ.map((o) => {
        const g = { root: $(`o${o.i}`) };
        const sub = (n) => document.getElementById(`o${o.i}-${n}`);
        for (const n of ["in", "sello", "tacha", "nube", "fx", "txt", "bar", "cinta", "luna", "hora"]) if (sub(n)) g[n] = sub(n);
        g.discos = [0, 1, 2, 3, 4, 5].map((k) => sub("d" + k)).filter(Boolean);
        g.items = [0, 1, 2, 3, 4, 5].map((k) => sub("k" + k)).filter(Boolean);
        return g;
      }),
      prod: PROD ? $("producto") : null,
      ver: $("veredicto"), verSello: $("veredicto-sello"), verTacha: $("veredicto-tacha"),
      cta: $("cta"), ctaTxt: $("cta-escribe"), ctaCursor: $("cta-cursor"), boton: $("boton-fondo"), botonSeguir: $("boton-seguir-txt"), botonSiguiendo: $("boton-siguiendo"), dedo: $("dedo-tap"),
    };
  }
  const MINI = {}; // estado de los personajes pequeños de las nubes (los pinta la nube)

  function render(t) {
    if (!R) init();
    const c = camara(t);
    R.cam.setAttribute("transform", `translate(${f2(CX - c.x * c.z + c.sx)} ${f2(CY - c.y * c.z + c.sy)}) scale(${c.z.toFixed(4)})`);
    const zf = 0.55 + c.z * 0.25;
    R.fondo.setAttribute("transform", `translate(${f2(CX - c.x * 0.3 * zf)} ${f2(CY - (c.y - 400) * 0.3 * zf - 600 * zf)}) scale(${f2(zf)})`);
    const c2 = camara(t - 1 / 30);
    const desp = Math.hypot((c.x - c2.x) * c.z, (c.y - c2.y) * c.z);
    const blur = clamp((desp - 26) / 10, 0, 4);
    R.svg.style.filter = blur > 0.25 ? `blur(${blur.toFixed(2)}px)` : "none";
    R.neonTienda.setAttribute("opacity", f2(0.85 + 0.15 * Math.sin(t * 2.1)));
    R.neonGym.setAttribute("opacity", f2(0.9 + 0.1 * Math.sin(t * 2.7 + 1)));

    // ── personajes ──
    const H = {};
    for (const id of Object.keys(ACT)) {
      const st = actor(id, t);
      H[id] = dibujarPJ(id, st, t);
      H[id].st = st;
    }
    // la puerta se abre cuando alguien pasa por ella
    let abre = 0;
    for (const id of Object.keys(H)) if (!H[id].st.oculto) abre = Math.max(abre, 1 - clamp(Math.abs(H[id].st.x - 2340) / 220));
    R.puerta.setAttribute("transform", `translate(2216 0) scale(${f2(1 - 0.75 * abre)} 1) translate(-2216 0)`);

    // ── objetos ──
    const cabeza = (q) => (H[q] ? H[q].cabeza : { x: 0, y: 0 });
    for (const o of OBJ) {
      const g = R.o[o.i];
      const vis = visible(o, t);
      if (o.tipo === "bocadillo") {
        const h = cabeza(o.quien);
        const p = pop(t, o.t0, 0.32);
        setOp(g.root, p.o * popOut(t, o.t1, 0.2));
        const ax = h.x + (o.dx ?? 40),
          ay = h.y - 110 + (o.dy ?? 0);
        g.root.setAttribute("transform", `translate(${f2(ax)} ${f2(ay)}) scale(${f2(p.s)})`);
        if (g.sello && o.sello != null) {
          const u = clamp((t - o.sello) / 0.14);
          setOp(g.sello, t >= o.sello ? 1 : 0);
          g.sello.setAttribute("transform", `scale(${f2(lerp(1.9, 1, EZ.i3(u)))})`);
          if (g.tacha) g.tacha.setAttribute("stroke-dashoffset", f2(110 - 110 * pr(t, o.sello + 0.12, 0.2, EZ.o)));
        }
      } else if (o.tipo === "nube") {
        const h = cabeza(o.quien);
        const cx = h.x + (o.dx ?? 60),
          cy = h.y - 430 + (o.dy ?? 0);
        const p = pop(t, o.t0, 0.38, 0.3);
        const sal = popOut(t, o.t1, 0.25);
        setOp(g.root, p.o * sal);
        g.nube.setAttribute("transform", `translate(${f2(cx)} ${f2(cy)}) scale(${f2(p.s * (1 + 0.25 * (1 - sal)))})`);
        // el personaje pequeño de dentro y su exageración
        const u = pr(t, o.t0 + 0.3, 0.9, EZ.backS);
        const id2 = o.mini;
        const st = {
          x: cx, y: cy + 185, s: 0.55 * (o.gag === "gigante" ? lerp(1, 1.15, u) : 1), face: 1, v: 0,
          m: o.gag === "globo" ? 0.1 : lerp(o.m0 ?? 0.15, o.gag === "gigante" ? 1.75 : 1.9, u),
          globo: o.gag === "globo" ? u * (1 + 0.04 * Math.sin(t * 9)) : 0,
          pose: o.gag === "globo" ? POSES.miedo : K(t, [[o.t0, POSES.reposo], [o.t0 + 0.9, POSES.flex, "back"]]),
          gesto: GESTOS[o.gag === "globo" ? "miedo" : "orgullo"], mx: 0.2, my: o.gag === "globo" ? 0.6 : -0.3, ojos: o.gag === "globo" ? 1.25 : 1,
          temblor: o.gag === "globo" ? 0.4 : 0,
        };
        dibujarPJ(id2, st, t);
        setOp(els[id2].root, p.o * sal * clamp((t - o.t0 - 0.15) / 0.15));
        const panza = document.getElementById(`o${o.i}-panza`);
        if (panza) {
          const brillo = document.getElementById(`o${o.i}-brillo`);
          const by = cy + 185 - 360 * st.s;
          const rx = (40 + 175 * st.globo) * st.s,
            ry = (40 + 150 * st.globo) * st.s;
          for (const [el, k, dx, dy] of [[panza, 1, 0, 0], [brillo, 0.3, -0.35, -0.4]]) {
            el.setAttribute("cx", f2(cx + dx * rx));
            el.setAttribute("cy", f2(by + dy * ry));
            el.setAttribute("rx", f2(rx * k));
            el.setAttribute("ry", f2(ry * k));
          }
          setOp(panza, clamp((u - 0.05) / 0.2));
        }
        if (g.fx) {
          setOp(g.fx, o.gag === "globo" ? 0 : clamp((u - 0.6) / 0.3) * p.o * sal);
          g.fx.setAttribute("transform", `translate(${f2(cx)} ${f2(cy)})`);
        }
      } else if (o.tipo === "pildora") {
        const p = pop(t, o.t0, 0.32);
        setOp(g.root, p.o * popOut(t, o.t1, 0.2));
        let x = o.x,
          y = o.y;
        if (o.quien) (x = cabeza(o.quien).x + (o.dx ?? 0)), (y = cabeza(o.quien).y + (o.dy ?? -150));
        g.root.setAttribute("transform", `translate(${f2(x)} ${f2(y)}) scale(${f2(p.s)})`);
      } else if (o.tipo === "reloj") {
        const p = pop(t, o.t0, 0.3);
        setOp(g.root, p.o * popOut(t, o.t1, 0.2));
        const h = cabeza(o.quien);
        g.root.setAttribute("transform", `translate(${f2(h.x + (o.dx ?? 0))} ${f2(h.y + (o.dy ?? -230))}) scale(${f2(p.s)})`);
        const resto = Math.max(0, o.desde - Math.max(0, t - o.t0) * o.velocidad);
        const mm = Math.floor(resto / 60),
          ss = Math.floor(resto % 60);
        const v = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
        if (g.txt.textContent !== v) g.txt.textContent = v;
      } else if (o.tipo === "noche") {
        R.oscuro.setAttribute("opacity", f2(0.78 * vis));
        setOp(g.root, vis);
      } else if (o.tipo === "zzz" || o.tipo === "gotas" || o.tipo === "rayos" || o.tipo === "brillos") {
        const h = cabeza(o.quien);
        setOp(g.root, vis);
        g.root.setAttribute("transform", `translate(${f2(h.x + (o.dx ?? 0))} ${f2(h.y + (o.dy ?? 0))})`);
        g.items.forEach((el, k) => {
          if (o.tipo === "zzz") {
            const u = ((t * 0.7 + k / 3) % 1 + 1) % 1;
            el.setAttribute("transform", `translate(${f2(70 + 40 * u + k * 10)} ${f2(-90 - 160 * u)}) scale(${f2(0.6 + 0.6 * u)})`);
            setOp(el, Math.sin(Math.PI * u));
          } else if (o.tipo === "gotas") {
            const u = ((t * 1.6 + k * 0.5) % 1 + 1) % 1;
            el.setAttribute("transform", `translate(${f2((k ? 70 : -60) + 6 * Math.sin(t * 5 + k))} ${f2(-20 + 70 * u)})`);
            setOp(el, 1 - u);
          } else if (o.tipo === "rayos") {
            const on = Math.sin(t * 23 + k * 2.1) > 0.1 ? 1 : 0.15;
            setOp(el, on);
          } else {
            const u = ((t * 0.9 + k / 3) % 1 + 1) % 1;
            el.setAttribute("transform", `translate(${[-90, 100, 20][k % 3]} ${[-40, 10, -120][k % 3]}) scale(${f2(0.4 + Math.sin(Math.PI * u) * 0.7)})`);
          }
        });
      } else if (o.tipo === "cacitos") {
        const h = H[o.quien];
        setOp(g.root, popOut(t, o.t1, 0.2) * (t >= o.t0 ? 1 : 0));
        g.root.setAttribute("transform", `translate(${f2(h.manoR.x + (o.dx ?? 0))} ${f2(h.manoR.y + (o.dy ?? -120))})`);
        g.items.forEach((el, k) => {
          const pk = pop(t, o.t0 + k * (o.dt ?? 0.3), 0.3);
          setOp(el, pk.o);
          el.setAttribute("transform", `translate(${(k - (g.items.length - 1) / 2) * 120} ${f2(-30 * (1 - pk.s))}) scale(${f2(pk.s)})`);
        });
      } else if (o.tipo === "marcador") {
        const de = o.desde ?? 1;
        const n = lerp(de, o.hasta, pr(t, o.t0, 0.7, EZ.io));
        R.marcadorU.setAttribute("transform", `translate(0 ${f2(-150 * n)})`);
        R.marcadorD.setAttribute("transform", `translate(0 ${f2(-150 * clamp((n - 9) / 1))})`);
        setOp(g.root, 0);
      } else if (o.tipo === "barra") {
        const h = H[o.quien];
        const on = t >= o.t0 && t < o.t1 && !h.st.oculto;
        setOp(g.root, on ? 1 : 0);
        if (on) {
          const flex = o.flex ?? 0.12;
          const discos = g.discos.map((_, k) => ({ s: k < (o.discos ?? 4) ? 1 : 0, o: k < (o.discos ?? 4) ? 1 : 0 }));
          barra({ root: g.root, bar: g.bar, discos: g.discos }, t, h.manoL, h.manoR, flex, discos);
        }
      } else if (o.tipo === "cinta") {
        setOp(g.root, vis);
        if (g.cinta) g.cinta.setAttribute("transform", `translate(${f2(-((t * 520) % 60))} 0)`);
      } else if (o.tipo === "pulgares") {
        setOp(g.root, t >= o.t0 && t < o.t1 ? 1 : 0);
        g.items.forEach((el, k) => {
          const [x, y] = o.puntos[k];
          const pk = pop(t, o.t0 + k * (o.dt ?? 0.15), 0.32);
          setOp(el, pk.o * popOut(t, o.t1, 0.2));
          el.setAttribute("transform", `translate(${x} ${f2(y + Math.sin(t * 4 + k) * 6)}) scale(${f2(pk.s)})`);
        });
      } else if (o.tipo === "prop") {
        const h = H[o.quien];
        const on = t >= o.t0 && t < o.t1 && !h.st.oculto;
        setOp(g.root, on ? 1 : 0);
        if (on) {
          if (o.que === "toalla") {
            const cab = h.cabeza;
            g.root.setAttribute("transform", `translate(${f2(cab.x)} ${f2(cab.y + 70 * h.st.s)}) scale(${f2(h.st.s * h.st.face)} ${f2(h.st.s)})`);
          } else {
            const m = o.mano === "L" ? h.manoL : h.manoR;
            g.root.setAttribute("transform", `translate(${f2(m.x)} ${f2(m.y)}) scale(${f2(h.st.s)})`);
          }
        }
      } else if (o.tipo === "estelas") {
        const h = H[o.quien];
        const vv = Math.abs(h.st.v);
        setOp(g.root, clamp((vv - 700) / 500) * 0.9 * (t >= o.t0 && t < o.t1 ? 1 : 0));
        g.root.setAttribute("transform", `translate(${f2(h.st.x - h.st.face * 150)} ${SUELO - 330}) scale(${-h.st.face} 1)`);
      }
    }

    // ── el producto en el mostrador ──
    if (PROD) {
      const p = pop(t, PROD.t, 0.4);
      setOp(R.prod, p.o * popOut(t, PROD.t1, 0.2));
      R.prod.setAttribute("transform", `translate(${PROD.x ?? 1290} 1450) scale(${f2(p.s)})`);
    }
    // ── la tarjeta REALIDAD ──
    tarjetas(t);

    // ── veredicto: el mito tachado y el sello ──
    {
      const p = pop(t, VER.t, 0.4);
      setOp(R.ver, p.o);
      R.ver.setAttribute("transform", `translate(${VER.x} ${VER.y}) scale(${f2(p.s)})`);
      const u = clamp((t - VER.sello) / 0.14);
      setOp(R.verSello, t >= VER.sello ? 1 : 0);
      R.verSello.setAttribute("transform", `rotate(-9) scale(${f2(lerp(2, 1, EZ.i3(u)))})`);
      R.verTacha.setAttribute("stroke-dashoffset", f2(110 - 110 * pr(t, VER.sello + 0.1, 0.25, EZ.o)));
    }
    // ── llamada: «déjalo en los comentarios» y seguir ──
    {
      const p = pop(t, CTA.t, 0.4);
      setOp(R.cta, p.o);
      R.cta.setAttribute("transform", `translate(${CTA.x} ${CTA.y}) scale(${f2(p.s)})`);
      escribir(R.ctaTxt, EP.cta.ejemplo, t, CTA.t + 0.5, CTA.siguenos - 0.2);
      setOp(R.ctaCursor, Math.sin(t * 12) > 0 ? 1 : 0);
      R.ctaCursor.setAttribute("x", f2(-290 + R.ctaTxt.textContent.length * 25.5));
      const tp = CTA.siguenos + 0.25;
      const dp = pop(t, CTA.siguenos + 0.1, 0.3);
      setOp(R.dedo, dp.o * popOut(t, tp + 0.4, 0.2));
      R.dedo.setAttribute("transform", `translate(${f2(290 + 30 * (1 - clamp((t - CTA.siguenos - 0.1) / 0.35)))} ${f2(225 + 20 * (t > tp && t < tp + 0.15 ? 1 : 0))})`);
      const ok = t >= tp;
      setOp(R.botonSeguir, ok ? 0 : 1);
      setOp(R.botonSiguiendo, ok ? 1 : 0);
      R.boton.setAttribute("fill", ok ? "#E5E7EB" : "#1D6BFF");
    }
  }
  window.__IF.render = render;
  window.__IF.camara = camara;
