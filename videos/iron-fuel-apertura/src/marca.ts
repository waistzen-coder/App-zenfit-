// Colores de Iron Fuel Nutrition, sacados del rótulo de la fachada
// (el azul del rótulo es #5ba1e2 a pleno sol; en vídeo, sobre negro, se
// usa una versión algo más intensa para que no se apague).
export const AZUL = "#3a9bff";
export const AZUL_RESPLANDOR = "rgba(58, 155, 255, 0.6)";
export const NEGRO = "#030509";

// Fotogramas en los que se encienden las luces del techo al principio.
// banda_sonora.py usa los mismos para el zumbido del fluorescente.
export const PARPADEOS: ReadonlyArray<readonly [number, number]> = [
  [60, 62],
  [65, 67],
  [70, 74],
  [78, 80],
  [83, 120],
];
