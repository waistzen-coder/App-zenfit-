import { Audio } from "@remotion/media";
import { AbsoluteFill, Series, staticFile, useVideoConfig } from "remotion";
import { Grano, Vineta } from "./efectos";
import { NEGRO } from "./marca";
import { Cierre } from "./escenas/Cierre";
import { Fachada } from "./escenas/Fachada";
import { Gancho } from "./escenas/Gancho";
import { Montaje } from "./escenas/Montaje";
import { Revelacion } from "./escenas/Revelacion";

// Teaser de apertura de Iron Fuel Nutrition: 30 s en vertical (Reels,
// TikTok, Shorts). La música va a 120 BPM: 15 fotogramas por pulso y 60 por
// compás, y cada escena empieza en un compás.
export const Teaser: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Series>
        <Series.Sequence name="Gancho" durationInFrames={120} premountFor={fps}>
          <Gancho />
        </Series.Sequence>
        <Series.Sequence
          name="Montaje"
          durationInFrames={240}
          premountFor={fps}
        >
          <Montaje />
        </Series.Sequence>
        <Series.Sequence
          name="Revelación"
          durationInFrames={120}
          premountFor={fps}
        >
          <Revelacion />
        </Series.Sequence>
        <Series.Sequence
          name="Fachada"
          durationInFrames={240}
          premountFor={fps}
        >
          <Fachada />
        </Series.Sequence>
        <Series.Sequence name="Cierre" durationInFrames={180} premountFor={fps}>
          <Cierre />
        </Series.Sequence>
      </Series>
      <Vineta />
      <Grano />
      <Audio
        name="Banda sonora"
        src={staticFile("audio/banda-sonora.wav")}
        premountFor={fps}
      />
    </AbsoluteFill>
  );
};
