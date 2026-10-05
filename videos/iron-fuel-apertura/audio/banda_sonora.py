#!/usr/bin/env python3
"""Banda sonora del teaser de apertura de Iron Fuel Nutrition.

Todo está sintetizado aquí, sin samples, así que no hay derechos de nadie
más. Va a 120 BPM en re menor: a 30 fps un pulso son 15 fotogramas y un
compás 60, y cada golpe cae en el mismo fotograma que su corte en el vídeo
(los números de fotograma son los de src/Teaser.tsx).

    python3 audio/banda_sonora.py      # escribe public/audio/banda-sonora.wav

Necesita numpy, scipy y ffmpeg.
"""

import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48_000
FPS = 30
DUR = 30.0
N = int(SR * DUR)
BAR = 2.0
SALIDA = Path(__file__).resolve().parent.parent / "public" / "audio" / "banda-sonora.wav"

rng = np.random.default_rng(2026)

# Notas (Hz)
BB1, C2, D2, F2 = 58.27, 65.41, 73.42, 87.31
D3, F3, A3 = 146.83, 174.61, 220.0


def fr(frame: float) -> float:
    """Fotograma del vídeo → segundos."""
    return frame / FPS


# ---------------------------------------------------------------- utilidades


def tt(dur: float) -> np.ndarray:
    return np.arange(int(dur * SR)) / SR


def decay(t: np.ndarray, tau: float) -> np.ndarray:
    return np.exp(-t / tau)


def phase(hz: np.ndarray) -> np.ndarray:
    return 2 * np.pi * np.cumsum(hz) / SR


def _sos(kind: str, hz, order: int = 2):
    return butter(order, hz, kind, fs=SR, output="sos")


def lowpass(x, hz, order=2):
    return sosfilt(_sos("lowpass", hz, order), x, axis=0)


def highpass(x, hz, order=2):
    return sosfilt(_sos("highpass", hz, order), x, axis=0)


def bandpass(x, lo, hi, order=2):
    return sosfilt(_sos("bandpass", [lo, hi], order), x, axis=0)


