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
import { AZUL } from "../marca";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const NARANJA = "#ff7424";

/**
 * - blanco: blanco con resplandor azul.
 * - azul: el azul de la marca, más claro, con resplandor blanco.
 * - naranja: naranja al rojo.
 *
 * Sin contorno: la Exo 2 es una fuente variable y sus letras se dibujan con
 * trazos que se solapan, así que -webkit-text-stroke pinta líneas por dentro.
 */
export type EstiloPalabra = "blanco" | "azul" | "naranja";

type PalabraProps = {
  readonly texto: string;
  /** Altura del centro de la palabra, en píxeles. */
  readonly y: number;
  readonly estilo: EstiloPalabra;
  readonly style?: React.CSSProperties;
};

// Una palabra de Edit: entra de golpe, separada en rojo y cian como una
// imagen mal enfocada que se junta en cinco fotogramas, se clava con un
// temblor y sale creciendo en los dos últimos. El tamaño se ajusta para que
// quepa en el ancho del vídeo.
const PalabraInner: React.FC<PalabraProps> = ({ texto, y, estilo, style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fin = durationInFrames - 1;
  const tamano = Math.min(190, 1500 / Math.max(4, texto.length));
  const entrada = interpolate(frame, [0, 5], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const salida = interpolate(frame, [fin - 2, fin], [0, 1], clamp);
  const temblor = interpolate(frame, [0, 9], [1, 0], clamp);
  const dx = (random(`palabra-x-${texto}-${frame}`) - 0.5) * 22 * temblor;
  const dy = (random(`palabra-y-${texto}-${frame}`) - 0.5) * 22 * temblor;
  const separacion = 22 * (1 - entrada) + 5;

  const color =
    estilo === "naranja" ? NARANJA : estilo === "azul" ? "#6cb8ff" : "#ffffff";
  const resplandor =
    estilo === "naranja"
      ? "rgba(255, 104, 26, 0.9)"
      : estilo === "azul"
        ? "rgba(255, 255, 255, 0.55)"
        : AZUL;

  return (
    <Interactive.Div
      style={{
        position: "absolute",
        left: 0,
        width: "100%",
        top: y,
        translate: "0px -50%",
        display: "flex",
        justifyContent: "center",
        opacity: interpolate(frame, [0, 1], [0.6, 1], clamp) * (1 - salida),
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: EXO,
          fontWeight: 900,
          fontStyle: "italic",
          textTransform: "uppercase",
          fontSize: tamano,
          lineHeight: 1,
          letterSpacing: `${0.02 + 0.2 * (1 - entrada)}em`,
          color,
          textShadow: [
            `${-separacion}px 0 0 rgba(255, 30, 70, ${0.75 * (1 - 0.6 * entrada)})`,
            `${separacion}px 0 0 rgba(0, 210, 255, ${0.75 * (1 - 0.6 * entrada)})`,
            `0 0 34px ${resplandor}`,
            "0 12px 40px rgba(0, 0, 0, 0.9)",
          ].join(", "),
          scale: String(
            interpolate(frame, [0, 5], [1.7, 1], {
              ...clamp,
              easing: Easing.out(Easing.back(1.6)),
            }) *
              (1 + 0.25 * salida),
          ),
          rotate: `${interpolate(frame, [0, 6], [-5, -2], clamp)}deg`,
          translate: `${dx}px ${dy}px`,
        }}
      >
        {texto}
      </div>
    </Interactive.Div>
  );
};

const palabraSchema = {
  texto: { type: "text-content", default: "FUERZA", description: "Palabra" },
  y: {
    type: "number",
    hiddenFromList: false,
    min: 0,
    max: 1920,
    step: 1,
    default: 1150,
    description: "Altura del centro",
  },
} as const satisfies InteractivitySchema;

export const Palabra = Interactive.withSchema({
  Component: PalabraInner,
  componentName: "<Palabra>",
  schema: palabraSchema,
  wrapInSequence: true,
});
