"""Alinea cada palabra del guion con la voz montada (sin whisper).

    python3 tools/alinear.py [--tira]

Whisper adelanta 0,3-0,5 s las palabras de dentro de una frase cuando la voz va pausada.
Aquí, como cada frase está colocada a mano (tools/montaje.json), se sabe dónde empieza y
acaba. Dentro de la frase:
  1. se predice la duración de cada sonido (vocal, fricativa, oclusiva…) y dónde caen los
     cierres de las oclusivas sordas (p, t, k), que en el audio son silencios de 30-120 ms;
  2. esos cierres previstos se emparejan en orden con los silencios reales del audio;
  3. el tiempo previsto se deforma por tramos para pasar por esos anclajes, y cada palabra
     que empieza por p, t o k arranca justo al soltar su cierre.
Escribe assets/audio/transcript.json, que lee tools/tiempos.mjs. --tira dibuja la energía
de cada frase (un carácter cada 10 ms) con las palabras debajo.
"""
import json, os, re, subprocess, sys
import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 24000
PASO = 0.01

raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(RAIZ, "assets/audio/voz.wav"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
h = int(PASO * SR)
db = np.array([20 * np.log10(np.sqrt(np.mean(x[i:i + h] ** 2)) + 1e-9) for i in range(0, len(x) - h, h)])
db = np.maximum(db, -80)

VOC = "aeiouáéíóúü"
DUR = {"V": 0.075, "K": 0.065, "B": 0.05, "F": 0.09, "N": 0.06, "R": 0.03, "Y": 0.07}


def sonidos(palabra):
    """Palabra → lista de (clase, letra). K = oclusiva sorda (cierra la boca del todo)."""
    p = re.sub(r"[^a-záéíóúüñ]", "", palabra.lower())
    out, i = [], 0
    while i < len(p):
        c, n = p[i], p[i + 1:i + 2]
        if c in VOC:
            out.append(("V", c))
        elif c == "y":
            out.append(("V" if i == len(p) - 1 else "Y", c))
        elif c == "h":
            pass
        elif c == "q":
            out.append(("K", c))
            i += 1  # la u de «qu» no suena
        elif c == "c" and n in ("e", "i", "é", "í"):
            out.append(("F", c))
        elif c == "c" and n == "h":
            out.append(("K", c)); i += 1
        elif c in "ptk" or c == "c":
            out.append(("K", c))
        elif c == "x":
            out += [("K", c), ("F", c)]
        elif c in "bvdg":
            out.append(("B", c))
            if c == "g" and n == "u" and p[i + 2:i + 3] in ("e", "i", "é", "í"):
                i += 1
        elif c in "fszj":
            out.append(("F", c))
        elif c in "mnñl":
            out.append(("N", c))
        elif c == "r":
            out.append(("R", c))
        else:
            out.append(("N", c))
        i += 1
    return out


def silencios(i0, i1, umbral=-50, minimo=3):
    """Tramos de silencio dentro de la frase: [(inicio, fin)] en índices."""
    out, s = [], None
    for i in range(i0, i1):
        if db[i] < umbral:
            if s is None:
                s = i
        elif s is not None:
            if i - s >= minimo:
                out.append((s, i))
            s = None
    return out


zc = np.array([np.mean(np.abs(np.diff(np.sign(x[i:i + h])))) / 2 for i in range(0, len(x) - h, h)])


def tramos(cond, i0, i1, minimo):
    out, s = [], None
    for i in range(i0, i1 + 1):
        if i < i1 and cond(i):
            if s is None:
                s = i
        elif s is not None:
            if i - s >= minimo:
                out.append((s * PASO, i * PASO))
            s = None
    return out


guion = [l.strip() for l in open(os.path.join(RAIZ, "guion.txt")) if l.strip()]
M = json.load(open(os.path.join(RAIZ, "tools/montaje.json")))
res, DEPURAR = [], "--depurar" in sys.argv
for f, linea in zip(M["frases"], guion):
    ws = [w for w in linea.split() if re.sub(r"\W", "", w)]
    a, b = f["inicio"], f["fin"]
    # 1) eventos previstos: cierres de p/t/k (silencio) y fricativas s/z/f/j (ruido)
    t, ini_pal, ev = 0.0, [], []
    anterior = None
    for k, w in enumerate(ws):
        son = sonidos(w)
        if anterior == "V" and son and son[0][0] == "V":
            # vocal + vocal entre palabras («puerta hay»): la voz deja un respiro corto
            ev.append({"tipo": "K", "t": t + 0.04, "pal": k, "primero": False, "salto": 0.08})
            t += 0.08
        ini_pal.append(t)
        for q, (cl, letra) in enumerate(son):
            if cl == "K":
                if anterior != "F":  # tras una s el cierre no se oye como silencio
                    ev.append({"tipo": "K", "t": t + 0.03, "pal": k, "primero": q == 0, "salto": 0.1 if anterior == "N" else 0.45})
            elif cl == "F":
                ev.append({"tipo": "F", "t": t + DUR["F"] / 2, "pal": k, "primero": q == 0, "salto": 0.25})
            t += DUR[cl]
            anterior = cl
        if re.search(r"[,;:]$", w):
            t += 0.22
            anterior = "P"
    t += 0.06
    esc = (b - a) / t
    for e in ev:
        e["t"] = a + e["t"] * esc
    pal0 = [a + p * esc for p in ini_pal]
    # 2) lo que hay de verdad en el audio
    ia, ib = int(round(a / PASO)), int(round(b / PASO))
    reales = [{"tipo": "K", "a": s0, "b": s1} for s0, s1 in tramos(lambda i: db[i] < -48, ia + 2, ib - 1, 2)]
    reales += [{"tipo": "F", "a": s0, "b": s1} for s0, s1 in tramos(lambda i: zc[i] > 0.25 and db[i] > -52, ia, ib, 3)]
    reales.sort(key=lambda r: r["a"])
    # 3) emparejar en orden (programación dinámica), solo eventos del mismo tipo. Lo que
    #    cuenta es que el hueco entre dos anclajes seguidos se parezca al previsto: así un
    #    desfase al principio de la frase no arrastra a todas las demás.
    P, S = len(ev), len(reales)
    cen = [(r["a"] + r["b"]) / 2 for r in reales]
    salto_ev = np.concatenate([[0], np.cumsum([e["salto"] for e in ev])])
    def coste_hueco(dp, dr):
        return ((dr - dp) / 0.1) ** 2 * 0.25
    # D[i][j]: coste mínimo si el último emparejado es (evento i, real j); -1 = el inicio de la frase
    D, prev_ = {}, {}
    for i in range(P):
        for j in range(S):
            if ev[i]["tipo"] != reales[j]["tipo"] or abs(cen[j] - ev[i]["t"]) > 0.45:
                continue
            mejor = (salto_ev[i] + j * 0.3 + coste_hueco(ev[i]["t"] - a, cen[j] - a), None)
            for (pi, pj), c in D.items():
                if pi < i and pj < j:
                    v = c + (salto_ev[i] - salto_ev[pi + 1]) + (j - pj - 1) * 0.3 + coste_hueco(ev[i]["t"] - ev[pi]["t"], cen[j] - cen[pj])
                    if v < mejor[0]:
                        mejor = (v, (pi, pj))
            D[(i, j)], prev_[(i, j)] = mejor
    final, fin_key = salto_ev[P] + S * 0.3, None
    for (i, j), c in D.items():
        v = c + (salto_ev[P] - salto_ev[i + 1]) + (S - j - 1) * 0.3 + coste_hueco(b - ev[i]["t"], b - cen[j])
        if v < final:
            final, fin_key = v, (i, j)
    pares, k_ = [], fin_key
    while k_ is not None:
        pares.append(k_)
        k_ = prev_[k_]
    pares.reverse()
    # 4) deformar el tiempo previsto para que pase por los anclajes
    xs, ys = [a], [a]
    for pi, rj in pares:
        c = (reales[rj]["a"] + reales[rj]["b"]) / 2
        if c > ys[-1] + 0.02 and ev[pi]["t"] > xs[-1] + 0.02:
            xs.append(ev[pi]["t"]); ys.append(c)
    xs.append(b); ys.append(b)
    inicios = [float(np.interp(p, xs, ys)) for p in pal0]
    for pi, rj in pares:  # anclaje exacto del principio de palabra
        e, r = ev[pi], reales[rj]
        if e["primero"] and e["pal"] > 0:
            inicios[e["pal"]] = r["b"] - 0.02 if e["tipo"] == "K" else r["a"] - 0.01
    for pi, rj in pares:  # tras el respiro entre vocales, la palabra empieza al volver la voz
        e, r = ev[pi], reales[rj]
        if e["tipo"] == "K" and not e["primero"] and e["salto"] == 0.08:
            inicios[e["pal"]] = r["b"] - 0.01
    for k in range(1, len(ws)):  # tras una coma, la palabra empieza cuando vuelve la voz
        if re.search(r"[,;:]$", ws[k - 1]):
            hueco = [r for r in reales if r["tipo"] == "K" and abs((r["a"] + r["b"]) / 2 - inicios[k]) < 0.3 and r["b"] - r["a"] >= 0.08]
            if hueco:
                inicios[k] = max(inicios[k], hueco[0]["b"] - 0.01)
    inicios[0] = a
    for k in range(1, len(ws)):
        inicios[k] = max(inicios[k], inicios[k - 1] + 0.07)
    if DEPURAR:
        print(f["n"], [(e["tipo"], round(e["t"], 2), ws[e["pal"]]) for e in ev])
        print("   ", [(r["tipo"], round(r["a"], 2), round(r["b"], 2)) for r in reales])
        print("   ", [(ev[pi]["tipo"], ws[ev[pi]["pal"]], round(reales[rj]["a"], 2)) for pi, rj in pares])
    for k, w in enumerate(ws):
        fin = inicios[k + 1] - 0.01 if k + 1 < len(ws) else b
        res.append({"text": w, "start": round(inicios[k], 3), "end": round(fin, 3), "frase": f["n"]})

json.dump(res, open(os.path.join(RAIZ, "assets/audio/transcript.json"), "w"), ensure_ascii=False, indent=1)
if "--tira" in sys.argv:
    for f in M["frases"]:
        i0, i1 = int(f["inicio"] / PASO) - 3, int(f["fin"] / PASO) + 3
        tira = "".join(str(min(9, max(0, int((db[i] + 62) / 5.5)))) for i in range(i0, i1))
        marcas = [" "] * len(tira)
        for r in res:
            if r["frase"] == f["n"]:
                j = int(round(r["start"] / PASO)) - i0
                for q, ch in enumerate("|" + r["text"]):
                    if 0 <= j + q < len(marcas):
                        marcas[j + q] = ch
        print(f'{f["n"]:2d} {f["inicio"]:6.2f} {tira}')
        print("          " + "".join(marcas))
else:
    for r in res:
        print(f'{r["frase"]:2d}  {r["start"]:6.2f}  {r["text"]}')
