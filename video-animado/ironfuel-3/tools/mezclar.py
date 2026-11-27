"""Mezcla el sonido del vídeo: voz + música muy baja + efectos en su palabra.

    python3 tools/mezclar.py        (después de node tools/build.mjs)

Lee tools/cues.json (lo escribe build.mjs con los tiempos de la voz) y deja
assets/audio/mezcla.wav a -14 LUFS integrados y pico real ≤ -1 dBTP.
Cada efecto se adelanta lo que tarde en sonar su golpe, para que el golpe caiga
un fotograma después de la imagen (la luz llega antes que el sonido).
"""
import json
import os
import subprocess
import sys

import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
FOTOGRAMA = 1 / 30


def decodificar(ruta):
    """Audio → array float32 estéreo a 48 kHz (con ffmpeg)."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", ruta, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def db(x):
    return 10 ** (x / 20)


def inicio_golpe(a):
    """Segundos hasta que el efecto empieza a sonar de verdad."""
    env = np.abs(a).max(axis=1)
    umbral = env.max() * 0.25
    idx = int(np.argmax(env > umbral))
    return idx / SR


def main():
    cues = json.load(open(os.path.join(RAIZ, "tools/cues.json")))
    D = cues["duracion"]
    n = int(round(D * SR))
    mezcla = np.zeros((n, 2), dtype=np.float64)

    # voz
    voz = decodificar(os.path.join(RAIZ, cues["voz"]))[:n]
    mezcla[: len(voz)] += voz

    # música: muy baja, sin silencio nunca, con entrada y salida suaves
    m = cues["musica"]
    mus = decodificar(os.path.join(RAIZ, m["archivo"]))
    i0 = int(m["desde"] * SR)
    mus = mus[i0 : i0 + n]
    if len(mus) < n:
        mus = np.pad(mus, ((0, n - len(mus)), (0, 0)))
    env = np.ones(n)
    fi, fo = int(0.25 * SR), int(1.4 * SR)
    env[:fi] = np.linspace(0, 1, fi)
    env[-fo:] = np.linspace(1, 0.35, fo)
    mezcla += mus * env[:, None] * db(m["db"])

    # efectos
    cache = {}
    informe = []
    for c in cues["efectos"]:
        ruta = os.path.join(RAIZ, c["archivo"])
        if ruta not in cache:
            a = decodificar(ruta)
            cache[ruta] = (a, inicio_golpe(a))
        a, golpe = cache[ruta]
        dur = c.get("dur") or (2.6 if "climax" in ruta else 2.2)
        a = a[: int(dur * SR)].astype(np.float64)
        fade = min(int(0.12 * SR), len(a))
        a[-fade:] *= np.linspace(1, 0, fade)[:, None]
        t0 = c["t"] + FOTOGRAMA - golpe
        k = int(round(t0 * SR))
        if k < 0:
            a = a[-k:]
            k = 0
        fin = min(n, k + len(a))
        if fin <= k:
            continue
        mezcla[k:fin] += a[: fin - k] * db(c["db"])
        informe.append(f"{c['t']:7.3f}s  {os.path.basename(ruta):18s} {c['db']:>4} dB  {c['que']}")

    # a disco y normalizado a -14 LUFS (dos pasadas de loudnorm)
    bruto = os.path.join(RAIZ, "tools", "_mezcla-bruta.wav")
    sal = os.path.join(RAIZ, "assets/audio/mezcla.wav")
    pico = np.abs(mezcla).max()
    if pico > 0.98:
        mezcla *= 0.98 / pico
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", bruto],
        input=mezcla.astype(np.float32).tobytes(),
        check=True,
    )
    medida = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", bruto, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
        capture_output=True,
        text=True,
    ).stderr
    js = json.loads(medida[medida.rindex("{") : medida.rindex("}") + 1])
    filtro = (
        "loudnorm=I=-14:TP=-1.5:LRA=11:linear=true:"
        f"measured_I={js['input_i']}:measured_TP={js['input_tp']}:measured_LRA={js['input_lra']}:"
        f"measured_thresh={js['input_thresh']}:offset={js['target_offset']}"
    )
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", bruto, "-af", f"{filtro},aresample={SR}", "-t", f"{D:.3f}", "-c:a", "pcm_s16le", sal],
        check=True,
    )
    os.remove(bruto)
    print(f"{len(informe)} efectos colocados · duración {D:.3f} s")
    if "-v" in sys.argv:
        print("\n".join(informe))


if __name__ == "__main__":
    main()
