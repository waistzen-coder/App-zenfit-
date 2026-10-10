import { blur } from "@remotion/effects/blur";
import { chromaticAberration } from "@remotion/effects/chromatic-aberration";
import { fisheye } from "@remotion/effects/fisheye";
import { glow } from "@remotion/effects/glow";
import { zoomBlur } from "@remotion/effects/zoom-blur";
import { Video } from "@remotion/media";
import type React from "react";
import {
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";

/**
 * Cómo entra o sale un plano:
 * - corte: corte seco.
 * - zoom: golpe de zoom con desenfoque radial (al entrar) o zoom a través
 *   de la imagen hasta quemarla (al salir).
 * - barrido-izq / barrido-der: barrido de cámara con desenfoque de
 *   movimiento hacia ese lado. El plano que sale y el que entra deben
 *   barrer hacia el mismo lado para que parezca un único movimiento.
 */
export type Transicion = "corte" | "zoom" | "barrido-izq" | "barrido-der";

type PlanoProps = {
  /** Ruta dentro de public/: un vídeo (.webm o .mp4) o una foto. */
  readonly archivo: string;
  /** Segundo del clip original en el que empieza el plano. */
  readonly inicio: number;
  /** 0.5 = cámara lenta (el clip de la fachada va a 60 fps y queda fluido). */
  readonly velocidad: number;
  readonly zoomInicial: number;
  readonly zoomFinal: number;
  /** Punto hacia el que se acerca el zoom. */
  readonly origen: string;
  readonly brillo: number;
  readonly entrada?: Transicion;
  readonly salida?: Transicion;
  /** Píxeles de temblor de cámara al empezar (para los golpes). */
  readonly temblor?: number;
  /** Multiplica el desenfoque radial y la aberración de la entrada en zoom. */
  readonly golpe?: number;
  /** Resplandor alrededor de las luces (0 = sin resplandor). */
  readonly bloom?: number;
  /**
   * Ojo de pez, como una cámara de acción: campo de visión en radianes
   * (0 = lente normal, 1,8 = ojo de pez marcado).
   */
  readonly ojoDePez?: number;
  readonly style?: React.CSSProperties;
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
// Lo que recorre un barrido, en % del ancho. Con el plano ampliado a 1,3
// durante el barrido no llegan a verse los bordes.
const RECORRIDO = 16;

const PlanoInner: React.FC<PlanoProps> = ({
  archivo,
  inicio,
  velocidad,
  zoomInicial,
  zoomFinal,
  origen,
  brillo,
  entrada = "corte",
  salida = "corte",
  temblor = 0,
  golpe = 1,
  bloom = 0,
  ojoDePez = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fin = durationInFrames - 1;

  let escala = interpolate(frame, [0, fin], [zoomInicial, zoomFinal], {
    ...clamp,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });
  let x = 0;
  let barrido = 0;
  let radial = 0;
  let aberracion = 0;
  let quemado = 0;

  if (entrada === "zoom") {
    escala *= interpolate(frame, [0, 8], [1.35, 1], {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    });
    radial = interpolate(frame, [0, 8], [70 * golpe, 0], clamp);
    aberracion = interpolate(
      frame,
      [0, Math.max(1, 10 * golpe)],
      [22 * golpe, 0],
      clamp,
    );
  } else if (entrada !== "corte") {
    const signo = entrada === "barrido-izq" ? 1 : -1;
    x = interpolate(frame, [0, 6], [signo * RECORRIDO, 0], {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    });
    escala *= interpolate(frame, [0, 6], [1.3, 1], clamp);
    barrido = interpolate(frame, [0, 6], [90, 0], clamp);
  }

  if (salida === "zoom") {
    escala *= interpolate(frame, [fin - 6, fin], [1, 1.6], {
      ...clamp,
      easing: Easing.in(Easing.cubic),
    });
    radial = Math.max(
      radial,
      interpolate(frame, [fin - 6, fin], [0, 90], clamp),
    );
    quemado = interpolate(frame, [fin - 3, fin], [0, 0.7], clamp);
  } else if (salida !== "corte") {
    const signo = salida === "barrido-izq" ? -1 : 1;
    x += interpolate(frame, [fin - 5, fin], [0, signo * RECORRIDO], {
      ...clamp,
      easing: Easing.in(Easing.cubic),
    });
    escala *= interpolate(frame, [fin - 5, fin], [1, 1.3], clamp);
    barrido = Math.max(
      barrido,
      interpolate(frame, [fin - 5, fin], [0, 90], clamp),
    );
  }

  const sacudida = temblor * interpolate(frame, [0, 12], [1, 0], clamp);
  const dx = (random(`plano-x-${frame}`) - 0.5) * 2 * sacudida;
  const dy = (random(`plano-y-${frame}`) - 0.5) * 2 * sacudida;

  const effects = [
    fisheye({
      fieldOfView: ojoDePez,
      zoom: 1.12,
      disabled: ojoDePez <= 0,
    }),
    blur({
      radius: barrido,
      horizontal: true,
      vertical: false,
      disabled: barrido < 0.5,
    }),
    zoomBlur({ amount: radial, disabled: radial < 0.5 }),
    chromaticAberration({ amount: aberracion, disabled: aberracion < 0.5 }),
    glow({
      radius: 40,
      intensity: bloom,
      threshold: 0.6,
      color: "#d8ecff",
      disabled: bloom <= 0,
    }),
  ];

  const estilo: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: "100%",
    scale: String(escala),
    translate: `calc(${x}% + ${dx}px) ${dy}px`,
    transformOrigin: origen,
    filter: `brightness(${brillo + quemado})`,
    ...style,
  };

  if (/\.(webm|mp4)$/.test(archivo)) {
    return (
      <Video
        src={staticFile(archivo)}
        trimBefore={Math.round(inicio * fps)}
        playbackRate={velocidad}
        muted
        objectFit="cover"
        effects={effects}
        style={estilo}
      />
    );
  }

  return (
    <CanvasImage
      src={staticFile(archivo)}
      width={1080}
      height={1920}
      fit="cover"
      effects={effects}
      style={estilo}
    />
  );
};

const planoSchema = {
  archivo: { type: "asset", default: "", description: "Clip o foto" },
  inicio: {
    type: "number",
    hiddenFromList: false,
    min: 0,
    step: 0.1,
    default: 0,
    description: "Segundo de inicio en el clip",
  },
  velocidad: {
    type: "number",
    hiddenFromList: false,
    min: 0.1,
    max: 4,
    step: 0.05,
    default: 1,
    description: "Velocidad",
  },
  zoomInicial: {
    type: "number",
    hiddenFromList: false,
    min: 0.5,
    max: 3,
    step: 0.01,
    default: 1.06,
    description: "Zoom al empezar",
  },
  zoomFinal: {
    type: "number",
    hiddenFromList: false,
    min: 0.5,
    max: 3,
    step: 0.01,
    default: 1.16,
    description: "Zoom al acabar",
  },
  origen: {
    type: "transform-origin",
    default: "50% 50%",
    description: "Centro del zoom",
  },
  brillo: {
    type: "number",
    hiddenFromList: false,
    min: 0,
    max: 3,
    step: 0.01,
    default: 1,
    description: "Brillo",
  },
} as const satisfies InteractivitySchema;

export const Plano = Interactive.withSchema({
  Component: PlanoInner,
  componentName: "<Plano>",
  schema: planoSchema,
  wrapInSequence: true,
});
