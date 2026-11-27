"""Transcribe la voz montada frase a frase, con cada frase aislada.

    python3 tools/transcribir_frases.py

Whisper, con la voz entera, pega el inicio de cada frase al final de la anterior y
descoloca las palabras de dentro. Aquí cada frase (sacada de assets/audio/voz.wav con
los tiempos de tools/montaje.json) va separada por 1,5 s de silencio; se transcribe una
sola vez y cada palabra se devuelve a su sitio en la voz montada.
Escribe assets/audio/transcript.json (lo que lee tools/tiempos.mjs).
"""
import json, os, subprocess
import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 24000
HUECO = 1.5
CLI = os.path.expanduser("~/.claude/skills/hyperframes/scripts/plugin-cli.mjs")

raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(RAIZ, "assets/audio/voz.wav"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
voz = np.frombuffer(raw, dtype=np.float32)
M = json.load(open(os.path.join(RAIZ, "tools/montaje.json")))

trozos, mapa, t = [], [], HUECO
for f in M["frases"]:
    a, b = f["inicio"] - 0.03, f["fin"] + 0.03
    x = voz[int(a * SR):int(b * SR)]
    trozos += [np.zeros(int(HUECO * SR) if not trozos else int(HUECO * SR), np.float32), x]
    mapa.append({"n": f["n"], "desde": t, "hasta": t + len(x) / SR, "voz": a})
    t += len(x) / SR + HUECO
trozos.append(np.zeros(int(HUECO * SR), np.float32))
y = np.concatenate(trozos)
dst = os.path.join(RAIZ, "tools/sueltas/frases-sueltas.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "pcm_s16le", dst], input=y.tobytes(), check=True)

env = dict(os.environ, NODE_NO_WARNINGS="1", NODE_USE_ENV_PROXY="1", NODE_EXTRA_CA_CERTS="/root/.ccr/ca-bundle.crt")
r = subprocess.run(["node", CLI, "transcribe", dst, "--language", "es", "--model", "large-v3", "--json"], cwd=RAIZ, env=env, capture_output=True, text=True)
if r.returncode:
    raise SystemExit(r.stderr[-2000:])
words = json.load(open(os.path.join(RAIZ, "tools/sueltas/transcript.json")))
words = words if isinstance(words, list) else words["words"]

out = []
for w in words:
    c = (w["start"] + w["end"]) / 2
    m = min(mapa, key=lambda m: 0 if m["desde"] <= c <= m["hasta"] else min(abs(c - m["desde"]), abs(c - m["hasta"])))
    d = m["voz"] - m["desde"]
    s = min(max(w["start"], m["desde"]), m["hasta"]) + d
    e = min(max(w["end"], m["desde"]), m["hasta"]) + d
    out.append({"text": w["text"], "start": round(s, 3), "end": round(e, 3), "frase": m["n"]})
json.dump(out, open(os.path.join(RAIZ, "assets/audio/transcript.json"), "w"), ensure_ascii=False, indent=1)
for w in out:
    print(f'{w["frase"]:2d}  {w["start"]:6.2f}–{w["end"]:6.2f}  {w["text"]}')
