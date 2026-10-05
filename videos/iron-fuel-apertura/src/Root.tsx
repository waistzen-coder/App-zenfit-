import { Composition, Folder } from "remotion";
import { Cierre } from "./escenas/Cierre";
import { Fachada } from "./escenas/Fachada";
import { Gancho } from "./escenas/Gancho";
import { Montaje } from "./escenas/Montaje";
import { Revelacion } from "./escenas/Revelacion";
import { Teaser } from "./Teaser";

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
