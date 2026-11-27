"""Alinea cada palabra del guion con la voz montada (sin whisper).

    python3 tools/alinear.py [--ver N]

Whisper adelanta 0,3-0,5 s las palabras de dentro de una frase cuando la voz va pausada.
Aquí, como cada frase está colocada a mano (tools/montaje.json), se sabe dónde empieza y
acaba; dentro de la frase, las palabras se reparten por sílabas y cada frontera se engancha
al valle de energía más cercano (silencio, cierre de una oclusiva o bajada entre sílabas).
Escribe assets/audio/transcript.json, que lee tools/tiempos.mjs. --ver N dibuja la frase N.
"""
import json, os, re, subprocess, sys, unicodedata
import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 24000
PASO = 0.01

raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(RAIZ, "assets/audio/voz.wav"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
h = int(PASO * SR)
db = np.array([20 * np.log10(np.sqrt(np.mean(x[i:i + h] ** 2)) + 1e-9) for i in range(0, len(x) - h, h)])
db = np.maximum(db, -80)
suave = np.convolve(db, np.ones(3) / 3, mode="same")

FUERTES, DEBILES = set("aeoáéó"), set("iuüy")
ACENT_DEB = set("íú")


def silabas(palabra):
    p = palabra.lower()
    p = re.sub(r"[^a-záéíóúüñ]", "", p)
    if p == "y":
        return 1
    n, prev = 0, None
    for i, c in enumerate(p):
        es_v = c in FUERTES or c in DEBILES or c in ACENT_DEB
        if c == "y" and i < len(p) - 1:  # «y» consonante (constru-ye)
            es_v = False
        if not es_v:
            prev = None
            continue
        if prev is None:
            n += 1
        elif (prev in FUERTES and c in FUERTES) or c in ACENT_DEB or prev in ACENT_DEB:
            n += 1  # hiato
        prev = c
    return max(1, n)


OCLUSIVAS = tuple("ptkbdgc")


def frontera(i0, i1):
    """Valles de energía entre los índices i0 e i1: [(índice donde vuelve a subir, profundidad dB)]."""
    out = []
    for i in range(max(i0, 2), min(i1, len(suave) - 2)):
        if suave[i] <= suave[i - 1] and suave[i] < suave[i + 1]:
            izq = suave[max(0, i - 12):i].max()
            der = suave[i + 1:i + 13].max()
            prof = min(izq, der) - suave[i]
            if prof < 3:
                continue
            j = i
            while j < len(suave) - 1 and suave[j + 1] < suave[i] + 6 and j - i < 15:
                j += 1
            out.append((j, prof))
    return out


guion = [l.strip() for l in open(os.path.join(RAIZ, "guion.txt")) if l.strip()]
M = json.load(open(os.path.join(RAIZ, "tools/montaje.json")))
res = []
for f, linea in zip(M["frases"], guion):
    ws = [w for w in linea.split() if re.sub(r"\W", "", w)]
    a, b = f["inicio"], f["fin"]
    pesos = []
    for k, w in enumerate(ws):
        letras = len(re.sub(r"[^a-záéíóúüñ]", "", w.lower()))
        s = 0.35 * silabas(w) + 0.65 * letras / 2.2  # duración ≈ sílabas y sonidos
        if k == len(ws) - 1:
            s += 0.6  # alargamiento a final de frase
        pesos.append(s)
    # una coma deja una pausa del tamaño de ~1,2 sílabas
    pausas = [1.2 if re.search(r"[,;:]$", w) else 0 for w in ws]
    total = sum(pesos) + sum(pausas[:-1])
    esperado, acc = [a], 0
    for k in range(1, len(ws)):
        acc += pesos[k - 1] + pausas[k - 1]
        esperado.append(a + (b - a) * acc / total)
    # programación dinámica: cada frontera elige un valle (o se queda donde se espera),
    # todas en orden y con al menos 70 ms por palabra
    ia, ib = int(a / PASO), int(b / PASO)
    cands = frontera(ia + 3, ib - 3)
    K = len(ws)
    opciones = [[(ia, 0.0)]]
    for k in range(1, K):
        tk = esperado[k]
        ops = [(int(round(tk / PASO)), 1.2)]  # sin valle: donde dicen las sílabas (con castigo)
        for j, prof in cands:
            d = abs(j * PASO - tk)
            if d > 0.32:
                continue
            ini = ws[k].lower().lstrip("¿¡")
            clase = 1.6 if ini.startswith(OCLUSIVAS) else 1.0 if ini[:1] in "aeiouáéíóúh" else 0.6
            bonus = min(prof, 40) / 40 * clase
            ops.append((j, (d / 0.12) ** 2 - 2.2 * bonus))
        opciones.append(ops)
    # coste acumulado
    coste = [{0: (0.0, None)}]
    for k in range(1, K):
        capa = {}
        for oi, (j, c) in enumerate(opciones[k]):
            mejor = None
            for pi, (cp, _) in coste[k - 1].items():
                jp = opciones[k - 1][pi][0]
                if j < jp + 7:
                    continue
                v = cp + c
                if mejor is None or v < mejor[0]:
                    mejor = (v, pi)
            if mejor:
                capa[oi] = mejor
        if not capa:  # nada encaja: repartir por sílabas
            capa = {0: (coste[k - 1][min(coste[k - 1], key=lambda q: coste[k - 1][q][0])][0], min(coste[k - 1], key=lambda q: coste[k - 1][q][0]))}
            opciones[k] = [(max(int(round(esperado[k] / PASO)), opciones[k - 1][capa[0][1]][0] + 7), 0)]
        coste.append(capa)
    oi = min(coste[-1], key=lambda q: coste[-1][q][0])
    elegidos = []
    for k in range(K - 1, -1, -1):
        elegidos.append(opciones[k][oi][0])
        oi = coste[k][oi][1]
    elegidos.reverse()
    inicios = [a] + [j * PASO - 0.01 for j in elegidos[1:]]
    for k, w in enumerate(ws):
        fin = inicios[k + 1] - 0.01 if k + 1 < len(ws) else b
        res.append({"text": w, "start": round(inicios[k], 3), "end": round(fin, 3), "frase": f["n"], "esperado": round(esperado[k], 3)})

json.dump([{k: v for k, v in r.items() if k != "esperado"} for r in res], open(os.path.join(RAIZ, "assets/audio/transcript.json"), "w"), ensure_ascii=False, indent=1)
for r in res:
    print(f'{r["frase"]:2d}  {r["start"]:6.2f}  (sílabas {r["esperado"]:6.2f})  {r["text"]}')

if "--ver" in sys.argv:
    n = int(sys.argv[sys.argv.index("--ver") + 1])
    f = M["frases"][n - 1]
    marcas = {round(r["start"], 2): r["text"] for r in res if r["frase"] == n}
    for i in range(int(f["inicio"] / PASO) - 2, int(f["fin"] / PASO) + 2):
        t = round(i * PASO, 2)
        print(f"{t:6.2f} {db[i]:6.1f} {'#' * max(0, int((db[i] + 60) / 1.5))} {marcas.get(t, '')}")
