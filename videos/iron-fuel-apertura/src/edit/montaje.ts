import datos from "./montaje.json";

// El montaje del Edit está en montaje.json porque también lo lee
// edicion/hornear_edit.py, que hornea el vídeo base con las rampas de
// velocidad. Los planos duran pulsos de la música (audio/musica_edit.py va a
// 14 fotogramas por pulso), así que si se cambia uno hay que compensarlo en
// otro para que los cortes sigan cayendo en los golpes.

export type PlanoMontaje = {
  readonly nombre: string;
  readonly fotogramas: number;
  /** Fotograma del Edit en el que empieza el plano. */
  readonly inicio: number;
  /** Las obras, en blanco y negro. */
  readonly antes: boolean;
  /** Resplandor alrededor de las luces (0 = sin resplandor). */
  readonly brillo: number;
};

// Solo lo que usa el vídeo; el resto (archivo, desde, velocidad, encuadre)
// es para hornear_edit.py.
const montaje: {
  readonly pulso: number;
  readonly planos: ReadonlyArray<{
    readonly nombre: string;
    readonly fotogramas: number;
    readonly antes?: boolean;
    readonly brillo?: number;
  }>;
} = datos;

export const PULSO = montaje.pulso;
export const COMPAS = 4 * PULSO;

/** Fotograma del pulso (0-3) de un compás (desde 1) de la música. */
export const compas = (n: number, pulso = 0) =>
  (n - 1) * COMPAS + pulso * PULSO;

export const PLANOS: readonly PlanoMontaje[] = montaje.planos.reduce<
  PlanoMontaje[]
>((lista, p) => {
  const anterior = lista[lista.length - 1];
  lista.push({
    nombre: p.nombre,
    fotogramas: p.fotogramas,
    inicio: anterior ? anterior.inicio + anterior.fotogramas : 0,
    antes: p.antes ?? false,
    brillo: p.brillo ?? 0,
  });
  return lista;
}, []);

export const DURACION = PLANOS.reduce((total, p) => total + p.fotogramas, 0);

/** Los cortes: el primer fotograma de cada plano menos el primero. */
export const CORTES = PLANOS.slice(1).map((p) => p.inicio);

export const planoEn = (frame: number) =>
  PLANOS.find((p) => frame >= p.inicio && frame < p.inicio + p.fotogramas) ??
  PLANOS[PLANOS.length - 1];

// Los momentos de la música (audio/musica_edit.py).
export const CAIDA_1 = compas(3); // «...A ESTO»
export const PARADA = compas(6, 3); // la cinta se frena
export const CONSTRUYE = compas(7); // «CONSTRUYE TU MEJOR VERSIÓN»
export const CAIDA_2 = compas(8);
export const LOGO = compas(10);
export const FINAL = compas(11); // «¡TE ESPERAMOS!»
