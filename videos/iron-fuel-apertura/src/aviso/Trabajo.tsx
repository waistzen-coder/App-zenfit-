import {
  AbsoluteFill,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Destello, LineaDeCarga } from "../efectos";
import { AZUL, NEGRO } from "../marca";
import { Plano, type Transicion } from "../Plano";
import { Rotulo } from "../Rotulo";
import {
  BarraProgreso,
  Brasas,
  Chispas,
  DestelloAnamorfico,
  OndaExpansiva,
} from "../vfx";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// El trabajo de estos meses, un plano por pulso (2–6 s): de montar las
// estanterías a las luces, la nevera, el rótulo y la fachada terminada.
const PLANOS: ReadonlyArray<{
  readonly nombre: string;
  readonly archivo: string;
  readonly inicio: number;
  readonly velocidad?: number;
  readonly zoom: readonly [number, number];
  readonly origen: string;
  readonly entrada: Transicion;
  readonly salida?: Transicion;
  readonly bloom?: number;
}> = [
  {
    nombre: "Montando las estanterías",
    archivo: "clips/montaje.webm",
    inicio: 2.4,
    zoom: [1.25, 1.33],
    origen: "50% 25%",
    entrada: "zoom",
    salida: "barrido-izq",
  },
  {
    nombre: "Las estanterías",
    archivo: "clips/estanteria-travelling.webm",
    inicio: 2.2,
    zoom: [1.1, 1.18],
    origen: "50% 50%",
    entrada: "barrido-izq",
  },
  {
    nombre: "La pared de estanterías",
    archivo: "clips/interior-revelacion.webm",
    inicio: 1.8,
    zoom: [1.1, 1.18],
    origen: "40% 45%",
    entrada: "zoom",
  },
  {
    nombre: "El techo de LED",
    archivo: "clips/interior-revelacion.webm",
    inicio: 5.9,
    zoom: [1.6, 1.7],
    origen: "50% 4%",
    entrada: "zoom",
    salida: "barrido-der",
    bloom: 1,
  },
  {
    nombre: "La nevera con su LED",
    archivo: "clips/nevera-led.webm",
    inicio: 2.8,
    zoom: [1.75, 1.9],
    origen: "82% 30%",
    entrada: "barrido-der",
    bloom: 1,
  },
  {
    nombre: "El rótulo con la escalera",
    archivo: "fotos/escalera.jpg",
    inicio: 0,
    zoom: [1.22, 1.3],
    origen: "55% 20%",
    entrada: "zoom",
    salida: "barrido-izq",
  },
  {
    nombre: "Las letras del rótulo",
    archivo: "clips/fachada-rotulo-60fps.webm",
    inicio: 15.6,
    velocidad: 0.5,
    zoom: [1.1, 1.2],
    origen: "50% 30%",
    entrada: "barrido-izq",
  },
  {
    nombre: "La fachada terminada",
    archivo: "fotos/fachada.jpg",
    inicio: 0,
    zoom: [1.06, 1.14],
    origen: "50% 30%",
    entrada: "zoom",
    salida: "zoom",
  },
];

// 0–8 s del aviso. «HEMOS ESTADO TRABAJANDO MUCHO» con dos golpes de
// forja, el montaje del trabajo con la barra que llega al 100 %, «PERO YA OS
// PODEMOS DECIR...» y medio segundo de casi silencio antes del logo.
export const Trabajo: React.FC = () => {
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
        semilla={13}
        intensidad={0.75}
        style={{ opacity: interpolate(frame, [56, 66], [1, 0], clamp) }}
      />

      {PLANOS.map((p, i) => (
        <Plano
          key={p.nombre}
          name={p.nombre}
          from={60 + i * 15}
          durationInFrames={15}
          premountFor={fps}
          archivo={p.archivo}
          inicio={p.inicio}
          velocidad={p.velocidad ?? 1}
          zoomInicial={p.zoom[0]}
          zoomFinal={p.zoom[1]}
          origen={p.origen}
          brillo={0.9}
          entrada={p.entrada}
          salida={p.salida ?? "corte"}
          temblor={10}
          bloom={p.bloom ?? 0}
        />
      ))}
      <Interactive.Div
        name="Sombra del suelo bajo el techo de LED"
        from={105}
        durationInFrames={15}
        premountFor={fps}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(3, 5, 9, 0) 46%, rgba(3, 5, 9, 0.85) 72%, #030509 90%)",
        }}
      />
      <BarraProgreso
        name="Trabajando… 100 %"
        from={60}
        durationInFrames={120}
        premountFor={fps}
        y={1440}
        ancho={760}
      />

      <Plano
        name="El rótulo de noche"
        from={180}
        durationInFrames={45}
        premountFor={fps}
        archivo="clips/fachada-rotulo-60fps.webm"
        inicio={8.4}
        velocidad={0.5}
        zoomInicial={1.25}
        zoomFinal={1.38}
        origen="50% 35%"
        brillo={0.32}
        entrada="zoom"
      />
      <Brasas
        name="Brasas antes del logo"
        from={210}
        durationInFrames={30}
        premountFor={fps}
        cantidad={60}
        semilla={21}
        intensidad={0.9}
        style={{ opacity: interpolate(frame, [210, 222], [0, 1], clamp) }}
      />
      <LineaDeCarga
        name="Carga antes del logo"
        from={225}
        durationInFrames={15}
        premountFor={fps}
        color={AZUL}
      />

      <OndaExpansiva
        name="Onda de Hemos estado"
        from={0}
        durationInFrames={22}
        premountFor={fps}
        x={540}
        y={900}
        color="#bfe0ff"
      />
      <Rotulo
        name="Hemos estado"
        from={0}
        durationInFrames={30}
        premountFor={fps}
        destacado=""
        tamano={170}
        y={900}
        metal
      >
        {"HEMOS\nESTADO"}
      </Rotulo>
      <DestelloAnamorfico
        name="Destello de Hemos estado"
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
        semilla={31}
        fuerza={52}
      />
      <Rotulo
        name="Trabajando mucho"
        from={30}
        durationInFrames={30}
        premountFor={fps}
        destacado="MUCHO"
        tamano={150}
        y={900}
        metal
        fundido
      >
        {"TRABAJANDO"}
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
        name="Golpe del yunque"
        from={30}
        durationInFrames={6}
        premountFor={fps}
        intensidad={0.3}
        color="#ff9a4a"
      />

      <Rotulo
        name="Pero ya"
        from={180}
        durationInFrames={45}
        premountFor={fps}
        destacado=""
        tamano={150}
        y={800}
        metal
      >
        {"PERO YA"}
      </Rotulo>
      <Rotulo
        name="Os podemos decir..."
        from={195}
        durationInFrames={30}
        premountFor={fps}
        destacado="DECIR..."
        tamano={110}
        y={990}
        metal
      >
        {"OS PODEMOS"}
      </Rotulo>
      <DestelloAnamorfico
        name="Destello de Pero ya"
        from={180}
        durationInFrames={18}
        premountFor={fps}
        y={800}
        color={AZUL}
        intensidad={0.7}
      />
      <Destello
        name="Golpe de Pero ya"
        from={180}
        durationInFrames={6}
        premountFor={fps}
        intensidad={0.3}
        color="#ffffff"
      />
    </AbsoluteFill>
  );
};
