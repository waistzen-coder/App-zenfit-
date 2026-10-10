import { AbsoluteFill, useVideoConfig } from "remotion";
import type { Fecha } from "../aviso/Anuncio";
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
  Quemadura,
  Siguenos,
  TubosNeon,
} from "../vfx";

// Las frases después del logo, un golpe cada pulso doble (cada 30
// fotogramas): sin fecha, la promesa de tu hermano; con fecha, la fecha. La
// tercera entra 3 fotogramas tarde porque ahí la canción golpea a contratiempo
// (11,6 s y no 11,5).
const TERCERA = 153;
const Frases: React.FC<{ readonly fecha?: Fecha }> = ({ fecha }) => {
  const { fps } = useVideoConfig();
  const frase = (
    nombre: string,
    from: number,
    blanco: string,
    destacado: string,
    tamano: number,
    opciones: { metal?: boolean; fundido?: boolean } = { metal: true },
  ) => (
    <Rotulo
      name={nombre}
      from={from}
      durationInFrames={Math.min(30, 180 - from)}
      premountFor={fps}
      destacado={destacado}
      tamano={tamano}
      y={1090}
      metal={opciones.metal}
      fundido={opciones.fundido}
    >
      {blanco}
    </Rotulo>
  );

  if (!fecha) {
    return (
      <>
        {frase(
          "Próximamente os diremos",
          90,
          "PRÓXIMAMENTE",
          "OS DIREMOS",
          104,
        )}
        {frase("Fecha y hora", 120, "", "FECHA Y HORA", 124, { fundido: true })}
        {frase(
          "De nuestra inauguración",
          TERCERA,
          "DE NUESTRA",
          "INAUGURACIÓN",
          104,
        )}
      </>
    );
  }
  return (
    <>
      {frase("Nuestra inauguración", 90, "NUESTRA", "INAUGURACIÓN", 104)}
      {frase("Será el sábado", 120, "SERÁ EL", fecha.dia, 124)}
      <Rotulo
        name="El día"
        from={TERCERA}
        durationInFrames={180 - TERCERA}
        premountFor={fps}
        destacado={fecha.numero}
        tamano={300}
        y={1060}
        fundido
      >
        {""}
      </Rotulo>
      <Rotulo
        name="El mes"
        from={TERCERA + 3}
        durationInFrames={177 - TERCERA}
        premountFor={fps}
        destacado=""
        tamano={110}
        y={1255}
        metal
      >
        {fecha.mes}
      </Rotulo>
    </>
  );
};

