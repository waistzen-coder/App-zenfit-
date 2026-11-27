// Episodio de «Mitos del gimnasio». Los datos están en tools/episodio.mjs; el mundo, en comun/mitos.
//   node tools/build.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { construir } from "../../comun/mitos/construir.mjs";
import EP from "./episodio.mjs";
await construir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), EP);
