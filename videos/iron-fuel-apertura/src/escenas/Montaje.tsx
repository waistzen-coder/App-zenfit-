import { AbsoluteFill, useVideoConfig } from "remotion";
import { Destello, FugaDeLuz } from "../efectos";
import { AZUL, NEGRO } from "../marca";
import { Plano } from "../Plano";
import { Rotulo } from "../Rotulo";

// 4–12 s. Ocho planos de un segundo, uno por cada dos pulsos de la música.
// Los textos caen en los compases (con el golpe de yunque) y los planos
// sin texto entran con barridos o zoom en el tercer pulso.
export const Montaje: React.FC = () => {
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
      />
      <Plano
        name="El techo de LED"
        from={90}
        durationInFrames={30}
        premountFor={fps}
        archivo="clips/interior-revelacion.webm"
        inicio={5.8}
        velocidad={1}
        zoomInicial={1.1}
        zoomFinal={1.22}
        origen="50% 20%"
        brillo={1}
        entrada="barrido-der"
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
      />
      <Plano
        name="Pasillo hacia el escaparate"
        from={180}
        durationInFrames={30}
        premountFor={fps}
        archivo="clips/estanteria-travelling.webm"
        inicio={4.9}
        velocidad={1}
        zoomInicial={1.05}
        zoomFinal={1.14}
        origen="50% 40%"
        brillo={1}
        entrada="zoom"
        salida="barrido-izq"
      />
      <Plano
        name="El techo de la entrada"
        from={210}
        durationInFrames={30}
        premountFor={fps}
        archivo="clips/entrada-techo-led.webm"
        inicio={4.6}
        velocidad={1}
        zoomInicial={1.1}
        zoomFinal={1.2}
        origen="50% 25%"
        brillo={1}
        entrada="barrido-izq"
      />
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
      >
        {"CADA"}
      </Rotulo>
      <Rotulo
        name="Pensado para ti"
        from={180}
        durationInFrames={58}
        premountFor={fps}
        destacado="PARA TI"
        tamano={160}
        y={900}
      >
        {"PENSADO"}
      </Rotulo>
      <Destello
        name="Golpe de Cada estante"
        from={0}
        durationInFrames={6}
        premountFor={fps}
        intensidad={0.35}
        color={AZUL}
      />
      <Destello
        name="Golpe de Cada luz"
        from={60}
        durationInFrames={6}
        premountFor={fps}
        intensidad={0.35}
        color="#ffffff"
      />
      <Destello
        name="Golpe de Cada detalle"
        from={120}
        durationInFrames={6}
        premountFor={fps}
        intensidad={0.35}
        color={AZUL}
      />
      <Destello
        name="Golpe de Pensado para ti"
        from={180}
        durationInFrames={6}
        premountFor={fps}
        intensidad={0.35}
        color="#ffffff"
      />
    </AbsoluteFill>
  );
};