// 6,5–14 s del reel. «PERO YA OS PODEMOS DECIR...» sobre la fachada con
// neones, el logo forjado en el compás fuerte (8,5 s), una frase por golpe y
// un cierre que entra a corcheas: «INAUGURACIÓN», la fecha y «ATENTOS».
export const Final: React.FC<{ readonly fecha?: Fecha }> = ({ fecha }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Plano
        name="La fachada"
        from={0}
        durationInFrames={60}
        premountFor={fps}
        archivo="fotos/fachada.jpg"
        inicio={0}
        velocidad={1}
        zoomInicial={1.06}
        zoomFinal={1.18}
        origen="50% 30%"
        brillo={0.55}
        entrada="zoom"
        golpe={1.3}
        temblor={14}
      />
      <TubosNeon
        name="Neones sobre la fachada"
        from={0}
        durationInFrames={60}
        premountFor={fps}
        cantidad={7}
        semilla={12}
        style={{ opacity: 0.7 }}
      />
      <Rotulo
        name="Pero ya"
        from={0}
        durationInFrames={60}
        premountFor={fps}
        destacado=""
        tamano={150}
        y={800}
        metal
      >
        {"PERO YA"}
      </Rotulo>
      <Rotulo
        name="Os podemos decir..."
        from={15}
        durationInFrames={45}
        premountFor={fps}
        destacado="DECIR..."
        tamano={110}
        y={990}
        metal
      >
        {"OS PODEMOS"}
      </Rotulo>

      <Plano
        name="Fondo del logo: el rótulo desenfocado"
        from={60}
        durationInFrames={165}
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
        from={60}
        durationInFrames={165}
        premountFor={fps}
        cantidad={50}
        semilla={17}
        intensidad={0.7}
      />
      <TubosNeon
        name="Neones de fondo"
        from={60}
        durationInFrames={165}
        premountFor={fps}
        cantidad={6}
        semilla={27}
        style={{ opacity: 0.3 }}
      />
      <LineasDeMarca
        name="Líneas del rótulo"
        from={66}
        durationInFrames={159}
        premountFor={fps}
        color={AZUL}
      />
      <OndaExpansiva
        name="Onda del logo"
        from={60}
        durationInFrames={26}
        premountFor={fps}
        x={540}
        y={640}
        color="#ffc38a"
      />
      <LogoForjado
        name="Logo forjado"
        from={60}
        durationInFrames={165}
        premountFor={fps}
        y={640}
        ancho={820}
      />
      <Chispas
        name="Chispas del logo"
        from={60}
        durationInFrames={50}
        premountFor={fps}
        x={540}
        y={700}
        cantidad={220}
        semilla={83}
        fuerza={54}
      />
      <DestelloAnamorfico
        name="Destello del logo"
        from={60}
        durationInFrames={30}
        premountFor={fps}
        y={640}
        color="#ff9a4a"
        intensidad={1}
      />

      <Frases fecha={fecha} />
      {fecha ? (
        <Chispas
          name="Chispas de la fecha"
          from={TERCERA}
          durationInFrames={40}
          premountFor={fps}
          x={540}
          y={1120}
          cantidad={150}
          semilla={89}
          fuerza={44}
        />
      ) : null}

      <Rotulo
        name="Cierre: Inauguración"
        from={180}
        durationInFrames={45}
        premountFor={fps}
        destacado=""
        tamano={fecha ? 92 : 100}
        y={fecha ? 975 : 1000}
        salida={false}
        metal
      >
        {"INAUGURACIÓN"}
      </Rotulo>
      <Rotulo
        name="Cierre: la fecha"
        from={187}
        durationInFrames={38}
        premountFor={fps}
        destacado={fecha ? fecha.mes : "MUY PRONTO"}
        tamano={fecha ? 88 : 80}
        y={fecha ? 1120 : 1150}
        salida={false}
      >
        {fecha ? `${fecha.dia} ${fecha.numero}` : "FECHA Y HORA"}
      </Rotulo>
      <Siguenos
        name="Atentos"
        from={195}
        durationInFrames={30}
        premountFor={fps}
        y={fecha ? 1245 : 1285}
        texto="ATENTOS"
        subtitulo={fecha ? "os diremos la hora muy pronto" : ""}
      />

      {[90, 120, TERCERA].map((f) => (
        <DestelloAnamorfico
          key={f}
          name="Destello de la frase"
          from={f}
          durationInFrames={18}
          premountFor={fps}
          y={1080}
          color={f === TERCERA && fecha ? "#ff8a3d" : AZUL}
          intensidad={0.7}
        />
      ))}
      <OndaExpansiva
        name="Onda del cierre"
        from={180}
        durationInFrames={20}
        premountFor={fps}
        x={540}
        y={990}
        color="#bfe0ff"
      />
      <Quemadura
        name="Quemadura del logo"
        from={57}
        durationInFrames={12}
        premountFor={fps}
        color="#ff2338"
      />
      <Destello
        name="Golpe del logo"
        from={60}
        durationInFrames={10}
        premountFor={fps}
        intensidad={0.75}
        color="#ffe2c2"
      />
      {[0, 90, 120, TERCERA, 180].map((f) => (
        <Destello
          key={f}
          name="Golpe de la frase"
          from={f}
          durationInFrames={5}
          premountFor={fps}
          intensidad={0.22}
          color={f === TERCERA && fecha ? "#ffb070" : "#ffffff"}
        />
      ))}
    </AbsoluteFill>
  );
};
