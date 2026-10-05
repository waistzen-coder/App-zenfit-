import { AbsoluteFill, useVideoConfig } from "remotion";
import { Destello, FugaDeLuz } from "../efectos";
import { NEGRO } from "../marca";
import { Plano } from "../Plano";
import { Rotulo } from "../Rotulo";

// 16–24 s. El golpe: el rótulo a cámara lenta en contrapicado, las letras
// de cerca y las dos fotos de los últimos retoques. Los barridos coinciden
// con los «whoosh» de la banda sonora y van hacia el mismo lado.
export const Fachada: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Plano
        name="El rótulo a cámara lenta"
        from={0}
        durationInFrames={90}
        premountFor={fps}
        archivo="clips/fachada-rotulo-60fps.webm"
        inicio={10.2}
        velocidad={0.5}
        zoomInicial={1.08}
        zoomFinal={1.2}
        origen="60% 30%"
        brillo={1}
        entrada="zoom"
        salida="barrido-der"
        temblor={34}
      />
      <Plano
        name="Las letras de cerca"
        from={90}
        durationInFrames={60}
        premountFor={fps}
        archivo="clips/fachada-rotulo-60fps.webm"
        inicio={15.4}
        velocidad={0.5}
        zoomInicial={1.1}
        zoomFinal={1.22}
        origen="50% 30%"
        brillo={1}
        entrada="barrido-der"
        salida="barrido-izq"
      />
      <Plano
        name="Foto con la escalera"
        from={150}
        durationInFrames={45}
        premountFor={fps}
        archivo="fotos/escalera.jpg"
        inicio={0}
        velocidad={1}
        zoomInicial={1.22}
        zoomFinal={1.32}
        origen="55% 20%"
        brillo={1}
        entrada="barrido-izq"
        salida="barrido-der"
      />
      <Plano
        name="Foto de la fachada"
        from={195}
        durationInFrames={45}
        premountFor={fps}
        archivo="fotos/fachada.jpg"
        inicio={0}
        velocidad={1}
        zoomInicial={1.06}
        zoomFinal={1.16}
        origen="50% 30%"
        brillo={1}
        entrada="barrido-der"
      />
      <FugaDeLuz
        name="Fuga del golpe"
        from={0}
        durationInFrames={36}
        premountFor={fps}
        semilla={7}
        tono={205}
      />
      <Rotulo
        name="Últimos retoques"
        from={150}
        durationInFrames={88}
        premountFor={fps}
        destacado="RETOQUES"
        tamano={150}
        y={1200}
      >
        {"ÚLTIMOS"}
      </Rotulo>
      <Destello
        name="El golpe"
        from={0}
        durationInFrames={10}
        premountFor={fps}
        intensidad={1}
        color="#ffffff"
      />
    </AbsoluteFill>
  );
};
