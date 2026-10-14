import { Audio } from "@remotion/media";
import { AbsoluteFill, Series, staticFile, useVideoConfig } from "remotion";
import { Grano, Vineta } from "./efectos";
import { Quemadura } from "./vfx";
import { Apertura } from "./inauguracion/Apertura";
import { Informacion } from "./inauguracion/Informacion";
import { NEGRO } from "./marca";

// La inauguración: 18 s en vertical con la información de la invitación
// (sábado 17 de octubre, desde las 19:00 h, calle Rafael Alberti 3; bebidas,
// aperitivos, regalos y un 10 % de descuento). La música
// (audio/banda_sonora_inauguracion.py) va a 120 BPM y el final queda quieto
// seis segundos para que dé tiempo a leerlo.
export const Inauguracion: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Series>
        <Series.Sequence
          name="Apertura"
          durationInFrames={180}
          premountFor={fps}
        >
          <Apertura />
        </Series.Sequence>
        <Series.Sequence
          name="Información"
          durationInFrames={360}
          premountFor={fps}
        >
          <Informacion />
        </Series.Sequence>
      </Series>
      <Quemadura
        name="Quemadura hacia el logo"
        from={176}
        durationInFrames={12}
        premountFor={fps}
        color="#ff2338"
      />
      {/* Sombra abajo: deja leer el texto y los botones de las historias. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(3, 5, 9, 0) 78%, rgba(3, 5, 9, 0.5) 100%)",
        }}
      />
      <Vineta />
      <Grano />
      <Audio
        name="Banda sonora de la inauguración"
        src={staticFile("audio/banda-sonora-inauguracion.wav")}
        premountFor={fps}
      />
    </AbsoluteFill>
  );
};
