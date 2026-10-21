import type React from "react";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { AZUL } from "../marca";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const MARGEN = 18;
const TRAMOS = 22;

// Un rayo que va de (x0, y0) a (x1, y1) en zigzag: cada punto se separa de
// la recta al azar, y la forma cambia cada dos fotogramas.
const rayo = (
  clave: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  amplitud: number,
) => {
  const nx = -(y1 - y0);
  const ny = x1 - x0;
  const largo = Math.hypot(nx, ny);
  const puntos: string[] = [];
  for (let i = 0; i <= TRAMOS; i++) {
    const t = i / TRAMOS;
    const borde = i === 0 || i === TRAMOS ? 0 : 1;
    const d = (random(`${clave}-${i}`) - 0.5) * 2 * amplitud * borde;
    puntos.push(
      `${x0 + (x1 - x0) * t + (nx / largo) * d},${y0 + (y1 - y0) * t + (ny / largo) * d}`,
    );
  }
  return puntos.join(" ");
};

type BordeProps = {
  readonly style?: React.CSSProperties;
};

/**
 * El marco de electricidad azul del vídeo de referencia de Iron Fuel: un
 * rayo por cada borde, que parpadea, y un resplandor azul hacia dentro. Se
 * enciende de golpe y se apaga en los últimos fotogramas.
 */
const BordeElectricoInner: React.FC<BordeProps> = ({ style }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const vivo = interpolate(
    frame,
    [0, 2, durationInFrames - 6, durationInFrames],
    [0, 1, 1, 0],
    clamp,
  );
  const paso = Math.floor(frame / 2);
  const parpadeo = 0.65 + 0.35 * random(`borde-parpadeo-${frame}`);
  const lados = [
    [MARGEN, MARGEN, width - MARGEN, MARGEN],
    [width - MARGEN, MARGEN, width - MARGEN, height - MARGEN],
    [width - MARGEN, height - MARGEN, MARGEN, height - MARGEN],
    [MARGEN, height - MARGEN, MARGEN, MARGEN],
  ] as const;
  const capas = [
    { ancho: 22, color: AZUL, opacidad: 0.22 },
    { ancho: 8, color: "#6cc4ff", opacidad: 0.7 },
    { ancho: 2.5, color: "#ffffff", opacidad: 0.95 },
  ];

  return (
    <Interactive.Div
      style={{
        position: "absolute",
        inset: 0,
        opacity: vivo * parpadeo,
        mixBlendMode: "screen",
        ...style,
      }}
    >
      <AbsoluteFill
        style={{
          boxShadow: `inset 0 0 90px rgba(58, 155, 255, 0.55), inset 0 0 22px rgba(160, 215, 255, 0.6)`,
        }}
      />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {lados.map(([x0, y0, x1, y1], i) => {
          const linea = rayo(`borde-${i}-${paso}`, x0, y0, x1, y1, 16);
          // Una rama corta que sale hacia dentro desde algún punto del borde.
          const t = random(`rama-t-${i}-${paso}`);
          const bx = x0 + (x1 - x0) * t;
          const by = y0 + (y1 - y0) * t;
          const hacia =
            i === 0 ? [0, 1] : i === 1 ? [-1, 0] : i === 2 ? [0, -1] : [1, 0];
          const rama = rayo(
            `rama-${i}-${paso}`,
            bx,
            by,
            bx + hacia[0] * 90 + (random(`rama-d-${i}-${paso}`) - 0.5) * 80,
            by + hacia[1] * 90 + (random(`rama-e-${i}-${paso}`) - 0.5) * 80,
            10,
          );
          return capas.map((c) => (
            <g key={`${i}-${c.ancho}`} opacity={c.opacidad}>
              <polyline
                points={linea}
                fill="none"
                stroke={c.color}
                strokeWidth={c.ancho}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <polyline
                points={rama}
                fill="none"
                stroke={c.color}
                strokeWidth={c.ancho * 0.6}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          ));
        })}
      </svg>
    </Interactive.Div>
  );
};

export const BordeElectrico = Interactive.withSchema({
  Component: BordeElectricoInner,
  componentName: "<BordeElectrico>",
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
