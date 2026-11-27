"""Voz de un episodio de «Mitos del gimnasio», frase a frase (Kokoro, em_alex).

    python3 ../comun/mitos/voz.py            (desde la carpeta del episodio)

Cada línea de guion.txt se genera aparte (tools/frases/NN.wav; solo se rehace si cambia
su texto), se le quita el silencio y se colocan una detrás de otra con una pausa corta
(más larga antes del veredicto y de la llamada final). Así se sabe exactamente dónde
empieza y acaba cada frase. Escribe assets/audio/voz.wav y tools/montaje.json.
"""
import json, os, subprocess, sys
import numpy as np

RAIZ = os.getcwd()
SR = 24000
VOZ, VEL = "em_alex", 1.0
INICIO, HUECO, HUECO_LARGO, COLA = 0.12, 0.24, 0.5, 0.55
CACHE = os.path.expanduser("~/.cache/hyperframes/tts")


def recortar(x):
    h = int(0.01 * SR)
    db = np.array([20 * np.log10(np.sqrt(np.mean(x[i:i + h] ** 2)) + 1e-9) for i in range(0, len(x) - h, h)])
    voz = np.where(db > -40)[0]
    a = max(0, voz[0] * h - int(0.02 * SR))
    b = min(len(x), (voz[-1] + 1) * h + int(0.06 * SR))
    return x[a:b]


lineas = [l.strip() for l in open(os.path.join(RAIZ, "guion.txt")) if l.strip()]
os.makedirs(os.path.join(RAIZ, "tools/frases"), exist_ok=True)
kokoro = None
clips = []
for n, texto in enumerate(lineas, 1):
    ftxt = os.path.join(RAIZ, f"tools/frases/{n:02d}.txt")
    fwav = os.path.join(RAIZ, f"tools/frases/{n:02d}.wav")
    if not (os.path.exists(fwav) and os.path.exists(ftxt) and open(ftxt).read().strip() == texto):
        if kokoro is None:
            from kokoro_onnx import Kokoro
            kokoro = Kokoro(os.path.join(CACHE, "models/kokoro-v1.0.onnx"), os.path.join(CACHE, "voices/voices-v1.0.bin"))
        audio, sr = kokoro.create(texto, voice=VOZ, speed=VEL, lang="es")
        assert sr == SR
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "pcm_s16le", fwav], input=np.asarray(audio, dtype=np.float32).tobytes(), check=True)
        open(ftxt, "w").write(texto + "\n")
        print(f"  generada {n:02d}: {texto}")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", fwav, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    clips.append(recortar(np.frombuffer(raw, dtype=np.float32).copy()))

t, frases = INICIO, []
for n, (texto, x) in enumerate(zip(lineas, clips), 1):
    if n > 1:
        t += HUECO_LARGO if texto.startswith(("Veredicto", "¿Qué mito")) else HUECO
    frases.append({"n": n, "texto": texto, "inicio": round(t, 3), "fin": round(t + len(x) / SR, 3)})
    t += len(x) / SR
total = t + COLA
y = np.zeros(int(total * SR) + 1, dtype=np.float32)
for f, x in zip(frases, clips):
    a = int(round(f["inicio"] * SR))
    y[a:a + len(x)] += x
os.makedirs(os.path.join(RAIZ, "assets/audio"), exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "pcm_s16le", os.path.join(RAIZ, "assets/audio/voz.wav")], input=y.tobytes(), check=True)
json.dump({"frases": frases, "duracion": round(total, 3)}, open(os.path.join(RAIZ, "tools/montaje.json"), "w"), ensure_ascii=False, indent=1)
for f in frases:
    print(f'{f["n"]:2d}  {f["inicio"]:6.2f}–{f["fin"]:6.2f}  {f["texto"]}')
print(f"voz {total:.2f} s")
