// La curva de velocidad con la que preparar-medios.sh genera
// clips/fachada-rampa.webm: 10 fotogramas a 1×, 48 a 0,25× y 32 acelerando
// de 0,25× a 2×. Sirve para que las chispas del golpe vayan a cámara lenta
// a la vez que el plano.
const VELOCIDADES = Array.from({ length: 90 }, (_, k) =>
  k < 10 ? 1 : k < 58 ? 0.25 : 0.25 + ((k - 58) / 31) * 1.75,
);

const velocidad = (k: number) => VELOCIDADES[Math.min(k, 89)] ?? 2;

/** Fotograma del plano → fotograma de tiempo real (a 30 fps). */
export const tiempoRampa = (f: number): number => {
  const entero = Math.floor(f);
  let t = 0;
  for (let k = 0; k < entero; k++) {
    t += velocidad(k);
  }
  return t + (f - entero) * velocidad(entero);
};
