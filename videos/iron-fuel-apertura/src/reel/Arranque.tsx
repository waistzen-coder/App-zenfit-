import { AbsoluteFill, Interactive, useVideoConfig } from "remotion";
import { Destello } from "../efectos";
import { NEGRO } from "../marca";
import { Plano, type Transicion } from "../Plano";
import { Rotulo } from "../Rotulo";
import { Chispas, DestelloAnamorfico, Quemadura, TubosNeon } from "../vfx";

// El montaje sigue la rejilla de la música del reel (120 BPM, una corchea
// son 7,5 fotogramas): un plano por pulso y, en las letras del rótulo, un
// corte por corchea, como los barridos de letras de la referencia.
const PLANOS: ReadonlyArray<{
  readonly nombre: string;
  readonly desde: number;
  readonly hasta: number;
  readonly archivo: string;
  readonly inicio: number;
  readonly velocidad?: number;
  readonly zoom: readonly [number, number];
  readonly origen: string;
  readonly entrada: Transicion;
  readonly salida?: Transicion;
  readonly ojoDePez?: number;
  readonly bloom?: number;
}> = [
  {
    nombre: "La nevera con su LED",
    desde: 75,
    hasta: 90,
    archivo: "clips/nevera-led.webm",
    inicio: 2.8,
    zoom: [1.6, 1.75],
    origen: "82% 30%",
    entrada: "zoom",
    ojoDePez: 1.6,
    bloom: 1,
  },
  {
    nombre: "La pared de estanterías",
    desde: 90,
    hasta: 105,
    archivo: "clips/interior-revelacion.webm",
    inicio: 1.8,
    zoom: [1.15, 1.25],
    origen: "40% 45%",
    entrada: "corte",
    ojoDePez: 1.8,
  },
  {
    nombre: "Montando las estanterías",
    desde: 105,
    hasta: 120,
    archivo: "clips/montaje.webm",
    inicio: 2.4,
    zoom: [1.25, 1.33],
    origen: "50% 25%",
    entrada: "zoom",
  },
  {
    nombre: "Travelling por las estanterías",
    desde: 120,
    hasta: 135,
    archivo: "clips/estanteria-travelling.webm",
    inicio: 2.2,
    zoom: [1.15, 1.22],
    origen: "50% 50%",
    entrada: "corte",
    salida: "barrido-der",
    ojoDePez: 1.8,
  },
  {
    nombre: "Letras 1",
    desde: 135,
    hasta: 142,
    archivo: "clips/fachada-rotulo-60fps.webm",
    inicio: 15.4,
    velocidad: 0.5,
    zoom: [1.25, 1.3],
    origen: "50% 30%",
    entrada: "barrido-der",
  },
  {
    nombre: "Letras 2",
    desde: 142,
    hasta: 150,
    archivo: "clips/fachada-rotulo-60fps.webm",
    inicio: 12.6,
    velocidad: 0.5,
    zoom: [1.4, 1.45],
    origen: "55% 25%",
    entrada: "corte",
  },
  {
    nombre: "Letras 3",
    desde: 150,
    hasta: 157,
    archivo: "clips/fachada-rotulo-60fps.webm",
    inicio: 16.6,
    velocidad: 0.5,
    zoom: [1.3, 1.35],
    origen: "45% 30%",
    entrada: "corte",
  },
  {
    nombre: "Letras 4",
    desde: 157,
    hasta: 180,
    archivo: "clips/fachada-rotulo-60fps.webm",
    inicio: 11.6,
    velocidad: 0.5,
    zoom: [1.2, 1.3],
    origen: "50% 30%",
    entrada: "corte",
  },
  {
    nombre: "El rótulo con la escalera",
    desde: 180,
    hasta: 195,
    archivo: "fotos/escalera.jpg",
    inicio: 0,
    zoom: [1.22, 1.32],
    origen: "55% 20%",
    entrada: "zoom",
  },
];

// 0–6,5 s del reel. Arranque oscuro con tubos de neón sobre el rótulo y
// «HEMOS ESTADO»; en el golpe (1,5 s) una quemadura roja y blanca, «TRABAJANDO
// MUCHO» y el montaje del trabajo a ritmo.
export const Arranque: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Plano
        name="El rótulo a oscuras"
        from={0}
        durationInFrames={45}
        premountFor={fps}
        archivo="clips/fachada-rotulo-60fps.webm"
        inicio={8.4}
        velocidad={0.5}
        zoomInicial={1.25}
        zoomFinal={1.35}
        origen="50% 35%"
        brillo={0.26}
      />
      <TubosNeon
        name="Tubos de neón"
        from={0}
        durationInFrames={45}
        premountFor={fps}
        cantidad={9}
        semilla={4}
      />

      <Plano
        name="El techo de LED"
        from={45}
        durationInFrames={30}
        premountFor={fps}
        archivo="clips/interior-revelacion.webm"
        inicio={5.9}
        velocidad={1}
        zoomInicial={1.6}
        zoomFinal={1.72}
        origen="50% 4%"
        brillo={1}
        entrada="zoom"
        golpe={1.4}
        temblor={20}
        bloom={1.2}
      />
      <Interactive.Div
        name="Sombra del suelo"
        from={45}
        durationInFrames={30}
        premountFor={fps}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(3, 5, 9, 0) 46%, rgba(3, 5, 9, 0.85) 72%, #030509 90%)",
        }}
      />
      {PLANOS.map((p) => (
        <Plano
          key={p.nombre}
          name={p.nombre}
          from={p.desde}
          durationInFrames={p.hasta - p.desde}
          premountFor={fps}
          archivo={p.archivo}
          inicio={p.inicio}
          velocidad={p.velocidad ?? 1}
          zoomInicial={p.zoom[0]}
          zoomFinal={p.zoom[1]}
          origen={p.origen}
          brillo={0.95}
          entrada={p.entrada}
          salida={p.salida ?? "corte"}
          temblor={8}
          ojoDePez={p.ojoDePez ?? 0}
          bloom={p.bloom ?? 0}
        />
      ))}

      <Rotulo
        name="Hemos estado"
        from={15}
        durationInFrames={30}
        premountFor={fps}
        destacado=""
        tamano={160}
        y={900}
        metal
      >
        {"HEMOS\nESTADO"}
      </Rotulo>
      <Chispas
        name="Chispas del golpe"
        from={45}
        durationInFrames={36}
        premountFor={fps}
        x={540}
        y={1040}
        cantidad={150}
        semilla={37}
        fuerza={50}
      />
      <Rotulo
        name="Trabajando mucho"
        from={45}
        durationInFrames={30}
        premountFor={fps}
        destacado="MUCHO"
        tamano={150}
        y={960}
        metal
        fundido
      >
        {"TRABAJANDO"}
      </Rotulo>
      <DestelloAnamorfico
        name="Destello de Hemos estado"
        from={15}
        durationInFrames={18}
        premountFor={fps}
        y={900}
        color="#ff2a4a"
        intensidad={0.8}
      />

      <Quemadura
        name="Quemadura del golpe"
        from={42}
        durationInFrames={12}
        premountFor={fps}
        color="#ff2338"
      />
      <Destello
        name="Golpe"
        from={45}
        durationInFrames={5}
        premountFor={fps}
        intensidad={0.55}
        color="#ffffff"
      />
      {[75, 135, 180, 187].map((f) => (
        <Destello
          key={f}
          name="Golpe a ritmo"
          from={f}
          durationInFrames={4}
          premountFor={fps}
          intensidad={0.25}
          color="#ffffff"
        />
      ))}
    </AbsoluteFill>
  );
};
