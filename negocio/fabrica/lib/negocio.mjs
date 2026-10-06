// Lee el JSON de un negocio, lo valida y lo combina con los valores por defecto de su sector.

import { SECTORES, LISTA_SECTORES } from './sectores.mjs';
import { ESTILOS } from './fuentes.mjs';
import { ICONOS } from './iconos.mjs';
import { semanaDeHorario } from './horario.mjs';
import { slugify, digitosTelefono, rellenar, listaNatural } from './utils.mjs';

const CTAS = ['llamar', 'whatsapp', 'reservar'];

/**
 * Devuelve el negocio listo para pintar, o lanza un Error con todos los fallos encontrados,
 * escritos para que los entienda quien rellenó el JSON.
 */
export function prepararNegocio(json, origen = 'negocio') {
  const fallos = [];
  const falta = (campo) => fallos.push(`falta «${campo}»`);

  if (!json.nombre) falta('nombre');
  if (!json.ciudad) falta('ciudad');
  if (!json.telefono) falta('telefono');
  const sectorId = json.sector ?? 'generico';
  const sector = SECTORES[sectorId];
  if (!sector) fallos.push(`sector «${sectorId}» no existe; usa uno de: ${LISTA_SECTORES.join(', ')}`);

  const telefono = json.telefono ? digitosTelefono(json.telefono) : null;
  if (json.telefono && !telefono) fallos.push(`el teléfono «${json.telefono}» no parece un número español de 9 cifras`);

  let whatsapp = null;
  if (json.whatsapp !== false) {
    const d = digitosTelefono(json.whatsapp ?? json.telefono);
    if (d && /^[67]/.test(d)) whatsapp = `34${d}`;
    else if (json.whatsapp) fallos.push(`el WhatsApp «${json.whatsapp}» tiene que ser un móvil español`);
  }

  let semana = [];
  try { semana = semanaDeHorario(json.horario); } catch (e) { fallos.push(e.message); }

  if (fallos.length) throw new Error(`${origen}: ${fallos.join('; ')}`);

  const base = { ...sector, ...json };
  const estilo = ESTILOS[base.estilo];
  if (!estilo) throw new Error(`${origen}: estilo «${base.estilo}» no existe; usa rotulo, salon o clinica`);
  for (const s of base.servicios) {
    if (!ICONOS[s.icono]) throw new Error(`${origen}: el icono «${s.icono}» del servicio «${s.titulo}» no existe`);
  }

  const zona = base.zona?.length ? base.zona : [json.ciudad];
  const vars = {
    nombre: json.nombre,
    ciudad: json.ciudad,
    actividad: base.actividad,
    profesion: base.profesion,
    zona: listaNatural(zona),
  };
  const r = (t) => rellenar(t, vars);

  // Si no hay WhatsApp, los botones que lo usan pasan a ser de llamada.
  let cta = base.cta;
  if (!CTAS.includes(cta)) throw new Error(`${origen}: cta «${cta}» no existe; usa ${CTAS.join(', ')}`);
  if (cta === 'whatsapp' && !whatsapp) cta = 'llamar';

  return {
    ...base,
    sector: sectorId,
    slug: json.slug ?? slugify(json.nombre),
    estiloTipo: estilo,
    paleta: { ...sector.paleta, ...(json.paleta ?? {}) },
    telefono,
    whatsapp,
    semana,
    zona,
    cta,
    titular: r(base.titular),
    subtitular: r(base.subtitular),
    sellos: base.sellos.map(r),
    servicios: base.servicios.map((s) => ({ ...s, titulo: r(s.titulo), texto: r(s.texto) })),
    pasos: base.pasos ? base.pasos.map((p) => ({ titulo: r(p.titulo), texto: r(p.texto) })) : null,
    faqs: base.faqs.map((f) => ({ p: r(f.p), r: r(f.r) })),
    cierre: r(base.cierre),
    tituloServicios: base.tituloServicios ? r(base.tituloServicios) : undefined,
    resenas: Array.isArray(json.resenas) ? json.resenas : [],
    valoracion: json.valoracion ?? null,
    ejemplo: Boolean(json.ejemplo),
  };
}
