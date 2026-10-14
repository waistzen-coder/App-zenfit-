#!/usr/bin/env python3
"""Banda sonora del vídeo de la inauguración de Iron Fuel Nutrition.

18 s a 120 BPM: dos golpes de forja para «DETRÁS DE CADA SUEÑO / HAY MUCHO
TRABAJO», el montaje con ostinato y taikos, la subida de «Y HOY QUEREMOS
COMPARTIRLO», medio segundo de casi silencio y el logo en re mayor (6 s).
Después, un golpe por cada línea de la información (7, 8, 9, 10 y 11 s) sobre
una progresión que sube, la resolución en «¡TE ESPERAMOS!» (12 s) y seis
segundos de final para que dé tiempo a leerlo todo.

La orquesta y la mezcla son las de audio/orquesta.py; cada golpe cae en el
mismo fotograma que su corte en src/inauguracion/.

    python3 audio/banda_sonora_inauguracion.py   # escribe public/audio/banda-sonora-inauguracion.wav
"""

from pathlib import Path

from orquesta import (
    Mezcla,
    bloque,
    bombo,
    boom,
    cello_spic,
    cello_sus,
    cello_trem,
    chispas,
    envolvente,
    fr,
    impacto,
    ostinato,
    plato,
    put,
    redoble_caja,
    redoble_timbal,
    riser,
    stab,
    subida_plato,
    taiko,
    tambores,
    timbal,
    trombon,
    trompa,
    tuba,
    viola_spic,
    violin_sus,
    violin_trem,
    whoosh,
    yunque,
)

SALIDA = Path(__file__).resolve().parent.parent / "public" / "audio" / "banda-sonora-inauguracion.wav"

# (desde, hasta, raíz MIDI grave, mayor/menor)
ACORDES = [
    (0.0, 2.0, 38, "m"),  # Dm   «DETRÁS DE CADA SUEÑO HAY MUCHO TRABAJO»
    (2.0, 3.0, 46, "M"),  # Bb   el montaje
    (3.0, 4.0, 43, "m"),  # Gm
    (4.0, 6.0, 45, "M"),  # A    «Y HOY QUEREMOS COMPARTIRLO»
    (6.0, 8.0, 38, "M"),  # D    el logo y la fecha
    (8.0, 9.0, 46, "M"),  # Bb   la hora
    (9.0, 10.0, 48, "M"),  # C    el sitio
    (10.0, 11.0, 38, "M"),  # D    bebidas, aperitivos y regalos
    (11.0, 12.0, 45, "M"),  # A    el 10 % de descuento
    (12.0, 18.0, 38, "M"),  # D    «¡TE ESPERAMOS!»
]

m = Mezcla(18.0, ACORDES)
orquesta, percusion, sfx, post = m.orquesta, m.percusion, m.sfx, m.post


def re_mayor(at, dur, gain=1.0):
    """El acorde de re mayor de toda la orquesta, como el final del teaser."""
    bloque([26], tuba, 3, dur, at, 0.5 * gain, pan=0.3)
    bloque([38, 45], trombon, 3, dur, at, 0.4 * gain, pan=0.15)
    bloque([50, 54, 57, 62], trompa, 4, dur, at, 0.3 * gain, pan=-0.2)
    bloque([38, 50], cello_sus, 3, dur, at, 0.42 * gain, pan=0.3, send=0.45)
    bloque([66, 69, 74], violin_sus, 2, dur, at, 0.3 * gain, pan=-0.3, send=0.5)


# 1 · «DETRÁS DE CADA SUEÑO» (0 s) y «HAY MUCHO TRABAJO» (1 s)
impacto(0.0, grande=False)
bloque([26], tuba, 3, 1.4, 0.0, 0.5, pan=0.3)
bloque([38, 45], trombon, 3, 1.4, 0.0, 0.4, pan=0.15)
put(percusion, yunque(3, 2), fr(30), 0.75, send=0.55)
put(percusion, bombo(5), fr(30), 0.6, send=0.2)
put(percusion, taiko(), fr(30), 0.7, send=0.3)
put(sfx, chispas(1.2), fr(30) + 0.02, 0.45)
put(sfx, boom(0.6, dur=2.0, start_hz=80, tau=0.6), fr(30), 0.6)
trem = cello_trem.nota(38, 2, 2.0, 0.3)
put(orquesta, envolvente(trem, [(0, 0.0), (0.5, 0.3), (1.7, 0.85), (2.1, 0.0)]), 0.3, 0.5, 0.3, 0.35)

