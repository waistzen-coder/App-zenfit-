#!/bin/sh
# Empaqueta el modelo 3D (Three.js solo con lo que se usa) en assets/lab-3d.js.
#   cd <carpeta con node_modules de three y esbuild> && sh <tema-lab>/src/lab-3d/build.sh <tema-lab>
set -e
T="$1"
cp "$T/src/lab-3d/main.js" ./main.js && npx esbuild ./main.js --bundle --minify --format=iife --target=es2018 \
  --legal-comments=eof --outfile="$T/assets/lab-3d.js"
