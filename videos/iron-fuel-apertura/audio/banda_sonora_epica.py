#!/usr/bin/env python3
"""Banda sonora épica (versión 2) del teaser de Iron Fuel Nutrition.

La orquesta es de verdad: muestras de la Versilian Studios Chamber
Orchestra 2 Community Edition (VSCO-2-CE, dominio público CC0). Cuerdas en
spiccato y trémolo, trompas, trombones y tuba, timbales, bombo de concierto,
gong, platos, tambores étnicos gigantes y un yunque. Encima va el diseño de
sonido sintetizado: graves, barridos, subidas y el zumbido de las luces.

Va a 120 BPM en re menor y acaba en re mayor. A 30 fps un pulso son 15
fotogramas y un compás 60, y cada golpe cae en el mismo fotograma que su
corte en src/epico/.

    python3 audio/banda_sonora_epica.py   # escribe public/audio/banda-sonora-epica.wav

Necesita numpy, scipy, ffmpeg y las muestras en audio/vsco/
(preparar-medios.sh las descarga).
"""

from pathlib import Path

import numpy as np

from orquesta import (
    Mezcla,
    acorde,
    arpegio,
    bloque,
    bombo,
    boom,
    braam,
    cello_spic,
    cello_sus,
    cello_trem,
    chispas,
    electrico,
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
    tt,
    tuba,
    viola_spic,
    violin_spic,
    violin_sus,
    violin_trem,
    whoosh,
    yunque,
)

SALIDA = Path(__file__).resolve().parent.parent / "public" / "audio" / "banda-sonora-epica.wav"

# (desde, hasta, raíz MIDI grave, mayor/menor)
ACORDES = [
    (4.0, 6.0, 38, "m"),  # Dm   «CADA ESTANTE»
    (6.0, 8.0, 46, "M"),  # Bb   «CADA LUZ»
    (8.0, 10.0, 41, "M"),  # F    «CADA DETALLE»
    (10.0, 11.0, 36, "M"),  # C    «PROTEÍNA · CREATINA»
    (11.0, 12.0, 45, "M"),  # A    «PRE-ENTRENO · Y MUCHO MÁS»
    (12.0, 14.0, 38, "m"),  # Dm   la tienda entera
    (14.0, 16.0, 45, "M"),  # A    cuenta atrás
    (16.0, 18.0, 38, "m"),  # Dm   el golpe de la fachada
    (18.0, 20.0, 46, "M"),  # Bb
    (20.0, 22.0, 43, "m"),  # Gm
    (22.0, 24.0, 45, "M"),  # A
    (24.0, 30.0, 38, "M"),  # D    el logo: final en mayor
]

m = Mezcla(30.0, ACORDES)
orquesta, percusion, sfx, post = m.orquesta, m.percusion, m.sfx, m.post

# ------------------------------------------------------------- partitura

# 1 · Gancho (0–2 s): «ALGO GRANDE» y «SE ESTÁ FORJANDO»
impacto(0.0)
bloque([26], tuba, 3, 1.4, 0.0, 0.5, pan=0.3)
bloque([38, 45], trombon, 3, 1.4, 0.0, 0.4, pan=0.15)
put(percusion, yunque(3, 2), fr(30), 0.75, send=0.55)
put(percusion, bombo(5), fr(30), 0.6, send=0.2)
put(percusion, taiko(), fr(30), 0.7, send=0.3)
put(sfx, chispas(1.2), fr(30) + 0.02, 0.45)
put(sfx, boom(0.6, dur=2.0, start_hz=80, tau=0.6), fr(30), 0.6)
# Trémolo grave de tensión que crece hasta que entra el ostinato
trem = cello_trem.nota(38, 2, 4.0, 0.3)
put(orquesta, envolvente(trem, [(0, 0.0), (0.6, 0.25), (3.6, 0.85), (4.3, 0.0)]), 0.3, 0.5, 0.3, 0.35)
trem_v = violin_trem.nota(57, 1, 2.2, 0.3)
put(orquesta, envolvente(trem_v, [(0, 0.0), (1.8, 0.6), (2.5, 0.0)]), 2.0, 0.32, -0.3, 0.4)

