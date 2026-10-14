import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Destello } from "../efectos";
import { EXO } from "../fuentes";
import { AZUL, NEGRO } from "../marca";
import { Plano } from "../Plano";
import { Rotulo } from "../Rotulo";
import {
  Brasas,
  Chispas,
  Confeti,
  DestelloAnamorfico,
  LogoForjado,
  OndaExpansiva,
  RayosDeLuz,
  Sello,
  TubosNeon,
} from "../vfx";
import { Tarjeta, type Fila } from "./Tarjeta";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Los datos de la invitación, uno por golpe de música (cada 30 fotogramas a
// partir del segundo 7 del vídeo).
const FILAS: readonly Fila[] = [
  { icono: "calendario", texto: "Sábado 17 de octubre", entra: 30 },
  { icono: "reloj", texto: "A partir de las 19:00 h", entra: 60 },
  { icono: "lugar", texto: "Calle Rafael Alberti, 3", entra: 90 },
  { icono: "regalo", texto: "Bebidas, aperitivos y regalos", entra: 120 },
  {
    icono: "descuento",
    texto: "10 % de descuento en productos",
    entra: 150,
    destacada: true,
  },
];

// Golpes de la música en esta escena: el logo, cada fila y «¡TE ESPERAMOS!».
const GOLPES = [0, ...FILAS.map((f) => f.entra), 180];
// Centro vertical de cada fila de la tarjeta (arriba en 735, 109 px por fila).
const centroFila = (i: number) => 799 + 109 * i;

// 6–18 s. El logo sale de la forja con «INAUGURACIÓN» debajo; la tarjeta
// con la fecha, la hora, el sitio, lo que habrá y el descuento; «¡TE
// ESPERAMOS!» y el Instagram. Desde el segundo 12 todo queda quieto seis
// segundos para que se pueda leer (o hacer captura).
export const Informacion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // La cámara da un pequeño empujón en cada golpe y vuelve en unos fotogramas.
  const empujon = GOLPES.reduce(
    (total, g) => total + (frame >= g ? 0.022 * Math.exp(-(frame - g) / 4) : 0),
    0,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Plano
        name="Fondo: el rótulo de frente, desenfocado"
        from={0}
        durationInFrames={360}
        premountFor={fps}
        archivo="clips/fachada-rotulo-60fps.webm"
        inicio={8.4}
        velocidad={0.5}
        zoomInicial={1.3}
        zoomFinal={1.45}
        origen="50% 40%"
        brillo={0.2}
        style={{ filter: "brightness(0.2) saturate(0.8) blur(14px)" }}
      />
      <Brasas
        name="Brasas"
        from={0}
        durationInFrames={360}
        premountFor={fps}
        cantidad={50}
        semilla={29}
        intensidad={0.6}
      />
      <TubosNeon
        name="Neones de fondo"
        from={0}
        durationInFrames={360}
        premountFor={fps}
        cantidad={6}
        semilla={31}
        style={{ opacity: 0.22 }}
      />
      <RayosDeLuz
        name="Rayos detrás del logo"
        from={0}
        durationInFrames={360}
        premountFor={fps}
        x={540}
        y={380}
        radio={950}
        rayos={14}
        color="#9fd0ff"
        intensidad={0.32}
      />
      <AbsoluteFill style={{ scale: String(1 + empujon) }}>
        <OndaExpansiva
          name="Onda del logo"
          from={0}
          durationInFrames={28}
          premountFor={fps}
          x={540}
          y={380}
          color="#ffc38a"
        />
        <LogoForjado
          name="Logo forjado"
          from={0}
          durationInFrames={360}
          premountFor={fps}
          y={380}
          ancho={600}
        />
        <Chispas
          name="Chispas del logo"
          from={0}
          durationInFrames={56}
          premountFor={fps}
          x={540}
          y={430}
          cantidad={220}
          semilla={97}
          fuerza={52}
        />
        <DestelloAnamorfico
          name="Destello del logo"
          from={0}
          durationInFrames={36}
          premountFor={fps}
          y={380}
          color="#ff9a4a"
          intensidad={1}
        />

        <Rotulo
          name="Inauguración"
          from={15}
          durationInFrames={345}
          premountFor={fps}
          destacado=""
          tamano={84}
          y={655}
          salida={false}
          metal
        >
          {"INAUGURACIÓN"}
        </Rotulo>
        <Tarjeta filas={FILAS} y={735} />

        <Rotulo
          name="¡Te esperamos!"
          from={180}
          durationInFrames={180}
          premountFor={fps}
          destacado="¡TE ESPERAMOS!"
          tamano={100}
          y={1405}
          salida={false}
          style={{
            scale: String(
              1 +
                0.02 *
                  Math.sin(
                    interpolate(frame, [190, 360], [0, Math.PI * 6], clamp),
                  ),
            ),
          }}
        >
          {""}
        </Rotulo>
        <Interactive.Div
          name="Instagram"
          from={190}
          durationInFrames={170}
          premountFor={fps}
          style={{
            position: "absolute",
            left: 0,
            width: "100%",
            top: 1468,
            textAlign: "center",
            fontFamily: EXO,
            fontStyle: "normal",
            fontWeight: 600,
            fontSize: 40,
            color: "rgba(255, 255, 255, 0.85)",
            textShadow: "0 4px 18px rgba(0, 0, 0, 0.9)",
            opacity: interpolate(frame, [190, 202], [0, 1], clamp),
            translate: `0px ${interpolate(frame, [190, 202], [18, 0], {
              ...clamp,
              easing: Easing.out(Easing.cubic),
            })}px`,
          }}
        >
          Instagram:{" "}
          <span style={{ color: AZUL, fontWeight: 600 }}>
            @ironfuelnutrition_
          </span>
        </Interactive.Div>

        {FILAS.map((f, i) => (
          <Chispas
            key={f.icono}
            name={`Chispas de la fila ${i + 1}`}
            from={f.entra}
            durationInFrames={24}
            premountFor={fps}
            x={146}
            y={centroFila(i)}
            cantidad={f.destacada ? 70 : 36}
            semilla={101 + i}
            fuerza={f.destacada ? 30 : 20}
          />
        ))}
      </AbsoluteFill>

      <OndaExpansiva
        name="Onda del sello"
        from={150}
        durationInFrames={22}
        premountFor={fps}
        x={950}
        y={300}
        color="#ffb070"
      />
      <Sello
        name="Sello del 10 %"
        from={150}
        durationInFrames={210}
        premountFor={fps}
        x={950}
        y={300}
        tamano={210}
        texto="10%"
        subtexto="DESCUENTO"
        color="#ff7424"
      />
      <Chispas
        name="Chispas del sello"
        from={150}
        durationInFrames={34}
        premountFor={fps}
        x={950}
        y={330}
        cantidad={120}
        semilla={113}
        fuerza={40}
      />
      {[
        { lado: "izquierda", x: 40, direccion: -62, semilla: 7 },
        { lado: "derecha", x: 1040, direccion: -118, semilla: 8 },
      ].map((c) => (
        <Confeti
          key={c.lado}
          name={`Cañón de confeti (${c.lado})`}
          from={180}
          durationInFrames={84}
          premountFor={fps}
          x={c.x}
          y={1820}
          cantidad={85}
          semilla={c.semilla}
          fuerza={70}
          direccion={c.direccion}
          apertura={46}
        />
      ))}

      <DestelloAnamorfico
        name="Destello de Inauguración"
        from={15}
        durationInFrames={18}
        premountFor={fps}
        y={655}
        color={AZUL}
        intensidad={0.6}
      />
      <OndaExpansiva
        name="Onda de Te esperamos"
        from={180}
        durationInFrames={22}
        premountFor={fps}
        x={540}
        y={1405}
        color="#bfe0ff"
      />
      <DestelloAnamorfico
        name="Destello de Te esperamos"
        from={180}
        durationInFrames={22}
        premountFor={fps}
        y={1405}
        color={AZUL}
        intensidad={0.8}
      />
      <Destello
        name="Golpe del logo"
        from={0}
        durationInFrames={14}
        premountFor={fps}
        intensidad={0.8}
        color="#ffe2c2"
      />
      <DestelloAnamorfico
        name="Destello del sello"
        from={150}
        durationInFrames={20}
        premountFor={fps}
        y={300}
        color="#ff8a3d"
        intensidad={0.8}
      />
      <Destello
        name="Golpe de Te esperamos"
        from={180}
        durationInFrames={6}
        premountFor={fps}
        intensidad={0.25}
        color={AZUL}
      />
    </AbsoluteFill>
  );
};
