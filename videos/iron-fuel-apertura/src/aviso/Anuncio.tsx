import { AbsoluteFill, useVideoConfig } from "remotion";
import { Destello, LineasDeMarca } from "../efectos";
import { AZUL, NEGRO } from "../marca";
import { Plano } from "../Plano";
import { Rotulo } from "../Rotulo";
import {
  Brasas,
  Chispas,
  DestelloAnamorfico,
  LogoForjado,
  OndaExpansiva,
  Siguenos,
} from "../vfx";

// 8–16 s del aviso. El logo sale de la forja al rojo vivo y se enfría hasta
// el azul de la marca; debajo, una frase por golpe: «PRÓXIMAMENTE OS
// DIREMOS», «FECHA Y HORA», «DE NUESTRA INAUGURACIÓN». El cierre lo resume
// todo con «ATENTOS». No invita a nadie a venir: la inauguración es para los
// suyos, el vídeo solo anuncia que la fecha y la hora están al caer.
export const Anuncio: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Plano
        name="Fondo: el rótulo de frente, desenfocado"
        from={0}
        durationInFrames={240}
        premountFor={fps}
        archivo="clips/fachada-rotulo-60fps.webm"
        inicio={8.4}
        velocidad={0.5}
        zoomInicial={1.3}
        zoomFinal={1.42}
        origen="50% 40%"
        brillo={0.22}
        style={{ filter: "brightness(0.22) saturate(0.8) blur(14px)" }}
      />
      <Brasas
        name="Brasas"
        from={0}
        durationInFrames={240}
        premountFor={fps}
        cantidad={55}
        semilla={9}
        intensidad={0.7}
      />
      <LineasDeMarca
        name="Líneas del rótulo"
        from={6}
        durationInFrames={234}
        premountFor={fps}
        color={AZUL}
      />
      <OndaExpansiva
        name="Onda del logo"
        from={0}
        durationInFrames={28}
        premountFor={fps}
        x={540}
        y={640}
        color="#ffc38a"
      />
      <LogoForjado
        name="Logo forjado"
        from={0}
        durationInFrames={240}
        premountFor={fps}
        y={640}
        ancho={820}
      />
      <Chispas
        name="Chispas del logo"
        from={0}
        durationInFrames={56}
        premountFor={fps}
        x={540}
        y={700}
        cantidad={230}
        semilla={67}
        fuerza={54}
      />
      <DestelloAnamorfico
        name="Destello del logo"
        from={0}
        durationInFrames={36}
        premountFor={fps}
        y={640}
        color="#ff9a4a"
        intensidad={1}
      />

      <Rotulo
        name="Próximamente os diremos"
        from={60}
        durationInFrames={30}
        premountFor={fps}
        destacado="OS DIREMOS"
        tamano={104}
        y={1090}
        metal
      >
        {"PRÓXIMAMENTE"}
      </Rotulo>
      <Rotulo
        name="Fecha y hora"
        from={90}
        durationInFrames={30}
        premountFor={fps}
        destacado="FECHA Y HORA"
        tamano={124}
        y={1090}
        fundido
      >
        {""}
      </Rotulo>
      <Chispas
        name="Chispas de Fecha y hora"
        from={90}
        durationInFrames={30}
        premountFor={fps}
        x={540}
        y={1130}
        cantidad={90}
        semilla={73}
        fuerza={34}
      />
      <Rotulo
        name="De nuestra inauguración"
        from={120}
        durationInFrames={60}
        premountFor={fps}
        destacado="INAUGURACIÓN"
        tamano={104}
        y={1090}
        metal
      >
        {"DE NUESTRA"}
      </Rotulo>

      <Rotulo
        name="Cierre: Inauguración"
        from={180}
        durationInFrames={60}
        premountFor={fps}
        destacado=""
        tamano={100}
        y={1000}
        salida={false}
        metal
      >
        {"INAUGURACIÓN"}
      </Rotulo>
      <Rotulo
        name="Cierre: Fecha y hora muy pronto"
        from={186}
        durationInFrames={54}
        premountFor={fps}
        destacado="MUY PRONTO"
        tamano={80}
        y={1150}
        salida={false}
      >
        {"FECHA Y HORA"}
      </Rotulo>
      <Siguenos
        name="Atentos"
        from={195}
        durationInFrames={45}
        premountFor={fps}
        y={1285}
        texto="ATENTOS"
        subtitulo=""
      />

      {[60, 120].map((f) => (
        <DestelloAnamorfico
          key={f}
          name="Destello de la frase"
          from={f}
          durationInFrames={18}
          premountFor={fps}
          y={1090}
          color={AZUL}
          intensidad={0.6}
        />
      ))}
      <DestelloAnamorfico
        name="Destello de Fecha y hora"
        from={90}
        durationInFrames={22}
        premountFor={fps}
        y={1090}
        color="#ff8a3d"
        intensidad={0.9}
      />
      <OndaExpansiva
        name="Onda del cierre"
        from={180}
        durationInFrames={22}
        premountFor={fps}
        x={540}
        y={1000}
        color="#bfe0ff"
      />
      <Destello
        name="Golpe del logo"
        from={0}
        durationInFrames={14}
        premountFor={fps}
        intensidad={0.8}
        color="#ffe2c2"
      />
      {[60, 90, 120, 180].map((f) => (
        <Destello
          key={f}
          name="Golpe de la frase"
          from={f}
          durationInFrames={6}
          premountFor={fps}
          intensidad={0.22}
          color={f === 90 ? "#ffb070" : AZUL}
        />
      ))}
    </AbsoluteFill>
  );
};
