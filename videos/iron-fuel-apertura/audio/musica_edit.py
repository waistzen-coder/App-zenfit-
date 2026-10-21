#!/usr/bin/env python3
"""Música del Edit de Instagram de Iron Fuel Nutrition: phonk épico de 22 s.

128,57 BPM, para que un pulso dure 14 fotogramas exactos y un compás 56 (los
cortes de src/edit/montaje.json caen en pulsos). La batería, el 808 y el
cencerro son sintetizados (audio/sintes.py); los metales, las cuerdas y la
percusión grande, de la orquesta de audio/orquesta.py.

    compases 1-2   «DE ESTO...»: las obras, con el ritmo apagado como desde
                   fuera, cuerdas en tensión y un redoble; el último pulso
                   se queda en silencio
    compás 3       «...A ESTO»: la tienda terminada, caída con todo (3,73 s)
    compases 4-6   una palabra cada dos pulsos; en el último pulso la cinta
                   se frena (efecto de parada de cinta)
    compás 7       «CONSTRUYE TU MEJOR VERSIÓN» sobre el logo, sin batería
    compases 8-9   segunda caída: un plano por pulso
    compases 10-11 el logo y la información: mi bemol, fa y sol mayor, y
                   tres segundos de final

    python3 audio/musica_edit.py   # escribe public/audio/musica-edit.wav
"""

from pathlib import Path

import numpy as np

from orquesta import (
    SR,
    Mezcla,
    bloque,
    boom,
    braam,
    cello_spic,
    cello_sus,
    envolvente,
    highpass,
    impacto,
    lowpass,
    ostinato,
    plato,
    put,
    redoble_timbal,
    riser,
    rng,
    stab,
    subida_plato,
    sweep_lowpass,
    timbal,
    trombon,
    trompa,
    tt,
    tuba,
    violin_sus,
    violin_trem,
    whoosh,
)
from sintes import Ritmo, caja, campana, exportar, hz, mezclar, ochocientos, palmada

SALIDA = Path(__file__).resolve().parent.parent / "public" / "audio" / "musica-edit.wav"
DURACION = 22.0
PULSO = 14 / 30
SEMI = PULSO / 4
COMPAS = 4 * PULSO


def c(compas, paso=0.0):
    """Segundo del paso (semicorchea, 0-15) de un compás (desde 1)."""
    return (compas - 1) * COMPAS + paso * SEMI


CAIDA_1 = c(3)  # 3,733 s, fotograma 112
HUECO = (c(2, 12), CAIDA_1)  # el pulso de silencio antes de la caída
PARADA = (c(6, 12), c(7))  # la parada de cinta, 10,733-11,2 s
CAIDA_2 = c(8)  # 13,067 s, fotograma 392
LOGO = c(10)  # 16,8 s, fotograma 504
FINAL = c(11)  # 18,667 s, fotograma 560

# (desde, hasta, raíz MIDI grave, mayor/menor): sol menor con su dominante y
# el final épico de mi bemol, fa y sol mayor.
ACORDES = [
    (0.0, c(5), 43, "m"),  # Gm   las obras y la caída
    (c(5), c(6), 39, "M"),  # Eb
    (c(6), c(7), 38, "M"),  # D
    (c(7), c(7, 8), 36, "m"),  # Cm   «CONSTRUYE TU MEJOR...
    (c(7, 8), c(8), 38, "M"),  # D    ...VERSIÓN»
    (c(8), c(9), 43, "m"),  # Gm   segunda caída
    (c(9), c(9, 8), 39, "M"),  # Eb
    (c(9, 8), c(10), 38, "M"),  # D
    (c(10), c(10, 8), 39, "M"),  # Eb   el logo
    (c(10, 8), c(11), 41, "M"),  # F
    (c(11), DURACION, 43, "M"),  # G    final
]

m = Mezcla(DURACION, ACORDES)
orquesta, percusion, sfx, post = m.orquesta, m.percusion, m.sfx, m.post
r = Ritmo(m)
bateria, bajo, campana_bus = r.bateria, r.bajo, r.sinte
bombo, charles = r.bombo, r.charles