# 2 · El montaje (2–4 s): un plano por pulso
stab(2.0, 1.0)
ostinato(2.0, 4.0, 0.25, [0, 0, 12, 0, 7, 0, 12, 7], cello_spic, 0, 1, 0.42, 0.3)
tambores(2.0, 4.0)
for corte, direccion in ((75, -1), (105, 1)):
    put(sfx, whoosh(0.42, direccion), fr(corte) - 0.21, 0.45)

# 3 · «Y HOY QUEREMOS COMPARTIRLO» (4 s): todo sube hacia el logo
stab(4.0, 1.1)
put(percusion, yunque(3, 0), 4.0, 0.6, send=0.45)
put(percusion, timbal(45), 4.0, 0.7, send=0.3)
put(percusion, taiko(), 4.0, 0.8, send=0.25)
ostinato(4.0, 5.55, 0.125, [0, 0, 12, 0], cello_spic, 0, 2, 0.36, 0.3)
ostinato(4.0, 5.55, 0.125, [0, 0, 12, 0], viola_spic, 12, 1, 0.26, 0.05)
trem_a = violin_trem.nota(69, 2, 1.6, 0.05)
put(orquesta, envolvente(trem_a, [(0, 0.15), (1.5, 1.0), (1.65, 0.0)]), 4.0, 0.4, -0.3, 0.3)
put(percusion, redoble_caja(1.55), 4.0, 0.5, send=0.25)
put(percusion, redoble_timbal(45, 1.55), 4.0, 0.45, send=0.3)
put(sfx, riser(1.55), 4.0, 0.25, send=0.1)
swell, desde = subida_plato(6.0, "Short")
put(post, swell, desde, 0.55)

# 4 · El logo y «INAUGURACIÓN» (6 s): re mayor con todo
impacto(6.0)
put(sfx, chispas(2.0, 0.006), 6.02, 0.4)
re_mayor(6.0, 1.9)
put(percusion, timbal(50), 6.0, 0.8, send=0.3)
ostinato(6.0, 12.0, 0.125, [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 7, 7, 12, 7], cello_spic, 0, 2, 0.32, 0.3)
ostinato(8.0, 12.0, 0.125, [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 7, 7, 12, 7], viola_spic, 12, 2, 0.22, 0.05)
tambores(6.0, 12.0)

# 5 · Una línea de información por golpe (7, 8, 9, 10 y 11 s)
for k, t_linea in enumerate((7.0, 8.0, 9.0, 10.0, 11.0)):
    stab(t_linea, 0.85 + 0.05 * k)
    put(percusion, yunque(2, k), t_linea, 0.38 + 0.04 * k, send=0.45)
put(percusion, plato("mf", 2.0), 11.0, 0.3, send=0.2)
put(percusion, redoble_timbal(45, 1.0), 11.0, 0.45, send=0.3)

# 6 · «¡TE ESPERAMOS!» (12 s) y el final para leer con calma
impacto(12.0, grande=False)
re_mayor(12.0, 5.6, 0.9)
put(percusion, timbal(50), 12.0, 0.75, send=0.3)
put(percusion, plato("ff", 3.0), 12.0, 0.32, send=0.2)
FANFARRIA = [(12.0, 57, 0.5), (12.5, 62, 0.5), (13.0, 66, 0.5), (13.5, 69, 0.5), (14.0, 62, 3.6)]
for t_n, midi, dur in FANFARRIA:
    put(orquesta, trompa.nota(midi, 4, dur, 0.18), t_n, 0.44, -0.15, 0.4)
    put(orquesta, violin_sus.nota(midi + 12, 2, dur, 0.18), t_n, 0.28, -0.35, 0.45)
ostinato(14.0, 17.0, 0.25, [0, 0, 12, 0, 7, 0, 12, 7], cello_spic, 0, 1, 0.24, 0.3)
put(percusion, taiko(), 14.0, 0.7, send=0.3)
put(percusion, redoble_timbal(38, 3.0), 14.5, 0.25, send=0.3)

# Casi silencio justo antes del logo (fotograma 180 = 6 s)
m.exportar(SALIDA, huecos=[(5.55, 5.68, 5.97, 6.0)])
