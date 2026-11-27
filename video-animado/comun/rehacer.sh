#!/usr/bin/env bash
# Regenera, comprueba y renderiza una parte: bash comun/rehacer.sh ironfuel
set -uo pipefail
cd "$(dirname "$0")/../$1"
export NODE_NO_WARNINGS=1
H=~/.claude/skills/hyperframes/scripts/plugin-cli.mjs
echo "== $1"
node tools/build.mjs | head -1
python3 tools/mezclar.py
timeout 900 node $H check --json > tools/check.json 2> tools/check.err
python3 -c "import json; d=json.load(open('tools/check.json')); print('check ok:', d['ok'], {s:d[s].get('errorCount') for s in ['lint','runtime','layout','contrast','craft','audio']})"
node tools/zonas.mjs | tail -1
timeout 300 node tools/sincronia.mjs | tail -1
mkdir -p renders
node $H render --quality delivery --workers auto -o renders/video-FINAL.mp4 > tools/render-final.log 2>&1
node $H render --quality delivery --workers auto --variables '{"subtitulos":false}' -o renders/video-SIN-SUBTITULOS.mp4 > tools/render-sin.log 2>&1
grep -hE "rendered in|Render failed" tools/render-final.log tools/render-sin.log
bash tools/verificar.sh renders/video-FINAL.mp4 renders/video-SIN-SUBTITULOS.mp4
cp renders/video-FINAL.mp4 video-FINAL.mp4 && cp renders/video-SIN-SUBTITULOS.mp4 video-SIN-SUBTITULOS.mp4
echo "== $1 terminado"
