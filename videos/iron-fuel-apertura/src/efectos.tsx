import { glow } from "@remotion/effects/glow";
import { lightLeak } from "@remotion/effects/light-leak";
import { shine } from "@remotion/effects/shine";
import { zoomBlur } from "@remotion/effects/zoom-blur";
import type React from "react";
import {
  AbsoluteFill,
  CanvasImage,
  Easing,
  Img,
  Interactive,
  interpolate,
  Solid,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { AZUL } from "./marca";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ------------------------------------------------------------ Destello

type DestelloProps = {
  readonly intensidad: number;
  readonly color: string;
  readonly style?: React.CSSProperties;
};

/** Fogonazo de luz que se apaga en lo que dura. Para los golpes. */
const DestelloInner: React.FC<DestelloProps> = ({
  intensidad,
  color,
  style,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <Interactive.Div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: color,
        mixBlendMode: "screen",
        opacity: interpolate(frame, [0, durationInFrames], [intensidad, 0], {
          ...clamp,
          easing: Easing.out(Easing.quad),
        }),
        ...style,
      }}
    />
  );
};

const destelloSchema = {
  intensidad: {
    type: "number",
    hiddenFromList: false,
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.8,
    description: "Intensidad",
  },
  color: { type: "color", default: "#ffffff", description: "Color" },
} as const satisfies InteractivitySchema;

export const Destello = Interactive.withSchema({
  Component: DestelloInner,
  componentName: "<Destello>",
  schema: destelloSchema,
  wrapInSequence: true,
});

// ------------------------------------------------------------ Fuga de luz

type FugaDeLuzProps = {
  readonly semilla: number;
  /** 0 = naranja, 200 ≈ el azul de la marca. */
  readonly tono: number;
  readonly style?: React.CSSProperties;
};

