import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Destello } from "../efectos";
import { AZUL, NEGRO, PARPADEOS } from "../marca";
import { Plano } from "../Plano";
import { Rotulo } from "../Rotulo";

// 0–4 s. Dos golpes de texto sobre negro con fogonazos de la tienda que
// casi no da tiempo a ver, y después las luces del techo encendiéndose.
export const Gancho: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const encendida = PARPADEOS.some(([a, b]) => frame >= a && frame < b);
  const recienEncendida = PARPADEOS.some(([a]) => frame === a);

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Plano
        name="Fogonazo de la fachada"
        from={9}
        durationInFrames={3}
        premountFor={fps}
        archivo="clips/fachada-rotulo-60fps.webm"
        inicio={14}
        velocidad={1}
        zoomInicial={1.3}
        zoomFinal={1.3}
        origen="50% 30%"
        brillo={0.5}
      />
      <Plano
        name="Fogonazo de la nevera"
        from={41}
        durationInFrames={3}
        premountFor={fps}
        archivo="clips/nevera-led.webm"
        inicio={3.2}
        velocidad={1}
        zoomInicial={1.6}
        zoomFinal={1.6}
        origen="80% 35%"
        brillo={0.55}
      />
      <Plano
        name="Se encienden las luces"
        from={60}
        durationInFrames={60}
        premountFor={fps}
        archivo="clips/interior-revelacion.webm"
        inicio={5}
        velocidad={1}
        zoomInicial={1.15}
        zoomFinal={1.32}
        origen="50% 22%"
        brillo={encendida ? (recienEncendida ? 1.6 : 1) : 0.05}
      />
      <Rotulo
        name="Algo grande"
        from={0}
        durationInFrames={30}
        premountFor={fps}
        destacado=""
        tamano={190}
        y={900}
      >
        {"ALGO\nGRANDE"}
      </Rotulo>
      <Rotulo
        name="Se está forjando"
        from={30}
        durationInFrames={30}
        premountFor={fps}
        destacado="FORJANDO"
        tamano={160}
        y={900}
      >
        {"SE ESTÁ"}
      </Rotulo>
      <Destello
        name="Golpe 1"
        from={0}
        durationInFrames={8}
        premountFor={fps}
        intensidad={0.45}
        color="#ffffff"
      />
      <Destello
        name="Golpe 2"
        from={30}
        durationInFrames={8}
        premountFor={fps}
        intensidad={0.4}
        color={AZUL}
      />
    </AbsoluteFill>
  );
};
