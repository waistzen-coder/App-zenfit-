import { Video } from "@remotion/media";
import type React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { Vineta } from "../efectos";
import { EXO } from "../fuentes";
import { AZUL, NEGRO } from "../marca";
import { Rotulo } from "../Rotulo";
import { CAIDA_1 } from "./montaje";

// Dónde se parte la imagen: una diagonal suave que baja hacia la derecha.
const CORTE_IZQ = 900;
const CORTE_DER = 1020;
// Las dos mitades enseñan la misma franja de su fotograma, desde esta fila
// hacia abajo: las luces del techo, la columna y el fondo de la tienda.
const FILA = 250;
const ESCALA = 1.12;
const ARRIBA_DE_LA_FILA = (FILA - 960) * ESCALA + 960;

const Mitad: React.FC<{
  readonly fotograma: number;
  readonly arriba: boolean;
}> = ({ fotograma, arriba }) => (
  <AbsoluteFill
    style={{
      clipPath: arriba
        ? `polygon(0 0, 100% 0, 100% ${CORTE_DER}px, 0 ${CORTE_IZQ}px)`
        : `polygon(0 ${CORTE_IZQ}px, 100% ${CORTE_DER}px, 100% 100%, 0 100%)`,
    }}
  >
    <Video
      src={staticFile("clips/edit-montaje.webm")}
      // La portada se saca en el fotograma 30 de su composición.
      trimBefore={fotograma - 30}
      muted
      objectFit="cover"
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        translate: `0px ${(arriba ? 0 : 960) - ARRIBA_DE_LA_FILA}px`,
        scale: String(ESCALA),
      }}
    />
  </AbsoluteFill>
);

const Etiqueta: React.FC<{
  readonly texto: string;
  readonly x: number;
  readonly y: number;
  readonly color: string;
}> = ({ texto, x, y, color }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      padding: "10px 26px",
      borderRadius: 14,
      background: "rgba(3, 5, 9, 0.78)",
      border: `2px solid ${color}`,
      boxShadow: `0 0 26px ${color}88`,
      fontFamily: EXO,
      fontStyle: "italic",
      fontWeight: 900,
      fontSize: 52,
      letterSpacing: "0.04em",
      color: "#ffffff",
    }}
  >
    {texto}
  </div>
);

/**
 * La portada del Edit para el perfil de Instagram: el mismo rincón de la
 * tienda en obras (arriba, en blanco y negro) y terminado (abajo), partido
 * en diagonal, y «ASÍ HA QUEDADO» en el centro. Lo importante queda dentro
 * del recorte 3:4 que hace la cuadrícula del perfil (de 240 a 1680 px).
 */
export const Portada: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: NEGRO }}>
    <Mitad fotograma={CAIDA_1 - 10} arriba />
    <Mitad fotograma={CAIDA_1 + 14} arriba={false} />
    <Vineta />
    <svg
      width={1080}
      height={1920}
      style={{ position: "absolute", inset: 0 }}
      viewBox="0 0 1080 1920"
    >
      <defs>
        <linearGradient id="linea-portada" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={AZUL} />
          <stop offset="1" stopColor="#ff7424" />
        </linearGradient>
      </defs>
      <line
        x1={0}
        y1={CORTE_IZQ}
        x2={1080}
        y2={CORTE_DER}
        stroke="url(#linea-portada)"
        strokeWidth={26}
        opacity={0.35}
      />
      <line
        x1={0}
        y1={CORTE_IZQ}
        x2={1080}
        y2={CORTE_DER}
        stroke="url(#linea-portada)"
        strokeWidth={7}
      />
    </svg>
    <Etiqueta texto="ANTES" x={60} y={300} color="#9aa4b2" />
    <Etiqueta texto="AHORA" x={760} y={1560} color={AZUL} />
    <Rotulo
      name="Así ha quedado"
      from={0}
      durationInFrames={31}
      destacado="QUEDADO"
      tamano={150}
      y={960}
      salida={false}
      metal
      fundido
    >
      {"ASÍ HA"}
    </Rotulo>
  </AbsoluteFill>
);
