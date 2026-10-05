import { AbsoluteFill, useVideoConfig } from "remotion";
import { Destello, LineaDeCarga } from "../efectos";
import { AZUL, NEGRO } from "../marca";
import { Plano } from "../Plano";
import { Rotulo } from "../Rotulo";

// 12–16 s. La tienda entera de un vistazo, cuenta atrás y medio segundo
// de silencio con una línea que se carga antes del golpe.
export const Revelacion: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Plano
        name="La tienda entera"
        from={0}
        durationInFrames={60}
        premountFor={fps}
        archivo="clips/interior-revelacion.webm"
        inicio={10.5}
        velocidad={1}
        zoomInicial={1.14}
        zoomFinal={1.3}
        origen="62% 45%"
        brillo={0.9}
        entrada="zoom"
      />
      <Plano
        name="Cuenta atrás: 3"
        from={60}
        durationInFrames={15}
        premountFor={fps}
        archivo="clips/estanteria-rincon.webm"
        inicio={2}
        velocidad={1}
        zoomInicial={1.15}
        zoomFinal={1.25}
        origen="50% 40%"
        brillo={0.55}
        entrada="zoom"
      />
      <Plano
        name="Cuenta atrás: 2"
        from={75}
        durationInFrames={15}
        premountFor={fps}
        archivo="clips/nevera-led.webm"
        inicio={6.6}
        velocidad={1}
        zoomInicial={1.1}
        zoomFinal={1.2}
        origen="50% 50%"
        brillo={0.55}
        entrada="zoom"
      />
      <Plano
        name="Cuenta atrás: 1"
        from={90}
        durationInFrames={15}
        premountFor={fps}
        archivo="clips/montaje.webm"
        inicio={1.2}
        velocidad={1}
        zoomInicial={1.1}
        zoomFinal={1.2}
        origen="50% 50%"
        brillo={0.55}
        entrada="zoom"
      />
      <Rotulo
        name="Tu nueva tienda de"
        from={0}
        durationInFrames={58}
        premountFor={fps}
        destacado=""
        tamano={78}
        y={770}
      >
        {"TU NUEVA TIENDA DE"}
      </Rotulo>
      <Rotulo
        name="Suplementación deportiva"
        from={15}
        durationInFrames={43}
        premountFor={fps}
        destacado={"SUPLEMENTACIÓN\nDEPORTIVA"}
        tamano={100}
        y={935}
      >
        {""}
      </Rotulo>
      <Rotulo
        name="3"
        from={60}
        durationInFrames={15}
        premountFor={fps}
        destacado=""
        tamano={560}
        y={960}
      >
        {"3"}
      </Rotulo>
      <Rotulo
        name="2"
        from={75}
        durationInFrames={15}
        premountFor={fps}
        destacado=""
        tamano={560}
        y={960}
      >
        {"2"}
      </Rotulo>
      <Rotulo
        name="1"
        from={90}
        durationInFrames={15}
        premountFor={fps}
        destacado="1"
        tamano={560}
        y={960}
      >
        {""}
      </Rotulo>
      <LineaDeCarga
        name="Carga antes del golpe"
        from={105}
        durationInFrames={15}
        premountFor={fps}
        color={AZUL}
      />
      <Destello
        name="Golpe del 3"
        from={60}
        durationInFrames={6}
        premountFor={fps}
        intensidad={0.4}
        color="#ffffff"
      />
      <Destello
        name="Golpe del 2"
        from={75}
        durationInFrames={6}
        premountFor={fps}
        intensidad={0.4}
        color="#ffffff"
      />
      <Destello
        name="Golpe del 1"
        from={90}
        durationInFrames={6}
        premountFor={fps}
        intensidad={0.5}
        color={AZUL}
      />
    </AbsoluteFill>
  );
};
