import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Destello, LineaDeCarga } from "../efectos";
import { AZUL, NEGRO } from "../marca";
import { Plano } from "../Plano";
import { Rotulo } from "../Rotulo";
import { Brasas, DestelloAnamorfico, OndaExpansiva } from "../vfx";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// La cuenta atrás: un número de acero por pulso (14–15,5 s), cada uno con
// su plano oscuro detrás, su onda y su destello.
const CUENTA = [
  { numero: "3", archivo: "clips/entrada-techo-led.webm", inicio: 5.4 },
  { numero: "2", archivo: "clips/nevera-led.webm", inicio: 6.6 },
  { numero: "1", archivo: "clips/montaje.webm", inicio: 1.2 },
] as const;

// 12–16 s. La tienda entera con los metales, la cuenta atrás y medio
// segundo de casi silencio con brasas y una línea que se carga antes del
// golpe de la fachada.
export const RevelacionEpica: React.FC = () => {
  const frame = useCurrentFrame();
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
        bloom={0.9}
      />
      {CUENTA.map((c, i) => (
        <Plano
          key={c.numero}
          name={`Cuenta atrás: ${c.numero}`}
          from={60 + i * 15}
          durationInFrames={15}
          premountFor={fps}
          archivo={c.archivo}
          inicio={c.inicio}
          velocidad={1}
          zoomInicial={1.15}
          zoomFinal={1.25}
          origen="50% 45%"
          brillo={0.45}
          entrada="zoom"
          temblor={18}
        />
      ))}
      <Brasas
        name="Brasas antes del golpe"
        from={100}
        durationInFrames={20}
        premountFor={fps}
        cantidad={60}
        semilla={8}
        intensidad={0.9}
        style={{ opacity: interpolate(frame, [100, 108], [0, 1], clamp) }}
      />

      <Rotulo
        name="Tu nueva tienda de"
        from={0}
        durationInFrames={58}
        premountFor={fps}
        destacado=""
        tamano={78}
        y={770}
        metal
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
      <DestelloAnamorfico
        name="Destello de Suplementación"
        from={15}
        durationInFrames={20}
        premountFor={fps}
        y={935}
        color={AZUL}
        intensidad={0.6}
      />
      {CUENTA.map((c, i) => (
        <Rotulo
          key={c.numero}
          name={c.numero}
          from={60 + i * 15}
          durationInFrames={15}
          premountFor={fps}
          destacado={i === 2 ? c.numero : ""}
          tamano={560}
          y={960}
          metal
          fundido
        >
          {i === 2 ? "" : c.numero}
        </Rotulo>
      ))}
      {CUENTA.map((c, i) => (
        <OndaExpansiva
          key={c.numero}
          name={`Onda del ${c.numero}`}
          from={60 + i * 15}
          durationInFrames={16}
          premountFor={fps}
          x={540}
          y={960}
          color={i === 2 ? "#ffb070" : "#bfe0ff"}
        />
      ))}
      {CUENTA.map((c, i) => (
        <DestelloAnamorfico
          key={c.numero}
          name={`Destello del ${c.numero}`}
          from={60 + i * 15}
          durationInFrames={14}
          premountFor={fps}
          y={960}
          color={i === 2 ? "#ff8a3d" : AZUL}
          intensidad={0.85}
        />
      ))}
      <LineaDeCarga
        name="Carga antes del golpe"
        from={105}
        durationInFrames={15}
        premountFor={fps}
        color={AZUL}
      />

      <Destello
        name="Golpe de la tienda"
        from={0}
        durationInFrames={8}
        premountFor={fps}
        intensidad={0.45}
        color="#ffffff"
      />
      {CUENTA.map((c, i) => (
        <Destello
          key={c.numero}
          name={`Golpe del ${c.numero}`}
          from={60 + i * 15}
          durationInFrames={6}
          premountFor={fps}
          intensidad={i === 2 ? 0.55 : 0.4}
          color={i === 2 ? "#ffb070" : "#ffffff"}
        />
      ))}
    </AbsoluteFill>
  );
};