# El riff del cencerro: 3 + 3 + 2 + 3 + 3 + 2 semicorcheas, sobre el acorde.
RITMO = (0, 3, 6, 8, 11, 14)
RIFF = {
    "Gm": (79, 79, 86, 84, 82, 81),  # sol sol re do si♭ la
    "Gm2": (79, 79, 86, 89, 86, 84),  # sol sol re fa re do
    "Eb": (79, 79, 87, 86, 82, 79),  # sol sol mi♭ re si♭ sol
    "D": (78, 78, 86, 84, 81, 78),  # fa♯ fa♯ re do la fa♯
    "F": (81, 81, 89, 88, 84, 81),  # la la fa mi do la
}


def riff(compas, nombre, desde=0, hasta=16, gain=0.37, doblar=False):
    for paso, midi in zip(RITMO, RIFF[nombre]):
        if not desde <= paso < hasta:
            continue
        at = c(compas, paso)
        acento = 1.0 if paso in (0, 8) else 0.82
        put(campana_bus, campana(midi), at, gain * acento, pan=-0.12, send=0.35)
        if doblar:
            # Los trombones y las trompas doblan el riff en la segunda caída.
            put(orquesta, trombon.nota(midi - 24, 4, 0.2, 0.08), at, 0.3 * acento, 0.15, 0.25)
            put(orquesta, trompa.nota(midi - 12, 4, 0.2, 0.08), at, 0.22 * acento, -0.2, 0.3)


def raiz_808(t):
    """Nota del 808 en el acorde de ese momento, entre 41 y 78 Hz."""
    for a, b, raiz, _ in ACORDES:
        if a <= t + 1e-6 < b:
            r = raiz - 12
            while hz(r) < 41:
                r += 12
            while hz(r) > 80:
                r -= 12
            return r
    return 31


def ritmo(compas, bombos=(0, 3, 8, 11), palmas=(4, 12), semicorcheas=False, redoble=False):
    """Un compás de batería y 808. El 808 dura hasta el siguiente bombo."""
    golpes = sorted(bombos)
    for k, paso in enumerate(golpes):
        at = c(compas, paso)
        bombo(at)
        siguiente = golpes[k + 1] if k + 1 < len(golpes) else 16
        nota = raiz_808(at)
        anterior = raiz_808(at - SEMI) if k == 0 and compas > 1 else None
        dur = (siguiente - paso) * SEMI * 0.95
        put(bajo, ochocientos(nota, dur, desde=anterior if anterior != nota else None), at, 0.47)
    for paso in palmas:
        put(bateria, palmada(), c(compas, paso), 0.56, send=0.3)
    for paso in range(16):
        if paso % 2 and not semicorcheas:
            continue
        charles(c(compas, paso), 0.26 if paso % 4 == 2 else 0.17)
    if redoble:
        for k in range(6):
            charles(c(compas, 13) + k * SEMI / 2, 0.1 + 0.03 * k)


# ------------------------------------------------------------- 1 · «DE ESTO...» (0-3,73 s)

# Ritmo apagado, como si sonara al otro lado de la pared: va a los buses
# normales y luego exportar() filtra los compases 1 y 2.
put(sfx, boom(0.7, dur=2.0, start_hz=60, tau=0.7), 0.0, 0.7)
put(percusion, timbal(43), 0.0, 0.7, send=0.3)
for compas in (1, 2):
    ritmo(compas, palmas=(4,) if compas == 2 else (4, 12))
riff(1, "Gm", gain=0.4)
riff(2, "Gm2", hasta=12, gain=0.4)
for corte in (28, 56, 70, 84):
    put(percusion, timbal(43 if corte < 70 else 50), corte / 30, 0.5, send=0.3)