const FugaDeLuzInner: React.FC<FugaDeLuzProps> = ({ semilla, tono, style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  return (
    <Solid
      width={width}
      height={height}
      effects={[
        lightLeak({
          seed: semilla,
          hueShift: tono,
          progress: interpolate(
            frame,
            [0, durationInFrames - 1],
            [0, 1],
            clamp,
          ),
        }),
      ]}
      style={{
        position: "absolute",
        inset: 0,
        mixBlendMode: "screen",
        ...style,
      }}
    />
  );
};

const fugaSchema = {
  semilla: {
    type: "number",
    hiddenFromList: false,
    min: 0,
    step: 1,
    default: 0,
    description: "Forma",
  },
  tono: {
    type: "number",
    hiddenFromList: false,
    min: 0,
    max: 360,
    step: 1,
    default: 200,
    description: "Tono",
  },
} as const satisfies InteractivitySchema;

export const FugaDeLuz = Interactive.withSchema({
  Component: FugaDeLuzInner,
  componentName: "<FugaDeLuz>",
  schema: fugaSchema,
  wrapInSequence: true,
});

// ------------------------------------------------------------ Línea de carga

type LineaDeCargaProps = {
  readonly color: string;
  readonly style?: React.CSSProperties;
};

/** Línea que crece desde el centro en el silencio previo al golpe. */
const LineaDeCargaInner: React.FC<LineaDeCargaProps> = ({ color, style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <Interactive.Div
      style={{
        position: "absolute",
        left: "50%",
        top: 960,
        height: 6,
        translate: "-50% -50%",
        borderRadius: 3,
        backgroundColor: color,
        boxShadow: `0 0 24px ${color}, 0 0 60px ${color}`,
        width: interpolate(frame, [0, durationInFrames - 1], [0, 1080], {
          ...clamp,
          easing: Easing.in(Easing.quad),
        }),
        ...style,
      }}
    />
  );
};

const lineaSchema = {
  color: { type: "color", default: AZUL, description: "Color" },
} as const satisfies InteractivitySchema;

export const LineaDeCarga = Interactive.withSchema({
  Component: LineaDeCargaInner,
  componentName: "<LineaDeCarga>",
  schema: lineaSchema,
  wrapInSequence: true,
});

// ------------------------------------------------------------ Logo

type LogoProps = {
  /** Altura del centro del logo, en píxeles. */
  readonly y: number;
  readonly ancho: number;
  readonly style?: React.CSSProperties;
};

// El logo es el propio rótulo de la fachada, enderezado, con el fondo del
// panel convertido en transparencia (la opacidad sale del brillo de cada píxel).
const LOGO = { archivo: "fotos/logo-rotulo.png", ancho: 2000, alto: 1270 };

const LogoInner: React.FC<LogoProps> = ({ y, ancho, style }) => {
  const frame = useCurrentFrame();
  const alto = (ancho * LOGO.alto) / LOGO.ancho;
  return (
    <CanvasImage
      src={staticFile(LOGO.archivo)}
      width={LOGO.ancho}
      height={LOGO.alto}
      fit="contain"
      effects={[
        zoomBlur({
          amount: interpolate(frame, [0, 10], [80, 0], clamp),
          disabled: frame >= 10,
        }),
        shine({
          progress: interpolate(frame, [16, 46], [0, 1], clamp),
          angle: 30,
        }),
        glow({ radius: 26, intensity: 0.7, threshold: 0.55, color: AZUL }),
      ]}
      style={{
        position: "absolute",
        left: (1080 - ancho) / 2,
        top: y - alto / 2,
        width: ancho,
        height: alto,
        opacity: interpolate(frame, [0, 3], [0, 1], clamp),
        scale: String(
          interpolate(frame, [0, 10], [1.4, 1], {
            ...clamp,
            easing: Easing.out(Easing.exp),
          }) * interpolate(frame, [10, 180], [1, 1.04], clamp),
        ),
        ...style,
      }}
    />
  );
};

const logoSchema = {
  y: {
    type: "number",
    hiddenFromList: false,
    min: 0,
    max: 1920,
    step: 1,
    default: 640,
    description: "Altura del centro",
  },
  ancho: {
    type: "number",
    hiddenFromList: false,
    min: 100,
    max: 1080,
    step: 1,
    default: 820,
    description: "Ancho",
  },
} as const satisfies InteractivitySchema;

export const Logo = Interactive.withSchema({
  Component: LogoInner,
  componentName: "<Logo>",
  schema: logoSchema,
  wrapInSequence: true,
});

// ------------------------------------------------------------ Líneas de la marca

type LineasDeMarcaProps = {
  readonly color: string;
  readonly style?: React.CSSProperties;
};

/** Las dos líneas en ángulo del rótulo, dibujándose a los lados del logo. */
const LineasDeMarcaInner: React.FC<LineasDeMarcaProps> = ({ color, style }) => {
  const frame = useCurrentFrame();
  const dibujo = interpolate(frame, [0, 20], [1, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const trazo = {
    fill: "none",
    stroke: color,
    strokeWidth: 9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    pathLength: 1,
    strokeDasharray: 1,
    strokeDashoffset: dibujo,
  } as const;
  return (
    <Interactive.Div
      style={{
        position: "absolute",
        inset: 0,
        filter: `drop-shadow(0 0 14px ${color})`,
        ...style,
      }}
    >
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <path d="M 20 700 L 120 700 L 300 400" {...trazo} />
        <path d="M 760 935 L 860 870 L 1060 870" {...trazo} />
      </svg>
    </Interactive.Div>
  );
};

const lineasSchema = {
  color: { type: "color", default: AZUL, description: "Color" },
} as const satisfies InteractivitySchema;

export const LineasDeMarca = Interactive.withSchema({
  Component: LineasDeMarcaInner,
  componentName: "<LineasDeMarca>",
  schema: lineasSchema,
  wrapInSequence: true,
});

// ------------------------------------------------------------ Capas fijas

/** Grano de película: seis texturas que se alternan en cada fotograma. */
export const Grano: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.1 }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Img
          key={i}
          src={staticFile(`grano/grano-${i}.png`)}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            opacity: frame % 6 === i ? 1 : 0,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

export const Vineta: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0, 0, 0, 0) 55%, rgba(0, 0, 0, 0.6) 100%)",
    }}
  />
);
