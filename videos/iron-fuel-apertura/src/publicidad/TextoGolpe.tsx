import type React from "react";
import {
  Easing,
  Interactive,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { EXO } from "../fuentes";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// El azul eléctrico de los textos, algo más claro que el de la marca para
// que se lea sobre las fotos oscuras.
export const AZUL_TEXTO = "#3fa9ff";

export type LineaGolpe = {
  readonly texto: string;
  readonly azul?: boolean;
  /** Tamaño máximo; se reduce si la línea no cabe con margen. */
  readonly tamano: number;
  /** Fotograma (del texto) en el que entra la línea. */
  readonly entra: number;
};

type TextoGolpeProps = {
  readonly lineas: readonly LineaGolpe[];
  /** Altura del borde de arriba del texto, en píxeles. */
  readonly y: number;
  /** Si es false, el texto no se va al acabar (para el cierre). */
  readonly salida?: boolean;
  readonly style?: React.CSSProperties;
};

// Lo que mide de ancho la Exo 2 negra cursiva, en «emes», por carácter.
const ANCHO_LETRA = 0.62;
const ANCHO_UTIL = 900;

/** Una línea que llega grande y desenfocada y se clava con un temblor. */
const Linea: React.FC<{ readonly linea: LineaGolpe }> = ({ linea }) => {
  const frame = useCurrentFrame() - linea.entra;
  const tamano = Math.min(
    linea.tamano,
    ANCHO_UTIL / (ANCHO_LETRA * linea.texto.length),
  );
  const temblor = interpolate(frame, [2, 10], [1, 0], clamp);
  const dx = (random(`golpe-x-${linea.texto}-${frame}`) - 0.5) * 18 * temblor;
  const dy = (random(`golpe-y-${linea.texto}-${frame}`) - 0.5) * 18 * temblor;
  if (frame < 0) {
    return null;
  }
  return (
    <div
      style={{
        fontFamily: EXO,
        fontWeight: 900,
        fontStyle: "italic",
        textTransform: "uppercase",
        fontSize: tamano,
        lineHeight: 1.02,
        letterSpacing: "0.005em",
        whiteSpace: "nowrap",
        color: linea.azul ? AZUL_TEXTO : "#ffffff",
        textShadow: linea.azul
          ? `0 0 28px rgba(58, 155, 255, 0.85), 0 8px 30px rgba(0, 0, 0, 0.9)`
          : `0 0 22px rgba(58, 155, 255, 0.45), 0 8px 30px rgba(0, 0, 0, 0.9)`,
        opacity: interpolate(frame, [0, 2], [0.4, 1], clamp),
        scale: String(
          interpolate(frame, [0, 6], [1.6, 1], {
            ...clamp,
            easing: Easing.out(Easing.exp),
          }),
        ),
        filter: `blur(${interpolate(frame, [0, 5], [12, 0], clamp)}px)`,
        translate: `${dx}px ${dy}px`,
      }}
    >
      {linea.texto}
    </div>
  );
};

/**
 * Los textos del anuncio, como los del vídeo de referencia: mayúsculas
 * gruesas en cursiva, una línea por golpe de música, en blanco y las
 * palabras destacadas en azul eléctrico. Detrás, una sombra suave para que
 * se lean sobre cualquier foto.
 */
const TextoGolpeInner: React.FC<TextoGolpeProps> = ({
  lineas,
  y,
  salida = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fin = durationInFrames - 1;
  const fuera = salida ? interpolate(frame, [fin - 4, fin], [0, 1], clamp) : 0;
  return (
    <Interactive.Div
      style={{
        position: "absolute",
        left: 0,
        width: "100%",
        top: y,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        rotate: "-3deg",
        opacity: 1 - fuera,
        scale: String(1 + 0.06 * fuera),
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "-22% -6%",
          zIndex: -1,
          background:
            "radial-gradient(closest-side, rgba(3, 5, 9, 0.55), rgba(3, 5, 9, 0))",
        }}
      />
      {lineas.map((l) => (
        <Linea key={l.texto} linea={l} />
      ))}
    </Interactive.Div>
  );
};

const textoSchema = {
  y: {
    type: "number",
    hiddenFromList: false,
    min: 0,
    max: 1920,
    step: 1,
    default: 960,
    description: "Altura de arriba del texto",
  },
} as const satisfies InteractivitySchema;

export const TextoGolpe = Interactive.withSchema({
  Component: TextoGolpeInner,
  componentName: "<TextoGolpe>",
  schema: textoSchema,
  wrapInSequence: true,
});
