import type React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { EXO } from "../fuentes";
import { AZUL } from "../marca";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Iconos de Material Icons (licencia Apache 2.0), en una caja de 24 × 24.
export const ICONOS = {
  calendario:
    "M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z",
  reloj:
    "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
  lugar:
    "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
  regalo:
    "M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z",
  descuento:
    "M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z",
} as const;

export type Fila = {
  readonly icono: keyof typeof ICONOS;
  readonly texto: string;
  /** Fotograma (de esta tarjeta) en el que entra la fila. */
  readonly entra: number;
  /** En naranja y con brillo: lo que más tiene que verse. */
  readonly destacada?: boolean;
};

const NARANJA = "#ff7424";

const FilaTarjeta: React.FC<{
  readonly fila: Fila;
  readonly ultima: boolean;
}> = ({ fila, ultima }) => {
  const frame = useCurrentFrame() - fila.entra;
  const color = fila.destacada ? NARANJA : AZUL;
  const entrada = interpolate(frame, [0, 8], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const pop = interpolate(frame, [0, 10], [1.7, 1], {
    ...clamp,
    easing: Easing.out(Easing.back(2)),
  });
  // Un fogonazo del color de la fila al entrar y, en la destacada, un latido
  // suave cada compás para que no se pierda.
  const fogonazo = interpolate(frame, [0, 12], [0.35, 0], clamp);
  // Un reflejo de luz cruza la fila justo después de entrar.
  const reflejo = interpolate(frame, [2, 16], [-35, 135], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  const latido = fila.destacada
    ? 0.5 + 0.5 * Math.cos(((Math.max(0, frame - 12) % 60) / 60) * 2 * Math.PI)
    : 0;
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "22px 34px",
        borderBottom: ultima ? "none" : "1px solid rgba(255, 255, 255, 0.09)",
        opacity: entrada,
        translate: `${(1 - entrada) * 60}px 0px`,
        background: `rgba(${fila.destacada ? "255, 116, 36" : "58, 155, 255"}, ${fogonazo})`,
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          width: 64,
          height: 64,
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `${color}22`,
          border: `2px solid ${color}`,
          boxShadow: `0 0 18px ${color}88`,
          scale: String(pop),
        }}
      >
        <svg width={38} height={38} viewBox="0 0 24 24">
          <path d={ICONOS[fila.icono]} fill={color} />
        </svg>
      </div>
      <div
        style={{
          fontFamily: EXO,
          fontStyle: "italic",
          fontWeight: 800,
          fontSize: 40,
          lineHeight: 1.12,
          letterSpacing: "0.01em",
          textTransform: "uppercase",
          color: fila.destacada ? NARANJA : "#ffffff",
          textShadow: fila.destacada
            ? `0 0 ${14 + 16 * latido}px rgba(255, 116, 36, ${0.55 + 0.35 * latido})`
            : "0 2px 10px rgba(0, 0, 0, 0.8)",
        }}
      >
        {fila.texto}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${reflejo}%`,
            width: "30%",
            background:
              "linear-gradient(100deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.32) 50%, rgba(255, 255, 255, 0) 100%)",
          }}
        />
      </div>
    </div>
  );
};

/**
 * La información de la invitación, como su tarjeta: una fila por dato, cada
 * una entra en su golpe de música. La tarjeta aparece con la primera fila.
 */
export const Tarjeta: React.FC<{
  readonly filas: readonly Fila[];
  readonly y: number;
}> = ({ filas, y }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const primera = filas[0]?.entra ?? 0;
  const aparece = interpolate(frame, [primera, primera + 8], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div
      style={{
        position: "absolute",
        left: (width - 920) / 2,
        width: 920,
        top: y,
        borderRadius: 30,
        overflow: "hidden",
        background: "rgba(8, 11, 18, 0.86)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow:
          "0 18px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(58, 155, 255, 0.12)",
        padding: "10px 0",
        opacity: aparece,
        scale: String(0.94 + 0.06 * aparece),
      }}
    >
      {filas.map((fila, i) => (
        <FilaTarjeta
          key={fila.icono}
          fila={fila}
          ultima={i === filas.length - 1}
        />
      ))}
    </div>
  );
};
