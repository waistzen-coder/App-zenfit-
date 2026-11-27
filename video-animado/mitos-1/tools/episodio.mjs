// Mitos del gimnasio · Nº 1: «La creatina engorda».
// Un momento se escribe "clave" (cuándo empieza esa palabra), ["clave", desfase en s] o un número.
// Las claves salen de `palabras`: [palabra del guion, cuántas veces ha salido antes + 1, "fin" para cuándo acaba].

// series de levantamientos: [momento, postura] alternando desde t0 cada `cada` segundos
const reps = (clave, desde, n, cada = 0.55, abajo = "pecho", arriba = "arriba") =>
  Array.from({ length: n * 2 }, (_, k) => [[clave, desde + k * cada], k % 2 ? abajo : arriba, k % 2 ? "io" : "back"]);

export default {
  numero: 1,
  palabras: {
    mito1: ["Mito", 1], laura1: ["Laura", 1], foro: ["foro"], y1: ["Y", 1], imagino: ["imaginó"],
    por1: ["Por", 1], dependiente: ["dependiente"], engorda2: ["Engorda", 2], no1: ["No", 1],
    la2: ["La", 2], creatina2: ["creatina", 2], agua1: ["agua", 1], uno: ["uno"], kilos: ["kilos"],
    no2: ["no", 2], grasa: ["grasa"], tres: ["Tres"], todos: ["todos"], rendir: ["rendir"], intensos: ["intensos"],
    laura2: ["Laura", 2], llevo: ["llevó"], mes: ["mes"], miraba2: ["Miraba", 2], barra: ["barra"],
    veredicto: ["Veredicto"], mito2: ["mito", 2], que: ["Qué"], comentarios: ["comentarios"], siguenos: ["síguenos"],
    fin: ["perdértelo", 1, "fin"],
  },
  clave: ["creatina", "engorda", "foro", "imagino", "dependiente", "agua", "musculo", "kilos", "grasa", "tres", "rendir", "barra", "mito", "comentarios", "siguenos"],

  // [momento, x, y, zum, curva]
  cam: [
    [0, 2950, 1325, 1.0],
    ["foro", 2950, 1310, 1.02, "s"],
    [["y1", -0.05], 2950, 1310, 1.02, "s"],
    [["y1", 0.45], 2990, 1170, 0.9, "io3"],
    [["por1", 0.15], 2990, 1175, 0.9, "s"],
    [["dependiente", -0.05], 1320, 1250, 0.97, "io"],
    [["la2", -0.15], 1320, 1245, 0.98, "s"],
    [["la2", 0.5], 1320, 1000, 0.85, "io3"],
    [["llevo", 0.15], 1320, 1005, 0.85, "s"],
    [["mes", 0.45], 3450, 1250, 0.9, "io3"],
    [["veredicto", -0.36], 3450, 1255, 0.9, "s"],
    [["veredicto", -0.02], 1350, -850, 1.0, "io3"],
    [["que", -0.36], 1350, -852, 1.0, "s"],
    [["que", -0.02], 1350, 450, 1.0, "io3"],
    [["fin", 0.6], 1350, 455, 1.012, "s"],
  ],
  sacudidas: [["no1", 0.25, 9], ["mito2", 0.35, 12]],

  actores: {
    dep: {
      m: 0.78,
      x: [[0, 1000]],
      face: [[0, 1]],
      pose: [[0, "reposo"], [["dependiente", -0.1], "reposo"], [["dependiente", 0.25], "explica", "back"], [["no1", -0.15], "explica"], [["no1", 0.08], "dedo", "back"], [["no1", 0.7], "dedo"], [["no1", 1.0], "explica", "io"], [["tres", -0.1], "explica"], [["tres", 0.2], "senala", "back"], [["rendir", 0.3], "senala"], [["rendir", 0.6], "explica", "io"], [["llevo", 0], "explica"], [["llevo", 0.4], "reposo", "io"]],
      gesto: [[0, "sonrisa"], [["no1", 0], "ceja"], [["la2", 0], "sonrisa"]],
      habla: [["no1", ["intensos", 0.65]]],
      mira: [[0, 0.8, 0]],
      oculto: [["veredicto", null]],
    },
    laura: {
      m: 0.1,
      x: [[0, 2950], [["por1", 0.2], 2950], [["dependiente", -0.2], 1640, "io"], [["llevo", 0.3], 1640], [["mes", 0.15], 3450, "io"]],
      face: [[0, -1], [["llevo", 0.25], 1]],
      pose: [
        [0, "reposo"], [["laura1", -0.1], "reposo"], [["laura1", 0.2], "telefono", "back"], [["y1", -0.1], "telefono"], [["y1", 0.2], "miedo", "back"],
        [["por1", 0.15], "miedo"], [["por1", 0.45], "reposo", "io"], [["engorda2", -0.1], "reposo"], [["engorda2", 0.15], "explica", "back"],
        [["no1", 0.45], "explica"], [["no1", 0.75], "reposo", "io"], [["llevo", -0.1], "reposo"], [["llevo", 0.15], "bolsa", "io"],
        [["mes", 0.15], "bolsa"], [["mes", 0.45], "pecho", "io"], ...reps("mes", 0.75, 4, 0.55),
      ],
      gesto: [[0, "ceja"], ["laura1", "serio"], [["y1", 0.1], "miedo"], [["por1", 0.2], "neutro"], ["engorda2", "ceja"], [["no1", 0.1], "wow"], ["la2", "sonrisa"], ["grasa", "orgullo"], [["mes", 0.5], "orgullo"]],
      mira: [[0, 0.8, -0.2], ["laura1", 0.4, 0.9], [["y1", 0], 0.3, -0.8], [["por1", 0.2], 0.9, 0], [["mes", 0.5], 0.4, -0.9]],
      habla: [["engorda2", ["no1", -0.12]]],
    },
  },

  objetos: [
    { tipo: "bocadillo", quien: "laura", t0: -1, t1: ["y1", -0.05], lineas: ["LA CREATINA", "ENGORDA"], etiqueta: "¿MITO?", size: 66 },
    { tipo: "prop", que: "movil", quien: "laura", t0: "laura1", t1: ["y1", 0] },
    { tipo: "nube", quien: "laura", mini: "laura2", gag: "globo", t0: "y1", t1: ["por1", 0.15] },
    { tipo: "bocadillo", quien: "laura", t0: "engorda2", t1: ["la2", -0.12], lineas: ["¿ENGORDA?"], sello: "no1", size: 66, dx: -290 },
    { tipo: "prop", que: "bolsa", quien: "laura", t0: "llevo", t1: ["mes", 0.4] },
    { tipo: "estelas", quien: "laura", t0: "llevo", t1: ["mes", 0.4] },
    { tipo: "marcador", t0: ["mes", 0.2], desde: 1, hasta: 4 },
    { tipo: "barra", quien: "laura", t0: ["mes", 0.4], t1: ["veredicto", 0.05], discos: 4 },
  ],
  producto: { tipo: "creatina", t: "creatina2", t1: ["llevo", 0.1], x: 1300 },
  tarjeta: {
    x: 820, y: 420, w: 1000, t0: "la2", hasta: "laura2", cierra: "laura2",
    filas: [
      { t: "agua1", icono: "drop", color: "#3D8BFF", texto: "AGUA DENTRO DEL MÚSCULO", size: 54 },
      { t: "uno", icono: "arrow-fat-up", color: "#1D6BFF", texto: "+1 O 2 KG AL PRINCIPIO", size: 54 },
      { t: "no2", icono: "x-circle", color: "#EF4444", texto: "AGUA, NO GRASA", size: 54 },
      { t: "tres", icono: "calendar-check", color: "#22C55E", texto: "3 G AL DÍA, TODOS LOS DÍAS", size: 54 },
      { t: "rendir", icono: "lightning", color: "#F59E0B", texto: ["RINDES MÁS EN ESFUERZOS", "CORTOS E INTENSOS"], size: 54 },
    ],
  },
  veredicto: { t: ["veredicto", -0.1], sello: "mito2", mito: ["«LA CREATINA", "ENGORDA»"] },
  cta: { t: ["que", -0.1], siguenos: "siguenos", ejemplo: "la creatina es para chicos…" },

  // [momento, efecto, dB, qué lo provoca, duración]
  sfx: [
    ["laura1", "pop-3", -15, "el móvil"],
    ["y1", "pop-2", -11, "la nube"],
    [["y1", 0.4], "boing", -11, "se hincha como un globo"],
    [["por1", 0.85], "campanilla", -15, "entra en la tienda"],
    ["engorda2", "pop-3", -12, "¿ENGORDA?"],
    ["no1", "punch", -8, "sello MITO"],
    ["la2", "pop-1", -11, "tarjeta REALIDAD"],
    ["creatina2", "golpe-madera", -13, "el bote en el mostrador"],
    ["agua1", "pop-2", -14, "fila agua"],
    ["uno", "pop-3", -14, "fila kilos"],
    ["no2", "pop-2", -14, "fila no grasa"],
    ["tres", "pop-3", -14, "fila 3 g"],
    ["rendir", "pop-2", -14, "fila rendimiento"],
    [["llevo", 0.1], "datafono", -14, "se lo lleva"],
    [["llevo", 0.35], "whoosh-2", -14, "se va corriendo al gimnasio"],
    [["mes", 0.2], "click-2", -11, "marcador: semana 4"],
    [["mes", 0.75], "disco-metal", -15, "levanta"],
    [["mes", 1.85], "disco-metal", -16, "levanta"],
    [["mes", 2.95], "disco-metal", -16, "levanta"],
    [["veredicto", -0.32], "whoosh-1", -10, "sube al veredicto"],
    ["mito2", "golpe-climax", -8, "sello MITO", 1.6],
    [["que", -0.3], "whoosh-3", -13, "baja a la llamada"],
    [["siguenos", 0.1], "pop-1", -13, "la mano"],
    [["siguenos", 0.25], "click-1", -8, "SEGUIR"],
  ],
};