def sweep_lowpass(x: np.ndarray, cutoff: np.ndarray, block: int = 256) -> np.ndarray:
    """Paso bajo mono con la frecuencia de corte variando en el tiempo."""
    out = np.empty_like(x)
    zi = np.zeros((1, 2))
    for i in range(0, len(x), block):
        hz = float(np.clip(cutoff[min(i + block // 2, len(cutoff) - 1)], 20, SR * 0.45))
        out[i : i + block], zi = sosfilt(_sos("lowpass", hz), x[i : i + block], zi=zi)
    return out


def saw(hz: float, t: np.ndarray) -> np.ndarray:
    return 2 * ((hz * t + rng.uniform(0, 1)) % 1) - 1


class Bus:
    def __init__(self) -> None:
        self.x = np.zeros((N, 2))

    def add(self, sig: np.ndarray, at: float, gain: float = 1.0, pan: float = 0.0) -> None:
        if sig.ndim == 1:
            a = (pan + 1) * np.pi / 4
            sig = np.stack([sig * np.cos(a), sig * np.sin(a)], axis=1) * np.sqrt(2)
        i = int(round(at * SR))
        if i >= N:
            return
        j = min(N, i + len(sig))
        self.x[i:j] += sig[: j - i] * gain


drums, bass, music, pad_bus, sfx, rev = Bus(), Bus(), Bus(), Bus(), Bus(), Bus()
# Lo que suena dentro del silencio previo al golpe y no debe apagarse con él
post = Bus()
kick_times: list[float] = []


def put(bus: Bus, sig, at, gain=1.0, pan=0.0, send=0.0) -> None:
    bus.add(sig, at, gain, pan)
    if send:
        rev.add(sig, at, gain * send, pan)


# ------------------------------------------------------------- instrumentos


def kick(vel=1.0):
    t = tt(0.7)
    body = np.sin(phase(46 + 120 * decay(t, 0.03))) * decay(t, 0.24)
    click = highpass(rng.standard_normal(len(t)), 2500) * decay(t, 0.003) * 0.35
    return np.tanh(2.4 * (body + click)) * vel


def snare(vel=1.0):
    t = tt(0.6)
    n = len(t)
    noise = bandpass(rng.standard_normal(n), 900, 7500) * decay(t, 0.10)
    tone = np.sin(phase(np.full(n, 190.0))) * decay(t, 0.05)
    env = np.zeros(n)
    for k, d in enumerate((0.0, 0.010, 0.021)):
        i = int(d * SR)
        env[i:] += decay(t[: n - i], 0.011 if k < 2 else 0.05)
    clap = bandpass(rng.standard_normal(n), 1000, 4500) * env * 0.6
    return (noise * 0.9 + tone * 0.5 + clap) * vel


def hat(vel=1.0, abierto=False):
    t = tt(0.35 if abierto else 0.09)
    x = highpass(rng.standard_normal(len(t)), 7000, order=4)
    return x * decay(t, 0.11 if abierto else 0.017) * vel


def taiko(hz=88.0, vel=1.0):
    t = tt(1.5)
    body = np.sin(phase(hz * (1 + 0.6 * decay(t, 0.025)))) * decay(t, 0.38)
    skin = bandpass(rng.standard_normal(len(t)), 90, 1400) * decay(t, 0.045) * 0.7
    return np.tanh(1.7 * (body + skin)) * vel


def anvil(f0=520.0, vel=1.0, dur=2.6):
    """Martillo sobre yunque: modos inarmónicos de una barra de acero."""
    t = tt(dur)
    n = len(t)
    modos = (
        (1.0, 1.0, 1.2),
        (1.51, 0.35, 0.9),
        (2.76, 0.7, 0.75),
        (3.9, 0.28, 0.5),
        (5.40, 0.45, 0.42),
        (8.93, 0.3, 0.22),
        (13.34, 0.18, 0.13),
    )
    out = np.zeros((n, 2))
    for ratio, amp, tau in modos:
        hz = f0 * ratio
        if hz > SR * 0.42:
            continue
        for ch, detune in ((0, -0.0012), (1, 0.0012)):
            out[:, ch] += (
                amp * np.sin(2 * np.pi * hz * (1 + detune) * t + rng.uniform(0, 2 * np.pi)) * decay(t, tau)
            )
    golpe = bandpass(rng.standard_normal(n), 1800, 11000) * decay(t, 0.004) * 1.4
    cuerpo = np.sin(phase(65 + 110 * decay(t, 0.015))) * decay(t, 0.09) * 0.9
    out += (golpe + cuerpo)[:, None]
    return out * vel * 0.45


def boom(vel=1.0, dur=3.2, start_hz=78.0, end_hz=27.0, tau=1.0):
    t = tt(dur)
    hz = end_hz + (start_hz - end_hz) * decay(t, 0.33)
    sub = np.tanh(1.6 * np.sin(phase(hz))) * decay(t, tau) * np.minimum(1, t / 0.003)
    crack = lowpass(rng.standard_normal(len(t)), 2200) * decay(t, 0.16) * 0.55
    return (sub + crack) * vel


def crash(vel=1.0, dur=3.0):
    t = tt(dur)
    x = highpass(rng.standard_normal((len(t), 2)), 3500) * decay(t, 0.9)[:, None]
    return x * vel * 0.5


def reverse_crash(dur=1.0, vel=1.0):
    t = tt(dur)
    x = highpass(rng.standard_normal((len(t), 2)), 3000) * decay(t, 0.35)[:, None]
    return x[::-1] * vel


def braam(root=D2, vel=1.0, dur=3.4):
    """El «BRAAAM» de tráiler: sierras desafinadas, filtro que se abre y saturación."""
    t = tt(dur)
    n = len(t)
    out = np.zeros((n, 2))
    for hz in (root * 0.5, root, root * 1.5, root * 2.0):
        for ch in (0, 1):
            for cents in (-9, 0, 9):
                out[:, ch] += saw(hz * 2 ** ((cents + rng.uniform(-2, 2)) / 1200), t)
    out /= 12
    cutoff = 220 + 2600 * np.minimum(1, t / 0.06) * decay(t, 0.45) + 300 * decay(t, 2.0)
    for ch in (0, 1):
        out[:, ch] = sweep_lowpass(out[:, ch], cutoff)
    out = np.tanh(3.0 * out)
    amp = np.minimum(1, t / 0.035) * decay(np.maximum(t - 0.25, 0), 1.3)
    return out * amp[:, None] * vel


def pad(dur, notas=(D2, D3, F3, A3)):
    t = tt(dur)
    out = np.zeros((len(t), 2))
    for hz in notas:
        for ch in (0, 1):
            for cents in (-6, 6):
                out[:, ch] += saw(hz * 2 ** ((cents + rng.uniform(-1, 1)) / 1200), t)
    out = lowpass(out / (len(notas) * 2), 700)
    return out * (0.75 + 0.25 * np.sin(2 * np.pi * 0.25 * t))[:, None]


def bajo(root, compases=1):
    """Semicorcheas de bajo durante `compases` compases."""
    t = tt(BAR * compases)
    n = len(t)
    x = lowpass(0.5 * (saw(root * 2 ** (-5 / 1200), t) + saw(root * 2 ** (5 / 1200), t)), 900)
    x += 0.6 * np.sin(2 * np.pi * root * t)
    paso = int(0.125 * SR)
    seg = tt(0.125)
    gate = np.zeros(n)
    for k in range(16 * compases):
        acento = 1.0 if k % 4 == 0 else 0.72
        gate[k * paso : k * paso + len(seg)] = acento * np.minimum(1, seg / 0.004) * decay(seg, 0.075)
    return np.tanh(1.5 * x * gate)


def riser(dur, lo=250.0, hi=9000.0):
    t = tt(dur)
    n = len(t)
    p = t / dur
    cutoff = lo * (hi / lo) ** p
    out = np.zeros((n, 2))
    for ch in (0, 1):
        ruido = rng.standard_normal(n)
        out[:, ch] = sweep_lowpass(ruido, cutoff) - sweep_lowpass(ruido, cutoff * 0.3)
    tono = 0.22 * np.sin(phase(140 * 8**p)) + 0.12 * np.sin(phase(210 * 8**p))
    out += tono[:, None]
    return out * (p**2.4)[:, None]


def whoosh(dur=0.42, direccion=1):
    t = tt(dur)
    p = t / dur
    cutoff = 350 + 4200 * np.sin(np.pi * np.clip(p * 1.1, 0, 1)) ** 1.4
    ruido = rng.standard_normal(len(t))
    x = (sweep_lowpass(ruido, cutoff) - sweep_lowpass(ruido, cutoff * 0.25)) * np.sin(np.pi * p) ** 2
    a = (np.clip((2 * p - 1) * direccion, -1, 1) + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1) * np.sqrt(2)


def electrico(dur, encendidos):
    """Zumbido de fluorescente que sigue el parpadeo de las luces del vídeo."""
    t = tt(dur)
    n = len(t)
    gate = np.zeros(n)
    for a, b in encendidos:
        gate[int(fr(a) * SR) : int(fr(b) * SR)] = 1
    gate = lowpass(gate, 300)
    zumbido = lowpass(sum(np.sin(2 * np.pi * 100 * k * t) / k for k in (1, 2, 3, 5, 7, 9, 11)), 2500) * 0.35
    chispas = lowpass(highpass(rng.standard_normal(n), 1500) * (rng.random(n) < 0.004), 6000)
    x = (zumbido + chispas) * gate
    clic = highpass(rng.standard_normal(600), 2000) * decay(tt(600 / SR), 0.002) * 1.5
    for a, _ in encendidos:
        i = int(fr(a) * SR)
        x[i : i + 600] += clic[: len(x[i : i + 600])]
    return x


def golpe_grande(at, vel=1.0, anvil_hz=460.0, cola=1.0):
    put(sfx, boom(vel, dur=3.2 + cola, tau=1.0 * cola), at, 0.95, send=0.25)
    put(sfx, anvil(anvil_hz), at, 0.85 * vel, send=0.45)
    put(sfx, crash(0.6 * vel, dur=3.0 * cola), at, 0.5, send=0.2)


def tocar_kick(at, vel=1.0):
    put(drums, kick(vel), at, 0.9)
    kick_times.append(at)


def compas_de_bateria(inicio, intensidad=1):
    """Un compás: bombo, caja, charles y taiko. intensidad 1 = montaje, 2 = clímax."""
    for beat in range(4):
        tb = inicio + beat * 0.5
        if intensidad == 2 or beat in (0, 2):
            tocar_kick(tb, (1.0 if beat in (0, 2) else 0.8) * (0.8 if intensidad == 1 else 1))
        if beat in (1, 3):
            put(drums, snare(), tb, 0.42 if intensidad == 1 else 0.6, send=0.25)
        for corchea in range(2):
            abierto = intensidad == 2 and corchea == 1
            put(drums, hat(0.8 if corchea else 0.5, abierto), tb + corchea * 0.25, 0.17 if intensidad == 1 else 0.2, pan=0.25)
    put(drums, taiko(88), inicio, 0.45 if intensidad == 1 else 0.55, send=0.35)
    if intensidad == 2:
        tocar_kick(inicio + 1.375, 0.7)
        put(drums, taiko(110, 0.8), inicio + 1.25, 0.45, send=0.35)


# ---------------------------------------------------------------- partitura

# 1 · Gancho (fotogramas 0–119): «ALGO GRANDE» y «SE ESTÁ FORJANDO»
golpe_grande(fr(0))
put(sfx, boom(0.8, start_hz=70, tau=0.8), fr(30), 0.8, send=0.25)
put(sfx, anvil(560), fr(30), 0.85, send=0.45)

# Las luces se encienden (mismos parpadeos que <Encendido> en el vídeo)
PARPADEOS = [(60, 62), (65, 67), (70, 74), (78, 80), (83, 120)]
elec = electrico(2.0, [(a - 60, b - 60) for a, b in PARPADEOS])
elec *= np.interp(tt(2.0), [0, 1.0, 1.6, 2.0], [1, 1, 0.35, 0.2])
put(sfx, elec, fr(60), 0.45)
for k in range(8):
    put(drums, hat(0.5 + 0.06 * k), 2.0 + 0.25 * k, 0.2, pan=0.2)
put(sfx, riser(1.0, 400, 6000), 3.0, 0.3)

# Colchón de re menor hasta el silencio previo al golpe
colchon = pad(15.5)
colchon *= np.interp(tt(15.5), [0, 1.5, 15.2, 15.5], [0, 1, 1, 0])[:, None]
put(pad_bus, colchon, 0.0, 0.16, send=0.3)

# 2 · Montaje (120–359): un compás por frase, golpe de yunque en cada texto
for inicio, raiz, yunque in ((4.0, D2, 520), (6.0, BB1, 560), (8.0, F2, 600), (10.0, C2, 640)):
    put(bass, bajo(raiz), inicio, 0.36)
    compas_de_bateria(inicio)
    put(sfx, anvil(yunque, 0.8), inicio, 0.55, send=0.4)
# Barridos de cámara en los cortes de 150, 210 y 330; el de 270 es un zoom
for corte, direccion in ((150, -1), (210, 1), (330, -1)):
    put(sfx, whoosh(0.42, direccion), fr(corte) - 0.21, 0.5)
put(sfx, whoosh(0.5, 1), fr(270) - 0.25, 0.35)

# 3 · Revelación del interior (360–419) y cuenta atrás (420–479)
put(bass, bajo(D2), 12.0, 0.45)
for beat in range(4):
    tocar_kick(12.0 + beat * 0.5)
    if beat in (1, 3):
        put(drums, snare(), 12.0 + beat * 0.5, 0.55, send=0.25)
for k in range(16):
    put(drums, hat(0.4 + 0.03 * k), 12.0 + k * 0.125, 0.18, pan=0.25)
for k in range(4):
    put(drums, taiko(95 + 8 * k, 0.6 + 0.12 * k), 13.5 + k * 0.125, 0.55, send=0.35)
put(sfx, anvil(500), fr(360), 0.55, send=0.4)
put(sfx, anvil(580, 0.8), fr(375), 0.45, send=0.4)
put(sfx, riser(3.5), 12.0, 0.45, send=0.1)
for i, frame in enumerate((420, 435, 450)):
    put(sfx, anvil(560 + 90 * i), fr(frame), 0.8, send=0.45)
    put(sfx, boom(0.7, dur=1.2, start_hz=90, end_hz=40, tau=0.35), fr(frame), 0.7)
    put(drums, taiko(80 + 10 * i), fr(frame), 0.6, send=0.4)
put(post, reverse_crash(1.0), 15.0, 0.45)

# 4 · El golpe: la fachada (480–719)
golpe_grande(fr(480), vel=1.15, anvil_hz=440, cola=1.3)
put(music, braam(D2), fr(480), 0.6, send=0.2)
put(music, braam(BB1), fr(600), 0.5, send=0.2)
for inicio, raiz in ((16.0, D2), (18.0, BB1), (20.0, F2), (22.0, C2)):
    put(bass, bajo(raiz), inicio, 0.5)
    if inicio < 22.0:
        compas_de_bateria(inicio, intensidad=2)
# Último compás: media parte con redoble de caja hasta el logo
for beat in range(2):
    tocar_kick(22.0 + beat * 0.5)
put(drums, snare(), 22.5, 0.6, send=0.25)
for k in range(8):
    put(drums, snare(0.45 + 0.08 * k), 23.0 + k * 0.125, 0.5, send=0.3)
put(sfx, riser(1.0, 500, 8000), 23.0, 0.35)
put(sfx, whoosh(0.42, 1), fr(570) - 0.21, 0.45)
put(sfx, anvil(620, 0.7), fr(570), 0.5, send=0.4)
put(sfx, whoosh(0.42, -1), fr(630) - 0.21, 0.45)
put(sfx, anvil(680, 0.7), fr(630), 0.5, send=0.4)
put(sfx, whoosh(0.42, 1), fr(675) - 0.21, 0.4)

# 5 · Cierre con el logo (720–899)
golpe_grande(fr(720), vel=1.2, anvil_hz=400, cola=1.6)
put(music, braam(D2, dur=5.0), fr(720), 0.55, send=0.3)
put(drums, taiko(70), fr(765), 0.6, send=0.5)
put(sfx, anvil(600, 0.6), fr(765), 0.5, send=0.5)
put(drums, taiko(80), fr(795), 0.6, send=0.5)
put(sfx, anvil(700, 0.6), fr(795), 0.5, send=0.5)
colchon_final = pad(14.0)
colchon_final *= np.interp(tt(14.0), [0, 0.4, 11.0, 13.8, 14.0], [0, 1, 1, 0, 0])[:, None]
put(pad_bus, colchon_final, 16.0, 0.14, send=0.3)

# ---------------------------------------------------------------- mezcla

t_all = np.arange(N) / SR
duck = np.ones(N)
for tk in kick_times:
    i = int(tk * SR)
    seg = t_all[: min(N - i, int(0.4 * SR))]
    duck[i : i + len(seg)] = np.minimum(duck[i : i + len(seg)], 1 - 0.5 * decay(seg, 0.11))
duck = duck[:, None]

ir_t = tt(2.6)
ir = rng.standard_normal((len(ir_t), 2)) * decay(ir_t, 2.2 / 6.9)[:, None]
ir = lowpass(ir, 5500)
pre = int(0.012 * SR)
ir[:pre] *= np.linspace(0, 1, pre)[:, None]
ir /= np.sqrt((ir**2).sum(axis=0))
wet = np.stack([fftconvolve(rev.x[:, c], ir[:, c])[:N] for c in (0, 1)], axis=1)

mix = drums.x + (bass.x + music.x) * duck + pad_bus.x * (0.6 + 0.4 * duck) + sfx.x + wet * 0.7
# Casi silencio justo antes del golpe de la fachada (fotograma 480 = 16 s)
mix *= np.interp(t_all, [15.45, 15.6, 15.97, 16.0], [1, 0.12, 0.12, 1])[:, None]
mix += post.x
mix = highpass(mix, 30)
mix = mix / np.abs(mix).max() * 0.9
mix = np.tanh(1.6 * mix) / np.tanh(1.6)
mix *= np.interp(t_all, [0, DUR - 0.25, DUR], [1, 1, 0])[:, None]

SALIDA.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
    crudo = Path(tmp) / "crudo.wav"
    wavfile.write(crudo, SR, mix.astype(np.float32))
    # Normalización a -14 LUFS (lo que usan Instagram y TikTok), en dos pasadas.
    medida = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(crudo), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
        capture_output=True,
        text=True,
        check=True,
    ).stderr
    m = json.loads(medida[medida.rindex("{") :])
    filtro = (
        "loudnorm=I=-14:TP=-1.5:LRA=11:linear=true"
        f":measured_I={m['input_i']}:measured_TP={m['input_tp']}"
        f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}"
        f":offset={m['target_offset']}"
    )
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(crudo), "-af", filtro, "-ar", str(SR), "-c:a", "pcm_s16le", str(SALIDA)],
        check=True,
    )
print(f"{SALIDA} ({DUR:.0f} s, {len(kick_times)} bombos)")
