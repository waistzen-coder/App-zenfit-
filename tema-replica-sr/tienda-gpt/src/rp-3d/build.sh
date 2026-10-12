#!/bin/sh
# Empaqueta el modelo 3D (Three.js solo con lo que se usa) en un único archivo para el tema.
#   cd <carpeta con node_modules de three y esbuild> && sh build.sh <ruta a tienda-gpt>
set -e
T="$1"
cp "$T/src/rp-3d/main.js" ./main.js && npx esbuild ./main.js --bundle --minify --format=iife --target=es2018 \
  --legal-comments=eof --outfile="$T/assets/rp-3d.js"
