#!/usr/bin/env python3
"""Banda sonora del aviso de la inauguración de Iron Fuel Nutrition.

16 s a 120 BPM (ocho compases): dos golpes de forja para «HEMOS ESTADO
TRABAJANDO MUCHO», el montaje del trabajo con ostinato y taikos, la subida de
«PERO YA OS PODEMOS DECIR...», medio segundo de casi silencio y el logo en re
mayor. Después, un golpe por frase («PRÓXIMAMENTE OS DIREMOS», «FECHA Y
HORA», «DE NUESTRA INAUGURACIÓN») y una fanfarria que sube hasta el cierre con
«ATENTOS».

La orquesta y la mezcla son las de audio/orquesta.py. A 30 fps un pulso son
15 fotogramas y un compás 60, y cada golpe cae en el mismo fotograma que su
corte en src/aviso/.

    python3 audio/banda_sonora_aviso.py   # escribe public/audio/banda-sonora-aviso.wav
"""

from pathlib import Path

from orquesta import (
    Mezcla,
    acorde,
    bloque,
    bombo,
    boom,
    braam,
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

SALIDA = Path(__file__).resolve().parent.parent / "public" / "audio" / "banda-sonora-aviso.wav"

# (desde, hasta, raíz MIDI grave, mayor/menor)
ACORDES = [
    (0.0, 3.0, 38, "m"),  # Dm   «HEMOS ESTADO TRABAJANDO MUCHO» y el montaje
    (3.0, 4.0, 46, "M"),  # Bb
    (4.0, 5.0, 43, "m"),  # Gm
    (5.0, 8.0, 45, "M"),  # A    hasta «PERO YA OS PODEMOS DECIR...»
    (8.0, 10.0, 38, "M"),  # D    el logo
    (10.0, 11.0, 46, "M"),  # Bb   «PRÓXIMAMENTE OS DIREMOS»
    (11.0, 12.0, 48, "M"),  # C    «FECHA Y HORA»
    (12.0, 16.0, 38, "M"),  # D    «DE NUESTRA INAUGURACIÓN» y el cierre
]

m = Mezcla(16.0, ACORDES)
orquesta, percusion, sfx, post = m.orquesta, m.percusion, m.sfx, m.post


def re_mayor(at, dur, gain=1.0):
    """El acorde de re mayor de toda la orquesta, como el final del teaser."""
    bloque([26], tuba, 3, dur, at, 0.5 * gain, pan=0.3)
    bloque([38, 45], trombon, 3, dur, at, 0.4 * gain, pan=0.15)
    bloque([50, 54, 57, 62], trompa, 4, dur, at, 0.3 * gain, pan=-0.2)
    bloque([38, 50], cello_sus, 3, dur, at, 0.42 * gain, pan=0.3, send=0.45)
    bloque([66, 69, 74], violin_sus, 2, dur, at, 0.3 * gain, pan=-0.3, send=0.5)


# 1 · «HEMOS ESTADO» (0 s) y «TRABAJANDO MUCHO» (1 s, fotograma 30)
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

# 2 · El montaje del trabajo (2–6 s): un plano por pulso, ostinato y taikos
stab(2.0, 1.0)
ostinato(2.0, 6.0, 0.25, [0, 0, 12, 0, 7, 0, 12, 7], cello_spic, 0, 1, 0.42, 0.3)
ostinato(4.0, 6.0, 0.25, [0, 0, 12, 0, 7, 0, 12, 7], viola_spic, 12, 1, 0.3, 0.05)
tambores(2.0, 6.0)
for corte, direccion in ((75, -1), (120, 1), (150, -1)):
    put(sfx, whoosh(0.42, direccion), fr(corte) - 0.21, 0.45)
# Los trombones crecen por debajo con cada acorde
for t_compas in (3.0, 4.0, 5.0):
    raiz, _ = acorde(t_compas + 0.01)
    x = trombon.nota(raiz + 12, 2, 1.0, 0.2)
    put(orquesta, envolvente(x, [(0, 0.2), (1.0, 0.8), (1.2, 0.0)]), t_compas, 0.28, 0.15, 0.3)

# 3 · «PERO YA» (6 s) y «OS PODEMOS DECIR...» (6,5 s): todo sube hacia el logo
stab(6.0, 1.1)
put(percusion, yunque(3, 0), 6.0, 0.6, send=0.45)
put(percusion, timbal(45), 6.0, 0.7, send=0.3)
put(percusion, taiko(), 6.0, 0.8, send=0.25)
stab(6.5, 0.9)
put(percusion, taiko(), 6.5, 0.75, send=0.25)
put(percusion, yunque(2, 2), 6.5, 0.45, send=0.45)
ostinato(6.0, 7.55, 0.125, [0, 0, 12, 0], cello_spic, 0, 2, 0.36, 0.3)
ostinato(6.0, 7.55, 0.125, [0, 0, 12, 0], viola_spic, 12, 1, 0.26, 0.05)
trem_a = violin_trem.nota(69, 2, 1.6, 0.05)
put(orquesta, envolvente(trem_a, [(0, 0.15), (1.5, 1.0), (1.65, 0.0)]), 6.0, 0.4, -0.3, 0.3)
put(percusion, redoble_caja(1.55), 6.0, 0.5, send=0.25)
put(percusion, redoble_timbal(45, 1.55), 6.0, 0.45, send=0.3)
put(sfx, riser(1.55), 6.0, 0.25, send=0.1)
swell, desde = subida_plato(8.0, "Short")
put(post, swell, desde, 0.55)

# 4 · El logo (8 s): re mayor con todo
impacto(8.0)
put(sfx, chispas(2.0, 0.006), 8.02, 0.4)
re_mayor(8.0, 1.9)
put(percusion, timbal(50), 8.0, 0.8, send=0.3)
ostinato(8.0, 14.0, 0.125, [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 7, 7, 12, 7], cello_spic, 0, 2, 0.34, 0.3)
ostinato(8.0, 14.0, 0.125, [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 7, 7, 12, 7], viola_spic, 12, 2, 0.24, 0.05)
tambores(8.0, 14.0, intenso=True)

# 5 · Una frase por golpe: «PRÓXIMAMENTE OS DIREMOS» (10 s), «FECHA Y HORA»
# (11 s) y «DE NUESTRA INAUGURACIÓN» (12 s)
braam(10.0, 0.9, 0.9)
put(percusion, yunque(2, 1), 10.0, 0.45, send=0.45)
braam(11.0, 0.9, 1.0)
put(percusion, yunque(3, 3), 11.0, 0.55, send=0.45)
put(percusion, plato("mf", 2.0), 11.0, 0.3, send=0.2)
re_mayor(12.0, 3.6, 0.9)
put(percusion, timbal(50), 12.0, 0.75, send=0.3)
put(percusion, plato("ff", 3.0), 12.0, 0.3, send=0.2)
# Fanfarria: trompas y violines suben por el acorde hasta el cierre
FANFARRIA = [(12.0, 57, 0.5), (12.5, 62, 0.5), (13.0, 66, 0.5), (13.5, 69, 0.5), (14.0, 62, 1.9)]
for t_n, midi, dur in FANFARRIA:
    put(orquesta, trompa.nota(midi, 4, dur, 0.18), t_n, 0.44, -0.15, 0.4)
    put(orquesta, violin_sus.nota(midi + 12, 2, dur, 0.18), t_n, 0.28, -0.35, 0.45)
put(percusion, redoble_timbal(45, 1.0), 13.0, 0.45, send=0.3)

# 6 · El cierre con «ATENTOS» (14 s)
put(percusion, taiko(), 14.0, 0.85, send=0.3)
put(percusion, bombo(7), 14.0, 0.7, send=0.2)
put(percusion, timbal(50), 14.0, 0.75, send=0.3)
put(percusion, yunque(2, 5), 14.0, 0.5, send=0.5)
put(percusion, plato("ff", 3.0), 14.0, 0.35, send=0.2)
put(sfx, boom(0.8, dur=2.5), 14.0, 0.6)

# Casi silencio justo antes del logo (fotograma 240 = 8 s)
m.exportar(SALIDA, huecos=[(7.55, 7.68, 7.97, 8.0)])
