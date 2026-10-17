#!/usr/bin/env python3
"""Música del Edit de Instagram de Iron Fuel Nutrition: phonk épico de 22 s.

128,57 BPM, para que un pulso dure 14 fotogramas exactos y un compás 56 (los
cortes de src/edit/montaje.json caen en pulsos). La batería, el 808 y el
cencerro son sintetizados; los metales, las cuerdas y la percusión grande,
de la orquesta de audio/orquesta.py.

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

import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d
from scipy.signal import fftconvolve, lfilter

from orquesta import (
    SR,
    Bus,
    Mezcla,
    bloque,
    boom,
    braam,
    cello_spic,
    cello_sus,
    decay,
    envolvente,
    highpass,
    impacto,
    lowpass,
    ostinato,
    phase,
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
bateria = Bus(m.n, m.rev)
bajo = Bus(m.n, m.rev)
campana_bus = Bus(m.n, m.rev)
# Envolvente de los bombos: aparta el resto en cada golpe (compresión lateral).
bombeo = np.zeros(m.n)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def cuadrada(f, t):
    """Onda cuadrada sin aliasing: solo los armónicos impares audibles."""
    x = np.zeros_like(t)
    k = 1
    while k * f < 16_000:
        x += np.sin(2 * np.pi * k * f * t) / k
        k += 2
    return x * 4 / np.pi


# ------------------------------------------------------------- la batería


def bombo_phonk():
    t = tt(0.42)
    cuerpo = np.sin(phase(46 + 210 * decay(t, 0.025))) * decay(t, 0.17)
    clic = highpass(rng.standard_normal(len(t)), 2500) * decay(t, 0.003) * 0.6
    return np.tanh(1.8 * (cuerpo + clic))


def palmada():
    t = tt(0.45)
    env = np.zeros(len(t))
    for d in (0.0, 0.011, 0.023):
        env += np.where(t >= d, decay(np.maximum(t - d, 0), 0.007), 0)
    env += 0.55 * np.where(t >= 0.023, decay(np.maximum(t - 0.023, 0), 0.12), 0)
    ruido = highpass(lowpass(rng.standard_normal(len(t)), 6500), 950) * env
    cuerpo = np.sin(2 * np.pi * 185 * t) * decay(t, 0.045) * 0.4
    return np.tanh(1.5 * (ruido + cuerpo))


def caja():
    """Caja corta para los redobles."""
    t = tt(0.16)
    ruido = highpass(lowpass(rng.standard_normal(len(t)), 7000), 1200) * decay(t, 0.04)
    cuerpo = np.sin(2 * np.pi * 200 * t) * decay(t, 0.03) * 0.5
    return np.tanh(1.4 * (ruido + cuerpo))


FRECUENCIAS_CHARLES = (205.3, 304.4, 369.6, 522.7, 540.0, 800.0)


def _charles(abierto):
    t = tt(0.32 if abierto else 0.08)
    metal = sum(cuadrada(f, t) for f in FRECUENCIAS_CHARLES)
    x = highpass(metal, 7000, order=4) * 0.5 + highpass(rng.standard_normal(len(t)), 8000) * 0.5
    return x * decay(t, 0.1 if abierto else 0.014) * np.minimum(1, t / 0.0005)


CHARLES = [_charles(False) for _ in range(4)]
CHARLES_ABIERTO = _charles(True)


def bombo(at, gain=0.8, send=0.0):
    put(bateria, bombo_phonk(), at, gain, send=send)
    i = int(at * SR)
    n = min(int(0.35 * SR), m.n - i)
    if n > 0:
        bombeo[i : i + n] = np.maximum(bombeo[i : i + n], gain * decay(tt(n / SR), 0.11)[:n])


def charles(at, gain, pan=0.15, abierto=False):
    x = CHARLES_ABIERTO if abierto else CHARLES[rng.integers(0, 4)]
    put(bateria, x, at, gain, pan)


# ------------------------------------------------------------- el 808 y el cencerro


def ochocientos(midi, dur, desde=None):
    """El bajo 808, saturado para que tenga armónicos y se oiga en el móvil."""
    t = tt(dur + 0.05)
    f = np.full(len(t), hz(midi))
    if desde is not None:
        f += (hz(desde) - hz(midi)) * np.clip(1 - t / 0.08, 0, 1)
    f *= 1 + 0.9 * decay(t, 0.008)
    x = np.tanh(2.6 * (np.sin(phase(f)) + 0.12)) - np.tanh(2.6 * 0.12)
    env = np.minimum(1, t / 0.003) * decay(t, 1.4)
    return x * env * np.interp(t, [0, dur, dur + 0.05], [1, 1, 0])


def campana(midi, dur=0.42):
    """Cencerro de 808: dos cuadradas a 1:1,48, filtradas y saturadas."""
    f = hz(midi)
    t = tt(dur)
    x = 0.65 * cuadrada(f, t) + 0.5 * cuadrada(f * 1.4815, t)
    x = highpass(lowpass(x, 5200), f * 0.8)
    env = (0.55 * decay(t, 0.015) + 0.45 * decay(t, 0.15)) * np.minimum(1, t / 0.001)
    x = np.tanh(2.2 * x * env) * np.interp(t, [0, dur - 0.03, dur], [1, 1, 0])
    return x / np.abs(x).max()


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


# Menos subgrave y más medios y agudos: en el altavoz del móvil el subgrave
# no se oye y solo se come el margen.
ECUALIZACION = "bass=g=-3.5:f=60,treble=g=2.5:f=1500"


def exportar():
    n = m.n
    t_all = np.arange(n) / SR
    i_caida = int(CAIDA_1 * SR)

    # El ritmo de los dos primeros compases suena apagado y se va abriendo.
    corte = np.interp(t_all[:i_caida], [0, HUECO[0]], [420, 1100])
    for bus in (bateria, bajo, campana_bus):
        for canal in (0, 1):
            bus.x[:i_caida, canal] = sweep_lowpass(bus.x[:i_caida, canal], corte) * 0.6

    ir_t = tt(2.6)
    ir = rng.standard_normal((len(ir_t), 2)) * decay(ir_t, 2.2 / 6.9)[:, None]
    ir = lowpass(ir, 6500)
    pre = int(0.015 * SR)
    ir[:pre] *= np.linspace(0, 1, pre)[:, None]
    ir /= np.sqrt((ir**2).sum(axis=0))
    wet = np.stack([fftconvolve(m.rev.x[:, k], ir[:, k])[:n] for k in (0, 1)], axis=1)

    # La orquesta se aparta en los golpes de percusión grande y todo lo
    # melódico «respira» con el bombo, como en el phonk.
    pico = maximum_filter1d(np.abs(percusion.x).max(axis=1), size=int(0.02 * SR))
    a = 1 - np.exp(-1 / (0.12 * SR))
    seguidor = lfilter([a], [1, a - 1], pico)
    seguidor = np.clip(seguidor / np.percentile(seguidor, 99.5), 0, 1)
    respiro = np.clip(bombeo / 0.8, 0, 1)
    duck_orquesta = (1 - 0.35 * seguidor - 0.3 * respiro)[:, None]
    duck_respiro = (1 - 0.45 * respiro)[:, None]

    mix = (
        orquesta.x * duck_orquesta
        + percusion.x
        + sfx.x * 0.9
        + bateria.x
        + bajo.x * duck_respiro ** 0.5
        + campana_bus.x * duck_respiro
        + wet * 0.45
    )
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

    mix = highpass(mix, 28)
    mix = mix / np.abs(mix).max() * 0.92
    mix = np.tanh(1.6 * mix) / np.tanh(1.6)
    mix *= np.interp(t_all, [0, DURACION - 1.6, DURACION], [1, 1, 0])[:, None]

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        crudo = Path(tmp) / "crudo.wav"
        wavfile.write(crudo, SR, mix.astype(np.float32))
        medida = subprocess.run(
            ["ffmpeg", "-hide_banner", "-i", str(crudo), "-af", f"{ECUALIZACION},loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json", "-f", "null", "-"],
            capture_output=True,
            text=True,
            check=True,
        ).stderr
        mm = json.loads(medida[medida.rindex("{") :])
        filtro = (
            f"{ECUALIZACION},loudnorm=I=-14:TP=-1.2:LRA=11:linear=true"
            f":measured_I={mm['input_i']}:measured_TP={mm['input_tp']}"
            f":measured_LRA={mm['input_lra']}:measured_thresh={mm['input_thresh']}"
            f":offset={mm['target_offset']}"
        )
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", str(crudo), "-af", filtro, "-ar", str(SR), "-c:a", "pcm_s16le", str(SALIDA)],
            check=True,
        )
    print(f"{SALIDA} ({DURACION:.0f} s)")


exportar()