# Crujido de vinilo.
t_v = tt(HUECO[0])
crujido = (rng.random(len(t_v)) < 0.0007) * rng.uniform(0.2, 1, len(t_v))
crujido = lowpass(highpass(crujido, 1500), 7000) * 0.8 + lowpass(rng.standard_normal(len(t_v)), 3000) * 0.004
put(sfx, crujido, 0.0, 0.5)
# Cuerdas en tensión: ostinato de chelos que crece y violines en trémolo.
ostinato(0.0, HUECO[0], SEMI, [0, 0, 12, 0], cello_spic, 0, 2, 0.34, 0.3)
trem = violin_trem.nota(67, 2, HUECO[0], 0.05)
put(orquesta, envolvente(trem, [(0, 0.2), (HUECO[0] - 0.1, 1.0), (HUECO[0], 0.0)]), 0.0, 0.4, -0.3, 0.35)
trem = violin_trem.nota(74, 2, HUECO[0] - c(2), 0.05)
put(orquesta, envolvente(trem, [(0, 0.1), (HUECO[0] - c(2), 1.0)]), c(2), 0.3, 0.3, 0.35)
# Redoble de caja que se acelera hacia el silencio.
t_r = c(2)
while t_r < HUECO[0] - 1e-6:
    put(percusion, caja(), t_r, 0.18 + 0.32 * (t_r - c(2)) / (HUECO[0] - c(2)), 0.1, 0.2)
    t_r += SEMI if t_r < c(2, 8) else SEMI / 2
# Subida hacia la caída: suena también durante el silencio.
put(post, riser(CAIDA_1 - c(2)), c(2), 0.3)
swell, desde = subida_plato(CAIDA_1, "Short")
put(post, swell, desde, 0.5)
put(post, whoosh(0.5, 1), CAIDA_1 - 0.45, 0.3)

# ------------------------------------------------------------- 2 · «...A ESTO» y las palabras (3,73-11,2 s)

impacto(CAIDA_1)
braam(CAIDA_1, dur=1.6)
put(percusion, timbal(43), CAIDA_1, 0.8, send=0.3)
for compas, nombre in ((3, "Gm"), (4, "Gm2"), (5, "Eb"), (6, "D")):
    ritmo(compas, redoble=compas in (4, 6) and compas != 6)
    riff(compas, nombre)
# Un golpe de metales en cada palabra (cada dos pulsos) y un barrido de aire
# entrando en cada corte.
for compas in (4, 5, 6):
    for paso in (0, 8):
        if compas == 6 and paso == 8:
            stab(c(6, 8), 0.75)
            continue
        stab(c(compas, paso), 0.85 if paso == 0 else 0.7)
for compas in (4, 5, 6):
    for paso in (0, 8):
        put(sfx, whoosh(0.38, 1 if paso else -1), c(compas, paso) - 0.34, 0.22)
put(percusion, plato("mf", 2.0), c(5), 0.25, send=0.2)

# ------------------------------------------------------------- 3 · «CONSTRUYE TU MEJOR VERSIÓN» (11,2-13,07 s)

put(sfx, boom(1.0, dur=2.4), c(7), 0.75)
put(bajo, ochocientos(36, PULSO * 2 * 0.95), c(7), 0.6)
put(bajo, ochocientos(38, PULSO * 2 * 0.95, desde=36), c(7, 8), 0.6)
put(percusion, timbal(48), c(7), 0.75, send=0.3)
put(percusion, timbal(50), c(7, 8), 0.75, send=0.3)
bloque([36, 43], trombon, 3, PULSO * 2, c(7), 0.36, pan=0.15, ataque=0.15)
bloque([48, 51, 55], trompa, 4, PULSO * 2, c(7), 0.3, pan=-0.2, ataque=0.15)
bloque([38, 45], trombon, 3, PULSO * 2.2, c(7, 8), 0.4, pan=0.15)
bloque([50, 54, 57], trompa, 4, PULSO * 2.2, c(7, 8), 0.34, pan=-0.2)
bloque([36, 48], cello_sus, 3, PULSO * 2, c(7), 0.4, pan=0.3, send=0.45)
bloque([38, 50], cello_sus, 3, PULSO * 2, c(7, 8), 0.42, pan=0.3, send=0.45)
bloque([72, 75, 79], violin_sus, 2, PULSO * 2, c(7), 0.26, pan=-0.3, send=0.5)
bloque([74, 78, 81], violin_sus, 2, PULSO * 2, c(7, 8), 0.3, pan=-0.3, send=0.5)
put(bateria, palmada(), c(7, 4), 0.42, send=0.6)  # «TU MEJOR»
put(percusion, plato("mf", 2.0), c(7, 8), 0.22, send=0.2)  # «VERSIÓN»
put(percusion, redoble_timbal(43, PULSO * 2), c(7, 8), 0.4, send=0.3)
t_r = c(7, 8)
while t_r < CAIDA_2 - 1e-6:
    put(percusion, caja(), t_r, 0.15 + 0.35 * (t_r - c(7, 8)) / (CAIDA_2 - c(7, 8)), 0.1, 0.2)
    t_r += SEMI if t_r < c(7, 12) else SEMI / 2
