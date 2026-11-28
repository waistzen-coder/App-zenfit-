#!/usr/bin/env bash
# Comprueba los MP4 finales: duración = voz, sin fotogramas en negro, -14 LUFS y capturas clave.
#   bash tools/verificar.sh video-FINAL.mp4 video-SIN-SUBTITULOS.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
voz=$(ffprobe -v error -show_entries format=duration -of csv=p=0 assets/audio/voz.wav)
echo "Voz: ${voz} s"
for f in "$@"; do
  echo "== $f"
  ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact=p=0:nk=0 "$f" | sed 's/^/   /'
  negros=$(ffmpeg -hide_banner -nostats -i "$f" -vf blackdetect=d=0.05:pix_th=0.05 -an -f null - 2>&1 | grep -c black_start || true)
  echo "   tramos en negro: ${negros}"
  ffmpeg -hide_banner -nostats -i "$f" -af ebur128=peak=true -vn -f null - 2>&1 | grep -A12 "Summary" | grep -E "I:|Peak:" | sed 's/^/  /'
done
# capturas de 10 momentos clave del primero
mkdir -p renders/capturas
i=0
for t in 0.3 2.4 4.85 7.3 11.6 14.4 16.2 19.6 23.6 27.4; do
  ffmpeg -v error -y -ss "$t" -i "$1" -frames:v 1 -vf scale=360:-1 "renders/capturas/c$(printf %02d $i).png"
  i=$((i+1))
done
ffmpeg -v error -y -i renders/capturas/c%02d.png -vf tile=5x2 renders/capturas/hoja.png
echo "Capturas: renders/capturas/hoja.png"
