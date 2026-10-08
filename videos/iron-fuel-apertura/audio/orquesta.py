#!/usr/bin/env python3
"""La orquesta y la mesa de mezclas de las bandas sonoras de Iron Fuel.

Lo comparten audio/banda_sonora_epica.py (el teaser de 30 s) y
audio/banda_sonora_aviso.py (el aviso de la inauguración): las muestras de
la Versilian Studios Chamber Orchestra 2 Community Edition (VSCO-2-CE,
dominio público CC0) que preparar-medios.sh descarga en audio/vsco/, la
percusión, el diseño de sonido sintetizado, los arreglos (golpes de metales,
ostinatos, tambores) y la mezcla final a -14 LUFS.

Cada partitura crea una Mezcla con su duración y sus acordes, coloca los
sonidos con put() y los arreglos, y termina con Mezcla.exportar().
"""

import json
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

AQUI = Path(__file__).resolve().parent
VSCO = AQUI / "vsco"

SR = 48_000
FPS = 30
rng = np.random.default_rng(2027)


def fr(frame: float) -> float:
    """Fotograma del vídeo → segundos."""
    return frame / FPS

# ------------------------------------------------------------- utilidades


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def decay(t, tau):
    return np.exp(-t / tau)


def phase(hz):
    return 2 * np.pi * np.cumsum(hz) / SR


def _sos(kind, hz, order=2):
    return butter(order, hz, kind, fs=SR, output="sos")


def lowpass(x, hz, order=2):
    return sosfilt(_sos("lowpass", hz, order), x, axis=0)


def highpass(x, hz, order=2):
    return sosfilt(_sos("highpass", hz, order), x, axis=0)


