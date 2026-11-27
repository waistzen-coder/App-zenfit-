"""Acorta los silencios de la voz: como mucho 0,25 s entre frases.

No acelera la voz: solo recorta el silencio que sobra en cada pausa.
Uso: python3 tools/limpiar_voz.py assets/audio/voz-bruta.wav assets/audio/voz.wav
"""
import sys
import numpy as np
import soundfile as sf

MAX_PAUSA = 0.25      # s entre frases
INICIO = 0.12         # s de silencio antes de la primera palabra
FINAL = 0.45         # s de silencio tras la última
UMBRAL_DB = -40.0
VENTANA = 0.01        # s

src, dst = sys.argv[1], sys.argv[2]
audio, sr = sf.read(src, dtype="float32")
if audio.ndim > 1:
    audio = audio.mean(axis=1)
hop = int(sr * VENTANA)
n = len(audio) // hop
rms = np.sqrt(np.mean(audio[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
voz = 20 * np.log10(rms) > UMBRAL_DB

# tramos de silencio [a, b) en ventanas
tramos, i = [], 0
while i < n:
    if not voz[i]:
        j = i
        while j < n and not voz[j]:
            j += 1
        tramos.append((i, j))
        i = j
    else:
        i += 1

trozos, cursor = [], 0
for a, b in tramos:
    s0, s1 = a * hop, b * hop
    dur = (b - a) * VENTANA
    if a == 0:
        keep = INICIO
    elif b >= n:
        keep = FINAL
    else:
        keep = MAX_PAUSA
    if dur > keep:
        mitad = int(keep * sr / 2)
        if a == 0:
            trozos.append(audio[cursor:0])
            cursor = s1 - int(keep * sr)
        elif b >= n:
            trozos.append(audio[cursor : s0 + int(keep * sr)])
            cursor = len(audio)
        else:
            trozos.append(audio[cursor : s0 + mitad])
            cursor = s1 - mitad
trozos.append(audio[cursor:])
out = np.concatenate(trozos)
# si el silencio final es más corto que FINAL, se completa con silencio
cola = 0
while cola < len(out) and abs(out[len(out) - 1 - cola]) < 10 ** (UMBRAL_DB / 20):
    cola += 1
falta = int(FINAL * sr) - cola
if falta > 0:
    out = np.concatenate([out, np.zeros(falta, dtype=out.dtype)])
# pequeño fundido en cada empalme ya no hace falta: se corta en silencio (< -40 dB)
sf.write(dst, out, sr, subtype="PCM_16")
print(f"{len(audio)/sr:.2f} s -> {len(out)/sr:.2f} s")
