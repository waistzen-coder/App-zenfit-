import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { Destello, FugaDeLuz, Grano, Vineta } from "./efectos";
import { Base } from "./edit/Base";
import { Cierre } from "./edit/Cierre";
import {
  CAIDA_1,
  CAIDA_2,
  CONSTRUYE,
  CORTES,
  DURACION,
  LOGO,
  PULSO,
} from "./edit/montaje";
import { Palabra, type EstiloPalabra } from "./edit/Palabra";
import { AZUL, NEGRO } from "./marca";
import { Rotulo } from "./Rotulo";
import { Chispas, DestelloAnamorfico, OndaExpansiva } from "./vfx";

// Las palabras del vinilo de la puerta de la tienda, una cada dos pulsos
// después de «...A ESTO».
const PALABRAS: ReadonlyArray<{ texto: string; estilo: EstiloPalabra }> = [
  { texto: "FUERZA", estilo: "blanco" },
  { texto: "RESISTENCIA", estilo: "azul" },
  { texto: "ENERGÍA", estilo: "naranja" },
  { texto: "RENDIMIENTO", estilo: "blanco" },
  { texto: "RECUPERACIÓN", estilo: "azul" },
];
const Y_TEXTO = 1150;

/**
 * El Edit de Instagram del día de la inauguración (22 s, 9:16). Empieza con
 * «DE ESTO...» sobre las obras en blanco y negro y, en la caída de la
 * música, «...A ESTO»: el mismo rincón de la tienda terminado. Después, un
 * recorrido por la tienda a golpe de pulso con las palabras del vinilo de la
 * puerta, «CONSTRUYE TU MEJOR VERSIÓN» sobre el logo de la pared, una segunda
 * caída de un plano por pulso y el final sobre la fachada con la
 * dirección. Música: audio/musica_edit.py; montaje: src/edit/montaje.json.
 */
export const EditInstagram: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Base />

      {/* 1 · «DE ESTO...» sobre las obras */}
      <Sequence
        name="Obras: grano y viñeta de película"
        durationInFrames={CAIDA_1}
      >
        <Grano />
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0.75) 100%)",
          }}
        />
      </Sequence>
      <Rotulo
        name="De esto..."
        from={-3}
        durationInFrames={CAIDA_1 + 3}
        premountFor={fps}
        destacado=""
        tamano={150}
        y={Y_TEXTO}
        metal
      >
        {"DE ESTO..."}
      </Rotulo>

      {/* 2 · «...A ESTO» y las palabras */}
      <OndaExpansiva
        name="Onda de la caída"
        from={CAIDA_1}
        durationInFrames={26}
        premountFor={fps}
        x={540}
        y={Y_TEXTO}
        color="#ffc38a"
      />
      <Chispas
        name="Chispas de la caída"
        from={CAIDA_1}
        durationInFrames={50}
        premountFor={fps}
        x={540}
        y={Y_TEXTO + 130}
        cantidad={200}
        semilla={71}
        fuerza={56}
      />
      <DestelloAnamorfico
        name="Destello de la caída"
        from={CAIDA_1}
        durationInFrames={30}
        premountFor={fps}
        y={Y_TEXTO}
        color="#ff9a4a"
        intensidad={1}
      />
      <Rotulo
        name="...a esto"
        from={CAIDA_1}
        durationInFrames={4 * PULSO}
        premountFor={fps}
        destacado="...A ESTO"
        tamano={180}
        y={Y_TEXTO}
        fundido
      >
        {""}
      </Rotulo>
      {PALABRAS.map((p, i) => (
        <Palabra
          key={p.texto}
          name={p.texto}
          from={CAIDA_1 + (2 + i) * 2 * PULSO}
          durationInFrames={2 * PULSO}
          premountFor={fps}
          texto={p.texto}
          estilo={p.estilo}
          y={Y_TEXTO}
        />
      ))}

      {/* 3 · «CONSTRUYE TU MEJOR VERSIÓN» sobre el logo de la pared */}
      <Rotulo
        name="Construye"
        from={CONSTRUYE}
        durationInFrames={4 * PULSO}
        premountFor={fps}
        destacado=""
        tamano={124}
        y={Y_TEXTO - 30}
        metal
      >
        {"CONSTRUYE"}
      </Rotulo>
      <Rotulo
        name="Tu mejor"
        from={CONSTRUYE + PULSO}
        durationInFrames={3 * PULSO}
        premountFor={fps}
        destacado=""
        tamano={124}
        y={Y_TEXTO + 100}
        metal
      >
        {"TU MEJOR"}
      </Rotulo>
      <Chispas
        name="Chispas de Versión"
        from={CONSTRUYE + 2 * PULSO}
        durationInFrames={2 * PULSO}
        premountFor={fps}
        x={540}
        y={Y_TEXTO + 340}
        cantidad={140}
        semilla={73}
        fuerza={44}
      />
      <DestelloAnamorfico
        name="Destello de Versión"
        from={CONSTRUYE + 2 * PULSO}
        durationInFrames={20}
        premountFor={fps}
        y={Y_TEXTO + 255}
        color="#ff8a3d"
        intensidad={0.8}
      />
      <Rotulo
        name="Versión"
        from={CONSTRUYE + 2 * PULSO}
        durationInFrames={2 * PULSO}
        premountFor={fps}
        destacado="VERSIÓN"
        tamano={170}
        y={Y_TEXTO + 255}
        fundido
      >
        {""}
      </Rotulo>

      {/* 4 · Segunda caída */}
      <FugaDeLuz
        name="Fuga de luz de la segunda caída"
        from={CAIDA_2}
        durationInFrames={16}
        premountFor={fps}
        semilla={9}
        tono={28}
        style={{ opacity: 0.5 }}
      />

      {/* 5 · El final */}
      <Sequence
        name="Cierre"
        from={LOGO}
        durationInFrames={DURACION - LOGO}
        premountFor={fps}
      >
        <Cierre />
      </Sequence>

      {/* Fogonazos de los cortes */}
      {CORTES.filter(
        (f) => f > CAIDA_1 && f !== CAIDA_2 && f !== CONSTRUYE && f < LOGO,
      ).map((f) => (
        <Destello
          key={f}
          name="Fogonazo del corte"
          from={f}
          durationInFrames={3}
          premountFor={fps}
          intensidad={0.2}
          color="#ffffff"
        />
      ))}
      <Destello
        name="Golpe de la caída"
        from={CAIDA_1}
        durationInFrames={8}
        premountFor={fps}
        intensidad={0.75}
        color="#ffffff"
      />
      <Destello
        name="Golpe de Construye"
        from={CONSTRUYE}
        durationInFrames={7}
        premountFor={fps}
        intensidad={0.5}
        color="#ffd7b0"
      />
      <Destello
        name="Golpe de la segunda caída"
        from={CAIDA_2}
        durationInFrames={9}
        premountFor={fps}
        intensidad={0.8}
        color={AZUL}
      />

      <Vineta />
      <Grano />
      <Audio
        name="Música del Edit"
        src={staticFile("audio/musica-edit.wav")}
        premountFor={fps}
      />
    </AbsoluteFill>
  );
};
