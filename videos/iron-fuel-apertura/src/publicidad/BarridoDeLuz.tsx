import type React from "react";
import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type BarridoDeLuzProps = {
  readonly color: string;
  /** Inclinación de la franja de luz, en grados. */
  readonly angulo: number;
  readonly intensidad: number;
  readonly style?: React.CSSProperties;
};

/**
 * Una franja ancha de luz de color que cruza la imagen de lado a lado, como
 * las luces de neón de las tiendas al pasar la cámara. A diferencia de una
 * fuga de luz, el color es exactamente el que se le da.
 */
const BarridoDeLuzInner: React.FC<BarridoDeLuzProps> = ({
  color,
  angulo,
  intensidad,
  style,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const avance = interpolate(frame, [0, durationInFrames - 1], [-60, 160], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  const vivo = Math.sin(
    Math.PI * interpolate(frame, [0, durationInFrames - 1], [0, 1], clamp),
  );
  return (
    <Interactive.Div
      style={{
        position: "absolute",
        inset: 0,
        mixBlendMode: "screen",
        opacity: intensidad * vivo,
        background: `linear-gradient(${angulo}deg, transparent ${avance - 45}%, ${color} ${avance}%, transparent ${avance + 45}%)`,
        ...style,
      }}
    />
  );
};

const barridoSchema = {
  color: { type: "color", default: "#2f7bff", description: "Color" },
  angulo: {
    type: "number",
    hiddenFromList: false,
    min: 0,
    max: 360,
    step: 1,
    default: 110,
    description: "Inclinación",
  },
  intensidad: {
    type: "number",
    hiddenFromList: false,
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
    description: "Intensidad",
  },
} as const satisfies InteractivitySchema;

export const BarridoDeLuz = Interactive.withSchema({
  Component: BarridoDeLuzInner,
  componentName: "<BarridoDeLuz>",
  schema: barridoSchema,
  wrapInSequence: true,
});
