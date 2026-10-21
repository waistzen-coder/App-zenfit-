import { glow } from "@remotion/effects/glow";
import { shine } from "@remotion/effects/shine";
import { zoomBlur } from "@remotion/effects/zoom-blur";
import type React from "react";
import {
  AbsoluteFill,
  CanvasImage,
  Easing,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Destello } from "../efectos";
import { EXO } from "../fuentes";
import { AZUL, NEGRO } from "../marca";
import { Plano } from "../Plano";
import { Chispas, DestelloAnamorfico, OndaExpansiva } from "../vfx";
import { BordeElectrico } from "./BordeElectrico";
import { AZUL_TEXTO, TextoGolpe } from "./TextoGolpe";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// El logo original, sacado del rótulo de la fachada (preparar-medios.sh).
const LOGO = { archivo: "fotos/logo-rotulo.png", ancho: 2000, alto: 1270 };
const ANCHO_LOGO = 780;
const Y_LOGO = 690;
const PULSO = 15;
/** Fotograma del cierre en el que llega el destello final (14 s). */
export const DESTELLO_FINAL = 60;

export const CHISPAS_AZULES = ["#0b3d91", "#3a9bff", "#9fd4ff", "#ffffff"];

/** Motas de luz azul que suben despacio y titilan. */
const Particulas: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg
      width={1080}
      height={1920}
      viewBox="0 0 1080 1920"
      style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}
    >
      {Array.from({ length: 70 }, (_, i) => {
        const r = (clave: string) => random(`particula-${i}-${clave}`);
        const x = r("x") * 1080 + Math.sin(frame / 18 + r("fase") * 6) * 14;
        const y = 1920 * (0.15 + 0.9 * r("y")) - frame * (1.5 + 3 * r("v"));
        const radio = 1.5 + 4 * r("radio") ** 2;
        const brillo =
          (0.35 +
            0.65 *
              Math.abs(Math.sin(frame / (6 + 8 * r("t")) + r("fase") * 9))) *
          interpolate(frame, [0, 10], [0, 1], clamp);
        const color = r("color") > 0.7 ? "#ffffff" : "#6cc4ff";
        return (
          <g key={i} opacity={brillo}>
            <circle cx={x} cy={y} r={radio * 3.5} fill={AZUL} opacity={0.18} />
            <circle cx={x} cy={y} r={radio} fill={color} />
          </g>
        );
      })}
    </svg>
  );
};

const Instagram: React.FC = () => (
  <svg width={46} height={46} viewBox="0 0 24 24">
    <rect
      x={3}
      y={3}
      width={18}
      height={18}
      rx={5.2}
      fill="none"
      stroke={AZUL_TEXTO}
      strokeWidth={2.2}
    />
    <circle
      cx={12}
      cy={12}
      r={4.2}
      fill="none"
      stroke={AZUL_TEXTO}
      strokeWidth={2.2}
    />
    <circle cx={17.3} cy={6.7} r={1.35} fill={AZUL_TEXTO} />
  </svg>
);

/**
 * Los últimos 3 segundos: el logo original sobre la tienda desenfocada y
 * oscura, con un pulso azul en cada golpe de la música, partículas, y debajo
 * «TE ESPERAMOS EN MOTRIL» y el Instagram. En el último golpe (14 s) un
 * reflejo cruza el logo con un destello.
 */
