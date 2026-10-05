import { AbsoluteFill, useVideoConfig } from "remotion";
import { Destello, FugaDeLuz } from "../efectos";
import { AZUL, NEGRO } from "../marca";
import { Plano } from "../Plano";
import { Rotulo } from "../Rotulo";
import { DestelloAnamorfico } from "../vfx";

// Lo que va a llenar los estantes: una palabra por pulso, con un plano
// distinto y un golpe de taiko en cada una (10–12 s de la música).
const PRODUCTOS = [
  {
    palabra: "PROTEÍNA",
    tamano: 168,
    archivo: "clips/estanteria-travelling.webm",
    inicio: 2,
    origen: "50% 50%",
  },
  {
    palabra: "CREATINA",
    tamano: 168,
    archivo: "clips/interior-revelacion.webm",
    inicio: 1,
    origen: "40% 45%",
  },
  {
    palabra: "PRE-ENTRENO",
    tamano: 128,
    archivo: "clips/estanteria-rincon.webm",
    inicio: 2.6,
    origen: "50% 40%",
  },
  {
    palabra: "Y MUCHO MÁS",
    tamano: 128,
    archivo: "clips/estanteria-travelling.webm",
    inicio: 5.2,
    origen: "70% 45%",
  },
] as const;

// 4–12 s. Planos de un segundo con «CADA ESTANTE», «CADA LUZ», «CADA
// DETALLE» en los compases, y al final cuatro palabras en dos segundos.
// Los barridos caen en los «whoosh» de la banda sonora.
export const MontajeEpico: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Plano
        name="Travelling por la estantería"
        from={0}
        durationInFrames={30}
        premountFor={fps}
        archivo="clips/estanteria-travelling.webm"
        inicio={1.8}
        velocidad={1}
        zoomInicial={1.05}
        zoomFinal={1.15}
        origen="50% 50%"
        brillo={1}
        entrada="zoom"
        salida="barrido-izq"
      />
      <Plano
        name="La pared de estanterías"
        from={30}
        durationInFrames={30}
        premountFor={fps}
        archivo="clips/interior-revelacion.webm"
        inicio={0.4}
        velocidad={1}
        zoomInicial={1.08}
        zoomFinal={1.16}
        origen="50% 50%"
        brillo={1}
        entrada="barrido-izq"
      />
      <Plano
        name="La nevera con su LED"
        from={60}
        durationInFrames={30}
        premountFor={fps}
        archivo="clips/nevera-led.webm"
        inicio={2.6}
        velocidad={1}
        zoomInicial={1.75}
        zoomFinal={1.95}
        origen="82% 30%"
        brillo={1}
        entrada="zoom"
        salida="barrido-der"
        bloom={1.6}
      />
      <Plano
        name="Los paneles de LED de la entrada"
        from={90}
        durationInFrames={30}
        premountFor={fps}
        archivo="clips/entrada-techo-led.webm"
        inicio={4.6}
        velocidad={1}
        zoomInicial={1.1}
        zoomFinal={1.2}
        origen="50% 25%"
        brillo={1}
        entrada="barrido-der"
        bloom={1.2}
      />
      <Plano
        name="Góndola de cerca"
        from={120}
        durationInFrames={30}
        premountFor={fps}
        archivo="clips/nevera-led.webm"
        inicio={5.6}
        velocidad={1}
        zoomInicial={1.05}
        zoomFinal={1.15}
        origen="50% 50%"
        brillo={1}
        entrada="zoom"
        salida="zoom"
      />
      <Plano
        name="Góndola con rejilla"
        from={150}
        durationInFrames={30}
        premountFor={fps}
        archivo="clips/estanteria-rincon.webm"
        inicio={0.3}
        velocidad={1}
        zoomInicial={1.06}
        zoomFinal={1.16}
        origen="50% 40%"
        brillo={1}
        entrada="zoom"
        bloom={0.8}
      />
      {PRODUCTOS.map((p, i) => (
        <Plano
          key={p.palabra}
          name={`Plano de ${p.palabra}`}
          from={180 + i * 15}
          durationInFrames={15}
          premountFor={fps}
          archivo={p.archivo}
          inicio={p.inicio}
          velocidad={1}
          zoomInicial={1.12}
          zoomFinal={1.2}
          origen={p.origen}
          brillo={0.62}
          entrada={i === 2 ? "barrido-izq" : "zoom"}
          salida={i === 1 ? "barrido-izq" : i === 3 ? "zoom" : "corte"}
          temblor={14}
        />
      ))}

      <FugaDeLuz
        name="Fuga en el zoom"
        from={140}
        durationInFrames={24}
        premountFor={fps}
        semilla={3}
        tono={200}
      />
      <Rotulo
        name="Cada estante"
        from={0}
        durationInFrames={28}
        premountFor={fps}
        destacado="ESTANTE"
        tamano={170}
        y={900}
        metal
      >
        {"CADA"}
      </Rotulo>
      <Rotulo
        name="Cada luz"
        from={60}
        durationInFrames={28}
        premountFor={fps}
        destacado="LUZ"
        tamano={190}
        y={900}
        metal
      >
        {"CADA"}
      </Rotulo>
      <Rotulo
        name="Cada detalle"
        from={120}
        durationInFrames={28}
        premountFor={fps}
        destacado="DETALLE"
        tamano={170}
        y={900}
        metal
      >
        {"CADA"}
      </Rotulo>
      {PRODUCTOS.map((p, i) => (
        <Rotulo
          key={p.palabra}
          name={p.palabra}
          from={180 + i * 15}
          durationInFrames={15}
          premountFor={fps}
          destacado={p.palabra}
          tamano={p.tamano}
          y={940}
          fundido
        >
          {""}
        </Rotulo>
      ))}

      {[0, 60, 120].map((f) => (
        <DestelloAnamorfico
          key={f}
          name="Destello del texto"
          from={f}
          durationInFrames={18}
          premountFor={fps}
          y={900}
          color={AZUL}
          intensidad={0.7}
        />
      ))}
      {[0, 60, 120].map((f, i) => (
        <Destello
          key={f}
          name="Golpe del texto"
          from={f}
          durationInFrames={6}
          premountFor={fps}
          intensidad={0.35}
          color={i === 1 ? "#ffffff" : AZUL}
        />
      ))}
      {PRODUCTOS.map((p, i) => (
        <Destello
          key={p.palabra}
          name={`Golpe de ${p.palabra}`}
          from={180 + i * 15}
          durationInFrames={5}
          premountFor={fps}
          intensidad={0.4}
          color="#ffb070"
        />
      ))}
    </AbsoluteFill>
  );
};
