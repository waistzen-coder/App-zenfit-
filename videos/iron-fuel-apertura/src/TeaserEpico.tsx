import { Audio } from "@remotion/media";
import { AbsoluteFill, Series, staticFile, useVideoConfig } from "remotion";
import { Grano, Vineta } from "./efectos";
import { CierreEpico } from "./epico/CierreEpico";
import { FachadaEpica } from "./epico/FachadaEpica";
import { GanchoEpico } from "./epico/GanchoEpico";
import { MontajeEpico } from "./epico/MontajeEpico";
import { RevelacionEpica } from "./epico/RevelacionEpica";
import { NEGRO } from "./marca";

// La versión épica del teaser: el mismo guion de 30 s con banda sonora
// orquestal (audio/banda_sonora_epica.py), textos de acero, chispas de
// forja, la fachada con rampa de velocidad y el logo forjado. Igual que en
// la primera versión, 120 BPM: 15 fotogramas por pulso y 60 por compás.
export const TeaserEpico: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Series>
        <Series.Sequence name="Gancho" durationInFrames={120} premountFor={fps}>
          <GanchoEpico />
        </Series.Sequence>
        <Series.Sequence
          name="Montaje"
          durationInFrames={240}
          premountFor={fps}
        >
          <MontajeEpico />
        </Series.Sequence>
        <Series.Sequence
          name="Revelación"
          durationInFrames={120}
          premountFor={fps}
        >
          <RevelacionEpica />
        </Series.Sequence>
        <Series.Sequence
          name="Fachada"
          durationInFrames={240}
          premountFor={fps}
        >
          <FachadaEpica />
        </Series.Sequence>
        <Series.Sequence name="Cierre" durationInFrames={180} premountFor={fps}>
          <CierreEpico />
        </Series.Sequence>
      </Series>
      <Vineta />
      <Grano />
      <Audio
        name="Banda sonora épica"
        src={staticFile("audio/banda-sonora-epica.wav")}
        premountFor={fps}
      />
    </AbsoluteFill>
  );
};
