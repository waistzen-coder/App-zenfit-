import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Destello } from "../efectos";
import { AZUL, NEGRO, PARPADEOS } from "../marca";
import { Plano } from "../Plano";
import { Rotulo } from "../Rotulo";
import {
  Brasas,
  Chispas,
  DestelloAnamorfico,
  OndaExpansiva,
} from "../vfx";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 0–4 s. Brasas sobre negro y dos golpes de forja: «ALGO GRANDE» en acero
// con la onda del impacto y «SE ESTÁ FORJANDO» con el yunque y una lluvia de
// chispas. Entre medias, fogonazos de la tienda que casi no da tiempo a ver.
// Después se encienden las luces del techo con su resplandor.
export const GanchoEpico: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const encendida = PARPADEOS.some(([a, b]) => frame >= a && frame < b);
  const recienEncendida = PARPADEOS.some(([a]) => frame === a);

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Brasas
        name="Brasas"
        from={0}
        durationInFrames={66}
        premountFor={fps}
        cantidad={46}
        semilla={3}
        intensidad={0.75}
        style={{ opacity: interpolate(frame, [56, 66], [1, 0], clamp) }}
      />
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
        bloom={1.2}
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
        bloom={encendida ? (recienEncendida ? 2.2 : 1.1) : 0}
      />
      <DestelloAnamorfico
        name="Destello de las luces"
        from={83}
        durationInFrames={26}
        premountFor={fps}
        y={330}
        color="#9fd0ff"
        intensidad={0.8}
      />

      <OndaExpansiva
        name="Onda de Algo grande"
        from={0}
        durationInFrames={22}
        premountFor={fps}
        x={540}
        y={900}
        color="#bfe0ff"
      />
      <Chispas
        name="Chispas de Algo grande"
        from={0}
        durationInFrames={30}
        premountFor={fps}
        x={540}
        y={1010}
        cantidad={110}
        semilla={11}
        fuerza={40}
      />
      <Rotulo
        name="Algo grande"
        from={0}
        durationInFrames={30}
        premountFor={fps}
        destacado=""
        tamano={190}
        y={900}
        metal
      >
        {"ALGO\nGRANDE"}
      </Rotulo>
      <DestelloAnamorfico
        name="Destello de Algo grande"
        from={0}
        durationInFrames={24}
        premountFor={fps}
        y={900}
        color={AZUL}
        intensidad={1}
      />

      <Chispas
        name="Chispas del yunque"
        from={30}
        durationInFrames={40}
        premountFor={fps}
        x={540}
        y={1000}
        cantidad={170}
        semilla={23}
        fuerza={52}
      />
      <Rotulo
        name="Se está forjando"
        from={30}
        durationInFrames={30}
        premountFor={fps}
        destacado="FORJANDO"
        tamano={160}
        y={900}
        metal
        fundido
      >
        {"SE ESTÁ"}
      </Rotulo>
      <DestelloAnamorfico
        name="Destello del yunque"
        from={30}
        durationInFrames={20}
        premountFor={fps}
        y={980}
        color="#ff8a3d"
        intensidad={0.9}
      />

      <Destello
        name="Golpe 1"
        from={0}
        durationInFrames={8}
        premountFor={fps}
        intensidad={0.55}
        color="#ffffff"
      />
      <Destello
        name="Golpe 2"
        from={30}
        durationInFrames={8}
        premountFor={fps}
        intensidad={0.45}
        color="#ff9a4a"
      />
    </AbsoluteFill>
  );
};
