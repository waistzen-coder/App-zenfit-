import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Destello, LineasDeMarca } from "../efectos";
import { EXO } from "../fuentes";
import { AZUL, NEGRO } from "../marca";
import { Plano } from "../Plano";
import { Rotulo } from "../Rotulo";
import {
  Brasas,
  Chispas,
  DestelloAnamorfico,
  LogoForjado,
  OndaExpansiva,
} from "../vfx";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 24–30 s. El logo sale de la forja al rojo vivo entre chispas y se enfría
// hasta el azul de la marca; después «PRÓXIMA APERTURA», «MUY PRONTO» y la
// llamada a seguir la cuenta. Todo el texto queda por encima de y = 1400
// para que no lo tapen los botones de Reels y TikTok.
export const CierreEpico: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Plano
        name="Fondo: el rótulo de frente, desenfocado"
        from={0}
        durationInFrames={180}
        premountFor={fps}
        archivo="clips/fachada-rotulo-60fps.webm"
        inicio={8.4}
        velocidad={0.5}
        zoomInicial={1.3}
        zoomFinal={1.4}
        origen="50% 40%"
        brillo={0.22}
        style={{ filter: "brightness(0.22) saturate(0.8) blur(14px)" }}
      />
      <Brasas
        name="Brasas"
        from={0}
        durationInFrames={180}
        premountFor={fps}
        cantidad={55}
        semilla={5}
        intensidad={0.7}
      />
      <LineasDeMarca
        name="Líneas del rótulo"
        from={6}
        durationInFrames={174}
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
        durationInFrames={180}
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
        semilla={57}
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
        name="Próxima apertura"
        from={45}
        durationInFrames={135}
        premountFor={fps}
        destacado=""
        tamano={84}
        y={1040}
        salida={false}
        metal
      >
        {"PRÓXIMA APERTURA"}
      </Rotulo>
      <DestelloAnamorfico
        name="Destello de Próxima apertura"
        from={45}
        durationInFrames={18}
        premountFor={fps}
        y={1040}
        color={AZUL}
        intensidad={0.6}
      />
      <Rotulo
        name="Muy pronto"
        from={75}
        durationInFrames={105}
        premountFor={fps}
        destacado="MUY PRONTO"
        tamano={128}
        y={1175}
        salida={false}
        fundido
        style={{
          scale: String(
            1 +
              0.025 *
                Math.sin(
                  interpolate(frame, [75, 180], [0, Math.PI * 6], clamp),
                ),
          ),
        }}
      >
        {""}
      </Rotulo>
      <OndaExpansiva
        name="Onda de Muy pronto"
        from={75}
        durationInFrames={20}
        premountFor={fps}
        x={540}
        y={1175}
        color="#bfe0ff"
      />
      <Interactive.Div
        name="Síguenos"
        from={110}
        durationInFrames={70}
        premountFor={fps}
        style={{
          position: "absolute",
          left: 0,
          width: "100%",
          top: 1320,
          textAlign: "center",
          fontFamily: EXO,
          fontStyle: "normal",
          fontWeight: 600,
          fontSize: 48,
          lineHeight: 1.25,
          color: "rgba(255, 255, 255, 0.9)",
          textShadow: "0 4px 18px rgba(0, 0, 0, 0.9)",
          opacity: interpolate(frame, [110, 122], [0, 1], clamp),
          translate: `0px ${interpolate(frame, [110, 122], [24, 0], {
            ...clamp,
            easing: Easing.out(Easing.cubic),
          })}px`,
        }}
      >
        Síguenos y no te pierdas
        <br />
        la inauguración
      </Interactive.Div>
      <Destello
        name="Golpe del logo"
        from={0}
        durationInFrames={14}
        premountFor={fps}
        intensidad={0.95}
        color="#ffe2c2"
      />
      {[45, 75].map((f) => (
        <Destello
          key={f}
          name="Golpe del texto"
          from={f}
          durationInFrames={6}
          premountFor={fps}
          intensidad={0.25}
          color={AZUL}
        />
      ))}
    </AbsoluteFill>
  );
};
