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
