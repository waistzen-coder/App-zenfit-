import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Destello, LineasDeMarca, Logo } from "../efectos";
import { EXO } from "../fuentes";
import { AZUL, NEGRO } from "../marca";
import { Plano } from "../Plano";
import { Rotulo } from "../Rotulo";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 24–30 s. El logo de la fachada con brillo, «PRÓXIMA APERTURA», «MUY
// PRONTO» y la llamada a seguir la cuenta. Todo el texto queda por encima de
// y = 1400 para que no lo tapen los botones de Reels y TikTok.
export const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Plano
        name="Fondo: la fachada desenfocada"
        from={0}
        durationInFrames={180}
        premountFor={fps}
        archivo="clips/fachada-rotulo-60fps.webm"
        inicio={4}
        velocidad={0.5}
        zoomInicial={1.3}
        zoomFinal={1.4}
        origen="50% 40%"
        brillo={0.22}
        style={{ filter: "brightness(0.22) saturate(0.8) blur(14px)" }}
      />
      <LineasDeMarca
        name="Líneas del rótulo"
        from={6}
        durationInFrames={174}
        premountFor={fps}
        color={AZUL}
      />
      <Logo
        name="Logo"
        from={0}
        durationInFrames={180}
        premountFor={fps}
        y={640}
        ancho={820}
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
      >
        {"PRÓXIMA APERTURA"}
      </Rotulo>
      <Rotulo
        name="Muy pronto"
        from={75}
        durationInFrames={105}
        premountFor={fps}
        destacado="MUY PRONTO"
        tamano={128}
        y={1175}
        salida={false}
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
        durationInFrames={12}
        premountFor={fps}
        intensidad={0.9}
        color="#ffffff"
      />
    </AbsoluteFill>
  );
};
