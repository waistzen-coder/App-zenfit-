#!/usr/bin/env python3
"""Música del anuncio de Instagram de Iron Fuel Nutrition: 15 s de
electrónica deportiva, sin voz.

120 BPM: un pulso dura 15 fotogramas y los cortes de src/Publicidad.tsx caen
en pulsos. Bombo a negras, palmas, charles, bajo 808 a contratiempo y
acordes de sierras desafinadas (audio/sintes.py); los golpes grandes llevan
el bombo, el taiko y los platos de la orquesta (audio/orquesta.py).

    0-2 s    la fachada a oscuras: subida, chispazo eléctrico y golpe en el
             destello azul (0,5 s), un golpe por cada línea de «MOTRIL, SUBE
             EL NIVEL» (1 y 1,25 s) y un redoble hacia el interior
    2-5 s    entra el ritmo con el interior de la tienda
    5-10 s   lo más intenso, con una melodía de sierras: «ALIMENTA TU
             OBJETIVO» y un plano por pulso; redoble y silencio antes de...
    10-12 s  ...la tienda entera: acordes grandes a medio tiempo y una
             subida hacia la luz del cierre
    12-15 s  el logo: golpe con caída del subgrave, un latido por pulso y el
             destello final (14 s)

    python3 audio/musica_anuncio.py   # escribe public/audio/musica-anuncio.wav
"""

from pathlib import Path

import numpy as np

from orquesta import (
    SR,
    Mezcla,
    bombo as bombo_orquesta,
    boom,
    decay,
    envolvente,
    highpass,
    lowpass,
    phase,
    plato,
    put,
    riser,
    rng,
    subida_plato,
    taiko,
    tt,
    whoosh,
)
from sintes import Ritmo, caja, exportar, mezclar, ochocientos, palmada, supersierra

SALIDA = Path(__file__).resolve().parent.parent / "public" / "audio" / "musica-anuncio.wav"
DURACION = 15.0
PULSO = 0.5
SEMI = PULSO / 4


def c(compas, paso=0.0):
    """Segundo del paso (semicorchea, 0-15) de un compás de 2 s (desde 1)."""
    return (compas - 1) * 4 * PULSO + paso * SEMI


DESTELLO = 0.5  # el rótulo se enciende (fotograma 15)
INTERIOR = c(2)  # 2 s, fotograma 60
INTENSO = c(3, 8)  # 5 s, fotograma 150
TIENDA = c(6)  # 10 s, fotograma 300
LOGO = c(7)  # 12 s, fotograma 360
FINAL = c(8)  # 14 s, fotograma 420

# Mi menor: i, VI, III, VII y vuelta a i en el logo.
MI, DO, SOL, RE = 40, 36, 43, 38
ACORDES = [
    (0.0, c(3), MI, "m"),
    (c(3), c(4), DO, "M"),
    (c(4), c(5), SOL, "M"),
    (c(5), c(6), RE, "M"),
    (c(6), c(6, 8), DO, "M"),
    (c(6, 8), c(7), RE, "M"),
    (c(7), DURACION, MI, "m"),
]
# Las notas de cada acorde para las sierras, en la octava del medio.
VOCES = {MI: (64, 67, 71, 76), DO: (60, 64, 67, 72), SOL: (62, 67, 71, 74), RE: (62, 66, 69, 74)}

m = Mezcla(DURACION, ACORDES)
percusion, sfx, post = m.percusion, m.sfx, m.post
r = Ritmo(m)
bateria, bajo, sinte = r.bateria, r.bajo, r.sinte


def raiz(t):
    for a, b, nota, _ in ACORDES:
        if a <= t + 1e-6 < b:
            return nota
    return MI


def chispazo(dur=0.4):
    """Descarga eléctrica: crepitar de chasquidos y un zumbido que cae."""
    t = tt(dur)
    crepitar = (rng.random(len(t)) < 0.03 * decay(t, 0.12)) * rng.uniform(-1, 1, len(t))
    zumbido = np.tanh(4 * np.sin(phase(150 + 2600 * decay(t, 0.05)))) * decay(t, 0.09) * 0.35
    return lowpass(highpass(crepitar * 1.6, 1200) + zumbido, 9000)


