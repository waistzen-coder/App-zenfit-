import { blur } from "@remotion/effects/blur";
import { brightness } from "@remotion/effects/brightness";
import { chromaticAberration } from "@remotion/effects/chromatic-aberration";
import { glow } from "@remotion/effects/glow";
import { saturation } from "@remotion/effects/saturation";
import { zoomBlur } from "@remotion/effects/zoom-blur";
import { Video } from "@remotion/media";
import { interpolate, random, staticFile, useCurrentFrame } from "remotion";
import {
  CAIDA_1,
  CAIDA_2,
  CONSTRUYE,
  CORTES,
  FINAL,
  LOGO,
  PARADA,
  PULSO,
  compas,
  planoEn,
} from "./montaje";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Los golpes de la música: las caídas, el logo y el final pegan fuerte; los
// demás cortes, menos; en las obras, apenas. Entre cortes, cada pulso da un
// empujón pequeño para que la imagen siga el ritmo.
const FUERTES = [CAIDA_1, CONSTRUYE, CAIDA_2, LOGO, FINAL];
const GOLPES = [...new Set([...CORTES, ...FUERTES])].map((f) => ({
  f,
  fuerza: FUERTES.includes(f) ? 1.3 : f < CAIDA_1 ? 0.35 : 0.65,
}));
for (let f = CAIDA_1; f < FINAL; f += PULSO) {
  if (!GOLPES.some((g) => g.f === f)) {
    GOLPES.push({ f, fuerza: 0.22 });
  }
}

// Barridos de cámara: el plano que sale se va hacia un lado con desenfoque
// de movimiento y el que entra llega desde el otro, como un solo giro.
const BARRIDOS = [
  { f: compas(5), lado: -1 }, // a los suplementos
  { f: compas(6, 2), lado: 1 }, // al escaparate
];

const decae = (frame: number, desde: number, tau: number) =>
  frame < desde ? 0 : Math.exp(-(frame - desde) / tau);

/**
 * El vídeo base del Edit (edicion/hornear_edit.py ya trae los cortes y las
 * rampas de velocidad) con lo que lo hace un Edit: golpes de zoom con
 * desenfoque radial y aberración cromática en cada corte, temblor en los
 * golpes fuertes, barridos, un zoom lento dentro de cada plano, resplandor
 * en los planos con luces, el parpadeo de película vieja en las obras y la
 * imagen que se apaga cuando la música se frena.
 */
export const Base: React.FC = () => {
  const frame = useCurrentFrame();
  const plano = planoEn(frame);

  let golpe = 0;
  let seco = 0;
  let temblor = 0;
  for (const g of GOLPES) {
    golpe += g.fuerza * decae(frame, g.f, 3);
    seco += (g.fuerza >= 1 ? 1 : g.fuerza * 0.4) * decae(frame, g.f, 1.6);
    temblor = Math.max(temblor, g.fuerza * decae(frame, g.f, 4.5));
  }

  // Zoom lento dentro del plano, reiniciado en cada corte.
  const avance = (frame - plano.inicio) / plano.fotogramas;
  let escala = 1.04 * (1 + 0.045 * avance) * (1 + 0.075 * golpe);

  let x = 0;
  let barrido = 0;
  for (const b of BARRIDOS) {
    const t = frame - b.f;
    if (t >= -4 && t < 0) {
      const u = (t + 4) / 4;
      x += b.lado * 22 * u * u;
      barrido = Math.max(barrido, 90 * u);
      escala *= 1 + 0.25 * u;
    } else if (t >= 0 && t < 4) {
      const u = 1 - t / 4;
      x -= b.lado * 22 * u * u;
      barrido = Math.max(barrido, 90 * u);
      escala *= 1 + 0.25 * u;
    }
  }

  // La parada de cinta: la imagen se queda sin color y se acerca.
  const parada =
    interpolate(frame, [PARADA, PARADA + PULSO - 1], [0, 1], clamp) *
    (frame < CONSTRUYE ? 1 : 0);
  escala *= 1 + 0.1 * parada * parada;

  const dx = (random(`base-x-${frame}`) - 0.5) * 2 * 18 * temblor;
  const dy = (random(`base-y-${frame}`) - 0.5) * 2 * 18 * temblor;
  const giro = (random(`base-r-${frame}`) - 0.5) * 1.4 * temblor;

  // En las obras, el parpadeo y el bailoteo de una película antigua.
  const antiguo = plano.antes;
  const parpadeo = antiguo ? (random(`parpadeo-${frame}`) - 0.5) * 0.09 : 0;
  const bailoteo = antiguo ? (random(`bailoteo-${frame}`) - 0.5) * 3 : 0;

  const aberracion = Math.min(40, 20 * golpe + 22 * parada);
  const radial = Math.min(70, 45 * seco);

  return (
    <Video
      src={staticFile("clips/edit-montaje.webm")}
      muted
      objectFit="cover"
      effects={[
        blur({
          radius: barrido,
          horizontal: true,
          vertical: false,
          disabled: barrido < 0.5,
        }),
        zoomBlur({ amount: radial, disabled: radial < 0.5 }),
        chromaticAberration({ amount: aberracion, disabled: aberracion < 0.5 }),
        glow({
          radius: 34,
          intensity: plano.brillo,
          threshold: 0.7,
          color: "#ffe6c8",
          disabled: plano.brillo <= 0,
        }),
        saturation({ amount: 1 - 0.85 * parada, disabled: parada <= 0 }),
        brightness({ amount: parpadeo, disabled: !antiguo }),
      ]}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        scale: String(escala),
        rotate: `${giro}deg`,
        translate: `calc(${x}% + ${dx + bailoteo}px) ${dy + bailoteo * 0.6}px`,
      }}
    />
  );
};
