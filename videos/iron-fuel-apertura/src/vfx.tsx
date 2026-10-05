import { glow } from "@remotion/effects/glow";
import { shine } from "@remotion/effects/shine";
import { zoomBlur } from "@remotion/effects/zoom-blur";
import type React from "react";
import {
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  interpolateColors,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { AZUL } from "./marca";

// Efectos de la versión épica: chispas, brasas, destellos anamórficos,
// ondas expansivas y el logo forjado. Todo es determinista (random() con
// semilla), así que cada fotograma sale igual en cada render.

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const numero = (
  min: number,
  max: number,
  defecto: number,
  descripcion: string,
  step = 1,
) =>
  ({
    type: "number",
    hiddenFromList: false,
    min,
    max,
    step,
    default: defecto,
    description: descripcion,
  }) as const;

// Del blanco del metal recién golpeado al rojo que se apaga.
const CHISPA_COLORES = ["#ff3d0d", "#ff7a1a", "#ffb547", "#fff1c9"];

// ------------------------------------------------------------ Chispas

type ChispasProps = {
  readonly x: number;
  readonly y: number;
  readonly cantidad: number;
  readonly semilla: number;
  /** Velocidad inicial en píxeles por fotograma. */
  readonly fuerza: number;
  /**
   * Convierte el fotograma en el tiempo de la simulación, para que las
   * chispas vayan a cámara lenta a la vez que el plano.
   */
  readonly tiempo?: (frame: number) => number;
  readonly style?: React.CSSProperties;
};

/** Estallido de chispas de forja: salen en abanico, frenan y caen. */
const ChispasInner: React.FC<ChispasProps> = ({
  x,
  y,
  cantidad,
  semilla,
  fuerza,
  tiempo,
  style,
}) => {
  const fotograma = useCurrentFrame();
  const frame = tiempo ? tiempo(fotograma) : fotograma;
  const { durationInFrames } = useVideoConfig();
  const duracion = tiempo ? tiempo(durationInFrames) : durationInFrames;
  const trazos: React.ReactNode[] = [];
  const friccion = 0.93;
  const gravedad = 0.55;

  const posicion = (t: number, vx: number, vy: number) => {
    const k = (1 - Math.pow(friccion, t)) / (1 - friccion);
    return [x + vx * k, y + vy * k + 0.5 * gravedad * t * t] as const;
  };

  for (let i = 0; i < cantidad; i++) {
    const r = (clave: string) => random(`chispa-${semilla}-${i}-${clave}`);
    const vida = 10 + r("vida") * Math.max(1, duracion - 10);
    if (frame > vida) {
      continue;
    }
    const angulo = -Math.PI / 2 + (r("angulo") - 0.5) * Math.PI * 1.7;
    const velocidad = fuerza * (0.3 + r("velocidad") * 0.7);
    const vx = Math.cos(angulo) * velocidad;
    const vy = Math.sin(angulo) * velocidad;
    const [x1, y1] = posicion(frame, vx, vy);
    const [x0, y0] = posicion(Math.max(0, frame - 1.6), vx, vy);
    const resto = 1 - frame / vida;
    trazos.push(
      <line
        key={i}
        x1={x0}
        y1={y0}
        x2={x1}
        y2={y1}
        stroke={interpolateColors(resto, [0, 0.35, 0.7, 1], CHISPA_COLORES)}
        strokeWidth={1.2 + 3.2 * resto * (0.5 + r("grosor"))}
        strokeLinecap="round"
        opacity={Math.pow(resto, 0.5)}
      />,
    );
  }

  return (
    <Interactive.Div
      style={{
        position: "absolute",
        inset: 0,
        mixBlendMode: "screen",
        filter:
          "drop-shadow(0 0 5px rgba(255, 170, 70, 0.95)) drop-shadow(0 0 16px rgba(255, 90, 20, 0.6))",
        ...style,
      }}
    >
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        {trazos}
      </svg>
    </Interactive.Div>
  );
};

export const Chispas = Interactive.withSchema({
  Component: ChispasInner,
  componentName: "<Chispas>",
  schema: {
    x: numero(0, 1080, 540, "Origen X"),
    y: numero(0, 1920, 960, "Origen Y"),
    cantidad: numero(1, 400, 120, "Cantidad"),
    semilla: numero(0, 9999, 1, "Forma"),
    fuerza: numero(1, 120, 42, "Fuerza"),
  } as const satisfies InteractivitySchema,
  wrapInSequence: true,
});

// ------------------------------------------------------------ Brasas

type BrasasProps = {
  readonly cantidad: number;
  readonly semilla: number;
  readonly intensidad: number;
  readonly style?: React.CSSProperties;
};

/** Brasas que suben flotando, para los fondos negros. */
const BrasasInner: React.FC<BrasasProps> = ({
  cantidad,
  semilla,
  intensidad,
  style,
}) => {
  const frame = useCurrentFrame();
  const puntos: React.ReactNode[] = [];
  for (let i = 0; i < cantidad; i++) {
    const r = (clave: string) => random(`brasa-${semilla}-${i}-${clave}`);
    const velocidad = 1.2 + r("v") * 3.2;
    const recorrido = 2200;
    const y = 2050 - ((frame * velocidad + r("o") * recorrido) % recorrido);
    const x =
      r("x") * 1080 + Math.sin(frame * (0.02 + r("f") * 0.04) + r("p") * 6.3) * 26;
    const radio = 1.5 + r("r") * 3.5;
    const parpadeo = 0.35 + 0.65 * Math.abs(Math.sin(frame * (0.08 + r("b") * 0.2) + r("q") * 6.3));
    puntos.push(
      <circle
        key={i}
        cx={x}
        cy={y}
        r={radio}
        fill={CHISPA_COLORES[1 + Math.floor(r("c") * 3)]}
        opacity={parpadeo * intensidad}
      />,
    );
  }
  return (
    <Interactive.Div
      style={{
        position: "absolute",
        inset: 0,
        mixBlendMode: "screen",
        filter: "drop-shadow(0 0 6px rgba(255, 140, 40, 0.9))",
        ...style,
      }}
    >
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        {puntos}
      </svg>
    </Interactive.Div>
  );
};

export const Brasas = Interactive.withSchema({
  Component: BrasasInner,
  componentName: "<Brasas>",
  schema: {
    cantidad: numero(1, 300, 46, "Cantidad"),
    semilla: numero(0, 9999, 1, "Forma"),
    intensidad: numero(0, 1, 0.8, "Intensidad", 0.01),
  } as const satisfies InteractivitySchema,
  wrapInSequence: true,
});

// ------------------------------------------------------------ Destello anamórfico

type AnamorficoProps = {
  readonly y: number;
  readonly color: string;
  readonly intensidad: number;
  readonly style?: React.CSSProperties;
};

/** La raya de luz horizontal de las lentes anamórficas de cine. */
const AnamorficoInner: React.FC<AnamorficoProps> = ({
  y,
  color,
  intensidad,
  style,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = frame / Math.max(1, durationInFrames - 1);
  const opacidad = intensidad * Math.pow(1 - p, 1.6);
  const raya = (alto: number, desenfoque: number, factor: number) => (
    <div
      style={{
        position: "absolute",
        left: -400,
        width: 1880,
        top: y,
        height: alto,
        translate: "0px -50%",
        scale: `${0.7 + p * 0.6} 1`,
        background: `linear-gradient(90deg, transparent 0%, ${color} 22%, #ffffff 50%, ${color} 78%, transparent 100%)`,
        filter: `blur(${desenfoque}px)`,
        opacity: opacidad * factor,
      }}
    />
  );
  return (
    <Interactive.Div
      style={{
        position: "absolute",
        inset: 0,
        mixBlendMode: "screen",
        pointerEvents: "none",
        ...style,
      }}
    >
      {raya(5, 1.2, 1)}
      {raya(46, 16, 0.45)}
      <div
        style={{
          position: "absolute",
          left: 540,
          top: y,
          width: 520,
          height: 520,
          translate: "-50% -50%",
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(255,255,255,0.95) 0%, ${color} 18%, rgba(0,0,0,0) 62%)`,
          opacity: opacidad * 0.75,
        }}
      />
    </Interactive.Div>
  );
};

export const DestelloAnamorfico = Interactive.withSchema({
  Component: AnamorficoInner,
  componentName: "<DestelloAnamorfico>",
  schema: {
    y: numero(0, 1920, 960, "Altura"),
    color: { type: "color", default: AZUL, description: "Color" },
    intensidad: numero(0, 1, 1, "Intensidad", 0.01),
  } as const satisfies InteractivitySchema,
  wrapInSequence: true,
});

// ------------------------------------------------------------ Onda expansiva

type OndaProps = {
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly style?: React.CSSProperties;
};

/** Anillo de luz que se abre desde el punto del impacto. */
const OndaInner: React.FC<OndaProps> = ({ x, y, color, style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = frame / Math.max(1, durationInFrames - 1);
  const e = Easing.out(Easing.cubic)(Math.min(1, p));
  const lado = 60 + e * 1900;
  return (
    <Interactive.Div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: lado,
        height: lado,
        translate: "-50% -50%",
        borderRadius: "50%",
        border: `${2 + 16 * (1 - p)}px solid ${color}`,
        boxShadow: `0 0 50px ${color}, inset 0 0 50px ${color}`,
        opacity: Math.pow(1 - p, 1.3),
        mixBlendMode: "screen",
        filter: "blur(1.5px)",
        ...style,
      }}
    />
  );
};

export const OndaExpansiva = Interactive.withSchema({
  Component: OndaInner,
  componentName: "<OndaExpansiva>",
  schema: {
    x: numero(0, 1080, 540, "Centro X"),
    y: numero(0, 1920, 960, "Centro Y"),
    color: { type: "color", default: "#bfe0ff", description: "Color" },
  } as const satisfies InteractivitySchema,
  wrapInSequence: true,
});

// ------------------------------------------------------------ Logo forjado

type LogoForjadoProps = {
  readonly y: number;
  readonly ancho: number;
  readonly style?: React.CSSProperties;
};

const LOGO = { archivo: "fotos/logo-rotulo.png", ancho: 2000, alto: 1270 };

/** El logo sale de la forja al rojo vivo y se enfría hasta el azul de la marca. */
const LogoForjadoInner: React.FC<LogoForjadoProps> = ({ y, ancho, style }) => {
  const frame = useCurrentFrame();
  const alto = (ancho * LOGO.alto) / LOGO.ancho;
  // 1 = al rojo, 0 = frío
  const calor = interpolate(frame, [0, 8, 52], [1, 1, 0], {
    ...clamp,
    easing: Easing.out(Easing.quad),
  });
  const halo = interpolateColors(
    calor,
    [0, 0.5, 1],
    ["rgba(58, 155, 255, 0.85)", "rgba(255, 110, 30, 0.9)", "rgba(255, 200, 120, 1)"],
  );
  return (
    <CanvasImage
      src={staticFile(LOGO.archivo)}
      width={LOGO.ancho}
      height={LOGO.alto}
      fit="contain"
      effects={[
        zoomBlur({
          amount: interpolate(frame, [0, 10], [90, 0], clamp),
          disabled: frame >= 10,
        }),
        shine({
          progress: interpolate(frame, [40, 70], [0, 1], clamp),
          angle: 30,
        }),
        glow({ radius: 30, intensity: 0.8, threshold: 0.5, color: AZUL }),
      ]}
      style={{
        position: "absolute",
        left: (1080 - ancho) / 2,
        top: y - alto / 2,
        width: ancho,
        height: alto,
        opacity: interpolate(frame, [0, 2], [0, 1], clamp),
        scale: String(
          interpolate(frame, [0, 12], [1.5, 1], {
            ...clamp,
            easing: Easing.out(Easing.exp),
          }) * interpolate(frame, [12, 180], [1, 1.05], clamp),
        ),
        filter: `sepia(${calor}) saturate(${1 + 4 * calor}) hue-rotate(${-14 * calor}deg) brightness(${1 + 1.1 * calor}) drop-shadow(0 0 ${18 + 40 * calor}px ${halo})`,
        ...style,
      }}
    />
  );
};

export const LogoForjado = Interactive.withSchema({
  Component: LogoForjadoInner,
  componentName: "<LogoForjado>",
  schema: {
    y: numero(0, 1920, 640, "Altura del centro"),
    ancho: numero(100, 1080, 820, "Ancho"),
  } as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