def golpe(at, fuerza=1.0):
    """Los golpes grandes: bombo y taiko de la orquesta, subgrave y plato."""
    put(percusion, bombo_orquesta(7), at, 0.8 * fuerza, send=0.2)
    put(percusion, taiko(), at, 0.75 * fuerza, send=0.25)
    put(sfx, boom(fuerza, dur=2.4), at, 0.7)
    put(percusion, plato("ff" if fuerza >= 1 else "mf", 3.0), at, 0.35 * fuerza, send=0.2)


def acorde(at, dur, gain, brillo=(5000, 1400), octava=0):
    notas = [n + 12 * octava for n in VOCES[raiz(at)]]
    put(sinte, supersierra(notas, dur, brillo), at, gain * 1.4, send=0.35)


def ritmo(compas, semicorcheas=False, contra=True, palmas=(4, 12)):
    """Un compás: bombo a negras, bajo a contratiempo, palmas y charles."""
    for paso in (0, 4, 8, 12):
        r.bombo(c(compas, paso))
    nota = raiz(c(compas))
    while nota - 12 >= 28:
        nota -= 12
    put(bajo, ochocientos(nota, 4 * SEMI * 0.9), c(compas), 0.42)
    if contra:
        for paso in (2, 6, 10, 14):
            put(bajo, ochocientos(nota + 12, SEMI * 1.4), c(compas, paso), 0.24)
    for paso in palmas:
        put(bateria, palmada(), c(compas, paso), 0.55, send=0.3)
    for paso in range(16):
        if paso % 2 == 0 and not semicorcheas:
            continue
        r.charles(c(compas, paso), 0.22 if paso % 4 == 2 else 0.12)
    if semicorcheas:
        for paso in (2, 6, 10, 14):
            r.charles(c(compas, paso), 0.13, abierto=True)


def redoble(desde, hasta, gain=0.5):
    t = desde
    while t < hasta - 1e-6:
        put(percusion, caja(), t, gain * (0.3 + 0.7 * (t - desde) / (hasta - desde)), 0.1, 0.2)
        t += SEMI if t < (desde + hasta) / 2 else SEMI / 2


# ------------------------------------------------------------- 1 · La fachada (0-2 s)

put(post, riser(DESTELLO, lo=120, hi=6000), 0.0, 0.35)
put(post, whoosh(DESTELLO, 1), 0.02, 0.25)
golpe(DESTELLO, 0.8)
put(sfx, chispazo(), DESTELLO, 0.6)
put(sfx, chispazo(0.3), DESTELLO + 0.21, 0.35)
put(bajo, ochocientos(28, INTERIOR - DESTELLO - 0.1), DESTELLO, 0.5)
acorde(DESTELLO, 0.5, 0.35, (7000, 900))
# Colchón oscuro y los dos golpes de «MOTRIL, / SUBE EL NIVEL».
colchon = supersierra(VOCES[MI], INTERIOR - DESTELLO, (700, 2500), ataque=0.3)
put(sinte, colchon, DESTELLO, 0.3, send=0.4)
for at in (c(1, 4), c(1, 6)):
    acorde(at, 0.3, 0.42, (8000, 1500))
    put(bateria, palmada(), at, 0.5, send=0.4)
    r.bombo(at, 0.7)
for paso in range(4, 16):
    r.charles(c(1, paso), 0.06 + 0.012 * paso)
redoble(c(1, 12), INTERIOR - 0.06, 0.5)
put(post, riser(INTERIOR - c(1, 8)), c(1, 8), 0.3)

# ------------------------------------------------------------- 2 · El interior (2-5 s)

golpe(INTERIOR)
ritmo(2)
for paso in (3, 6, 10, 13):
    acorde(c(2, paso), 0.22, 0.32, (6000, 1200))
ritmo(3)
for paso in (3, 6):
    acorde(c(3, paso), 0.22, 0.32, (6000, 1200))
# Un barrido de aire entrando en cada corte.
for corte in (90, 120, 135):
    put(sfx, whoosh(0.32, 1 if corte % 2 else -1), corte / 30 - 0.28, 0.2)

