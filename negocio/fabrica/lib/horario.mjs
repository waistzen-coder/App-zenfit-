// Convierte el horario escrito a mano en una semana de tramos en minutos.
//
//   "horario": {
//     "lunes-viernes": "9:00-14:00, 17:00-20:00",
//     "sábado": "10:00-14:00",
//     "domingo": "cerrado"
//   }
//
// Claves: días sueltos (lunes, sáb, X...), rangos ("lunes-viernes", "l-v", "lunes a sábado"),
// listas ("sábado y domingo") o "todos". Valores: "cerrado", "24h" o tramos separados por
// coma, "y" o "/". Un tramo que acaba antes de empezar cruza la medianoche ("20:00-02:00").

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SCHEMA_DIAS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ABREV = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const ALIAS = {
  lunes: 0, lun: 0, l: 0,
  martes: 1, mar: 1, m: 1,
  miercoles: 2, mie: 2, x: 2,
  jueves: 3, jue: 3, j: 3,
  viernes: 4, vie: 4, v: 4,
  sabado: 5, sab: 5, s: 5,
  domingo: 6, dom: 6, d: 6,
};

const normalizar = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function dia(nombre) {
  const i = ALIAS[normalizar(nombre).replace(/\.$/, '')];
  if (i === undefined) throw new Error(`No entiendo el día «${nombre}» del horario`);
  return i;
}

/** "lunes-viernes" -> [0,1,2,3,4] · "sábado y domingo" -> [5,6] · "todos" -> [0..6] */
export function diasDeClave(clave) {
  const k = normalizar(clave);
  if (/^(todos|diario|todos los dias|cada dia)$/.test(k)) return [0, 1, 2, 3, 4, 5, 6];
  const dias = new Set();
  for (const parte of k.split(/\s*(?:,|\by\b)\s*/).filter(Boolean)) {
    const rango = parte.split(/\s*(?:-|–|\ba\b)\s*/).filter(Boolean);
    if (rango.length === 1) dias.add(dia(rango[0]));
    else if (rango.length === 2) {
      const [a, b] = rango.map(dia);
      for (let i = a; ; i = (i + 1) % 7) { dias.add(i); if (i === b) break; }
    } else throw new Error(`No entiendo los días «${clave}» del horario`);
  }
  return [...dias].sort((a, b) => a - b);
}

function minutos(h) {
  const m = String(h).trim().match(/^(\d{1,2})(?:[:.h](\d{2}))?$/);
  if (!m) throw new Error(`No entiendo la hora «${h}» del horario`);
  const total = Number(m[1]) * 60 + Number(m[2] ?? 0);
  if (total > 24 * 60) throw new Error(`Hora imposible «${h}» en el horario`);
  return total;
}

/** "9:00-14:00, 17:00-20:00" -> [[540,840],[1020,1200]] */
export function tramosDeValor(valor) {
  const v = normalizar(valor);
  if (/^(cerrado|cerrada|-|no)$/.test(v) || v === '') return [];
  if (/^24\s*(h|horas)$/.test(v)) return [[0, 1440]];
  return v.split(/\s*(?:,|\/|;|\by\b)\s*/).filter(Boolean).map((tramo) => {
    const partes = tramo.split(/\s*(?:-|–|\ba\b)\s*/);
    if (partes.length !== 2) throw new Error(`No entiendo el tramo «${tramo}» del horario`);
    const ini = minutos(partes[0]);
    let fin = minutos(partes[1]);
    if (fin <= ini) fin += 1440; // cruza la medianoche
    return [ini, fin];
  });
}

/** Objeto del JSON -> array de 7 días (lunes primero), cada uno con sus tramos. */
export function semanaDeHorario(horario) {
  const semana = Array.from({ length: 7 }, () => null);
  for (const [clave, valor] of Object.entries(horario ?? {})) {
    const tramos = tramosDeValor(valor);
    for (const d of diasDeClave(clave)) semana[d] = tramos;
  }
  return semana.map((t) => t ?? []); // un día que no aparece se da por cerrado
}

export const hayHorario = (semana) => semana.some((t) => t.length > 0);

/** 540 -> "9:00" · 1500 -> "1:00" */
export function hora(min) {
  const m = min % 1440;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

const textoTramos = (tramos) => {
  if (!tramos.length) return 'Cerrado';
  if (tramos.length === 1 && tramos[0][0] === 0 && tramos[0][1] === 1440) return 'Abierto 24 horas';
  return tramos.map(([a, b]) => `${hora(a)} – ${hora(b)}`).join(' · ');
};

/** Una fila por día, para la tabla de horario. */
export const filasHorario = (semana) => semana.map((tramos, i) => ({ dia: DIAS[i], texto: textoTramos(tramos) }));

/** Resumen agrupado para textos cortos: "L–V 9:00 – 14:00 · S 10:00 – 14:00" */
export function resumenHorario(semana) {
  const grupos = [];
  semana.forEach((tramos, i) => {
    const texto = textoTramos(tramos);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.texto === texto && ultimo.fin === i - 1) ultimo.fin = i;
    else grupos.push({ ini: i, fin: i, texto });
  });
  return grupos
    .filter((g) => g.texto !== 'Cerrado')
    .map((g) => `${g.ini === g.fin ? ABREV[g.ini] : `${ABREV[g.ini]}–${ABREV[g.fin]}`} ${g.texto}`)
    .join(' · ');
}

/** Para los datos estructurados de Google (schema.org). */
export function horarioSchema(semana) {
  const filas = [];
  semana.forEach((tramos, i) => {
    for (const [a, b] of tramos) {
      const fmt = (m) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      filas.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${SCHEMA_DIAS[i]}`,
        opens: fmt(a),
        closes: b >= 1440 && b % 1440 === 0 ? '23:59' : fmt(b),
      });
    }
  });
  return filas;
}