put(sfx, riser(PULSO * 2), c(7, 8), 0.28)
swell, desde = subida_plato(CAIDA_2, "Short")
put(post, swell, desde, 0.45)

# ------------------------------------------------------------- 4 · Segunda caída, un plano por pulso (13,07-16,8 s)

impacto(CAIDA_2, grande=False)
braam(CAIDA_2, dur=1.2)
ritmo(8, semicorcheas=True)
ritmo(9, bombos=(0, 3, 8, 11, 14), semicorcheas=True)
riff(8, "Gm", doblar=True)
riff(9, "Eb", hasta=8, doblar=True)
riff(9, "D", desde=8, doblar=True)
stab(c(9), 0.8)
stab(c(9, 8), 0.8)
for k in range(4):
    put(percusion, caja(), c(9, 12) + k * SEMI, 0.25 + 0.08 * k, 0.1, 0.2)
put(sfx, riser(PULSO * 2), c(9, 8), 0.25)

# ------------------------------------------------------------- 5 · El logo, la información y el final (16,8-22 s)

impacto(LOGO)
braam(LOGO, dur=PULSO * 2)
ritmo(10, semicorcheas=True)
riff(10, "Eb", hasta=8)
riff(10, "F", desde=8)
braam(c(10, 8), dur=PULSO * 2)
put(percusion, redoble_timbal(41, PULSO * 2), c(10, 8), 0.5, send=0.3)
swell, desde = subida_plato(FINAL, "Short")
put(post, swell, desde, 0.4)

impacto(FINAL)
put(percusion, timbal(43), FINAL, 0.85, send=0.3)
put(bajo, ochocientos(31, 2.2), FINAL, 0.6)
largo = DURACION - FINAL - 0.4
bloque([31], tuba, 3, largo, FINAL, 0.5, pan=0.3)
bloque([43, 50], trombon, 3, largo, FINAL, 0.42, pan=0.15)
bloque([55, 59, 62], trompa, 4, largo, FINAL, 0.34, pan=-0.2)
bloque([43, 55], cello_sus, 3, largo, FINAL, 0.42, pan=0.3, send=0.45)
bloque([67, 71, 74, 79], violin_sus, 2, largo, FINAL, 0.28, pan=-0.3, send=0.5)
put(campana_bus, campana(79, 0.6), FINAL, 0.3, -0.12, send=0.8)
put(campana_bus, campana(86, 0.6), FINAL + PULSO * 1.5, 0.12, 0.2, send=0.9)


# ------------------------------------------------------------- mezcla


def acabar():
    n = m.n
    t_all = np.arange(n) / SR
    i_caida = int(CAIDA_1 * SR)

    # El ritmo de los dos primeros compases suena apagado y se va abriendo.
    corte = np.interp(t_all[:i_caida], [0, HUECO[0]], [420, 1100])
    for bus in (bateria, bajo, campana_bus):
        for canal in (0, 1):
            bus.x[:i_caida, canal] = sweep_lowpass(bus.x[:i_caida, canal], corte) * 0.6

    mix = mezclar(m, r)
    # El pulso de silencio antes de la primera caída.
    mix *= np.interp(t_all, [HUECO[0] - 0.01, HUECO[0] + 0.02, CAIDA_1 - 0.005, CAIDA_1], [1, 0.04, 0.04, 1])[:, None]
    mix += post.x

    # Parada de cinta: el último pulso del compás 6 se frena hasta pararse.
    a0, a1 = int(PARADA[0] * SR), int(PARADA[1] * SR)
    tau = np.arange(a1 - a0) / SR
    largo_p = PARADA[1] - PARADA[0]
    fuente = a0 + (tau - tau**2 / (2 * largo_p)) * SR
    tramo = np.stack([np.interp(fuente, np.arange(n), mix[:, k]) for k in (0, 1)], axis=1)
    tramo *= np.interp(tau, [0, largo_p * 0.8, largo_p], [1, 0.7, 0])[:, None]
    mix[a0:a1] = tramo

    exportar(mix, DURACION, SALIDA)


acabar()
