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
import { EXO } from "./fuentes";
import { AZUL } from "./marca";

// Efectos de la versión épica: chispas, brasas, destellos anamórficos,
// ondas expansivas y el logo forjado. Todo es determinista (random() con
// semilla), así que cada fotograma sale igual en cada render.
//
// Los resplandores se dibujan con trazos anchos y translúcidos o con
// degradados, no con filter: blur() ni drop-shadow(): sin GPU, cada filtro
// sobre una capa de pantalla completa cuesta cientos de milisegundos por
// fotograma.

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
  const halos: React.ReactNode[] = [];
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
    const [x0, y0] = posicion(Math.max(0, frame - 2.2), vx, vy);
    const resto = 1 - frame / vida;
    const ancho = 1.6 + 4.4 * resto * (0.5 + r("grosor"));
    const opacidad = Math.pow(resto, 0.5);
    // El resplandor es el mismo trazo, ancho y translúcido, por debajo.
    halos.push(
      <line
        key={i}
        x1={x0}
        y1={y0}
        x2={x1}
        y2={y1}
        stroke="#ff7a1a"
        strokeWidth={ancho * 4.5}
        strokeLinecap="round"
        opacity={opacidad * 0.2}
      />,
    );
    trazos.push(
      <line
        key={i}
        x1={x0}
        y1={y0}
        x2={x1}
        y2={y1}
        stroke={interpolateColors(resto, [0, 0.35, 0.7, 1], CHISPA_COLORES)}
        strokeWidth={ancho}
        strokeLinecap="round"
        opacity={opacidad}
      />,
    );
  }

  return (
    <Interactive.Div
      style={{
        position: "absolute",
        inset: 0,
        mixBlendMode: "screen",
        ...style,
      }}
    >
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        {halos}
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
    const color = CHISPA_COLORES[1 + Math.floor(r("c") * 3)];
    puntos.push(
      <g key={i} opacity={parpadeo * intensidad}>
        <circle cx={x} cy={y} r={radio * 3.2} fill="#ff8c28" opacity={0.18} />
        <circle cx={x} cy={y} r={radio} fill={color} />
      </g>,
    );
  }
  return (
    <Interactive.Div
      style={{
        position: "absolute",
        inset: 0,
        mixBlendMode: "screen",
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
  // Cada raya es una elipse muy alargada con un degradado radial: blanca en
  // el centro, del color en el medio y transparente en el borde.
  const raya = (alto: number, factor: number) => (
    <div
      style={{
        position: "absolute",
        left: -400,
        width: 1880,
        top: y,
        height: alto,
        translate: "0px -50%",
        scale: `${0.7 + p * 0.6} 1`,
        background: `radial-gradient(closest-side, #ffffff 0%, ${color} 45%, transparent 100%)`,
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
      {raya(8, 1)}
      {raya(80, 0.45)}
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
  // Radio del anillo, grosor y resplandor a cada lado, en píxeles.
  const radio = 30 + e * 950;
  const grosor = 2 + 16 * (1 - p);
  const halo = 45;
  const lado = 2 * (radio + grosor / 2 + halo);
  const anillo = [
    `transparent ${Math.max(0, radio - grosor / 2 - halo)}px`,
    `${color} ${radio - grosor / 2}px`,
    `#ffffff ${radio}px`,
    `${color} ${radio + grosor / 2}px`,
    `transparent ${radio + grosor / 2 + halo}px`,
  ].join(", ");
  return (
    <Interactive.Div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: lado,
        height: lado,
        translate: "-50% -50%",
        background: `radial-gradient(circle closest-side, ${anillo})`,
        opacity: Math.pow(1 - p, 1.3),
        mixBlendMode: "screen",
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

// ------------------------------------------------------------ Síguenos

type SiguenosProps = {
  /** Altura del borde de arriba del botón, en píxeles. */
  readonly y: number;
  readonly style?: React.CSSProperties;
};

// La campana de notificaciones de Material Icons (licencia Apache 2.0).
const CAMPANA =
  "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z";

/**
 * La llamada a la acción del final: un botón «SÍGUENOS» con la campana que
 * entra con rebote, late con la música y lo cruza un reflejo, y debajo
 * «y no te pierdas la inauguración».
 */
const SiguenosInner: React.FC<SiguenosProps> = ({ y, style }) => {
  const frame = useCurrentFrame();
  const entrada = interpolate(frame, [0, 10], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.back(1.8)),
  });
  // Late a 120 BPM (un golpe cada 15 fotogramas) cuando ya ha entrado.
  const latido =
    frame > 10 ? 1 + 0.035 * Math.pow(Math.max(0, Math.cos(((frame - 10) / 15) * Math.PI)), 8) : 1;
  const campana = frame > 12 ? 16 * Math.sin((frame - 12) * 0.9) * Math.exp(-(frame - 12) / 14) : 0;
  const reflejo = interpolate(frame, [14, 30], [-60, 160], clamp);
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
        gap: 20,
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "16px 46px 16px 38px",
          borderRadius: 999,
          border: `3px solid ${AZUL}`,
          background:
            "linear-gradient(180deg, rgba(58, 155, 255, 0.42), rgba(18, 60, 120, 0.55))",
          boxShadow:
            "0 0 34px rgba(58, 155, 255, 0.65), inset 0 0 20px rgba(160, 210, 255, 0.35)",
          opacity: interpolate(frame, [0, 4], [0, 1], clamp),
          scale: String((0.55 + 0.45 * entrada) * latido),
        }}
      >
        <svg
          width={54}
          height={54}
          viewBox="0 0 24 24"
          style={{ rotate: `${campana}deg`, transformOrigin: "50% 12%" }}
        >
          <path d={CAMPANA} fill="#ffffff" />
        </svg>
        <span
          style={{
            fontFamily: EXO,
            fontWeight: 900,
            fontStyle: "italic",
            fontSize: 60,
            lineHeight: 1,
            letterSpacing: "0.02em",
            color: "#ffffff",
          }}
        >
          SÍGUENOS
        </span>
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${reflejo}%`,
            width: "28%",
            background:
              "linear-gradient(100deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.55) 50%, rgba(255, 255, 255, 0) 100%)",
          }}
        />
      </div>
      <div
        style={{
          fontFamily: EXO,
          fontStyle: "normal",
          fontWeight: 600,
          fontSize: 44,
          lineHeight: 1.2,
          color: "rgba(255, 255, 255, 0.92)",
          textShadow: "0 4px 18px rgba(0, 0, 0, 0.9)",
          opacity: interpolate(frame, [8, 18], [0, 1], clamp),
          translate: `0px ${interpolate(frame, [8, 18], [18, 0], {
            ...clamp,
            easing: Easing.out(Easing.cubic),
          })}px`,
        }}
      >
        y no te pierdas la inauguración
      </div>
    </Interactive.Div>
  );
};

export const Siguenos = Interactive.withSchema({
  Component: SiguenosInner,
  componentName: "<Siguenos>",
  schema: {
    y: numero(0, 1920, 1320, "Altura"),
  } as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
