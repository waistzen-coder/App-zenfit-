// Motor del vídeo de prueba «Cinco palabras en la puerta». build.mjs lo incrusta en compositions/mundo.html.
// Todo lo que se ve es una función pura del tiempo t: render(t). Una sola línea de tiempo de
// GSAP mueve el reloj, así que cada fotograma sale igual siempre.
// Un solo mundo (coordenadas del cartel de la puerta) y una sola cámara.
(function () {
  const IF = window.__IF;
  const { T, D, ON, PAL, PREG, LEMA, YR, XP, YP, FIN, SESGO } = IF;
  const CX = 540,
    CY = 960;

  // ───────────────────────── utilidades ─────────────────────────
  const $ = (id) => {
    const e = document.getElementById(id);
    if (!e) throw new Error("falta #" + id);
    return e;
  };
  const pe = (n) => gsap.parseEase(n);
  const EZ = {
    io: pe("power2.inOut"), io3: pe("power3.inOut"), o: pe("power2.out"), o3: pe("power3.out"), o4: pe("power4.out"),
    i: pe("power2.in"), i3: pe("power3.in"), back: pe("back.out(1.6)"), backS: pe("back.out(1.2)"), expo: pe("expo.out"),
    s: pe("sine.inOut"), lin: (x) => x,
  };
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, u) => a + (b - a) * u;
  const pr = (t, t0, d, e = EZ.io) => e(clamp((t - t0) / d));
  const f2 = (v) => Math.round(v * 100) / 100;
  const ruido = (t, seed) => Math.sin(t * 12.9898 + seed * 78.233) * 0.5 + Math.sin(t * 7.13 + seed * 3.1) * 0.5;
  // fotogramas clave: [[t, valor, ease?], …]
  function K(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, v0] = keys[i],
        [t1, v1, e] = keys[i + 1];
      if (t < t1) return lerp(v0, v1, (EZ[e] || e || EZ.io)(clamp((t - t0) / Math.max(1e-6, t1 - t0))));
    }
    return keys[keys.length - 1][1];
  }
  // opacidad con «display:none» cuando no se ve (así no se pinta lo que está apagado)
  function ver(el, o) {
    if (o <= 0.003) {
      if (el.getAttribute("display") !== "none") el.setAttribute("display", "none");
      return;
    }
    if (el.getAttribute("display") === "none") el.removeAttribute("display");
    el.setAttribute("opacity", f2(o));
  }
  const tr = (el, x, y, s = 1, r = 0) =>
    el.setAttribute("transform", `translate(${f2(x)} ${f2(y)})${r ? ` rotate(${f2(r)})` : ""}${s !== 1 ? ` scale(${Math.max(0.0001, s).toFixed(4)})` : ""}`);
  // aparecer con rebote (escala) y opacidad rápida
  function pop(t, t0, d = 0.35, desde = 0.5) {
    if (t < t0) return { s: desde, o: 0 };
    const u = clamp((t - t0) / d);
    return { s: lerp(desde, 1, EZ.back(u)), o: clamp(u * 3) };
  }
  const salida = (t, t1, d = 0.2) => (t < t1 ? 1 : 1 - EZ.i(clamp((t - t1) / d)));

  // ───────────────────────── cámara ─────────────────────────
  // [t, x, y, zum, ease]: el punto (x, y) del mundo cae en (540, 960) de la pantalla.
  // Entre dos claves, el punto de destino viaja en línea recta por la pantalla y el zum es
  // exponencial: un zum «hacia» algo se ve como acercarse a ese algo, no como una deriva.
  const celda = (i) => PAL[i].ys - 120;
  const FRANJAS = 5985;
  const CAM = [
    [0, 160, 1518, 0.35],
    [2.25, 330, 1460, 0.405, "s"],
    [ON[0], 500, celda(0), 1.0, "i3"],
  ];
  for (let i = 1; i < 5; i++) CAM.push([ON[i] - 0.3, 500, celda(i - 1), 1.0, "s"], [ON[i] - 0.01, 500, celda(i), 1.0, "io3"]);
  CAM.push(
    [T.cinco2, 500, celda(4), 1.0, "s"],
    [T.cinco2 + 0.7, 500, FRANJAS, 1.0, "io3"],
    [T.por1, 500, FRANJAS, 1.0, "s"],
    [T.por1 + 0.45, 500, 5960, 1.0, "io3"],
    [T.si1 - 0.34, 500, 5960, 1.0, "s"],
    [T.si1 - 0.02, -1240, 6000, 1.0, "io3"],
    [T.falta, -1240, 6000, 1.0, "s"],
    [T.falta + 0.5, XP, 5960, 1.0, "io3"],
    [T.aunque, XP, 5960, 1.0, "s"],
    [T.aunque + 0.45, XP, 5950, 1.0, "io3"],
    [T.debajo - 0.34, XP, 5950, 1.0, "s"],
    [T.debajo, 500, 6200, 0.7, "io3"],
    [T.una - 0.05, 500, 6200, 0.7, "s"],
    [T.una + 0.38, 500, 6815, 1.0, "io3"],
    [T.construye - 0.02, 500, 6815, 1.0, "s"],
    [T.airon - 0.36, 500, 6815, 1.0, "s"],
    [T.airon - 0.01, 500, 4560, 1.0, "io3"],
    [D, 500, 4548, 1.02, "s"],
  );
  // sacudidas: [inicio, duración, amplitud px]
  const SACUDIDAS = [
    [ON[0], 0.4, 14], [ON[1], 0.15, 4], [ON[2], 0.3, 10], [ON[3], 0.2, 5],
    [T.para2, 0.2, 6], [T.construye, 0.55, 18], [T.tu, 0.2, 7], [T.version, 0.25, 9],
  ];
  function camara(t) {
    let c = null;
    if (t <= CAM[0][0]) c = { x: CAM[0][1], y: CAM[0][2], z: CAM[0][3] };
    for (let k = 0; !c && k < CAM.length - 1; k++) {
      const [t0, x0, y0, z0] = CAM[k],
        [t1, x1, y1, z1, e] = CAM[k + 1];
      if (t < t1) {
        const u = (EZ[e] || EZ.io)(clamp((t - t0) / Math.max(1e-6, t1 - t0)));
        const z = z0 * Math.pow(z1 / z0, u);
        // el destino (x1, y1) se mueve recto por la pantalla hasta el centro
        c = { x: x1 - ((x1 - x0) * z0 * (1 - u)) / z, y: y1 - ((y1 - y0) * z0 * (1 - u)) / z, z };
      }
    }
    if (!c) {
      const l = CAM[CAM.length - 1];
      c = { x: l[1], y: l[2], z: l[3] };
    }
    // deriva muy suave: nunca hay una imagen congelada
    c.x += (Math.sin(t * 0.7) * 3) / c.z;
    c.y += (Math.sin(t * 0.53 + 1) * 2.5) / c.z;
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

  // ───────────────────────── el rodillo (tragaperras) ─────────────────────────
  const PASO = 240,
    VMAX = 2600,
    VLENTA = 260;
  const R0 = T.por1 + 0.42,
    R1 = T.para2 - 0.55;
  // posición del rodillo = integral de su velocidad (tramos lineales)
  function giro(t) {
    if (t <= R0) return 0;
    const tramos = [
      [R0, 0], [R0 + 0.45, VMAX], [R1, VMAX], [R1 + 0.6, VLENTA], [1e9, VLENTA],
    ];
    let s = 0;
    for (let k = 0; k < tramos.length - 1; k++) {
      const [a, va] = tramos[k],
        [b, vb] = tramos[k + 1];
      if (t <= a) break;
      const e = Math.min(t, b);
      const ve = va + ((vb - va) * (e - a)) / (b - a);
      s += ((va + ve) / 2) * (e - a);
    }
    return s;
  }
  const velGiro = (t) => (giro(t + 1 / 60) - giro(t - 1 / 60)) * 30;
  function enRodillo(i, t) {
    let w = i - giro(t) / PASO;
    w = ((((w + 2.5) % 5) + 5) % 5) - 2.5;
    return YR + w * PASO;
  }

  // ───────────────────────── cada palabra: dónde está y cómo de grande ─────────────────────────
  const sigma = (t) => pr(t, 2.54, 0.18, EZ.io3); // de la foto (compacto) a una palabra por plano
  const tBanda = (i) => T.cinco2 + 0.09 * (4 - i); // caen en franjas: primero la de abajo
  function palabra(i, t) {
    const p = PAL[i];
    const sg = sigma(t);
    let x = lerp(p.xc, 500, sg),
      y = lerp(p.yc, p.ys, sg),
      s = 1;
    const b = pr(t, tBanda(i), 0.5, EZ.o3);
    if (b > 0) {
      y = lerp(p.ys, p.yb, b);
      s = lerp(1, p.sB, b);
    }
    const l = pr(t, T.cada + 0.05 * i, 0.4, EZ.io3);
    if (l > 0) {
      x = lerp(500, 60 + (p.wH * p.sL) / 2, l);
      s = lerp(p.sB, p.sL, l);
    }
    const r = pr(t, T.por1, 0.42, EZ.io3);
    if (r > 0) {
      x = lerp(x, 500, r);
      y = lerp(y, enRodillo(i, t), r);
      s = lerp(s, p.sR, r);
    }
    const v = pr(t, T.debajo - 0.36, 0.36, EZ.io3);
    if (v > 0) {
      x = lerp(x, 500, v);
      y = lerp(y, p.yb, v);
      s = lerp(s, p.sB, v);
    }
    return { x, y, s, b, l, r, v };
  }

  // ───────────────────────── elementos ─────────────────────────
  let R = null;
  function init() {
    R = {
      svg: $("mundo-svg"), pantalla: $("pantalla"), cam: $("cam"), mblur: $("mblur-g"), flash: $("flash"),
      foto: $("foto"), cartel: $("cartel"), panel: $("panel"), veta: $("panel-veta"), panelLuz: $("panel-luz"),
      bordes: ["borde-gI", "borde-gD", "borde-I", "borde-D"].map($),
      palabras: $("palabras"), rblur: $("rblur-g"), marco: $("rodillo-marco"), marcoR: $("rodillo-marco-r"), marcoL: $("rodillo-marco-l"), clipRod: $("clip-rodillo-r"),
      hs: PAL.map((p) => [$(`hs${p.i}`), $(`hs${p.i}-g`)]),
      pp: PAL.map((p) => $(`pp${p.i}`)), ph: PAL.map((p) => $(`ph${p.i}`)), phB: PAL.map((p) => $(`ph${p.i}-blanco`)),
      grad: PAL.map((p) => $(`b${p.i}`)),
      w: PAL.map((p) => $(`w${p.i}`)), clipW: PAL.map((p) => $(`clip-w${p.i}-r`)),
      ic: PAL.map((p) => $(`ic${p.i}`)), sub: PAL.map((p) => [$(`sub${p.i}`), $(`sub${p.i}-g`), $(`sub${p.i}-c`)]),
      plan: PAL.map((p) => [0, 1, 2].map((k) => $(`plan${p.i}-${k}`))),
      luz0: $("g-luz0"), w0: $("w0"),
      est: [], rayo: $("w2-rayo"), w2flash: $("w2-flash"), engA: $("w3-a"), engB: $("w3-b"), sol: $("w4-sol"), halo: $("w4-halo"),
      brazo: $("ic0-brazo"), corredor: $("ic1-corredor"), lineas: [0, 1, 2].map((k) => $(`ic1-l${k}`)), icRayo: $("ic2-rayo"),
      icA: $("ic3-a"), icB: $("ic3-b"), icSol: $("ic4-sol"),
      preg: [$("preg1"), $("preg2")], pregB: [$("preg1-blanco"), $("preg2-blanco")], gq: [$("bq1"), $("bq2")],
      que: ["g", "c", "b", "w"].map((k) => $(`q1-${k}`)),
      lp: [0, 1, 2].map((k) => $(`lp${k}`)), lh: [0, 1, 2].map((k) => $(`lh${k}`)), lhB: [0, 1, 2].map((k) => $(`lh${k}-blanco`)), gl: [0, 1, 2].map((k) => $(`bl${k}`)),
      foco: $("foco"), producto: $("producto"), sombraProd: $("producto-sombra"),
      tags: [0, 1, 2].map((k) => ({ g: $(`tag${k}`), linea: $(`tag${k}-linea`), punto: $(`tag${k}-punto`), caja: $(`tag${k}-caja`) })),
      bocadillo: $("bocadillo"), tique: $("tique"), sello: $("tique-sello"), tl: [0, 1, 2, 3, 4].map((k) => $(`tl${k}`)),
      cierre: $("cierre"), apagado: $("rotulo-apagado"), rotuloLuz: $("rotulo-luz"), logo: $("logo"), boton: $("boton"), botonIn: $("boton-in"), botonLuz: $("boton-luz"), ven: $("ven"),
    };
    for (let k = 0; k < 18; k++) {
      const a = $(`w1-e${k}`),
        b = $(`w1-n${k}`);
      R.est.push({ a, b, w: +a.getAttribute("width"), v: 1500 + ((k * 397) % 9) * 260, x0: (k * 263) % 1000 });
    }
  }

  // brazo flexionado (línea), f = 0 relajado → 1 marcando bíceps
  function brazoD(f) {
    const b = (x0, y0, x1, y1) => `${f2(lerp(x0, x1, f))} ${f2(lerp(y0, y1, f))}`;
    return `M -150 95 L 30 95 Q 125 100 128 10 L 118 -95 Q 122 -165 55 -165 Q 0 -165 -5 -125 Q -8 -88 35 -90 L 48 -30 C ${b(35, -85, 40, -116)}, ${b(-70, -100, -80, -132)}, -95 -15 Q -120 15 -150 25 Z`;
  }
  // brillo que recorre una palabra de cromo: gradiente de −1 a +1
  const barrer = (g, t, t0, d = 0.55) => g.setAttribute("gradientTransform", `translate(${f2(lerp(-1, 1, EZ.io(clamp((t - t0) / d))))} 0)`);

  // ───────────────────────── render ─────────────────────────
  function render(t) {
    if (!R) init();
    // ── cámara y desenfoque de movimiento (solo en los barridos) ──
    const c = camara(t);
    R.cam.setAttribute("transform", `translate(${f2(CX - c.x * c.z + c.sx)} ${f2(CY - c.y * c.z + c.sy)}) scale(${c.z.toFixed(4)})`);
    const c2 = camara(t - 1 / 30);
    const dx = Math.abs(c.x - c2.x) * c.z,
      dy = Math.abs(c.y - c2.y) * c.z,
      dz = Math.abs(Math.log(c.z / c2.z)) * 900;
    const bz = clamp((dz - 14) / 6, 0, 10);
    const bx = Math.max(clamp((dx - 14) / 5, 0, 18), bz),
      by = Math.max(clamp((dy - 14) / 5, 0, 18), bz);
    if (bx > 0.3 || by > 0.3) {
      R.mblur.setAttribute("stdDeviation", `${f2(bx)} ${f2(by)}`);
      R.pantalla.setAttribute("filter", "url(#mblur)");
    } else R.pantalla.removeAttribute("filter");

    // ── la foto real de la puerta y sus cinco tiras de luz ──
    const oFoto = 1 - pr(t, 2.34, 0.24, EZ.io);
    ver(R.foto, oFoto);
    R.hs.forEach(([a, g], i) => {
      const u = pr(t, T.cinco1 + 0.1 * i, 0.18, EZ.expo);
      a.setAttribute("stroke-dashoffset", f2(110 - 110 * u));
      g.setAttribute("stroke-dashoffset", f2(110 - 110 * u));
      g.setAttribute("opacity", f2(0.8 * u + 0.2 * u * Math.sin(t * 9 + i)));
    });

    // ── el cartel: de la foto (inclinado, marrón) al cartel de la tienda (recto, negro) ──
    const sg = sigma(t);
    ver(R.cartel, pr(t, 2.28, 0.14, EZ.o));
    R.cartel.setAttribute("transform", `matrix(1 0 ${f2(SESGO * (1 - sg) * 1000) / 1000} 1 0 0)`);
    const col = (a, b, u) => `rgb(${[0, 1, 2].map((k) => Math.round(lerp(parseInt(a.substr(1 + 2 * k, 2), 16), parseInt(b.substr(1 + 2 * k, 2), 16), u))).join(",")})`;
    R.panel.setAttribute("fill", col("#3A3531", "#0E1219", pr(t, 2.5, 0.25, EZ.io)));
    const top = lerp(0, -900, sg),
      bot = lerp(3478, 8300, sg);
    for (const el of [R.panel, R.veta, R.panelLuz]) {
      el.setAttribute("y", f2(top));
      el.setAttribute("height", f2(bot - top));
    }
    // bordes de luz azul: el camino que une todo el mundo; destellan en el golpe final
    const destello = Math.max(Math.exp(-Math.max(0, t - T.construye) * 5) * (t >= T.construye ? 1 : 0), 0);
    R.bordes.forEach((el, k) => {
      el.setAttribute("y", f2(top));
      el.setAttribute("height", f2(bot - top));
      if (k < 2) el.setAttribute("opacity", f2(0.7 + 0.3 * destello));
      else {
        const w = 6 + 10 * destello;
        el.setAttribute("width", f2(w));
        el.setAttribute("x", f2((k === 2 ? 0 : 1000) - w / 2));
      }
    });

    // ── las cinco palabras ──
    const enRod = t >= T.por1 && t < T.debajo;
    // las cinco se apagan un poco cuando la cámara baja a la frase, y del todo para el cierre
    const tenue = (1 - 0.8 * pr(t, T.una, 0.35, EZ.io)) * (1 - pr(t, T.airon - 0.2, 0.2, EZ.io));
    const enPantalla = (y, margen) => Math.abs(CY + (y - c.y) * c.z - CY) < 960 + margen * c.z;
    for (let i = 0; i < 5; i++) {
      const p = PAL[i],
        q = palabra(i, t);
      const on = ON[i];
      const visible = enPantalla(q.y, 900);
      // impresa (como en la puerta) hasta que se dice
      ver(R.pp[i], visible && t < on ? 1 : 0);
      tr(R.pp[i], q.x, q.y);
      // grande: cromo que crece en su sitio
      let s = q.s,
        oH = t >= on ? 1 : 0;
      if (t >= on) {
        const u = clamp((t - on) / 0.36);
        const s0 = i === 4 ? 0.9 : p.wc / p.wH;
        s *= lerp(s0, 1, EZ.back(u));
      }
      // en el rodillo, las palabras que están fuera de la ventana se apagan
      if (q.r > 0 && q.v < 1) {
        const dist = Math.abs(q.y - YR) / PASO;
        const vis = 1 - clamp((dist - 0.55) / 0.6);
        oH *= lerp(1, vis, q.r * (1 - q.v));
      }
      ver(R.ph[i], visible ? oH * (t >= T.una ? tenue : 1) : 0);
      tr(R.ph[i], q.x, q.y, s);
      R.phB[i].setAttribute("opacity", f2(t >= on ? 1 - clamp((t - on) / 0.22) : 0));
      barrer(R.grad[i], t, on + 0.12);
      // su mundo, recortado a su celda (1500 u) o a su franja (220 u)
      let oW = t >= on - 0.02 ? clamp((t - on + 0.02) / 0.1) : 0;
      oW *= 1 - pr(t, T.por1, 0.3, EZ.io);
      oW = Math.max(oW, 0.55 * pr(t, T.debajo - 0.2, 0.3, EZ.io) * (1 - pr(t, T.construye, 0.25, EZ.io)));
      ver(R.w[i], enPantalla(q.y, 1500) ? oW * (t >= T.una ? tenue : 1) : 0);
      const H = lerp(1500, 220, q.b),
        off = lerp(120, 0, q.b);
      // la primera celda sube hasta el borde de arriba del cartel
      const extra = i === 0 ? 450 * (1 - q.b) : 0;
      R.w[i].setAttribute("transform", `translate(0 ${f2(q.y)})`);
      R.clipW[i].setAttribute("y", f2(-(H / 2 + off) - extra));
      R.clipW[i].setAttribute("height", f2(H + extra));
      // su icono encima (solo con una palabra por plano)
      const pi = pop(t, on, 0.35, 0.5);
      const oI = i === 4 ? 0 : pi.o * (1 - pr(t, tBanda(i), 0.2, EZ.i));
      ver(R.ic[i], oI);
      tr(R.ic[i], 500, q.y - 330, pi.s * (1 - 0.5 * pr(t, tBanda(i), 0.2, EZ.i)));
      // su tira de luz debajo
      const wDisp = (t >= on ? p.wH * s : p.wc) + 40;
      const capDisp = t >= on ? p.capH * s : p.capc;
      let oS = t >= on ? pr(t, on, 0.2, EZ.expo) * (1 - pr(t, tBanda(i), 0.15, EZ.i)) : 0;
      const encendida = pr(t, T.cinco3 + 0.06 * i, 0.2, EZ.expo) * (1 - pr(t, T.construye, 0.2, EZ.i));
      oS = Math.max(oS, encendida * tenue);
      ver(R.sub[i][0], visible ? oS : 0);
      const ancho = oS > 0 ? wDisp * (t >= T.cinco3 ? encendida : pr(t, on, 0.25, EZ.expo)) : 0;
      tr(R.sub[i][0], q.x, q.y + capDisp / 2 + (q.b > 0 ? 26 : 46));
      for (const el of [R.sub[i][1], R.sub[i][2]]) {
        el.setAttribute("x", f2(-ancho / 2));
        el.setAttribute("width", f2(Math.max(0, ancho)));
      }
      // su plan: tres iconos a la derecha de la franja
      R.plan[i].forEach((el, k) => {
        const pp_ = pop(t, T.plan + 0.07 * i + 0.03 * k, 0.3, 0.4);
        const fuera = pr(t, T.por1, 0.22, EZ.i3);
        ver(el, pp_.o * (1 - fuera));
        tr(el, 690 + 112 * k + 80 * fuera, p.yb, pp_.s);
      });
    }

    // ── mundos: lo que pasa dentro de cada celda ──
    // 0 · acero: la luz lo barre cada 4 s; la chapa cae con la palabra
    {
      const tt = t - ON[0];
      const u = tt < 0 ? 0 : clamp((tt % 4) / 0.7);
      R.luz0.setAttribute("gradientTransform", `translate(${f2(lerp(-1, 1, EZ.io(u)))} 0)`);
    }
    // 1 · estelas que corren de derecha a izquierda
    for (const e of R.est) {
      const tt = Math.max(0, t - ON[1] + 0.4);
      const rango = 1000 + e.w + 200;
      const x = ((((e.x0 - e.v * tt) % rango) + rango) % rango) - e.w - 100;
      e.a.setAttribute("x", f2(x));
      e.b.setAttribute("x", f2(x));
    }
    // 2 · el rayo: cae de golpe, parpadea y queda un resplandor que tiembla
    {
      const tt = t - ON[2];
      let o = 0;
      if (tt >= 0) o = tt < 0.25 ? K(tt, [[0, 1], [0.05, 0.3, "lin"], [0.09, 1, "lin"], [0.15, 0.45, "lin"], [0.22, 0.95, "lin"], [0.25, 0.9, "lin"]]) : lerp(0.9, 0.3, pr(tt, 0.25, 0.6, EZ.o)) + 0.06 * Math.sin(tt * 23);
      ver(R.rayo, o);
      R.w2flash.setAttribute("opacity", f2(tt >= 0 ? 0.55 * (1 - clamp(tt / 0.15)) : 0));
    }
    // 3 · engranajes (18 y 13 dientes: giran a la vez, en sentidos opuestos)
    {
      const tt = Math.max(0, t - ON[3]);
      const a = 40 * tt + 35 * EZ.o(clamp(tt / 0.4));
      tr(R.engA, 160, -330, 1, a);
      tr(R.engB, 650, 81, 1, (-a * 18) / 13 + 7);
      tr(R.icA, -55, 15, 1, a * 1.5);
      tr(R.icB, 88, -62, 1, (-a * 1.5 * 12) / 9);
    }
    // 4 · amanece: el sol sube detrás de las hojas
    {
      const u = pr(t, ON[4], 1.4, EZ.o);
      const cy = lerp(120, -300, u) - 0.6 * Math.max(0, t - ON[4] - 1.4);
      R.sol.setAttribute("cy", f2(cy));
      R.halo.setAttribute("cy", f2(cy));
      R.icSol.setAttribute("cy", f2(lerp(70, -18, pr(t, ON[4] + 0.1, 1.1, EZ.o))));
    }
    // iconos que actúan
    R.brazo.setAttribute("d", brazoD(EZ.back(clamp((t - ON[0] - 0.08) / 0.3))));
    {
      const tt = Math.max(0, t - ON[1]);
      tr(R.corredor, 0, -Math.abs(Math.sin(tt * 11)) * 14);
      R.lineas.forEach((el, k) => el.setAttribute("transform", `translate(${f2(-((tt * 520 + k * 21) % 46))} 0)`));
    }
    R.icRayo.setAttribute("fill", t >= ON[2] && t < ON[2] + 0.3 ? "#FFFFFF" : "#C9CED6");

    // ── el rodillo: las cinco franjas se funden en una ventana que gira ──
    {
      const r = pr(t, T.por1, 0.42, EZ.io3),
        v = pr(t, T.debajo - 0.36, 0.36, EZ.io3);
      const k = r * (1 - v);
      const y0 = lerp(5435, YR - 120, k),
        h = lerp(1100, 240, k);
      if (enRod) {
        R.palabras.setAttribute("clip-path", "url(#clip-rodillo)");
        R.clipRod.setAttribute("y", f2(y0));
        R.clipRod.setAttribute("height", f2(h));
      } else R.palabras.removeAttribute("clip-path");
      ver(R.marco, k);
      R.marcoR.setAttribute("y", f2(y0 - 10));
      R.marcoR.setAttribute("height", f2(h + 20));
      R.marcoL.setAttribute("y", f2(y0 + 8));
      R.marcoL.setAttribute("height", f2(h - 16));
      const vb = enRod ? clamp((Math.abs(velGiro(t)) / 30) * 0.35, 0, 22) : 0;
      if (vb > 0.3) {
        R.rblur.setAttribute("stdDeviation", `0 ${f2(vb)}`);
        R.palabras.setAttribute("filter", "url(#rblur)");
      } else R.palabras.removeAttribute("filter");
    }

    // ── ¿PARA QUÉ ENTRENAS? ──
    [T.para2, T.entrenas].forEach((t0, k) => {
      const u = clamp((t - t0) / 0.3);
      const o = (t >= t0 ? 1 : 0) * (1 - pr(t, T.si1 + 0.4, 0.1, EZ.lin));
      ver(R.preg[k], o);
      tr(R.preg[k], 500, PREG[k].y, t >= t0 ? lerp(1.22, 1, EZ.back(u)) : 1);
      R.pregB[k].setAttribute("opacity", f2(t >= t0 ? 1 - clamp((t - t0) / 0.25) : 0));
      barrer(R.gq[k], t, t0 + 0.15);
    });
    {
      const oq = t >= T.que1 ? 1 : 0;
      R.que.forEach((el) => {
        el.setAttribute("fill-opacity", oq);
        el.setAttribute("stroke-opacity", oq);
      });
    }

    // ── el mostrador ──
    {
      // foco: se enciende con «algo», se apaga con «no»
      let of = 0;
      if (t >= T.algo) of = t < T.algo + 0.1 ? K(t - T.algo, [[0, 1], [0.04, 0.2, "lin"], [0.08, 1, "lin"]]) : 1;
      if (t >= T.no1) of = t < T.no1 + 0.1 ? K(t - T.no1, [[0, 0.3], [0.04, 0.85, "lin"], [0.1, 0, "lin"]]) : 0;
      ver(R.foco, of);
      // el bote sube con «sirve» y baja con «falta»
      const sube = pr(t, T.sirve - 0.08, 0.5, EZ.expo),
        baja = pr(t, T.falta, 0.4, EZ.i3);
      const dy = lerp(660, 0, sube) + 700 * baja;
      ver(R.producto, sube > 0 && baja < 1 ? 1 : 0);
      tr(R.producto, 0, dy);
      R.sombraProd.setAttribute("opacity", f2(0.72 * pr(t, T.no1 + 0.04, 0.12, EZ.o)));
      // etiquetas: la línea sale del bote y la caja llega después
      [T.explicamos, T.explicamos + 0.3, T.por2].forEach((t0, k) => {
        const g = R.tags[k];
        const o = (t >= t0 ? 1 : 0) * (1 - pr(t, T.no1, 0.25, EZ.io));
        ver(g.g, o);
        g.linea.setAttribute("stroke-dashoffset", f2(110 - 110 * pr(t, t0, 0.25, EZ.o3)));
        const pp_ = pop(t, t0, 0.25, 0.3);
        g.punto.setAttribute("opacity", f2(pp_.o));
        const u = pr(t, t0 + 0.12, 0.3, EZ.expo);
        g.caja.setAttribute("opacity", f2(u));
        g.caja.setAttribute("transform", `translate(${f2(-30 * (1 - u))} 0)`);
      });
      // bocadillo: «ESTO NO TE HACE FALTA»
      {
        const pb = pop(t, T.lo - 0.1, 0.3, 0.6);
        const o = pb.o * salida(t, T.aunque - 0.12, 0.15);
        ver(R.bocadillo, o);
        const s = pb.s * lerp(1, 0.85, pr(t, T.aunque - 0.12, 0.15, EZ.i));
        // crece desde la punta del bocadillo
        R.bocadillo.setAttribute("transform", `translate(${f2((XP - 150) * (1 - s))} ${f2(6000 * (1 - s))}) scale(${s.toFixed(4)})`);
      }
      // el tique se imprime: sale de la ranura línea a línea
      const L = K(t, [
        [T.aunque - 0.02, 0], [T.aunque + 0.25, 125, "o"], [T.eso2, 125], [T.eso2 + 0.18, 205, "o"],
        [T.signifique, 205], [T.signifique + 0.18, 275, "o"], [T.no2, 275], [T.no2 + 0.18, 345, "o"],
        [T.nada2 - 0.08, 345], [T.nada2 + 0.12, 520, "o3"], [T.nada2 + 0.26, 520], [T.nada2 + 0.42, 706, "o3"],
      ]);
      const vibra = L > 0 && L < 705 && Math.abs(L - 345) > 1 && Math.abs(L - 520) > 1 ? Math.sin(t * 90) * 1.2 : 0;
      [40, 150, 220, 290, 400].forEach((h, k) => ver(R.tl[k], L >= h ? 1 : 0));
      ver(R.tique, L > 0 ? 1 : 0);
      tr(R.tique, vibra, YP - L);
      const ps = clamp((t - T.nada2 - 0.42) / 0.12);
      ver(R.sello, t >= T.nada2 + 0.42 ? 1 : 0);
      R.sello.setAttribute("transform", `translate(${f2(XP * (1 - lerp(1.5, 1, EZ.i3(ps))))} ${f2(590 * (1 - lerp(1.5, 1, EZ.i3(ps))))}) scale(${f2(lerp(1.5, 1, EZ.i3(ps)))})`);
    }

    // ── la frase de abajo: impresa → CONSTRUYE / TU MEJOR / VERSIÓN en cromo gigante ──
    {
      const aparece = pr(t, T.debajo - 0.08, 0.2, EZ.o);
      [T.construye, T.tu, T.version].forEach((t0, k) => {
        const l = LEMA[k];
        ver(R.lp[k], aparece * (t < t0 ? 1 : 1 - clamp((t - t0) / 0.06)));
        tr(R.lp[k], 500, l.yp);
        const u = clamp((t - t0) / 0.4);
        const s0 = [412, 342, 304][k] / l.w;
        const y = lerp(l.yp, l.yh, EZ.expo(u));
        ver(R.lh[k], t >= t0 ? 1 : 0);
        tr(R.lh[k], 500, y, t >= t0 ? lerp(s0, 1, EZ.back(clamp((t - t0) / 0.32))) : s0);
        R.lhB[k].setAttribute("opacity", f2(t >= t0 ? 1 - clamp((t - t0) / 0.25) : 0));
        barrer(R.gl[k], t, t0 + 0.15, 0.6);
      });
    }
    // destellos de pantalla: el rayo y el golpe final
    {
      let o = 0;
      if (t >= ON[2] && t < ON[2] + 0.15) o = 0.28 * (1 - (t - ON[2]) / 0.15);
      if (t >= T.construye && t < T.construye + 0.2) o = 0.3 * (1 - (t - T.construye) / 0.2);
      ver(R.flash, o);
    }

    // ── el cierre: el rótulo real, el logo y la llamada ──
    {
      ver(R.cierre, t >= T.airon - 0.5 ? 1 : 0);
      const ta = t - T.airon;
      R.apagado.setAttribute("opacity", f2(ta < 0 ? 0.8 : ta < 0.16 ? K(ta, [[0, 0.1], [0.05, 0.55, "lin"], [0.1, 0.05, "lin"], [0.16, 0, "lin"]]) : 0));
      R.rotuloLuz.setAttribute("x", f2(-300 + ((Math.max(0, ta) * 820) % 1400)));
      R.rotuloLuz.setAttribute("opacity", ta > 0 ? 1 : 0);
      const ul = pr(t, T.nutrishon, 0.5, EZ.expo);
      ver(R.logo, clamp((t - T.nutrishon) / 0.2));
      R.logo.setAttribute("transform", `translate(${f2(500 * (1 - lerp(0.88, 1, ul)))} ${f2(FIN.logo * (1 - lerp(0.88, 1, ul)) + 50 * (1 - ul))}) scale(${f2(lerp(0.88, 1, ul))})`);
      const pb = pop(t, T.siguenos, 0.35, 0.5);
      const tp = T.siguenos + 0.28;
      const bump = t >= tp && t < tp + 0.2 ? Math.sin((Math.PI * (t - tp)) / 0.2) : 0;
      ver(R.boton, pb.o);
      tr(R.boton, 500, FIN.boton, pb.s);
      tr(R.botonIn, 0, 0, 1 - 0.08 * bump);
      R.botonLuz.setAttribute("opacity", f2(0.45 * bump));
      const uv = pr(t, T.ven, 0.35, EZ.expo);
      ver(R.ven, clamp((t - T.ven) / 0.15));
      R.ven.setAttribute("transform", `translate(${f2(30 * (1 - uv))} 0)`);
    }
  }
  window.__IF.render = render;
  window.__IF.camara = camara;
})();
