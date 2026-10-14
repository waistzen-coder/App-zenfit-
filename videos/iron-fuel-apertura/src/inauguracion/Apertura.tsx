import {
  AbsoluteFill,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Destello, FugaDeLuz, LineaDeCarga } from "../efectos";
import { AZUL, NEGRO } from "../marca";
import { Plano } from "../Plano";
import { Rotulo } from "../Rotulo";
import {
  Brasas,
  Chispas,
  DestelloAnamorfico,
  OndaExpansiva,
  Quemadura,
  TubosNeon,
} from "../vfx";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 0–6 s. La frase de la invitación, «DETRÁS DE CADA SUEÑO HAY MUCHO TRABAJO»,
// en dos golpes de forja; un montaje de la tienda de un plano por pulso; «Y
// HOY QUEREMOS COMPARTIRLO» sobre la fachada y medio segundo de casi silencio
// antes del logo.
export const Apertura: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Brasas
        name="Brasas"
        from={0}
        durationInFrames={66}
        premountFor={fps}
        cantidad={46}
        semilla={19}
        intensidad={0.75}
        style={{ opacity: interpolate(frame, [56, 66], [1, 0], clamp) }}
      />
      <TubosNeon
        name="Neones del arranque"
        from={0}
        durationInFrames={30}
        premountFor={fps}
        cantidad={8}
        semilla={41}
        style={{ opacity: 0.65 }}
      />

      <Plano
        name="El techo de LED"
        from={60}
        durationInFrames={15}
        premountFor={fps}
        archivo="clips/interior-revelacion.webm"
        inicio={5.9}
        velocidad={1}
        zoomInicial={1.6}
        zoomFinal={1.7}
        origen="50% 4%"
        brillo={1}
        entrada="zoom"
        salida="barrido-izq"
        bloom={1.1}
      />
      <Interactive.Div
        name="Sombra del suelo"
        from={60}
        durationInFrames={15}
        premountFor={fps}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(3, 5, 9, 0) 46%, rgba(3, 5, 9, 0.85) 72%, #030509 90%)",
        }}
      />
      <Plano
        name="La pared de estanterías"
        from={75}
        durationInFrames={15}
        premountFor={fps}
        archivo="clips/interior-revelacion.webm"
        inicio={1.8}
        velocidad={1}
        zoomInicial={1.15}
        zoomFinal={1.22}
        origen="40% 45%"
        brillo={0.95}
        entrada="barrido-izq"
        ojoDePez={1.6}
      />
      <Plano
        name="Montando las estanterías"
        from={90}
        durationInFrames={15}
        premountFor={fps}
        archivo="clips/montaje.webm"
        inicio={2.4}
        velocidad={1}
        zoomInicial={1.25}
        zoomFinal={1.33}
        origen="50% 25%"
        brillo={0.95}
        entrada="zoom"
        salida="barrido-der"
      />
      <Plano
        name="Las letras del rótulo 1"
        from={105}
        durationInFrames={7}
        premountFor={fps}
        archivo="clips/fachada-rotulo-60fps.webm"
        inicio={15.4}
        velocidad={0.5}
        zoomInicial={1.2}
        zoomFinal={1.25}
        origen="50% 30%"
        brillo={1}
        entrada="barrido-der"
      />
      <Plano
        name="Las letras del rótulo 2"
        from={112}
        durationInFrames={8}
        premountFor={fps}
        archivo="clips/fachada-rotulo-60fps.webm"
        inicio={12.6}
        velocidad={0.5}
        zoomInicial={1.4}
        zoomFinal={1.45}
        origen="55% 25%"
        brillo={1}
        entrada="zoom"
        golpe={1.3}
      />
      <Plano
        name="La fachada"
        from={120}
        durationInFrames={48}
        premountFor={fps}
        archivo="fotos/fachada.jpg"
        inicio={0}
        velocidad={1}
        zoomInicial={1.06}
        zoomFinal={1.16}
        origen="50% 30%"
        brillo={0.5}
        entrada="zoom"
        temblor={12}
      />
      <TubosNeon
        name="Neones sobre la fachada"
        from={120}
        durationInFrames={46}
        premountFor={fps}
        cantidad={7}
        semilla={47}
        style={{ opacity: 0.6 }}
      />
      <FugaDeLuz
        name="Fuga de luz hacia la fachada"
        from={112}
        durationInFrames={18}
        premountFor={fps}
        semilla={5}
        tono={200}
        style={{ opacity: 0.55 }}
      />
      <Brasas
        name="Brasas antes del logo"
        from={150}
        durationInFrames={30}
        premountFor={fps}
        cantidad={60}
        semilla={23}
        intensidad={0.9}
        style={{ opacity: interpolate(frame, [150, 162], [0, 1], clamp) }}
      />
      <LineaDeCarga
        name="Carga antes del logo"
        from={166}
        durationInFrames={14}
        premountFor={fps}
        color={AZUL}
      />

      <OndaExpansiva
        name="Onda de Detrás de cada sueño"
        from={0}
        durationInFrames={22}
        premountFor={fps}
        x={540}
        y={900}
        color="#bfe0ff"
      />
      <Rotulo
        name="Detrás de cada sueño"
        from={0}
        durationInFrames={30}
        premountFor={fps}
        destacado=""
        tamano={130}
        y={900}
        metal
      >
        {"DETRÁS DE\nCADA SUEÑO"}
      </Rotulo>
      <DestelloAnamorfico
        name="Destello de Detrás de cada sueño"
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
        y={1010}
        cantidad={170}
        semilla={43}
        fuerza={52}
      />
      <Rotulo
        name="Hay mucho trabajo"
        from={30}
        durationInFrames={30}
        premountFor={fps}
        destacado="TRABAJO"
        tamano={140}
        y={900}
        metal
        fundido
      >
        {"HAY MUCHO"}
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
      <Quemadura
        name="Quemadura del yunque"
        from={27}
        durationInFrames={12}
        premountFor={fps}
        color="#ff2338"
      />
      {[60, 75, 90, 105, 112].map((f) => (
        <Destello
          key={f}
          name="Fogonazo del corte"
          from={f}
          durationInFrames={4}
          premountFor={fps}
          intensidad={0.28}
          color="#ffffff"
        />
      ))}
      <Destello
        name="Golpe del yunque"
        from={30}
        durationInFrames={6}
        premountFor={fps}
        intensidad={0.3}
        color="#ff9a4a"
      />

      <Rotulo
        name="Y hoy queremos compartirlo"
        from={120}
        durationInFrames={46}
        premountFor={fps}
        destacado="COMPARTIRLO"
        tamano={100}
        y={940}
        metal
      >
        {"Y HOY QUEREMOS"}
      </Rotulo>
      <DestelloAnamorfico
        name="Destello de Y hoy"
        from={120}
        durationInFrames={18}
        premountFor={fps}
        y={940}
        color={AZUL}
        intensidad={0.7}
      />
      <Destello
        name="Golpe de Y hoy"
        from={120}
        durationInFrames={6}
        premountFor={fps}
        intensidad={0.3}
        color="#ffffff"
      />
    </AbsoluteFill>
  );
};