def sweep_lowpass(x, cutoff, block=256):
    out = np.empty_like(x)
    zi = np.zeros((1, 2))
    for i in range(0, len(x), block):
        hz = float(np.clip(cutoff[min(i + block // 2, len(cutoff) - 1)], 20, SR * 0.45))
        out[i : i + block], zi = sosfilt(_sos("lowpass", hz), x[i : i + block], zi=zi)
    return out


def estereo(x, pan=0.0):
    if x.ndim == 2:
        if pan == 0:
            return x
        izq, der = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        return x * np.array([izq, der]) * np.sqrt(2)
    a = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1) * np.sqrt(2)


def envolvente(x, puntos):
    """Multiplica x por una envolvente dada como [(segundo, ganancia), …]."""
    t = np.arange(len(x)) / SR
    e = np.interp(t, [p[0] for p in puntos], [p[1] for p in puntos])
    return x * (e[:, None] if x.ndim == 2 else e)


class Bus:
    def __init__(self, n, envio=None):
        self.x = np.zeros((n, 2))
        # El bus de reverberación al que van los envíos de put(send=…).
        self.envio = envio

    def add(self, sig, at, gain=1.0, pan=0.0):
        sig = estereo(sig, pan)
        n = len(self.x)
        i = int(round(at * SR))
        if i < 0:
            sig, i = sig[-i:], 0
        if i >= n or len(sig) == 0:
            return
        j = min(n, i + len(sig))
        self.x[i:j] += sig[: j - i] * gain


def put(bus, sig, at, gain=1.0, pan=0.0, send=0.0):
    bus.add(sig, at, gain, pan)
    if send:
        bus.envio.add(sig, at, gain * send, pan)


class Mezcla:
    """Los buses de una banda sonora, sus acordes y la mezcla final.

    acordes: [(desde, hasta, raíz MIDI grave, "m" o "M"), …]. Los arreglos
    (braam, stab, ostinato…) tocan siempre en el acorde del momento.
    """

    actual: "Mezcla"

    def __init__(self, dur, acordes):
        self.dur = dur
        self.n = int(SR * dur)
        self.acordes = acordes
        self.rev = Bus(self.n)
        self.orquesta = Bus(self.n, self.rev)
        self.percusion = Bus(self.n, self.rev)
        self.sfx = Bus(self.n, self.rev)
        self.post = Bus(self.n, self.rev)
        Mezcla.actual = self

    def exportar(self, salida, huecos=()):
        """Reverberación, compresión lateral, huecos de silencio y -14 LUFS.

        huecos: [(empieza a bajar, ya en silencio, empieza a subir, vuelve), …]
        en segundos; dentro, la mezcla (salvo el bus post) queda al 10 %.
        """
        t_all = np.arange(self.n) / SR
        ir_t = tt(3.2)
        ir = rng.standard_normal((len(ir_t), 2)) * decay(ir_t, 2.6 / 6.9)[:, None]
        ir = lowpass(ir, 6000)
        pre = int(0.02 * SR)
        ir[:pre] *= np.linspace(0, 1, pre)[:, None]
        ir /= np.sqrt((ir**2).sum(axis=0))
        wet = np.stack([fftconvolve(self.rev.x[:, c], ir[:, c])[: self.n] for c in (0, 1)], axis=1)

        # Compresión lateral: la orquesta se aparta un poco en cada golpe de
        # percusión para que los tambores peguen en vez de quedar tapados.
        pico = maximum_filter1d(np.abs(self.percusion.x).max(axis=1), size=int(0.02 * SR))
        a = 1 - np.exp(-1 / (0.12 * SR))
        seguidor = lfilter([a], [1, a - 1], pico)
        seguidor = np.clip(seguidor / np.percentile(seguidor, 99.5), 0, 1)
        duck = (1 - 0.42 * seguidor)[:, None]

        mix = self.orquesta.x * duck + self.percusion.x * 1.0 + self.sfx.x * 0.9 + wet * 0.5 * (0.5 + 0.5 * duck)
        for a0, a1, b0, b1 in huecos:
            mix *= np.interp(t_all, [a0, a1, b0, b1], [1, 0.1, 0.1, 1])[:, None]
        mix += self.post.x
        mix = highpass(mix, 28)
        mix = mix / np.abs(mix).max() * 0.92
        mix = np.tanh(1.5 * mix) / np.tanh(1.5)
        mix *= np.interp(t_all, [0, self.dur - 1.2, self.dur], [1, 1, 0])[:, None]

        salida.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory() as tmp:
            crudo = Path(tmp) / "crudo.wav"
            wavfile.write(crudo, SR, mix.astype(np.float32))
            medida = subprocess.run(
                ["ffmpeg", "-hide_banner", "-i", str(crudo), "-af", "loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json", "-f", "null", "-"],
                capture_output=True,
                text=True,
                check=True,
            ).stderr
            m = json.loads(medida[medida.rindex("{") :])
            filtro = (
                "loudnorm=I=-14:TP=-1.2:LRA=11:linear=true"
                f":measured_I={m['input_i']}:measured_TP={m['input_tp']}"
                f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}"
                f":offset={m['target_offset']}"
            )
            subprocess.run(
                ["ffmpeg", "-v", "error", "-y", "-i", str(crudo), "-af", filtro, "-ar", str(SR), "-c:a", "pcm_s16le", str(salida)],
                check=True,
            )
        print(f"{salida} ({self.dur:.0f} s, {len(_cache)} muestras de orquesta)")

# ------------------------------------------------------------- muestras

_cache: dict[str, np.ndarray] = {}


def cargar(rel: str) -> np.ndarray:
    """Muestra en estéreo a 48 kHz, normalizada al pico y sin silencio inicial."""
    if rel not in _cache:
        raw = subprocess.run(
            ["ffmpeg", "-v", "error", "-i", str(VSCO / rel), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
            capture_output=True,
            check=True,
        ).stdout
        x = np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, 2)
        x = x / (np.abs(x).max() or 1.0)
        inicio = int(np.argmax(np.abs(x).max(axis=1) > 0.03))
        _cache[rel] = x[max(0, inicio - int(0.002 * SR)) :]
    return _cache[rel]


def transponer(x: np.ndarray, semitonos: float) -> np.ndarray:
    if abs(semitonos) < 1e-6:
        return x
    ratio = 2 ** (semitonos / 12)
    t = np.arange(int(len(x) / ratio)) * ratio
    idx = np.arange(len(x))
    return np.stack([np.interp(t, idx, x[:, c]) for c in (0, 1)], axis=1)


def recortar(x: np.ndarray, dur: float | None, release: float = 0.15) -> np.ndarray:
    if dur is None:
        return x
    n = int((dur + release) * SR)
    x = x[:n].copy()
    r = min(len(x), int(release * SR))
    if r:
        x[-r:] *= np.linspace(1, 0, r)[:, None]
    return x


NOTA = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
# VSCO nombra las notas con la convención de Yamaha (C3 = do central = MIDI 60).
PATRON = re.compile(r"_([A-G]#?)(\d)_[vV](\d)")


class Instrumento:
    def __init__(self, carpeta: str):
        self.muestras = []
        for p in sorted((VSCO / carpeta).glob("*.wav")):
            m = PATRON.search(p.name)
            if m:
                midi = 12 * (int(m.group(2)) + 2) + NOTA[m.group(1)]
                self.muestras.append((midi, int(m.group(3)), str(p.relative_to(VSCO))))
        if not self.muestras:
            raise SystemExit(f"No hay muestras en {VSCO / carpeta}: ejecuta preparar-medios.sh")
        self.dinamicas = sorted({d for _, d, _ in self.muestras})
        self.turno = 0

    def nota(self, midi: float, dinamica: int, dur: float | None = None, release: float = 0.15) -> np.ndarray:
        # Primero la nota más cercana (transponer poco suena mejor) y, entre
        # las muestras de esa nota, la dinámica más parecida.
        dist = min(abs(s[0] - midi) for s in self.muestras)
        cerca = [s for s in self.muestras if abs(s[0] - midi) == dist]
        d = min({s[1] for s in cerca}, key=lambda v: abs(v - dinamica))
        opciones = [s for s in cerca if s[1] == d]
        base, _, rel = opciones[self.turno % len(opciones)]
        self.turno += 1
        return recortar(transponer(cargar(rel), midi - base), dur, release)


cello_spic = Instrumento("Strings/Cello Section/spic")
viola_spic = Instrumento("Strings/Viola Section/spic")
violin_spic = Instrumento("Strings/Violin Section/Spic")
cello_trem = Instrumento("Strings/Cello Section/trem")
violin_trem = Instrumento("Strings/Violin Section/Trem")
cello_sus = Instrumento("Strings/Cello Section/susvib")
violin_sus = Instrumento("Strings/Violin Section/susVib")
trompa = Instrumento("Brass/F Horn/sus")
trombon = Instrumento("Brass/Tenor Trombone/sus")
tuba = Instrumento("Brass/Tuba/sus")

P = "Percussion/"
G = "VSCO 1 Percussion/drums/other/ethnic/giant/"


def golpe(rel, semitonos=0.0, dur=None, release=0.3):
    return recortar(transponer(cargar(rel), semitonos), dur, release)


def bombo(v=7):
    return golpe(f"{P}BDrumNewhit_v{v}_rr{rng.integers(1, 3)}_Sum.wav", dur=3.0, release=1.0)


def taiko(fuerte=True):
    if fuerte:
        return golpe(f"{G}mallet/EthnicLargeMallet_hit_ff_{rng.integers(1, 3)}.wav")
    return golpe(f"{G}mallet/EthnicLargeMallet_hit_f_1.wav")


def palos(din="f"):
    archivos = {
        "fff": ["EthnicLargeSticks_hit_fff_1.wav"],
        "f": ["EthnicLargeSticks_hit_f_1.wav", "EthnicLargeSticks_hit_f_2.wav"],
        "mf": ["EthnicLargeSticks_hit_mf_1.wav", "EthnicLargeSticks_hit_mf_2.wav"],
        "p": ["EthnicLargeSticks_hit_p_1.wav"],
    }[din]
    return golpe(f"{G}sticks/{archivos[rng.integers(0, len(archivos))]}")


def aro():
    return golpe(f"{G}EthnicLargeStick_rimshot_{rng.integers(1, 4)}.wav")


def yunque(v=3, semitonos=0.0):
    return golpe(f"{P}Anvil_Hit1_v{v}_Sum.wav", semitonos)


def gong(dur=6.0):
    return golpe(f"{P}gongHit_fff.wav", dur=dur, release=2.5)


def plato(din="ff", dur=4.0):
    return golpe(f"{P}cymbal-crash1_{din}_rr{rng.integers(1, 3)}.wav", dur=dur, release=1.5)


# Los timbales de VSCO están afinados en F#2 (1), F#3 (2), G#3 (3), B3 (4) y
# G3 (5): se transportan a re o a la según el acorde.
TIMBAL = {1: 41.5, 2: 53.5, 3: 56.3, 4: 58.9, 5: 54.6}


def timbal(midi, v=4):
    n = min(TIMBAL, key=lambda k: abs(TIMBAL[k] - midi))
    v = 3 if n == 1 and v == 4 else v
    return golpe(f"{P}Timpani/Timpani{n}_Hit_v{v}_rr{rng.integers(1, 3)}_Sum.wav", midi - TIMBAL[n], dur=3.5, release=1.0)


def redoble_timbal(midi, dur):
    n = 1 if midi < 48 else 2
    x = golpe(f"{P}Timpani/Rolls/Timpani{n}_Roll_v5_rr1_Sum.wav", midi - TIMBAL[n], dur=dur, release=0.05)
    return envolvente(x, [(0, 0.15), (dur * 0.8, 0.8), (dur, 1.0)])


def redoble_caja(dur):
    x = golpe(f"{P}Snare2-rollNS_v5_rr1_Sum.wav", dur=dur, release=0.03)
    return envolvente(x, [(0, 0.1), (dur, 1.0)])


def subida_plato(pico_en, largo="Median"):
    """Crescendo de plato colocado para que el pico caiga en `pico_en`."""
    pico = {"Long": 7.19, "Median": 3.57, "Short": 1.43}[largo]
    x = golpe(f"{P}susCymb1-cresc-{largo}_v1.wav", dur=pico, release=0.05)
    return x, pico_en - pico


# ------------------------------------------------------------- síntesis


def boom(vel=1.0, dur=3.2, start_hz=70.0, end_hz=26.0, tau=1.1):
    t = tt(dur)
    hz = end_hz + (start_hz - end_hz) * decay(t, 0.3)
    sub = np.tanh(1.5 * np.sin(phase(hz))) * decay(t, tau) * np.minimum(1, t / 0.003)
    return sub * vel


def whoosh(dur=0.45, direccion=1):
    t = tt(dur)
    p = t / dur
    cutoff = 350 + 4500 * np.sin(np.pi * np.clip(p * 1.1, 0, 1)) ** 1.4
    ruido = rng.standard_normal(len(t))
    x = (sweep_lowpass(ruido, cutoff) - sweep_lowpass(ruido, cutoff * 0.25)) * np.sin(np.pi * p) ** 2
    a = (np.clip((2 * p - 1) * direccion, -1, 1) + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1) * np.sqrt(2)


def riser(dur, lo=200.0, hi=9000.0):
    t = tt(dur)
    p = t / dur
    cutoff = lo * (hi / lo) ** p
    out = np.zeros((len(t), 2))
    for c in (0, 1):
        ruido = rng.standard_normal(len(t))
        out[:, c] = sweep_lowpass(ruido, cutoff) - sweep_lowpass(ruido, cutoff * 0.3)
    return out * (p**2.4)[:, None]


def chispas(dur=1.2, densidad=0.004):
    """Chisporroteo de metal al rojo: clics agudos que se van apagando."""
    t = tt(dur)
    clics = (rng.random((len(t), 2)) < densidad * decay(t, dur / 3)[:, None]) * rng.uniform(0.3, 1, (len(t), 2))
    return lowpass(highpass(clics, 2500), 9000) * 1.2


def electrico(dur, encendidos):
    t = tt(dur)
    n = len(t)
    gate = np.zeros(n)
    for a, b in encendidos:
        gate[int(fr(a) * SR) : int(fr(b) * SR)] = 1
    gate = lowpass(gate, 300)
    zumbido = lowpass(sum(np.sin(2 * np.pi * 100 * k * t) / k for k in (1, 2, 3, 5, 7, 9, 11)), 2500) * 0.35
    chasquidos = lowpass(highpass(rng.standard_normal(n), 1500) * (rng.random(n) < 0.004), 6000)
    x = (zumbido + chasquidos) * gate
    clic = highpass(rng.standard_normal(600), 2000) * decay(tt(600 / SR), 0.002) * 1.5
    for a, _ in encendidos:
        i = int(fr(a) * SR)
        x[i : i + 600] += clic[: len(x[i : i + 600])]
    return x


# ------------------------------------------------------------- armonía


def acorde(t):
    for a, b, raiz, tipo in Mezcla.actual.acordes:
        if a <= t < b:
            return raiz, (0, 3, 7) if tipo == "m" else (0, 4, 7)
    return 38, (0, 3, 7)


def bloque(midis, instrumento, dinamica, dur, at, gain, pan=0.0, send=0.3, ataque=0.0):
    for m in midis:
        x = instrumento.nota(m, dinamica, dur, release=0.35)
        if ataque:
            x = envolvente(x, [(0, 0.0), (ataque, 1.0), (len(x) / SR, 1.0)])
        put(Mezcla.actual.orquesta, x, at, gain, pan, send)


def braam(at, dur=1.8, gain=1.0):
    """Metales graves en fortissimo: tuba, trombones y trompas en el acorde."""
    raiz, (_, tercera, quinta) = acorde(at + 0.01)
    bloque([raiz - 12], tuba, 3, dur, at, 0.55 * gain, pan=0.3)
    bloque([raiz, raiz + quinta], trombon, 3, dur, at, 0.42 * gain, pan=0.15)
    bloque([raiz + 12, raiz + 12 + tercera, raiz + 12 + quinta], trompa, 4, dur, at, 0.34 * gain, pan=-0.2)


def stab(at, gain=1.0):
    """Golpe corto de metales en el acorde (para los textos)."""
    raiz, (_, tercera, quinta) = acorde(at + 0.01)
    bloque([raiz, raiz + quinta], trombon, 3, 0.32, at, 0.38 * gain, pan=0.15)
    bloque([raiz + 12, raiz + 12 + tercera, raiz + 12 + quinta], trompa, 4, 0.32, at, 0.3 * gain, pan=-0.2)


def ostinato(desde, hasta, paso, patron, instrumento, octava, dinamica, gain, pan, send=0.25):
    t = desde
    k = 0
    while t < hasta - 1e-6:
        raiz, _ = acorde(t + 1e-3)
        acento = k % (len(patron) // 2) == 0
        x = instrumento.nota(raiz + octava + patron[k % len(patron)], dinamica + (1 if acento else 0), 0.28, 0.12)
        put(Mezcla.actual.orquesta, x, t, gain * (1.0 if acento else 0.78), pan, send)
        t += paso
        k += 1


def arpegio(desde, hasta, paso, instrumento, base, dinamica, gain, pan):
    t = desde
    k = 0
    while t < hasta - 1e-6:
        raiz, (_, tercera, quinta) = acorde(t + 1e-3)
        notas = [raiz + base, raiz + base + tercera, raiz + base + quinta, raiz + base + 12]
        x = instrumento.nota(notas[k % 4], dinamica, 0.22, 0.1)
        put(Mezcla.actual.orquesta, x, t, gain * (1.0 if k % 4 == 0 else 0.8), pan, 0.3)
        t += paso
        k += 1


def tambores(desde, hasta, intenso=False):
    """Patrón de taikos por compás; `intenso` dobla a corcheas para el clímax."""
    t = desde
    while t < hasta - 1e-6:
        put(Mezcla.actual.percusion, taiko(), t, 0.85, send=0.25)
        put(Mezcla.actual.percusion, bombo(6 if intenso else 5), t, 0.55, send=0.15)
        put(Mezcla.actual.percusion, palos("f"), t + 0.5, 0.5, -0.2, 0.2)
        put(Mezcla.actual.percusion, palos("mf"), t + 0.75, 0.4, 0.2, 0.2)
        put(Mezcla.actual.percusion, taiko(False), t + 1.0, 0.7, send=0.25)
        put(Mezcla.actual.percusion, palos("f"), t + 1.5, 0.5, -0.2, 0.2)
        put(Mezcla.actual.percusion, aro(), t + 1.5, 0.35 if intenso else 0.25, 0.3, 0.2)
        if intenso:
            put(Mezcla.actual.percusion, palos("mf"), t + 0.25, 0.35, 0.25, 0.2)
            put(Mezcla.actual.percusion, bombo(6), t + 1.0, 0.45, send=0.15)
            put(Mezcla.actual.percusion, palos("mf"), t + 1.25, 0.35, -0.25, 0.2)
            put(Mezcla.actual.percusion, palos("f"), t + 1.75, 0.45, 0.2, 0.2)
        t += 2.0


def impacto(at, grande=True):
    put(Mezcla.actual.percusion, bombo(7), at, 0.9, send=0.2)
    put(Mezcla.actual.percusion, bombo(7), at + 0.012, 0.6, send=0.2)
    put(Mezcla.actual.percusion, taiko(), at, 0.9, send=0.3)
    put(Mezcla.actual.sfx, boom(1.0 if grande else 0.7), at, 0.75)
    put(Mezcla.actual.percusion, plato("ff" if grande else "mf"), at, 0.45 if grande else 0.3, send=0.2)
    put(Mezcla.actual.percusion, yunque(3), at, 0.55, send=0.5)
    if grande:
        put(Mezcla.actual.percusion, gong(), at, 0.5, send=0.15)
        put(Mezcla.actual.sfx, chispas(1.4), at + 0.02, 0.35)