# 2 · Las luces (2–4 s): mismos parpadeos que src/marca.ts
PARPADEOS = [(60, 62), (65, 67), (70, 74), (78, 80), (83, 120)]
elec = electrico(2.0, [(a - 60, b - 60) for a, b in PARPADEOS])
elec *= np.interp(tt(2.0), [0, 1.0, 1.6, 2.0], [1, 1, 0.35, 0.2])
put(sfx, elec, 2.0, 0.4)
put(percusion, redoble_timbal(38, 1.0), 3.0, 0.6, send=0.3)
put(sfx, riser(1.0, 400, 7000), 3.0, 0.22)

# 3 · Montaje (4–12 s): ostinato de cuerdas, taikos y un golpe por texto
ostinato(4.0, 12.0, 0.25, [0, 0, 12, 0, 7, 0, 12, 7], cello_spic, 0, 1, 0.42, 0.3)
ostinato(8.0, 12.0, 0.25, [0, 0, 12, 0, 7, 0, 12, 7], viola_spic, 12, 1, 0.3, 0.05)
tambores(4.0, 10.0)
for t_texto, semitonos in ((4.0, 0), (6.0, 1), (8.0, 2)):
    put(percusion, yunque(3, semitonos), t_texto, 0.55, send=0.45)
    put(percusion, plato("mf", 2.0), t_texto, 0.22, send=0.2)
    stab(t_texto, 0.9)
# Los metales graves crecen por debajo a partir de «CADA DETALLE»
for t0, dur in ((8.0, 2.0), (10.0, 1.0), (11.0, 1.0)):
    raiz, _ = acorde(t0 + 0.01)
    x = trombon.nota(raiz + 12, 2, dur, 0.2)
    put(orquesta, envolvente(x, [(0, 0.2), (dur, 0.9), (dur + 0.2, 0.0)]), t0, 0.3, 0.15, 0.3)
# «PROTEÍNA · CREATINA · PRE-ENTRENO · Y MUCHO MÁS»: un golpe por palabra
for k, t_palabra in enumerate((10.0, 10.5, 11.0, 11.5)):
    put(percusion, taiko(), t_palabra, 0.85, send=0.25)
    put(percusion, bombo(6), t_palabra, 0.55, send=0.15)
    put(percusion, yunque(2, k), t_palabra, 0.4, send=0.45)
    stab(t_palabra, 1.0)
put(percusion, redoble_caja(0.5), 11.5, 0.35, send=0.2)
for corte, direccion in ((150, -1), (210, 1), (330, -1)):
    put(sfx, whoosh(0.42, direccion), fr(corte) - 0.21, 0.45)
put(sfx, whoosh(0.5, 1), fr(270) - 0.25, 0.32)

# 4 · La tienda entera (12–14 s) y cuenta atrás (14–16 s)
impacto(12.0, grande=False)
bloque([50, 53, 57], trompa, 3, 2.0, 12.0, 0.3, pan=-0.2, ataque=0.25)
bloque([38, 50], cello_sus, 3, 2.0, 12.0, 0.4, pan=0.3, send=0.4, ataque=0.3)
bloque([62, 69, 74], violin_sus, 2, 2.0, 12.0, 0.28, pan=-0.3, send=0.45, ataque=0.4)
bloque([26], tuba, 2, 2.0, 12.0, 0.4, pan=0.3)
ostinato(12.0, 14.0, 0.125, [0, 0, 12, 0], cello_spic, 0, 2, 0.36, 0.3)
ostinato(12.0, 14.0, 0.125, [0, 0, 12, 0], viola_spic, 12, 1, 0.26, 0.05)
put(percusion, timbal(38), 12.0, 0.7, send=0.3)
put(percusion, redoble_timbal(45, 1.5), 12.5, 0.4, send=0.3)
put(sfx, riser(3.5), 12.0, 0.22, send=0.1)
for i, frame in enumerate((420, 435, 450)):
    t_c = fr(frame)
    put(percusion, bombo(7), t_c, 0.85, send=0.2)
    put(percusion, taiko(), t_c, 0.85, send=0.3)
    put(percusion, timbal(45), t_c, 0.75, send=0.3)
    put(percusion, yunque(3, 2 * i), t_c, 0.6, send=0.45)
    stab(t_c, 1.2)
