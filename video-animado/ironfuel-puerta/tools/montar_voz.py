"""Monta la voz frase a frase sobre el ritmo de la música.

    python3 tools/montar_voz.py

Lee tools/frases/NN.wav (una frase del guion por archivo, generadas con
`hyperframes tts ... --speed 0.9`), recorta su silencio y las coloca así:
  · la primera frase empieza a los 0,12 s (el gancho, sin esperar);
  · las cinco palabras de la puerta (frases 2 a 6) caen cada dos tiempos;
  · el resto, una detrás de otra, empezando en el medio tiempo más cercano;
  · «Construye tu mejor versión» (frase 14) cae justo en la entrada fuerte de la música.
Escribe assets/audio/voz.wav y tools/montaje.json (inicio de cada frase y desfase de la música).
"""
import json, os, subprocess
import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 24000
BPM = 127.99           # «A Game», medido con flujo espectral
PRIMER_TIEMPO = 0.4322  # s, primer tiempo de la pista
ENTRADA = 82.001       # s, tiempo 174: vuelve el bajo tras el bajón (75,4 → 82,0)
TIEMPO = 60 / BPM
INICIO = 0.12          # s, primera frase
HUECO = 0.20           # s, pausa mínima entre frases
PALABRAS = range(2, 7)  # Fuerza … Recuperación
CLIMAX = 14            # «Construye tu mejor versión»
COLA = 0.55            # s de silencio al final


def leer(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def recortar(x):
    h = int(0.01 * SR)
    db = np.array([20 * np.log10(np.sqrt(np.mean(x[i:i + h] ** 2)) + 1e-9) for i in range(0, len(x) - h, h)])
    voz = np.where(db > -40)[0]
    a = max(0, voz[0] * h - int(0.02 * SR))
    b = min(len(x), (voz[-1] + 1) * h + int(0.06 * SR))
    return x[a:b]


frases = []
for n in range(1, 17):
    x = recortar(leer(os.path.join(RAIZ, f"tools/frases/{n:02d}.wav")))
    texto = open(os.path.join(RAIZ, f"tools/frases/{n:02d}.txt")).read().strip()
    frases.append({"n": n, "texto": texto, "dur": len(x) / SR, "audio": x})

# 1) colocación provisional para fijar la fase de la rejilla con la primera palabra
fin1 = INICIO + frases[0]["dur"]
fase = (fin1 + 0.26) % TIEMPO  # la primera palabra, un respiro después de la primera frase
rejilla = lambda t, paso=1.0: fase + np.ceil((t - fase) / (TIEMPO * paso) - 1e-9) * TIEMPO * paso

inicios = {1: INICIO}
t = rejilla(fin1 + 0.26)
for n in PALABRAS:
    inicios[n] = t
    t += 2 * TIEMPO
    # una palabra larga no se monta sobre la siguiente
    while inicios[n] + frases[n - 1]["dur"] + 0.12 > t:
        t += TIEMPO
fin = inicios[6] + frases[5]["dur"]
for n in range(7, 17):
    inicios[n] = float(rejilla(fin + HUECO, 0.5))
    fin = inicios[n] + frases[n - 1]["dur"]

# 2) la frase del clímax, exactamente en un tiempo entero (la entrada de la música cae ahí)
tc = float(rejilla(inicios[CLIMAX] - 1e-6, 1.0))
inicios[CLIMAX] = tc
fin = tc + frases[CLIMAX - 1]["dur"]
for n in range(CLIMAX + 1, 17):
    inicios[n] = float(rejilla(fin + HUECO, 0.5))
    fin = inicios[n] + frases[n - 1]["dur"]
desfase = ENTRADA - tc  # segundo de la pista que suena en el 0 del vídeo

total = fin + COLA
y = np.zeros(int(total * SR) + 1, dtype=np.float32)
for f in frases:
    a = int(round(inicios[f["n"]] * SR))
    y[a:a + len(f["audio"])] += f["audio"]
os.makedirs(os.path.join(RAIZ, "assets/audio"), exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "pcm_s16le", os.path.join(RAIZ, "assets/audio/voz.wav")], input=y.tobytes(), check=True)

montaje = {
    "bpm": BPM, "tiempo": TIEMPO, "fase": fase, "desfase_musica": desfase,
    "bajon": [75.438 - desfase, ENTRADA - desfase],
    "frases": [{"n": f["n"], "texto": f["texto"], "inicio": round(inicios[f["n"]], 3), "fin": round(inicios[f["n"]] + f["dur"], 3)} for f in frases],
    "duracion": round(total, 3),
}
json.dump(montaje, open(os.path.join(RAIZ, "tools/montaje.json"), "w"), ensure_ascii=False, indent=1)
for f in montaje["frases"]:
    print(f'{f["n"]:2d}  {f["inicio"]:6.3f}–{f["fin"]:6.3f}  {f["texto"]}')
print(f"voz {total:.2f} s · la música empieza en su segundo {desfase:.3f} · bajón del vídeo {montaje['bajon'][0]:.2f}–{montaje['bajon'][1]:.2f} s")
