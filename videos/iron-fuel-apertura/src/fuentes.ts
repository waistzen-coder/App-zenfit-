import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Exo 2 negra y en cursiva es lo más parecido a la rotulación de la tienda.
// Los archivos son los de Google Fonts (el subconjunto latino, que ya trae
// las tildes y la ñ) guardados en public/, así el render no depende de la red.
const FAMILIA = "Exo 2";
// En CSS el nombre va entre comillas: «Exo 2» sin ellas no es válido (el «2»).
export const EXO = `"${FAMILIA}", sans-serif`;

loadFont({
  family: FAMILIA,
  url: staticFile("fuentes/exo2-italic.woff2"),
  style: "italic",
  weight: "100 900",
});

loadFont({
  family: FAMILIA,
  url: staticFile("fuentes/exo2-600-normal.woff2"),
  style: "normal",
  weight: "600",
});
