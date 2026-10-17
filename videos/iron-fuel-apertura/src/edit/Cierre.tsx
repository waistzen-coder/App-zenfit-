import type React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Destello } from "../efectos";
import { EXO } from "../fuentes";
import { ICONOS } from "../inauguracion/Tarjeta";
import { AZUL } from "../marca";
import { Rotulo } from "../Rotulo";
import {
  Chispas,
  Confeti,
  DestelloAnamorfico,
  LogoForjado,
  OndaExpansiva,
} from "../vfx";
import { PULSO } from "./montaje";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// El logo de Instagram dibujado a mano (un cuadrado redondeado, el objetivo
// y el punto del flash), en la misma caja de 24 × 24 que los otros iconos.
const Instagram: React.FC<{ readonly color: string }> = ({ color }) => (
  <svg width={40} height={40} viewBox="0 0 24 24">
    <rect
      x={3}
      y={3}
      width={18}
      height={18}
      rx={5.2}
      fill="none"
      stroke={color}
      strokeWidth={2.2}
    />
    <circle
      cx={12}
      cy={12}
      r={4.2}
      fill="none"
      stroke={color}
      strokeWidth={2.2}
    />
    <circle cx={17.3} cy={6.7} r={1.35} fill={color} />
  </svg>
);

const Ubicacion: React.FC<{ readonly color: string }> = ({ color }) => (
  <svg width={42} height={42} viewBox="0 0 24 24">
    <path d={ICONOS.lugar} fill={color} />
  </svg>
);

/** Una pastilla con icono que entra deslizándose y la cruza un reflejo. */
const Pastilla: React.FC<{
  readonly icono: React.ReactNode;
  readonly texto: string;
  readonly y: number;
  readonly entra: number;
}> = ({ icono, texto, y, entra }) => {
  const frame = useCurrentFrame() - entra;
  const dentro = interpolate(frame, [0, 8], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.back(1.5)),
  });
  const reflejo = interpolate(frame, [4, 20], [-40, 140], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: "100%",
        top: y,
        translate: "0px -50%",
        display: "flex",
        justifyContent: "center",
        opacity: interpolate(frame, [0, 3], [0, 1], clamp),
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "18px 38px 18px 30px",
          borderRadius: 999,
          background: "rgba(8, 11, 18, 0.82)",
          border: "1px solid rgba(255, 255, 255, 0.16)",
          boxShadow: `0 14px 44px rgba(0, 0, 0, 0.6), 0 0 30px rgba(58, 155, 255, 0.25)`,
          translate: `${(1 - dentro) * -90}px 0px`,
          scale: String(0.85 + 0.15 * dentro),
        }}
      >
        {icono}
        <div
          style={{
            fontFamily: EXO,
            fontStyle: "italic",
            fontWeight: 800,
            fontSize: 46,
            color: "#ffffff",
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
        >
          {texto}
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${reflejo}%`,
            width: "28%",
            background:
              "linear-gradient(100deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.35) 50%, rgba(255, 255, 255, 0) 100%)",
          }}
        />
      </div>
    </div>
  );
};

/**
 * El final del Edit (16,8-22 s) sobre la fachada con las mesas de la
 * fiesta: el logo en el golpe, «YA ESTAMOS ABIERTOS», la dirección y el
 * Instagram, uno por pulso, y «¡TE ESPERAMOS!» con confeti en el último
 * golpe de la música.
 */
export const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ultimo = 4 * PULSO;
  const latido =
    frame > ultimo + 10
      ? 1 +
        0.03 *
          Math.pow(
            Math.max(0, Math.cos(((frame - ultimo - 10) / PULSO) * Math.PI)),
            8,
          )
      : 1;

  return (
    <AbsoluteFill>
      {/* Oscurece la fachada de la mitad hacia abajo para leer el texto. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(3, 5, 9, 0.15) 0%, rgba(3, 5, 9, 0.55) 26%, rgba(3, 5, 9, 0.78) 48%, rgba(3, 5, 9, 0.86) 100%)",
          opacity: interpolate(frame, [0, 6], [0, 1], clamp),
        }}
      />
      <OndaExpansiva
        name="Onda del logo"
        from={0}
        durationInFrames={26}
        premountFor={fps}
        x={540}
        y={600}
        color="#ffc38a"
      />
      <LogoForjado
        name="Logo forjado"
        from={0}
        durationInFrames={156}
        premountFor={fps}
        y={600}
        ancho={660}
      />
      <Chispas
        name="Chispas del logo"
        from={0}
        durationInFrames={50}
        premountFor={fps}
        x={540}
        y={650}
        cantidad={200}
        semilla={61}
        fuerza={50}
      />
      <DestelloAnamorfico
        name="Destello del logo"
        from={0}
        durationInFrames={30}
        premountFor={fps}
        y={600}
        color="#ff9a4a"
        intensidad={1}
      />

      <Rotulo
        name="Ya estamos abiertos"
        from={PULSO}
        durationInFrames={156 - PULSO}
        premountFor={fps}
        destacado="ABIERTOS"
        tamano={112}
        y={1010}
        salida={false}
        metal
      >
        {"YA ESTAMOS"}
      </Rotulo>
      <DestelloAnamorfico
        name="Destello de Ya estamos abiertos"
        from={PULSO}
        durationInFrames={18}
        premountFor={fps}
        y={1010}
        color={AZUL}
        intensidad={0.7}
      />

      <Pastilla
        icono={<Ubicacion color={AZUL} />}
        texto="Calle Rafael Alberti, 3"
        y={1238}
        entra={2 * PULSO}
      />
      <Pastilla
        icono={<Instagram color={AZUL} />}
        texto="@ironfuelnutrition_"
        y={1348}
        entra={3 * PULSO}
      />

      <Rotulo
        name="¡Te esperamos!"
        from={ultimo}
        durationInFrames={156 - ultimo}
        premountFor={fps}
        destacado="¡TE ESPERAMOS!"
        tamano={104}
        y={1500}
        salida={false}
        fundido
        style={{ scale: String(latido) }}
      >
        {""}
      </Rotulo>
      <OndaExpansiva
        name="Onda de Te esperamos"
        from={ultimo}
        durationInFrames={22}
        premountFor={fps}
        x={540}
        y={1500}
        color="#ffb070"
      />
      {[
        { lado: "izquierda", x: 40, direccion: -62, semilla: 17 },
        { lado: "derecha", x: 1040, direccion: -118, semilla: 18 },
      ].map((c) => (
        <Confeti
          key={c.lado}
          name={`Cañón de confeti (${c.lado})`}
          from={ultimo}
          durationInFrames={156 - ultimo}
          premountFor={fps}
          x={c.x}
          y={1840}
          cantidad={90}
          semilla={c.semilla}
          fuerza={72}
          direccion={c.direccion}
          apertura={46}
        />
      ))}
      <Destello
        name="Golpe del logo"
        from={0}
        durationInFrames={10}
        premountFor={fps}
        intensidad={0.8}
        color="#ffe2c2"
      />
      <Destello
        name="Golpe de Te esperamos"
        from={ultimo}
        durationInFrames={8}
        premountFor={fps}
        intensidad={0.45}
        color="#ffd7b0"
      />
    </AbsoluteFill>
  );
};