export const CierreLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const latido = frame < PULSO ? 0 : Math.exp(-(frame % PULSO) / 4);
  const entrada = interpolate(frame, [0, 10], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.exp),
  });
  const alto = (ANCHO_LOGO * LOGO.alto) / LOGO.ancho;
  // Entra pronto para que se lea más de dos segundos.
  const entraHandle = PULSO + 7;

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Plano
        name="La tienda desenfocada"
        from={0}
        durationInFrames={90}
        premountFor={fps}
        archivo="fotos/anuncio-fondo-cierre.jpg"
        inicio={0}
        velocidad={1}
        zoomInicial={1.12}
        zoomFinal={1.2}
        origen="50% 40%"
        brillo={0.34}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 85% 60% at 50% 42%, rgba(3, 5, 9, 0) 30%, rgba(3, 5, 9, 0.75) 100%)",
        }}
      />
      {/* El pulso azul detrás del logo, en cada golpe. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 48% 22% at 50% ${(Y_LOGO / 1920) * 100}%, rgba(58, 155, 255, 0.85) 0%, rgba(58, 155, 255, 0.25) 45%, rgba(58, 155, 255, 0) 100%)`,
          opacity: (0.3 + 0.45 * latido) * entrada,
          scale: String(1 + 0.08 * latido),
          mixBlendMode: "screen",
        }}
      />
      <Particulas />
      <OndaExpansiva
        name="Onda del logo"
        from={0}
        durationInFrames={26}
        premountFor={fps}
        x={540}
        y={Y_LOGO}
        color="#7cc6ff"
      />
      <CanvasImage
        src={staticFile(LOGO.archivo)}
        width={LOGO.ancho}
        height={LOGO.alto}
        fit="contain"
        effects={[
          zoomBlur({
            amount: interpolate(frame, [0, 9], [80, 0], clamp),
            disabled: frame >= 9,
          }),
          shine({
            progress: interpolate(
              frame,
              [DESTELLO_FINAL - 2, DESTELLO_FINAL + 14],
              [0, 1],
              clamp,
            ),
            angle: 28,
            disabled: frame < DESTELLO_FINAL - 2 || frame > DESTELLO_FINAL + 14,
          }),
          glow({
            radius: 34,
            intensity: 0.7 + 0.5 * latido,
            threshold: 0.45,
            color: AZUL,
          }),
        ]}
        style={{
          position: "absolute",
          left: (1080 - ANCHO_LOGO) / 2,
          top: Y_LOGO - alto / 2,
          width: ANCHO_LOGO,
          height: alto,
          opacity: interpolate(frame, [0, 2], [0, 1], clamp),
          scale: String(
            interpolate(frame, [0, 10], [1.35, 1], {
              ...clamp,
              easing: Easing.out(Easing.exp),
            }) *
              (1 + 0.015 * latido),
          ),
        }}
      />
      <Chispas
        name="Chispas azules del logo"
        from={0}
        durationInFrames={45}
        premountFor={fps}
        x={540}
        y={Y_LOGO + 60}
        cantidad={170}
        semilla={131}
        fuerza={46}
        colores={CHISPAS_AZULES}
      />
      <DestelloAnamorfico
        name="Destello del logo"
        from={0}
        durationInFrames={26}
        premountFor={fps}
        y={Y_LOGO}
        color={AZUL}
        intensidad={1}
      />

      <TextoGolpe
        name="Te esperamos en Motril"
        from={8}
        durationInFrames={82}
        premountFor={fps}
        y={1020}
        salida={false}
        lineas={[
          { texto: "TE ESPERAMOS EN", tamano: 84, entra: 0 },
          { texto: "MOTRIL", azul: true, tamano: 150, entra: 7 },
        ]}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          width: "100%",
          top: 1335,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
          opacity: interpolate(
            frame,
            [entraHandle, entraHandle + 6],
            [0, 1],
            clamp,
          ),
          translate: `0px ${interpolate(
            frame,
            [entraHandle, entraHandle + 8],
            [24, 0],
            {
              ...clamp,
              easing: Easing.out(Easing.cubic),
            },
          )}px`,
        }}
      >
        <Instagram />
        <div
          style={{
            fontFamily: EXO,
            fontStyle: "italic",
            fontWeight: 800,
            fontSize: 58,
            color: "#ffffff",
            textShadow:
              "0 0 18px rgba(58, 155, 255, 0.5), 0 6px 24px rgba(0, 0, 0, 0.9)",
          }}
        >
          @ironfuelnutrition_
        </div>
      </div>

      <BordeElectrico
        name="Borde eléctrico del logo"
        from={0}
        durationInFrames={22}
        premountFor={fps}
      />
      <Destello
        name="Golpe del logo"
        from={0}
        durationInFrames={9}
        premountFor={fps}
        intensidad={0.7}
        color="#cfe8ff"
      />
      <DestelloAnamorfico
        name="Destello final"
        from={DESTELLO_FINAL}
        durationInFrames={24}
        premountFor={fps}
        y={Y_LOGO}
        color={AZUL}
        intensidad={0.9}
      />
      <Destello
        name="Golpe final"
        from={DESTELLO_FINAL}
        durationInFrames={7}
        premountFor={fps}
        intensidad={0.3}
        color="#cfe8ff"
      />
    </AbsoluteFill>
  );
};
