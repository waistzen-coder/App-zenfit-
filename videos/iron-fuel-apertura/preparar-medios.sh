#!/usr/bin/env bash
# Prepara en public/ todo el material del vídeo a partir de los originales:
#
#   originales/          los vídeos y fotos tal como salieron del móvil
#   public/clips/        clips etalonados y reescalados, en VP9
#   public/fotos/        fotos etalonadas y el logo sacado del rótulo
#   public/grano/        texturas de grano de película
#   public/audio/        la banda sonora (audio/banda_sonora.py)
#
# Los clips van en VP9 y no en H.264 porque el Chromium de las sesiones en la
# nube no decodifica H.264: Remotion cae entonces a <OffthreadVideo>, que
# ignora los efectos (desenfoques de barrido, zoom radial, aberración).
#
# Tarda unos 15 minutos, casi todo en codificar VP9.
set -euo pipefail
cd "$(dirname "$0")"

O=originales
P=public
mkdir -p "$P/clips" "$P/fotos" "$P/grano" "$P/audio"

# Etalonaje frío: negros azulados, grises de acero y el azul del rótulo arriba.
GRADE="eq=contrast=1.24:saturation=0.7:brightness=-0.045:gamma=0.92,colorbalance=rs=-0.09:gs=-0.02:bs=0.13:rm=-0.05:gm=-0.01:bm=0.06:rh=0.0:bh=0.03,curves=master='0/0 0.15/0.07 0.5/0.47 0.85/0.88 1/0.97'"
VP9="-c:v libvpx-vp9 -crf 22 -b:v 0 -deadline good -cpu-used 5 -row-mt 1 -threads 2 -pix_fmt yuv420p -an"
# Los clips de 480×640 llegaron comprimidos: se limpian, se etalonan y se suben
# a 1440×1920 (3:4; Remotion recorta los lados al encajarlos en 9:16).
BAJA="hqdn3d=2:1.5:4:4,$GRADE,scale=1440:1920:flags=lanczos,unsharp=5:5:0.7:5:5:0,fps=30,format=yuv420p"

clip() {
  # shellcheck disable=SC2086
  ffmpeg -v error -y -i "$O/$1" -vf "$2" $VP9 -g "$3" "$P/clips/$4"
}

clip interior.mov "$BAJA" 15 interior-revelacion.webm &
clip estanteria-travelling.mov "$BAJA" 15 estanteria-travelling.webm &
clip estanteria-rincon.mov "$BAJA" 15 estanteria-rincon.webm &
clip montaje.mov "$BAJA" 15 montaje.webm &
wait
clip entrada.mov "$BAJA" 15 entrada-techo-led.webm &
clip nevera.mov "$GRADE,fps=30,format=yuv420p" 15 nevera-led.webm &
# La fachada se grabó a 60 fps y se queda así: a media velocidad sigue fluida.
clip fachada.mov "hqdn3d=1.5:1.5:3:3,$GRADE,scale=1080:1936:flags=lanczos,crop=1080:1920,unsharp=5:5:0.6:5:5:0,fps=60,format=yuv420p" 30 fachada-rotulo-60fps.webm &
wait

ffmpeg -v error -y -i "$O/fachada.jpg" -vf "$GRADE" -q:v 2 "$P/fotos/fachada.jpg"
ffmpeg -v error -y -i "$O/escalera.jpg" -vf "$GRADE" -q:v 2 "$P/fotos/escalera.jpg"

# El logo es el propio rótulo de la foto de la fachada: se recorta, se corrige
# la perspectiva con las cuatro esquinas del panel, se endereza 1,2°, se pasa
# el panel a negro, se tapa un trozo de la línea decorativa de la izquierda y
# después el negro se convierte en transparencia.
ffmpeg -v error -y -i "$O/fachada.jpg" -vf "crop=1100:500:250:400,perspective=200:51:720:48:161:310:688:360:interpolation=cubic,scale=2184:1200:flags=lanczos,rotate=-1.2*PI/180:fillcolor=black:ow=iw:oh=ih,crop=1840:1110:290:50,curves=all='0/0 0.36/0 0.62/0.52 1/1',unsharp=5:5:0.5:5:5:0,drawbox=x=0:y=0:w=420:h=660:color=black:t=fill,pad=iw+160:ih+160:80:80:black,curves=all='0/0 0.07/0 1/1'" -f rawvideo -pix_fmt rgb24 - |
  python3 -c '
import subprocess, sys
import numpy as np
h, w = 1270, 2000
a = np.frombuffer(sys.stdin.buffer.read(), np.uint8).reshape(h, w, 3).astype(np.float32) / 255
alfa = np.clip((a.max(axis=2) - 0.03) / 0.97, 0, 1)
rgb = np.where(alfa[..., None] > 0, a / np.maximum(alfa[..., None], 1e-6), 0)
rgba = (np.dstack([np.clip(rgb, 0, 1), alfa]) * 255 + 0.5).astype(np.uint8)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{w}x{h}", "-i", "-", "public/fotos/logo-rotulo.png"], input=rgba.tobytes(), check=True)
'

# Grano de película: seis texturas de ruido gris que el vídeo va alternando.
python3 -c '
import subprocess
import numpy as np
from scipy.ndimage import gaussian_filter
rng = np.random.default_rng(11)
for i in range(6):
    n = gaussian_filter(rng.standard_normal((960, 540)), 0.7)
    img = np.clip(n / n.std() * 38 + 128, 0, 255).astype(np.uint8)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", "540x960", "-i", "-", f"public/grano/grano-{i}.png"], input=img.tobytes(), check=True)
'

python3 audio/banda_sonora.py
