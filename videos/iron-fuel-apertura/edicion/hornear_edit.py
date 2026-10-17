#!/usr/bin/env python3
"""El vídeo base del Edit de Instagram: public/clips/edit-montaje.webm.

Pone uno detrás de otro los planos de src/edit/montaje.json, cada uno con su
rampa de velocidad, en un solo clip VP9 de 1080 × 1920 a 30 fps. Remotion
(src/edit/) pone encima los golpes de zoom, los destellos y los textos.

Cada plano sale de un vídeo (el recorrido del día de la inauguración o un
clip de las obras), empieza en el segundo `desde`, dura `fotogramas`
fotogramas y avanza según su curva `velocidad`: [[posición en el plano de 0
a 1, velocidad], …], interpolada en línea recta. Donde va rápido, cada
fotograma mezcla los fotogramas originales que caen dentro de su obturación,
como una cámara a 270°: así la rampa tiene desenfoque de movimiento en vez de
saltos. Los planos de `antes` (las obras) van en blanco y negro y, si el clip
es 3:4, `encuadre` dice qué parte de la anchura se queda (0 izquierda, 1
derecha).

El recorrido llegó por WhatsApp: 576 × 1024, con fotogramas perdidos. Por eso
se toma cada fotograma por su marca de tiempo y no por su número.

    python3 edicion/hornear_edit.py
"""

import json
import re
import subprocess
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
MONTAJE = json.loads((RAIZ / "src" / "edit" / "montaje.json").read_text())
SALIDA = RAIZ / "public" / "clips" / "edit-montaje.webm"
W, H, FPS = 1080, 1920, 30
OBTURACION = 0.75

# El recorrido: se limpia la compresión, se sube a 1080 × 1920 y se etalona
# con contraste, color con fuerza, sombras algo frías y luces cálidas (la
# madera y el logo de la pared).
DESPUES = (
    "hqdn3d=1.5:1.5:3:3,scale=1080:1920:flags=lanczos,unsharp=5:5:0.8:5:5:0,"
    "eq=contrast=1.1:saturation=1.22:gamma=0.97,"
    "colorbalance=rs=-0.03:bs=0.04:rh=0.03:bh=-0.03,"
    "curves=master='0/0 0.25/0.21 0.75/0.8 1/1'"
)
# Las obras, en blanco y negro con más contraste y algo más oscuras.
ANTES = (
    "crop=1080:1920:(iw-1080)*{encuadre}:0,hue=s=0,"
    "eq=contrast=1.22:gamma=1.12,curves=master='0/0.03 0.5/0.5 1/0.96'"
)


def curva(plano):
    """Segundo del original y velocidad en cada fotograma del plano."""
    n = plano["fotogramas"]
    u, v = zip(*plano["velocidad"])
    sub = 16
    tau = np.arange(n * sub + 1) / (sub * FPS)
    vel = np.interp(tau / (n / FPS), u, v)
    s = np.concatenate([[0.0], np.cumsum((vel[1:] + vel[:-1]) / 2) / (sub * FPS)])
    i = np.arange(n) * sub
    return plano["desde"] + s[i], vel[i]


def decodificar(plano, hasta):
    """Los fotogramas originales entre `desde` y `hasta`, con su segundo."""
    filtro = ANTES.format(encuadre=plano.get("encuadre", 0.5)) if plano.get("antes") else DESPUES
    cmd = [
        "ffmpeg", "-hide_banner", "-copyts",
        "-ss", f"{max(0.0, plano['desde'] - 0.1):.3f}", "-to", f"{hasta + 0.15:.3f}",
        "-i", str(RAIZ / plano["archivo"]),
        "-vf", f"{filtro},format=yuv444p,showinfo",
        "-fps_mode", "passthrough", "-f", "rawvideo", "-",
    ]
    r = subprocess.run(cmd, capture_output=True, check=True)
    tiempos = np.array([float(x) for x in re.findall(rb"pts_time:\s*(-?[\d.]+)", r.stderr)])
    cuadros = np.frombuffer(r.stdout, np.uint8).reshape(-1, 3, H, W)
    assert len(cuadros) == len(tiempos), (plano["nombre"], len(cuadros), len(tiempos))
    return cuadros, tiempos


def main():
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    codificador = subprocess.Popen(
        [
            "ffmpeg", "-v", "error", "-y",
            "-f", "rawvideo", "-pix_fmt", "yuv444p", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
            "-c:v", "libvpx-vp9", "-crf", "20", "-b:v", "0", "-deadline", "good", "-cpu-used", "4",
            "-row-mt", "1", "-threads", "4", "-g", "15", "-pix_fmt", "yuv420p",
            "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
            str(SALIDA),
        ],
        stdin=subprocess.PIPE,
    )
    total = 0
    for plano in MONTAJE["planos"]:
        segundos, velocidades = curva(plano)
        cuadros, tiempos = decodificar(plano, segundos[-1] + OBTURACION * velocidades[-1] / FPS)
        for s, v in zip(segundos, velocidades):
            cerca = int(np.argmin(np.abs(tiempos - s)))
            dentro = np.flatnonzero(np.abs(tiempos - s) <= OBTURACION * v / FPS / 2)
            if v <= 1.3 or len(dentro) < 2:
                cuadro = cuadros[cerca]
            else:
                cuadro = (cuadros[dentro].astype(np.float32).mean(axis=0) + 0.5).astype(np.uint8)
            codificador.stdin.write(cuadro.tobytes())
        total += plano["fotogramas"]
        print(f"{plano['nombre']}: {plano['desde']:.2f}–{segundos[-1]:.2f} s → {plano['fotogramas']} fotogramas")
    codificador.stdin.close()
    if codificador.wait():
        raise SystemExit("ffmpeg no pudo codificar el clip")
    print(f"{SALIDA} ({total} fotogramas, {total / FPS:.1f} s)")


if __name__ == "__main__":
    main()