# ------------------------------------------------------------- 3 · Lo más intenso (5-10 s)

golpe(INTENSO, 0.7)
for paso in (10, 13):
    acorde(c(3, paso), 0.22, 0.34, (6500, 1300))
for compas in (4, 5):
    ritmo(compas, semicorcheas=True)
    for paso in (0, 3, 6, 10, 13):
        acorde(c(compas, paso), 0.24, 0.36, (7000, 1300))
# La melodía de sierras: 3 + 3 + 2 semicorcheas, en lo alto.
MELODIA = {DO: (79, 79, 76, 74), SOL: (79, 83, 79, 78), RE: (78, 81, 78, 74), MI: (76, 79, 76, 71)}
for compas in (3, 4, 5):
    for mitad in (0, 8):
        at0 = c(compas, mitad)
        if at0 < INTENSO - 1e-6:
            continue
        for paso, nota in zip((0, 3, 6, 7), MELODIA[raiz(at0)]):
            put(sinte, supersierra([nota], 0.2, (9000, 2500), voces=5), c(compas, mitad + paso), 0.27, 0.1, 0.3)
for corte in range(165, 300, 15):
    put(sfx, whoosh(0.22, 1 if corte % 30 else -1), corte / 30 - 0.18, 0.12)
redoble(c(5, 8), TIENDA - 0.13, 0.55)
put(post, riser(TIENDA - c(5, 8)), c(5, 8), 0.3)
swell, desde = subida_plato(TIENDA, "Short")
put(post, swell, desde, 0.35)

# ------------------------------------------------------------- 4 · La tienda entera (10-12 s)

golpe(TIENDA)
for paso, dur in ((0, 4 * PULSO * 0.5), (8, 4 * PULSO * 0.5)):
    at = c(6, paso)
    acorde(at, dur, 0.4, (3500, 1800), octava=0)
    acorde(at, dur, 0.18, (2500, 1500), octava=-1)
    r.bombo(at)
    put(bajo, ochocientos(raiz(at) - 12, dur * 0.95), at, 0.45)
for paso in (4, 12):
    put(bateria, palmada(), c(6, paso), 0.6, send=0.5)
for paso in range(0, 16, 2):
    r.charles(c(6, paso), 0.14)
put(post, riser(PULSO * 2, lo=300, hi=10000), c(6, 8), 0.3)
swell, desde = subida_plato(LOGO, "Short")
put(post, swell, desde, 0.4)

# ------------------------------------------------------------- 5 · El logo (12-15 s)

golpe(LOGO)
put(sfx, chispazo(), LOGO, 0.45)
put(bajo, ochocientos(28, 1.6, desde=40), LOGO, 0.55)
largo = DURACION - LOGO
put(sinte, envolvente(supersierra(VOCES[MI], largo, (2600, 900), ataque=0.02), [(0, 1), (largo, 0.3)]), LOGO, 0.32, send=0.5)
# El latido: un golpe suave por pulso, como el pulso azul detrás del logo.
for k in range(1, 6):
    at = LOGO + k * PULSO
    r.bombo(at, 0.45)
    put(bajo, ochocientos(28, 0.3), at, 0.25)
# Destellos agudos que bajan, como las partículas.
for k, nota in enumerate((88, 86, 83, 81, 79, 76, 74, 71)):
    put(sinte, supersierra([nota], 0.18, (10000, 3000), voces=3), LOGO + 0.25 + k * SEMI, 0.1, 0.4 * (-1) ** k, 0.6)
golpe(FINAL, 0.6)
acorde(FINAL, 0.6, 0.3, (9000, 2000), octava=1)

mix = mezclar(m, r)
# Un instante de silencio justo antes de la tienda entera.
t_all = np.arange(m.n) / SR
mix *= np.interp(t_all, [TIENDA - 0.13, TIENDA - 0.1, TIENDA - 0.005, TIENDA], [1, 0.08, 0.08, 1])[:, None]
mix += post.x
exportar(mix, DURACION, SALIDA, fundido=0.9)
