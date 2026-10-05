import { AbsoluteFill, useVideoConfig } from "remotion";
import { Destello, FugaDeLuz } from "../efectos";
import { AZUL, NEGRO } from "../marca";
import { Plano } from "../Plano";
import { Rotulo } from "../Rotulo";
import { Chispas, DestelloAnamorfico, OndaExpansiva } from "../vfx";
import { tiempoRampa } from "./rampa";

// 16–24 s. El golpe: el rótulo llega a velocidad normal, se congela casi
// del todo (0,25×) con una lluvia de chispas que también va a cámara lenta
// y sale acelerando con el segundo compás. Después, las letras de cerca y
// las dos fotos de los últimos retoques. Los barridos coinciden con los
// «whoosh» de la banda sonora y los destellos con los platos.
export const FachadaEpica: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Plano
        name="El rótulo con rampa de velocidad"
        from={0}
        durationInFrames={90}
        premountFor={fps}
        archivo="clips/fachada-rampa.webm"
        inicio={0}
        velocidad={1}
        zoomInicial={1.06}
        zoomFinal={1.16}
        origen="55% 22%"
        brillo={1}
        entrada="zoom"
        salida="barrido-der"
        temblor={40}
        golpe={1.7}
        bloom={0.7}
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
        bloom={0.6}
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
        salida="zoom"
      />

      <FugaDeLuz
        name="Fuga del golpe"
        from={0}
        durationInFrames={36}
        premountFor={fps}
        semilla={7}
        tono={205}
        style={{ opacity: 0.4 }}
      />
      <Chispas
        name="Lluvia de chispas del rótulo"
        from={0}
        durationInFrames={90}
        premountFor={fps}
        x={560}
        y={430}
        cantidad={240}
        semilla={41}
        fuerza={34}
        tiempo={tiempoRampa}
      />
      <OndaExpansiva
        name="Onda del golpe"
        from={0}
        durationInFrames={26}
        premountFor={fps}
        x={560}
        y={430}
        color="#bfe0ff"
      />
      <DestelloAnamorfico
        name="Destello del rótulo"
        from={0}
        durationInFrames={40}
        premountFor={fps}
        y={430}
        color={AZUL}
        intensidad={1}
      />
      {[60, 120, 180].map((f) => (
        <DestelloAnamorfico
          key={f}
          name="Destello del plato"
          from={f}
          durationInFrames={16}
          premountFor={fps}
          y={f === 60 ? 430 : 520}
          color={AZUL}
          intensidad={0.55}
        />
      ))}

      <Rotulo
        name="Últimos retoques"
        from={150}
        durationInFrames={88}
        premountFor={fps}
        destacado="RETOQUES"
        tamano={150}
        y={1200}
        metal
      >
        {"ÚLTIMOS"}
      </Rotulo>
      <Destello
        name="El golpe"
        from={0}
        durationInFrames={12}
        premountFor={fps}
        intensidad={1}
        color="#ffffff"
      />
      {[60, 120, 180].map((f) => (
        <Destello
          key={f}
          name="Golpe del compás"
          from={f}
          durationInFrames={5}
          premountFor={fps}
          intensidad={0.22}
          color="#ffffff"
        />
      ))}
    </AbsoluteFill>
  );
};
