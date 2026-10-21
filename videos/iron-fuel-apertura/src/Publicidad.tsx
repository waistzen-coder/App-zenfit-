import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Destello, Grano, Vineta } from "./efectos";
import { AZUL, NEGRO } from "./marca";
import { Plano, type Transicion } from "./Plano";
import { BarridoDeLuz } from "./publicidad/BarridoDeLuz";
import { BordeElectrico } from "./publicidad/BordeElectrico";
import { CierreLogo } from "./publicidad/CierreLogo";
import { TextoGolpe } from "./publicidad/TextoGolpe";
import { DestelloAnamorfico } from "./vfx";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Las cuatro fotos de la tienda (preparar-medios.sh las etalona).
const FACHADA = "fotos/anuncio-fachada.jpg";
const SUPLEMENTOS = "fotos/anuncio-pasillo-suplementos.jpg";
const NEVERAS = "fotos/anuncio-pasillo-neveras.jpg";
const PROTEINAS = "fotos/anuncio-proteinas.jpg";

// Los golpes de la música (audio/musica_anuncio.py, 120 BPM: un pulso cada
// 15 fotogramas).
const DESTELLO = 15;
const INTERIOR = 60;
const INTENSO = 150;
const TIENDA = 300;
const LOGO = 360;
export const DURACION_PUBLICIDAD = 450;

type PlanoAnuncio = {
  readonly nombre: string;
  readonly archivo: string;
  readonly desde: number;
  readonly hasta: number;
  readonly zoom: readonly [number, number];
  /** Centro del zoom, medido sobre la foto entera. */
  readonly origen: string;
  /** Qué parte de la anchura de la foto se ve (0 izquierda, 1 derecha). */
  readonly encuadre?: number;
  readonly giro?: readonly [number, number];
  readonly paneo?: readonly [number, number];
  readonly entrada?: Transicion;
  readonly salida?: Transicion;
  readonly reflejo?: boolean;
  readonly bloom?: number;
  readonly golpe?: number;
};

// Un plano por golpe: generales que se mueven despacio y detalles de los
// productos con la cámara inclinada, alternando.
// En los detalles (medio segundo) el golpe de zoom de la entrada es suave y
// corto para que el producto se lea casi todo el plano; los barridos van
// entre planos generales.
const DETALLE = 0.45;
const PLANOS: readonly PlanoAnuncio[] = [
  // 2-5 s · el interior
  {
    nombre: "Pasillo de las neveras",
    archivo: NEVERAS,
    desde: 60,
    hasta: 90,
    zoom: [1.06, 1.16],
    origen: "48% 45%",
    giro: [-2, 0],
    entrada: "zoom",
    salida: "barrido-izq",
    bloom: 0.4,
    golpe: 1.2,
  },
  {
    nombre: "Pasillo de los suplementos",
    archivo: SUPLEMENTOS,
    desde: 90,
    hasta: 120,
    zoom: [1.18, 1.28],
    origen: "35% 50%",
    giro: [2, 1],
    entrada: "barrido-izq",
    bloom: 0.3,
  },
  {
    nombre: "Detalle: suplementos",
    archivo: SUPLEMENTOS,
    desde: 120,
    hasta: 135,
    zoom: [1.9, 2.0],
    origen: "18% 60%",
    encuadre: 0,
    giro: [-4, -4],
    entrada: "zoom",
    golpe: DETALLE,
  },
  {
    nombre: "Detalle: Whey & Milk",
    archivo: NEVERAS,
    desde: 135,
    hasta: 150,
    zoom: [1.9, 2.0],
    origen: "70% 40%",
    encuadre: 0.75,
    giro: [4, 4],
    entrada: "zoom",
    golpe: DETALLE,
  },
  // 5-10 s · lo más intenso
  {
    nombre: "Las proteínas Blue King",
    archivo: PROTEINAS,
    desde: 150,
    hasta: 180,
    zoom: [1.0, 1.06],
    origen: "55% 15%",
    giro: [-3, -1],
    entrada: "zoom",
    reflejo: true,
    bloom: 0.5,
    golpe: 1.2,
  },
  {
    nombre: "Detalle: latas de C4",
    archivo: NEVERAS,
    desde: 180,
    hasta: 195,
    zoom: [1.9, 2.0],
    origen: "93% 68%",
    encuadre: 1,
    giro: [5, 5],
    entrada: "zoom",
    golpe: DETALLE,
  },
  {
    nombre: "Detalle: botes ISO",
    archivo: SUPLEMENTOS,
    desde: 195,
    hasta: 210,
    zoom: [1.9, 2.0],
    origen: "16% 27%",
    encuadre: 0,
    giro: [-5, -5],
    entrada: "zoom",
    golpe: DETALLE,
  },
  {
    nombre: "Detalle: Rice Up",
    archivo: NEVERAS,
    desde: 210,
    hasta: 225,
    zoom: [1.8, 1.9],
    origen: "9% 56%",
    encuadre: 0,
    giro: [4, 4],
    entrada: "zoom",
    salida: "barrido-der",
    golpe: DETALLE,
  },
  {
    nombre: "La tienda, de lado",
    archivo: SUPLEMENTOS,
    desde: 225,
    hasta: 255,
    zoom: [1.14, 1.22],
    origen: "50% 45%",
    paneo: [-3, 3],
    giro: [-3, -2],
    entrada: "barrido-der",
    bloom: 0.5,
  },
  {
    nombre: "Detalle: Whey cookies",
    archivo: PROTEINAS,
    desde: 255,
    hasta: 270,
    zoom: [1.8, 1.9],
    origen: "44% 64%",
    giro: [-4, -4],
    entrada: "zoom",
    reflejo: true,
    golpe: DETALLE,
  },
  {
    nombre: "Detalle: latas de Monster",
    archivo: NEVERAS,
    desde: 270,
    hasta: 285,
    zoom: [2.0, 2.1],
    origen: "88% 93%",
    encuadre: 1,
    giro: [5, 5],
    entrada: "zoom",
    golpe: DETALLE,
  },
  {
    nombre: "Detalle: protein chips",
    archivo: SUPLEMENTOS,
    desde: 285,
    hasta: 300,
    zoom: [1.8, 1.9],
    origen: "92% 62%",
    encuadre: 1,
    giro: [-4, -4],
    entrada: "zoom",
    golpe: DETALLE,
  },
  // 10-12 s · la tienda entera
  {
    nombre: "La tienda entera",
    archivo: SUPLEMENTOS,
    desde: 300,
    hasta: 360,
    zoom: [1.0, 1.08],
    origen: "52% 42%",
    entrada: "zoom",
    bloom: 0.6,
    golpe: 1.4,
  },
];

