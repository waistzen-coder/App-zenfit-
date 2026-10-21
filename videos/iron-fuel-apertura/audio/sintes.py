#!/usr/bin/env python3
"""La parte electrónica de las músicas de Iron Fuel: batería, 808 y cencerro
sintetizados, y la mezcla de la batería con la orquesta de audio/orquesta.py.

La usan audio/musica_edit.py (el Edit de Instagram, phonk épico) y
audio/musica_anuncio.py (el anuncio de 15 s, electrónica deportiva, que
añade los acordes de sierras desafinadas de supersierra()).

Cada música crea su Mezcla de la orquesta y un Ritmo encima (los buses de
batería, bajo y sintetizador, y la envolvente de los bombos para la
compresión lateral); al final junta todo con mezclar() y lo escribe con
exportar().
"""

import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d
from scipy.signal import fftconvolve, lfilter

from orquesta import SR, Bus, decay, estereo, highpass, lowpass, phase, put, rng, sweep_lowpass, tt


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


def sierra(f, t, fase=0.0, tope=12_000):
    """Diente de sierra sin aliasing, hasta el armónico que pasa de `tope` Hz."""
    x = np.zeros_like(t)
    for k in range(1, max(2, int(tope / f)) + 1):
        x += (-1) ** (k + 1) * np.sin(k * (2 * np.pi * f * t + fase)) / k
    return x * 2 / np.pi


def supersierra(midis, dur, brillo=(5000, 1400), ataque=0.004, voces=7, desafine=0.2):
    """Acorde de sierras desafinadas abiertas en estéreo (el «supersaw» de la
    música electrónica). El filtro va de brillo[0] a brillo[1] Hz a lo largo
    de la nota: muy abierto y cerrándose rápido suena a golpe; quieto, a colchón."""
    t = tt(dur + 0.08)
    out = np.zeros((len(t), 2))
    for midi in midis:
        for v in range(voces):
            lado = (v - (voces - 1) / 2) / ((voces - 1) / 2)
            x = sierra(hz(midi + lado * desafine), t, rng.uniform(0, 2 * np.pi), tope=brillo[0] * 1.6)
            out += estereo(x, 0.75 * lado)
    corte = brillo[0] * (brillo[1] / brillo[0]) ** np.clip(t / dur, 0, 1)
    out = np.stack([sweep_lowpass(out[:, k], corte) for k in (0, 1)], axis=1)
    env = np.minimum(1, t / ataque) * np.interp(t, [0, dur, dur + 0.08], [1, 1, 0])
    out *= env[:, None]
    return out / (np.abs(out).max() or 1.0)


# ------------------------------------------------------------- buses y mezcla


class Ritmo:
    """Los buses electrónicos sobre una Mezcla de la orquesta."""

    def __init__(self, mezcla):
        self.m = mezcla
        self.bateria = Bus(mezcla.n, mezcla.rev)
        self.bajo = Bus(mezcla.n, mezcla.rev)
        # El cencerro del Edit o los acordes de sintetizador del anuncio.
        self.sinte = Bus(mezcla.n, mezcla.rev)
        # Envolvente de los bombos: aparta el resto en cada golpe.
        self.bombeo = np.zeros(mezcla.n)

    def bombo(self, at, gain=0.8, send=0.0):
        put(self.bateria, bombo_phonk(), at, gain, send=send)
        i = int(at * SR)
        n = min(int(0.35 * SR), self.m.n - i)
        if n > 0:
            self.bombeo[i : i + n] = np.maximum(self.bombeo[i : i + n], gain * decay(tt(n / SR), 0.11)[:n])

    def charles(self, at, gain, pan=0.15, abierto=False):
        x = CHARLES_ABIERTO if abierto else CHARLES[rng.integers(0, 4)]
        put(self.bateria, x, at, gain, pan)


def mezclar(m, r):
    """Reverberación y compresión lateral: todo menos el bus post."""
    n = m.n
    ir_t = tt(2.6)
    ir = rng.standard_normal((len(ir_t), 2)) * decay(ir_t, 2.2 / 6.9)[:, None]
    ir = lowpass(ir, 6500)
    pre = int(0.015 * SR)
    ir[:pre] *= np.linspace(0, 1, pre)[:, None]
    ir /= np.sqrt((ir**2).sum(axis=0))
    wet = np.stack([fftconvolve(m.rev.x[:, k], ir[:, k])[:n] for k in (0, 1)], axis=1)

    # La orquesta se aparta en los golpes de percusión grande y todo lo
    # melódico «respira» con el bombo, como en el phonk.
    pico = maximum_filter1d(np.abs(m.percusion.x).max(axis=1), size=int(0.02 * SR))
    a = 1 - np.exp(-1 / (0.12 * SR))
    seguidor = lfilter([a], [1, a - 1], pico)
    seguidor = np.clip(seguidor / np.percentile(seguidor, 99.5), 0, 1)
    respiro = np.clip(r.bombeo / 0.8, 0, 1)
    duck_orquesta = (1 - 0.35 * seguidor - 0.3 * respiro)[:, None]
    duck_respiro = (1 - 0.45 * respiro)[:, None]

    return (
        m.orquesta.x * duck_orquesta
        + m.percusion.x
        + m.sfx.x * 0.9
        + r.bateria.x
        + r.bajo.x * duck_respiro**0.5
        + r.sinte.x * duck_respiro
        + wet * 0.45
    )


# Menos subgrave y más medios y agudos: en el altavoz del móvil el subgrave
# no se oye y solo se come el margen.
ECUALIZACION = "bass=g=-3.5:f=60,treble=g=2.5:f=1500"


def exportar(mix, duracion, salida, fundido=1.6):
    """Saturación suave, fundido final, ecualización y -14 LUFS."""
    t_all = np.arange(len(mix)) / SR
    mix = highpass(mix, 28)
    mix = mix / np.abs(mix).max() * 0.92
    mix = np.tanh(1.6 * mix) / np.tanh(1.6)
    mix *= np.interp(t_all, [0, duracion - fundido, duracion], [1, 1, 0])[:, None]

    salida.parent.mkdir(parents=True, exist_ok=True)
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
            ["ffmpeg", "-v", "error", "-y", "-i", str(crudo), "-af", filtro, "-ar", str(SR), "-c:a", "pcm_s16le", str(salida)],
            check=True,
        )
    print(f"{salida} ({duracion:.0f} s)")
