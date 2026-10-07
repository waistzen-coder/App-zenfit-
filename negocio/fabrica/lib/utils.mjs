// Utilidades pequeñas que usan la plantilla y el generador.

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa texto para meterlo en HTML (contenido o atributos). */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ENTIDADES[c]);

/** "Fontanería García" -> "fontaneria-garcia" */
export function slugify(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Rellena {ciudad}, {nombre}... con los valores de `vars`. Deja intactas las claves que no existan. */
export function rellenar(texto, vars) {
  return String(texto ?? '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}

/** Deja solo los 9 dígitos de un teléfono español. Devuelve null si no lo parece. */
export function digitosTelefono(tel) {
  let d = String(tel ?? '').replace(/\D/g, '');
  if (d.startsWith('0034')) d = d.slice(4);
  else if (d.length === 11 && d.startsWith('34')) d = d.slice(2);
  return /^[6789]\d{8}$/.test(d) ? d : null;
}

/** 612345678 -> "612 345 678" (móvil) · 958123456 -> "958 12 34 56" (fijo) */
export function telefonoLegible(d) {
  return /^[67]/.test(d)
    ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
    : `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
}

export const enlaceTelefono = (d) => `tel:+34${d}`;

/** Enlace de WhatsApp con el mensaje ya escrito. `numero` en formato internacional sin "+". */
export const enlaceWhatsapp = (numero, texto) =>
  `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;

/**
 * Enlace para escribir a la agencia: WhatsApp si config.json tiene número, si no correo,
 * y null si no tiene ninguno (entonces se le contesta en el mensaje en el que llegó la propuesta).
 */
export function enlaceAgencia(agencia, texto, asunto) {
  if (agencia.whatsapp) return enlaceWhatsapp(agencia.whatsapp, texto);
  if (agencia.email) return `mailto:${agencia.email}?subject=${encodeURIComponent(asunto ?? texto)}&body=${encodeURIComponent(texto)}`;
  return null;
}

/** Enlace de Google Maps para llegar a una dirección. */
export const enlaceComoLlegar = (destino) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`;

/** Número con coma decimal: 4.8 -> "4,8" */
export const decimal = (n) => String(n).replace('.', ',');

/** Une una lista en castellano: ["a","b","c"] -> "a, b y c" */
export function listaNatural(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}
