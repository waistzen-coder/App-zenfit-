import { Composition, Folder } from "remotion";
import { Aviso } from "./Aviso";
import { CierreEpico } from "./epico/CierreEpico";
import { FachadaEpica } from "./epico/FachadaEpica";
import { GanchoEpico } from "./epico/GanchoEpico";
import { MontajeEpico } from "./epico/MontajeEpico";
import { RevelacionEpica } from "./epico/RevelacionEpica";
import { Cierre } from "./escenas/Cierre";
import { Fachada } from "./escenas/Fachada";
import { Gancho } from "./escenas/Gancho";
import { Montaje } from "./escenas/Montaje";
import { Revelacion } from "./escenas/Revelacion";
import { Teaser } from "./Teaser";
import { TeaserEpico } from "./TeaserEpico";

const ESCENAS_EPICAS = [
  { id: "Gancho-epico", component: GanchoEpico, durationInFrames: 120 },
  { id: "Montaje-epico", component: MontajeEpico, durationInFrames: 240 },
  { id: "Revelacion-epica", component: RevelacionEpica, durationInFrames: 120 },
  { id: "Fachada-epica", component: FachadaEpica, durationInFrames: 240 },
  { id: "Cierre-epico", component: CierreEpico, durationInFrames: 180 },
] as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Teaser"
        component={Teaser}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="TeaserEpico"
        component={TeaserEpico}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Aviso"
        component={Aviso}
        durationInFrames={480}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Aviso-fecha"
        component={Aviso}
        durationInFrames={480}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          fecha: { dia: "SÁBADO", numero: "17", mes: "DE OCTUBRE" },
        }}
      />
      <Folder name="Escenas-epicas">
        {ESCENAS_EPICAS.map((e) => (
          <Composition
            key={e.id}
            id={e.id}
            component={e.component}
            durationInFrames={e.durationInFrames}
            fps={30}
            width={1080}
            height={1920}
          />
        ))}
      </Folder>
      <Folder name="Escenas">
        <Composition
          id="Gancho"
          component={Gancho}
          durationInFrames={120}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="Montaje"
          component={Montaje}
          durationInFrames={240}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="Revelacion"
          component={Revelacion}
          durationInFrames={120}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="Fachada"
          component={Fachada}
          durationInFrames={240}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="Cierre"
          component={Cierre}
          durationInFrames={180}
          fps={30}
          width={1080}
          height={1920}
        />
      </Folder>
    </>
  );
};
