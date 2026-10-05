/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Los efectos de @remotion/effects (destellos, aberración cromática…) usan
// WebGL2. Sin GPU (como en la sesión en la nube) hay que usar REMOTION_GL=swangle.
Config.setChromiumOpenGlRenderer(
  process.env.REMOTION_GL === "swangle" ? "swangle" : "angle",
);

// En la sesión en la nube no se puede descargar el Chrome Headless Shell de
// Remotion (remotion.media está bloqueado), así que se usa el de Playwright
// que ya viene instalado. En otra máquina basta con borrar esta línea.
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
