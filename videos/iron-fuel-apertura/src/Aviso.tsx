import { Audio } from "@remotion/media";
import { AbsoluteFill, Series, staticFile, useVideoConfig } from "remotion";
import { Anuncio } from "./aviso/Anuncio";
import { Trabajo } from "./aviso/Trabajo";
import { Grano, Vineta } from "./efectos";
import { NEGRO } from "./marca";

// Aviso de la inauguración: 16 s en vertical para estados de WhatsApp e
// historias. «Hemos estado trabajando mucho, pero ya os podemos decir que
// próximamente os diremos fecha y hora de nuestra inauguración», con el logo
// forjado. La música (audio/banda_sonora_aviso.py) va a 120 BPM: 15
// fotogramas por pulso y 60 por compás.
export const Aviso: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Series>
        <Series.Sequence
          name="El trabajo"
          durationInFrames={240}
          premountFor={fps}
        >
          <Trabajo />
        </Series.Sequence>
        <Series.Sequence
          name="El anuncio"
          durationInFrames={240}
          premountFor={fps}
        >
          <Anuncio />
        </Series.Sequence>
      </Series>
      {/* Sombra abajo: deja leer el texto y los botones de las historias. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(3, 5, 9, 0) 70%, rgba(3, 5, 9, 0.5) 100%)",
        }}
      />
      <Vineta />
      <Grano />
      <Audio
        name="Banda sonora del aviso"
        src={staticFile("audio/banda-sonora-aviso.wav")}
        premountFor={fps}
      />
    </AbsoluteFill>
  );
};
