import type React from "react";
import {
  Easing,
  Interactive,
  interpolate,
  interpolateColors,
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
  /** El texto blanco como acero pulido, con un reflejo que lo recorre. */
  readonly metal?: boolean;
  /** El texto destacado, al rojo: sale blanco y se enfría hasta naranja. */
  readonly fundido?: boolean;
  readonly style?: React.CSSProperties;
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Acero cepillado: blanco arriba, una banda gris de reflejo en el centro y
// otra vez claro abajo.
const ACERO =
  "linear-gradient(180deg, #ffffff 0%, #f2f6fb 36%, #93a0b0 50%, #edf2f8 61%, #bcc6d2 100%)";

// Texto que entra de golpe: llega grande y desenfocado, se clava con un
// temblor que se apaga en unos fotogramas y sale en los tres últimos.
const RotuloInner: React.FC<RotuloProps> = ({
  children,
  destacado,
  tamano,
  y,
  salida = true,
  metal = false,
  fundido = false,
  style,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fin = durationInFrames - 1;
  const fuera = salida ? interpolate(frame, [fin - 3, fin], [0, 1], clamp) : 0;
  const temblor = interpolate(frame, [3, 12], [1, 0], clamp);
  const dx = (random(`rotulo-x-${frame}`) - 0.5) * 26 * temblor;
  const dy = (random(`rotulo-y-${frame}`) - 0.5) * 26 * temblor;

  // Con background-clip: text la sombra de texto se pintaría encima del
  // degradado, así que el metal lleva drop-shadow en vez de text-shadow.
  const reflejo = interpolate(frame, [3, 21], [125, -25], clamp);
  const estiloMetal: React.CSSProperties = {
    backgroundImage: `linear-gradient(100deg, rgba(255, 255, 255, 0) 44%, rgba(255, 255, 255, 0.95) 50%, rgba(255, 255, 255, 0) 56%), ${ACERO}`,
    backgroundSize: "300% 100%, 100% 100%",
    backgroundPosition: `${reflejo}% 0%, 0% 0%`,
    backgroundRepeat: "no-repeat",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
    textShadow: "none",
    filter: `drop-shadow(0 0 20px ${AZUL_RESPLANDOR}) drop-shadow(0 10px 26px rgba(0, 0, 0, 0.9))`,
  };

  // El metal fundido pasa del blanco al naranja en la mitad de lo que dura
  // el texto. Se queda en naranja: entre el naranja y el azul de la marca
  // cualquier mezcla sale rosa.
  const enfriado = interpolate(
    frame,
    [2, Math.max(8, fin * 0.5)],
    [0, 1],
    clamp,
  );
  const colorDestacado = fundido
    ? interpolateColors(
        enfriado,
        [0, 0.4, 1],
        ["#fffbe8", "#ffc061", "#ff7424"],
      )
    : AZUL;
  const resplandorDestacado = fundido
    ? interpolateColors(
        enfriado,
        [0, 1],
        ["rgba(255, 196, 110, 0.95)", "rgba(255, 104, 26, 0.95)"],
      )
    : "rgba(58, 155, 255, 0.95)";

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
        {metal && children ? (
          <div style={estiloMetal}>{children}</div>
        ) : (
          children
        )}
        {destacado ? (
          <div
            style={{
              color: colorDestacado,
              textShadow: fundido
                ? `0 0 36px ${resplandorDestacado}, 0 0 90px ${resplandorDestacado}, 0 10px 40px rgba(0, 0, 0, 0.85)`
                : `0 0 36px ${resplandorDestacado}, 0 10px 40px rgba(0, 0, 0, 0.85)`,
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