trem_a = violin_trem.nota(69, 2, 1.6, 0.05)
put(orquesta, envolvente(trem_a, [(0, 0.2), (1.5, 1.0), (1.65, 0.0)]), 14.0, 0.4, -0.3, 0.3)
put(percusion, redoble_caja(0.6), 15.0, 0.5, send=0.25)
swell, desde = subida_plato(16.0, "Median")
put(post, swell, desde, 0.55)

# 5 · El golpe de la fachada (16–24 s)
impacto(16.0)
for t_compas in (16.0, 18.0, 20.0, 22.0):
    braam(t_compas, 1.9, 1.1 if t_compas == 16.0 else 0.9)
    raiz, _ = acorde(t_compas + 0.01)
    put(percusion, timbal(raiz + 12 if raiz < 40 else raiz), t_compas, 0.7, send=0.3)
ostinato(16.0, 24.0, 0.125, [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 7, 7, 12, 7], cello_spic, 0, 2, 0.4, 0.3)
ostinato(16.0, 24.0, 0.125, [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 7, 7, 12, 7], viola_spic, 12, 2, 0.28, 0.05)
arpegio(16.0, 24.0, 0.125, violin_spic, 24, 2, 0.24, -0.3)
tambores(16.0, 22.0, intenso=True)
put(percusion, plato("ff", 3.0), 20.0, 0.35, send=0.2)
# Melodía heroica: trompas, y violines una octava por encima
MELODIA = [  # (segundo, nota MIDI, pulsos)
    (16.0, 57, 1), (16.5, 62, 2), (17.5, 60, 1),
    (18.0, 58, 2), (19.0, 57, 1), (19.5, 55, 1),
    (20.0, 55, 1), (20.5, 57, 1), (21.0, 58, 1), (21.5, 60, 1),
    (22.0, 57, 4),
]
for t_n, midi, pulsos in MELODIA:
    dur = pulsos * 0.5
    put(orquesta, trompa.nota(midi, 4, dur, 0.18), t_n, 0.42, -0.15, 0.4)
    put(orquesta, violin_sus.nota(midi + 12, 2, dur, 0.18), t_n, 0.26, -0.35, 0.45)
# Último compás: los tambores se quedan en medio tiempo y todo sube hacia el logo
for t_b in (22.0, 23.0):
    put(percusion, taiko(), t_b, 0.85, send=0.25)
    put(percusion, bombo(7), t_b, 0.6, send=0.15)
put(percusion, redoble_caja(1.0), 23.0, 0.55, send=0.25)
put(percusion, redoble_timbal(45, 1.0), 23.0, 0.55, send=0.3)
swell2, desde2 = subida_plato(24.0, "Short")
put(post, swell2, desde2, 0.5)
for corte, direccion in ((570, 1), (630, -1), (675, 1)):
    put(sfx, whoosh(0.42, direccion), fr(corte) - 0.21, 0.4)
    put(percusion, yunque(2, 3), fr(corte), 0.3, send=0.4)

# 6 · El logo (24–30 s): re mayor triunfal
impacto(24.0)
put(sfx, chispas(2.0, 0.006), 24.02, 0.4)
bloque([26], tuba, 3, 4.5, 24.0, 0.5, pan=0.3)
bloque([38, 45], trombon, 3, 4.5, 24.0, 0.4, pan=0.15)
bloque([50, 54, 57, 62], trompa, 4, 4.5, 24.0, 0.3, pan=-0.2)
bloque([38, 50], cello_sus, 3, 4.5, 24.0, 0.42, pan=0.3, send=0.45)
bloque([66, 69, 74], violin_sus, 2, 4.5, 24.0, 0.3, pan=-0.3, send=0.5)
put(percusion, timbal(50), 24.0, 0.8, send=0.3)
put(percusion, redoble_timbal(38, 4.0), 24.6, 0.25, send=0.3)
for t_g, semitonos in ((fr(765), 0), (fr(795), 2)):
    put(percusion, taiko(), t_g, 0.75, send=0.35)
    put(percusion, timbal(50), t_g, 0.55, send=0.35)
    put(percusion, yunque(2, semitonos), t_g, 0.45, send=0.5)

# Casi silencio justo antes del golpe de la fachada (fotograma 480 = 16 s)
m.exportar(SALIDA, huecos=[(15.55, 15.68, 15.97, 16.0)])