const CORTES = PLANOS.map((p) => p.desde).filter((f) => f > INTERIOR);

/** La fachada a oscuras hasta que el destello azul enciende el rótulo. */
const Oscuridad: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: NEGRO,
        opacity: interpolate(
          frame,
          [0, DESTELLO - 1, DESTELLO + 3],
          [0.86, 0.8, 0.12],
          clamp,
        ),
      }}
    />
  );
};

/** La imagen se quema hacia el blanco azulado justo antes del logo. */
const SubidaDeLuz: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#e6f3ff",
        mixBlendMode: "screen",
        opacity: interpolate(frame, [0, 7], [0, 0.75], {
          ...clamp,
          easing: (t) => t * t,
        }),
      }}
    />
  );
};

/**
 * Anuncio de 15 s para Instagram de Iron Fuel Nutrition (Motril), hecho
 * solo con las cuatro fotos de la tienda: la fachada a oscuras que se
 * enciende con un destello azul («MOTRIL, SUBE EL NIVEL»), el interior, un
 * plano por golpe entre los productos («ALIMENTA TU OBJETIVO»), la tienda
 * entera y el logo original con «TE ESPERAMOS EN MOTRIL» y el Instagram.
 * Música: audio/musica_anuncio.py.
 */
export const Publicidad: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      {/* 0-2 s · la fachada */}
      <Plano
        name="La fachada"
        from={0}
        durationInFrames={INTERIOR}
        premountFor={fps}
        archivo={FACHADA}
        inicio={0}
        velocidad={1}
        zoomInicial={1.08}
        zoomFinal={1.22}
        origen="32% 14%"
        encuadre={0.3}
        proporcion={0.75}
        brillo={1}
        salida="zoom"
        bloom={0.9}
        temblor={0}
      />
      <Sequence name="Fachada a oscuras" durationInFrames={INTERIOR}>
        {/* La acera y lo que hay delante de la puerta, en sombra. */}
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(3, 5, 9, 0) 42%, rgba(3, 5, 9, 0.7) 62%, rgba(3, 5, 9, 0.92) 100%)",
          }}
        />
        <Oscuridad />
      </Sequence>
      <BordeElectrico
        name="Borde eléctrico del destello"
        from={DESTELLO}
        durationInFrames={30}
        premountFor={fps}
      />
      <DestelloAnamorfico
        name="Destello del rótulo"
        from={DESTELLO}
        durationInFrames={24}
        premountFor={fps}
        y={330}
        color={AZUL}
        intensidad={1}
      />
      <TextoGolpe
        name="Motril, sube el nivel"
        from={30}
        durationInFrames={INTERIOR - 30}
        premountFor={fps}
        y={1060}
        lineas={[
          { texto: "MOTRIL,", azul: true, tamano: 170, entra: 0 },
          { texto: "SUBE EL NIVEL", tamano: 120, entra: 7 },
        ]}
      />

      {/* 2-12 s · el interior, los productos y la tienda entera */}
      {PLANOS.map((p) => (
        <Plano
          key={p.nombre}
          name={p.nombre}
          from={p.desde}
          durationInFrames={p.hasta - p.desde}
          premountFor={fps}
          archivo={p.archivo}
          inicio={0}
          velocidad={1}
          zoomInicial={p.zoom[0]}
          zoomFinal={p.zoom[1]}
          origen={p.origen}
          encuadre={p.encuadre ?? 0.5}
          proporcion={0.75}
          brillo={1}
          giro={p.giro}
          paneo={p.paneo}
          entrada={p.entrada}
          salida={p.salida}
          reflejo={p.reflejo}
          bloom={p.bloom}
          golpe={p.golpe}
          temblor={p.desde === INTENSO || p.desde === TIENDA ? 16 : 6}
        />
      ))}
      <TextoGolpe
        name="Alimenta tu objetivo"
        from={INTENSO}
        durationInFrames={60}
        premountFor={fps}
        y={190}
        lineas={[
          { texto: "ALIMENTA", tamano: 132, entra: 0 },
          { texto: "TU OBJETIVO", azul: true, tamano: 112, entra: 7 },
        ]}
      />
      {/* Luces de colores (azul eléctrico y violeta) en los golpes fuertes. */}
      {[
        { f: INTERIOR, color: "#2f7bff", angulo: 110 },
        { f: INTENSO, color: "#2f7bff", angulo: 70 },
        { f: 225, color: "#7a3cff", angulo: 115 },
        { f: TIENDA, color: "#2f7bff", angulo: 65 },
      ].map((l) => (
        <BarridoDeLuz
          key={l.f}
          name="Luz de color"
          from={l.f}
          durationInFrames={18}
          premountFor={fps}
          color={l.color}
          angulo={l.angulo}
          intensidad={0.55}
        />
      ))}
      {[INTERIOR, INTENSO, TIENDA].map((f) => (
        <DestelloAnamorfico
          key={f}
          name="Destello del golpe"
          from={f}
          durationInFrames={18}
          premountFor={fps}
          y={760}
          color={AZUL}
          intensidad={0.8}
        />
      ))}
      {CORTES.map((f) => (
        <Destello
          key={f}
          name="Fogonazo del corte"
          from={f}
          durationInFrames={3}
          premountFor={fps}
          intensidad={f === INTENSO || f === TIENDA ? 0.55 : 0.18}
          color="#dcefff"
        />
      ))}
      <Destello
        name="Golpe del interior"
        from={INTERIOR}
        durationInFrames={6}
        premountFor={fps}
        intensidad={0.6}
        color="#cfe8ff"
      />
      <Destello
        name="Destello azul del rótulo"
        from={DESTELLO}
        durationInFrames={8}
        premountFor={fps}
        intensidad={0.7}
        color={AZUL}
      />
      {/* La luz que lleva al cierre. */}
      <BarridoDeLuz
        name="Luz hacia el logo"
        from={LOGO - 16}
        durationInFrames={16}
        premountFor={fps}
        color="#7cc0ff"
        angulo={100}
        intensidad={0.8}
      />
      <Sequence
        name="Luz blanca hacia el logo"
        from={LOGO - 8}
        durationInFrames={8}
      >
        <SubidaDeLuz />
      </Sequence>

      {/* 12-15 s · el logo */}
      <Sequence
        name="Cierre con el logo"
        from={LOGO}
        durationInFrames={DURACION_PUBLICIDAD - LOGO}
        premountFor={fps}
      >
        <CierreLogo />
      </Sequence>

      <Vineta />
      <Grano />
      <Audio
        name="Música del anuncio"
        src={staticFile("audio/musica-anuncio.wav")}
        premountFor={fps}
      />
    </AbsoluteFill>
  );
};
