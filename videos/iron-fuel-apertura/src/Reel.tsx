import { Audio } from "@remotion/media";
import { AbsoluteFill, Series, staticFile, useVideoConfig } from "remotion";
import type { Fecha } from "./aviso/Anuncio";
import { Grano, Vineta } from "./efectos";
import { NEGRO } from "./marca";
import { Arranque } from "./reel/Arranque";
import { Final } from "./reel/Final";

// El aviso montado como el reel de referencia que nos pasaron: su música
// (public/audio/musica-reel.wav, que preparar-medios.sh saca de
// originales/referencia-reel.mov), cortes a golpe de corchea, neones,
// quemaduras de luz y ojo de pez. 14 s, 120 BPM: el golpe fuerte cae en el
// segundo 1,5 y los compases en 0,5 · 2,5 · 4,5 · 6,5 · 8,5 · 10,5 · 12,5.
export const Reel: React.FC<{ readonly fecha?: Fecha }> = ({ fecha }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Series>
        <Series.Sequence
          name="Arranque y montaje"
          durationInFrames={195}
          premountFor={fps}
        >
          <Arranque />
        </Series.Sequence>
        <Series.Sequence
          name="El anuncio"
          durationInFrames={225}
          premountFor={fps}
        >
          <Final fecha={fecha} />
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
        name="Música del reel de referencia"
        src={staticFile("audio/musica-reel.wav")}
        premountFor={fps}
      />
    </AbsoluteFill>
  );
};
