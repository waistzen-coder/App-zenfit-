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
import { EXO } from "./fuentes";
import { AZUL, AZUL_RESPLANDOR } from "./marca";

type RotuloProps = {
  /** Texto en blanco. Admite saltos de línea. */
  readonly children: string;
  /** Texto en azul debajo del blanco; vacío para no ponerlo. */
  readonly destacado: string;
  readonly tamano: number;
  /** Altura del centro del texto, en píxeles. */
  readonly y: number;
  /** Si es false, el texto no se desvanece al acabar (para el cierre). */
  readonly salida?: boolean;
  readonly style?: React.CSSProperties;
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Texto que entra de golpe: llega grande y desenfocado, se clava con un
// temblor que se apaga en unos fotogramas y sale en los tres últimos.
const RotuloInner: React.FC<RotuloProps> = ({
  children,
  destacado,
  tamano,
  y,
  salida = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fin = durationInFrames - 1;
  const fuera = salida ? interpolate(frame, [fin - 3, fin], [0, 1], clamp) : 0;
  const temblor = interpolate(frame, [3, 12], [1, 0], clamp);
  const dx = (random(`rotulo-x-${frame}`) - 0.5) * 26 * temblor;
  const dy = (random(`rotulo-y-${frame}`) - 0.5) * 26 * temblor;

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
        opacity: interpolate(frame, [0, 1], [0.55, 1], clamp) * (1 - fuera),
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          fontFamily: EXO,
          fontWeight: 900,
          fontStyle: "italic",
          textTransform: "uppercase",
          fontSize: tamano,
          lineHeight: 0.95,
          letterSpacing: "-0.01em",
          textAlign: "center",
          whiteSpace: "pre-line",
          color: "#ffffff",
          textShadow: `0 0 30px ${AZUL_RESPLANDOR}, 0 10px 40px rgba(0, 0, 0, 0.85)`,
          scale: String(
            interpolate(frame, [0, 6], [1.8, 1], {
              ...clamp,
              easing: Easing.out(Easing.exp),
            }) *
              (1 + fuera * 0.08),
          ),
          translate: `${dx}px ${dy}px`,
          filter: `blur(${interpolate(frame, [0, 5], [16, 0], clamp) + fuera * 10}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "-30% -12%",
            zIndex: -1,
            background:
              "radial-gradient(closest-side, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0))",
          }}
        />
        {children}
        {destacado ? (
          <div
            style={{
              color: AZUL,
              textShadow:
                "0 0 36px rgba(58, 155, 255, 0.95), 0 10px 40px rgba(0, 0, 0, 0.85)",
            }}
          >
            {destacado}
          </div>
        ) : null}
      </div>
    </Interactive.Div>
  );
};

const rotuloSchema = {
  children: {
    type: "text-content",
    default: "",
    description: "Texto en blanco",
  },
  destacado: {
    type: "text-content",
    default: "",
    description: "Texto en azul",
  },
  tamano: {
    type: "number",
    hiddenFromList: false,
    min: 20,
    max: 700,
    step: 1,
    default: 160,
    description: "Tamaño",
  },
  y: {
    type: "number",
    hiddenFromList: false,
    min: 0,
    max: 1920,
    step: 1,
    default: 960,
    description: "Altura del centro",
  },
} as const satisfies InteractivitySchema;

export const Rotulo = Interactive.withSchema({
  Component: RotuloInner,
  componentName: "<Rotulo>",
  schema: rotuloSchema,
  wrapInSequence: true,
});
