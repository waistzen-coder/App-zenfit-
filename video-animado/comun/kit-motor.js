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
