#!/usr/bin/env bash
# Crea la carpeta de un episodio de «Mitos del gimnasio»: bash comun/mitos/nuevo.sh 3
set -euo pipefail
cd "$(dirname "$0")/../.."
N=$1; D=mitos-$N
mkdir -p $D/tools $D/assets/audio $D/compositions
for f in package.json hyperframes.json CLAUDE.md AGENTS.md .gitignore; do cp --update=none ironfuel-9/$f $D/ 2>/dev/null || true; done
printf '{\n  "id": "mitos-%s",\n  "name": "mitos-%s"\n}\n' $N $N > $D/meta.json
for a in sfx music icons brand; do mkdir -p $D/assets/$a; cp -r --update=none ironfuel-9/assets/$a/. $D/assets/$a/; done
cp --update=none ironfuel-9/assets/CREDITOS.md $D/assets/ 2>/dev/null || true
cp ironfuel-puerta/tools/tiempos.mjs ironfuel-puerta/tools/alinear.py ironfuel-puerta/tools/verificar.sh $D/tools/
cp comun/mitos/mezclar.py $D/tools/
[ -e $D/tools/node ] || ln -s ../../ironfuel-9/tools/node $D/tools/node
cp --update=none _guiones/mitos-$N.txt $D/guion.txt
cat > $D/tools/build.mjs <<'EOT'
// Episodio de «Mitos del gimnasio». Los datos están en tools/episodio.mjs; el mundo, en comun/mitos.
//   node tools/build.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { construir } from "../../comun/mitos/construir.mjs";
import EP from "./episodio.mjs";
await construir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), EP);
EOT
echo "creado $D"
