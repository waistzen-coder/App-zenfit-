// La web de un negocio, en un único archivo HTML: estilos, fuentes, iconos y script dentro.
// Sin cookies, sin mapas incrustados, sin nada que cargue de terceros.

import { icono, iconoWhatsapp, ICONOS } from './iconos.mjs';
import { fontFace } from './fuentes.mjs';
import { filasHorario, hayHorario, horarioSchema, resumenHorario } from './horario.mjs';
import { esc, telefonoLegible, enlaceTelefono, enlaceWhatsapp, enlaceComoLlegar, decimal, rellenar } from './utils.mjs';

/** Página principal del negocio. `opciones`: { modo: 'demo' | 'final', agencia, fecha } */
export function paginaNegocio(n, opciones) {
  const demo = opciones.modo !== 'final';
  const { agencia } = opciones;
  const tel = telefonoLegible(n.telefono);
  const telHref = enlaceTelefono(n.telefono);
  const waTexto = rellenar(n.mensajeWhatsapp ?? '', { nombre: n.nombre, ciudad: n.ciudad });
  const waHref = n.whatsapp ? enlaceWhatsapp(n.whatsapp, waTexto) : null;
  const [tit1, tit2] = n.titular.split('|');
  const direccionCompleta = [n.direccion, n.cp && n.ciudad ? `${n.cp} ${n.ciudad}` : n.ciudad, n.provincia]
    .filter(Boolean).join(', ');
  const destinoMapa = n.mapa ?? (n.direccion ? `${n.nombre}, ${direccionCompleta}` : `${n.nombre}, ${n.ciudad}`);
  const conHorario = hayHorario(n.semana);
  const b = botones(n, { telHref, tel, waHref });
  const descripcion = metaDescripcion(n);
  const url = n.dominio ? n.dominio.replace(/\/?$/, '/') : null;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(`${n.nombre} · ${n.actividad} en ${n.ciudad}`)}</title>
<meta name="description" content="${esc(descripcion)}">
${demo ? '<meta name="robots" content="noindex, nofollow">' : url ? `<link rel="canonical" href="${esc(url)}">` : ''}
<meta name="theme-color" content="${esc(n.paleta.oscuro)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
<meta property="og:title" content="${esc(`${n.nombre} · ${n.actividad} en ${n.ciudad}`)}">
<meta property="og:description" content="${esc(descripcion)}">
<link rel="icon" href="${favicon(n)}">
<style>
${fontFace(...n.estiloTipo.fuentes)}
${css(n)}
</style>
<script type="application/ld+json">${jsonLd(n, { url, direccionCompleta }).replace(/</g, '\\u003c')}</script>
</head>
<body class="e-${n.estilo} m-${n.modo}">
${demo ? bannerDemo(n, agencia) : ''}
<header class="cab">
  <div class="env cab-in">
    <a class="logo" href="#inicio"><span class="logo-ico">${icono(n.icono)}</span><span>${esc(n.nombre)}</span></a>
    <nav class="menu" aria-label="Secciones">
      <a href="#servicios">Servicios</a>
      ${conHorario ? '<a href="#horario">Horario</a>' : ''}
      <a href="#preguntas">Preguntas</a>
    </nav>
    <a class="cab-tel" href="${telHref}">${icono('phone')}<span>${tel}</span></a>
  </div>
</header>

<main id="inicio">
<section class="hero">
  <div class="env hero-in">
    <div class="hero-txt">
      <p class="antetitulo">${conHorario ? `<span class="estado" data-estado>${esc(resumenHorario(n.semana))}</span>` : esc(`${n.actividad} · ${n.ciudad}`)}</p>
      <h1>${esc(tit1)}${tit2 ? ` <span class="resalte">${esc(tit2)}</span>` : ''}</h1>
      <p class="entradilla">${esc(n.subtitular)}</p>
      <div class="botones">${b.pri}${b.sec ?? ''}</div>
      <ul class="sellos">
        ${[...(n.urgencias ? ['Urgencias 24 horas'] : []), ...n.sellos].slice(0, 3).map((s) => `<li>${icono('check')}${esc(s)}</li>`).join('\n        ')}
      </ul>
    </div>
    ${rotulo(n, { tel, telHref, waHref, conHorario })}
  </div>
</section>

<section class="bloque" id="servicios">
  <div class="env">
    <div class="bloque-cab">
      <p class="antetitulo">${esc(n.antetituloServicios ?? 'Servicios')}</p>
      <h2>${esc(n.tituloServicios ?? 'En qué te podemos ayudar')}</h2>
    </div>
    <div class="servicios">
      ${n.servicios.map((s) => `<article class="servicio">
        <span class="s-ico">${icono(s.icono)}</span>
        <div><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p>${s.precio ? `<p class="precio">${esc(s.precio)}</p>` : ''}</div>
      </article>`).join('\n      ')}
    </div>
  </div>
</section>

${galeria(n)}
${n.pasos ? `<section class="bloque bloque-alt" id="como">
  <div class="env">
    <div class="bloque-cab">
      <p class="antetitulo">Cómo trabajamos</p>
      <h2>Así de sencillo</h2>
    </div>
    <ol class="pasos">
      ${n.pasos.map((p, i) => `<li><span class="p-num">${i + 1}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></li>`).join('\n      ')}
    </ol>
  </div>
</section>` : ''}

${opiniones(n)}

<section class="bloque ${n.pasos ? '' : 'bloque-alt'}" id="horario">
  <div class="env dos-col">
    ${conHorario ? `<div class="tarjeta">
      <h2>Horario</h2>
      <p class="estado-linea"><span class="estado" data-estado>${esc(resumenHorario(n.semana))}</span></p>
      <table class="tabla-horario">
        <tbody>
          ${filasHorario(n.semana).map((f, i) => `<tr data-dia="${i}"><th scope="row">${f.dia}</th><td>${f.texto.split(' · ').map((t) => `<span class="tramo">${esc(t)}</span>`).join('')}</td></tr>`).join('\n          ')}
        </tbody>
      </table>
      ${n.urgencias ? '<p class="nota-urgencias">Urgencias: llámanos a cualquier hora.</p>' : ''}
      ${n.notaHorario ? `<p class="nota-urgencias">${esc(n.notaHorario)}</p>` : ''}
    </div>` : ''}
    <div class="tarjeta">
      <h2>${n.modo === 'domicilio' ? 'Zona de trabajo' : 'Dónde estamos'}</h2>
      ${n.direccion ? `<address>${esc(n.direccion)}<br>${esc(n.cp ? `${n.cp} ${n.ciudad}` : n.ciudad)}${n.provincia ? ` (${esc(n.provincia)})` : ''}</address>` : ''}
      ${n.modo === 'domicilio' ? `<p class="zona-txt">Vamos a domicilio en:</p><ul class="zona">${n.zona.map((z) => `<li>${esc(z)}</li>`).join('')}</ul>` : ''}
      <a class="mapa" href="${esc(enlaceComoLlegar(destinoMapa))}" target="_blank" rel="noopener">
        <span class="mapa-pin">${icono('map-pin')}</span>
        <span class="mapa-txt">${n.modo === 'domicilio' && !n.direccion ? 'Ver en Google Maps' : 'Cómo llegar'} ${icono('arrow-right')}</span>
      </a>
      <ul class="contacto">
        <li>${icono('phone')}<a href="${telHref}">${tel}</a></li>
        ${n.whatsapp ? `<li>${iconoWhatsapp()}<a href="${esc(waHref)}" target="_blank" rel="noopener">WhatsApp</a></li>` : ''}
        ${n.email ? `<li>${icono('mail')}<a href="mailto:${esc(n.email)}">${esc(n.email)}</a></li>` : ''}
      </ul>
    </div>
  </div>
</section>

<section class="bloque" id="preguntas">
  <div class="env estrecho">
    <div class="bloque-cab">
      <p class="antetitulo">Preguntas frecuentes</p>
      <h2>Lo que más nos preguntan</h2>
    </div>
    <div class="faqs">
      ${n.faqs.map((f) => `<details><summary>${esc(f.p)}${icono('chevron-down')}</summary><p>${esc(f.r)}</p></details>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="cierre">
  <div class="env cierre-in">
    <h2>${esc(n.cierre)}</h2>
    <p class="cierre-tel"><a href="${telHref}">${tel}</a></p>
    <div class="botones">${b.priCierre}${b.secCierre ?? ''}</div>
  </div>
</section>
</main>

<footer class="pie">
  <div class="env pie-in">
    <div>
      <p class="pie-nombre">${esc(n.nombre)}</p>
      <p>${esc(direccionCompleta)}</p>
      <p><a href="${telHref}">${tel}</a>${n.email ? ` · <a href="mailto:${esc(n.email)}">${esc(n.email)}</a>` : ''}</p>
    </div>
    <div class="pie-legal">
      ${demo ? '<p>Aviso legal y privacidad: se añaden al publicar.</p>' : '<p><a href="aviso-legal/">Aviso legal y privacidad</a></p>'}
      <p>Esta web no usa cookies.</p>
      <p>Web hecha por <a href="${esc(agencia.web)}">${esc(agencia.nombre)}</a></p>
    </div>
  </div>
</footer>

<nav class="barra" aria-label="Contacto rápido">
  <a class="barra-tel" href="${telHref}">${icono('phone')}Llamar</a>
  ${waHref ? `<a class="barra-wa" href="${esc(waHref)}" target="_blank" rel="noopener">${iconoWhatsapp()}WhatsApp</a>` : ''}
</nav>
${conHorario ? scriptHorario(n) : ''}
</body>
</html>
`;
}

function botones(n, { telHref, tel, waHref }) {
  const llamar = (clase = 'btn-pri') => `<a class="btn ${clase}" href="${telHref}">${icono('phone')}Llamar al ${tel}</a>`;
  const llamarCorto = (clase = 'btn-sec') => `<a class="btn ${clase}" href="${telHref}">${icono('phone')}Llamar</a>`;
  const whatsapp = (texto = 'Escribir por WhatsApp') => `<a class="btn btn-wa" href="${esc(waHref)}" target="_blank" rel="noopener">${iconoWhatsapp()}${texto}</a>`;
  const cierreClaro = (html) => html.replace('btn-pri', 'btn-claro').replace('btn-sec', 'btn-borde');

  let pri; let sec;
  if (n.cta === 'llamar') { pri = llamar(); sec = waHref ? whatsapp() : null; }
  else if (n.cta === 'whatsapp') { pri = whatsapp(n.modo === 'domicilio' ? 'Pedir presupuesto por WhatsApp' : 'Escribir por WhatsApp'); sec = llamarCorto(); }
  else if (n.reservas) {
    pri = `<a class="btn btn-pri" href="${esc(n.reservas)}" target="_blank" rel="noopener">${icono('calendar-check')}Reservar online</a>`;
    sec = waHref ? whatsapp('Reservar por WhatsApp') : llamarCorto();
  } else if (waHref) { pri = whatsapp(n.sector === 'restaurante' ? 'Reservar mesa por WhatsApp' : 'Pedir cita por WhatsApp'); sec = llamarCorto(); }
  else { pri = llamar(); sec = null; }
  return { pri, sec, priCierre: cierreClaro(pri), secCierre: sec ? cierreClaro(sec) : null };
}

function rotulo(n, { tel, telHref, waHref, conHorario }) {
  const estado = conHorario ? `<span class="estado" data-estado>${esc(resumenHorario(n.semana))}</span>` : '';
  const pie = n.valoracion
    ? `<span class="r-nota">${icono('star')} ${decimal(n.valoracion.nota)} · ${n.valoracion.resenas} reseñas en Google</span>`
    : n.desde ? `<span class="r-nota">Desde ${esc(n.desde)}</span>` : '';

  if (n.estilo === 'salon') {
    return `<aside class="rotulo r-salon" aria-label="Datos de ${esc(n.nombre)}">
      <div class="r-marco">
        <span class="r-ico">${icono(n.icono)}</span>
        ${n.desde ? `<span class="r-desde">Desde ${esc(n.desde)}</span>` : `<span class="r-desde">${esc(n.actividad)}</span>`}
        <span class="r-nombre">${esc(n.nombre)}</span>
        <span class="r-act">${esc(n.ciudad)}</span>
        ${estado}
        ${conHorario ? '<span class="r-hoy" data-hoy></span>' : ''}
        ${n.valoracion ? pie : ''}
      </div>
    </aside>`;
  }
  if (n.estilo === 'clinica') {
    return `<aside class="rotulo r-clinica" aria-label="Datos de ${esc(n.nombre)}">
      <div class="r-cab"><span class="r-ico">${icono(n.icono)}</span>${estado}</div>
      <span class="r-nombre">${esc(n.nombre)}</span>
      <span class="r-act">${esc(`${n.actividad} · ${n.ciudad}`)}</span>
      <ul class="r-lista">${n.servicios.slice(0, 4).map((s) => `<li>${icono('check')}${esc(s.titulo)}</li>`).join('')}</ul>
      ${waHref ? `<a class="r-boton" href="${esc(waHref)}" target="_blank" rel="noopener">${iconoWhatsapp()}Pedir cita por WhatsApp</a>` : `<a class="r-boton r-boton-tel" href="${telHref}">${icono('phone')}${tel}</a>`}
      ${pie}
    </aside>`;
  }
  return `<aside class="rotulo r-rotulo" aria-label="Datos de ${esc(n.nombre)}">
    <div class="r-franja"></div>
    <div class="r-cuerpo">
      <div class="r-cab"><span class="r-ico">${icono(n.icono)}</span>${estado}</div>
      <span class="r-nombre">${esc(n.nombre)}</span>
      <span class="r-act">${esc(n.modo === 'domicilio' ? `${n.actividad} · ${n.zona.slice(0, 3).join(', ')}` : `${n.actividad} · ${n.ciudad}`)}</span>
      <a class="r-tel" href="${telHref}">${tel}</a>
      ${pie}
    </div>
  </aside>`;
}

function galeria(n) {
  if (!n.fotos?.length) return '';
  return `<section class="bloque" id="fotos">
  <div class="env">
    <div class="bloque-cab"><p class="antetitulo">Fotos</p><h2>Así trabajamos</h2></div>
    <div class="galeria">
      ${n.fotos.map((f) => `<img src="${esc(typeof f === 'string' ? f : f.src)}" alt="${esc(typeof f === 'string' ? `Foto de ${n.nombre}` : f.alt)}" loading="lazy" width="600" height="450">`).join('\n      ')}
    </div>
  </div>
</section>`;
}

function opiniones(n) {
  if (!n.resenas.length && !n.valoracion) return '';
  const estrellas = (k) => Array.from({ length: 5 }, (_, i) => `<span class="${i < k ? 'on' : ''}">${icono('star')}</span>`).join('');
  return `<section class="bloque" id="opiniones">
  <div class="env">
    <div class="bloque-cab">
      <p class="antetitulo">Opiniones</p>
      <h2>Lo que dicen nuestros clientes</h2>
      ${n.valoracion ? `<p class="nota-global"><span class="estrellas">${estrellas(Math.round(n.valoracion.nota))}</span> <strong>${decimal(n.valoracion.nota)}</strong> de 5 · ${n.valoracion.resenas} reseñas en Google</p>` : ''}
    </div>
    ${n.resenas.length ? `<div class="resenas">
      ${n.resenas.map((r) => `<figure class="resena">
        <span class="estrellas">${estrellas(r.estrellas ?? 5)}</span>
        <blockquote>${esc(r.texto)}</blockquote>
        <figcaption>${esc(r.autor)}${r.fuente !== false ? ' · Reseña de Google' : ''}</figcaption>
      </figure>`).join('\n      ')}
    </div>` : ''}
    ${n.ejemplo && n.resenas.length ? '<p class="aviso-ejemplo">Reseñas de ejemplo: en tu web irán las tuyas de Google.</p>' : ''}
    ${n.enlaceGoogle ? `<p class="mas-resenas"><a href="${esc(n.enlaceGoogle)}" target="_blank" rel="noopener">Ver todas las reseñas en Google ${icono('arrow-right')}</a></p>` : ''}
  </div>
</section>`;
}

function bannerDemo(n, agencia) {
  const href = enlaceWhatsapp(agencia.whatsapp, `Hola, he visto la propuesta de web para ${n.nombre} y me interesa.`);
  return `<div class="demo" role="note">
  <div class="env demo-in">
    <p><strong>Propuesta de web para ${esc(n.nombre)}</strong>, preparada por ${esc(agencia.nombre)}. ${n.ejemplo ? 'Negocio y datos ficticios, solo para enseñar el diseño.' : 'Los textos son orientativos: los ajustamos contigo antes de publicar.'}</p>
    <a href="${esc(href)}" target="_blank" rel="noopener">${n.ejemplo ? 'Quiero una así' : '¿Te gusta? Hablemos'}</a>
  </div>
</div>`;
}

function metaDescripcion(n) {
  const base = `${n.nombre}: ${n.actividad.toLowerCase()} en ${n.ciudad}. ${n.subtitular}`;
  return base.length > 158 ? `${base.slice(0, 155).replace(/\s+\S*$/, '')}…` : base;
}

function favicon(n) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${n.paleta.oscuro}"/><g transform="translate(5 5) scale(.917)" fill="none" stroke="${n.paleta.acento}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONOS[n.icono]}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function jsonLd(n, { url, direccionCompleta }) {
  const datos = {
    '@context': 'https://schema.org',
    '@type': n.schema,
    name: n.nombre,
    description: n.subtitular,
    telephone: `+34${n.telefono}`,
    ...(url ? { url } : {}),
    ...(n.email ? { email: n.email } : {}),
    address: {
      '@type': 'PostalAddress',
      ...(n.direccion ? { streetAddress: n.direccion } : {}),
      addressLocality: n.ciudad,
      ...(n.cp ? { postalCode: n.cp } : {}),
      ...(n.provincia ? { addressRegion: n.provincia } : {}),
      addressCountry: 'ES',
    },
    ...(n.geo ? { geo: { '@type': 'GeoCoordinates', latitude: n.geo[0], longitude: n.geo[1] } } : {}),
    ...(n.modo === 'domicilio' ? { areaServed: n.zona.map((z) => ({ '@type': 'City', name: z })) } : {}),
    ...(hayHorario(n.semana) ? { openingHoursSpecification: horarioSchema(n.semana) } : {}),
    ...(n.precios ? { priceRange: n.precios } : {}),
    ...(n.redes?.length ? { sameAs: n.redes } : {}),
  };
  // Sin aggregateRating: Google no admite reseñas propias en la ficha de un negocio local.
  void direccionCompleta;
  return JSON.stringify(datos);
}

/** Calcula en el navegador si está abierto ahora, con la hora de España peninsular. */
function scriptHorario(n) {
  return `<script>
(function () {
  var S = ${JSON.stringify(n.semana)};
  var DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  function h(m) { m = m % 1440; return Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2); }
  function cierra(m) { return m % 1440 === 0 ? 'cierra a medianoche' : 'cierra a las ' + h(m); }
  var p = {};
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
    .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
  var d = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday);
  var t = (+p.hour % 24) * 60 + (+p.minute);
  if (d < 0) return;
  var siempre = S.every(function (x) { return x.length === 1 && x[0][0] === 0 && x[0][1] === 1440; });
  var texto, abierto = false, i, k, x;
  if (siempre) { texto = 'Abierto 24 horas'; abierto = true; }
  for (i = 0; !texto && i < S[d].length; i++) {
    x = S[d][i];
    if (t >= x[0] && t < x[1]) { texto = 'Abierto ahora · ' + cierra(x[1]); abierto = true; }
  }
  var ayer = S[(d + 6) % 7];
  for (i = 0; !texto && i < ayer.length; i++) {
    x = ayer[i];
    if (x[1] > 1440 && t + 1440 < x[1]) { texto = 'Abierto ahora · ' + cierra(x[1]); abierto = true; }
  }
  for (k = 0; !texto && k < 8; k++) {
    var dd = (d + k) % 7;
    for (i = 0; !texto && i < S[dd].length; i++) {
      x = S[dd][i];
      if (k > 0 || x[0] > t) {
        texto = 'Cerrado ahora · abre ' + (k === 0 ? 'hoy' : k === 1 ? 'mañana' : 'el ' + DIAS[dd]) + ' a las ' + h(x[0]);
      }
    }
  }
  if (!texto) return;
  document.querySelectorAll('[data-estado]').forEach(function (el) {
    el.textContent = texto;
    el.classList.add(abierto ? 'abierto' : 'cerrado');
  });
  var hoy = S[d].length ? S[d].map(function (x) { return h(x[0]) + ' – ' + h(x[1]); }).join(' · ') : 'Hoy cerramos';
  document.querySelectorAll('[data-hoy]').forEach(function (el) { el.textContent = S[d].length ? 'Hoy: ' + hoy : hoy; });
  var fila = document.querySelector('tr[data-dia="' + d + '"]');
  if (fila) fila.classList.add('hoy');
})();
</script>`;
}

function css(n) {
  const p = n.paleta;
  const e = n.estiloTipo;
  const radioBoton = { rotulo: '10px', salon: '999px', clinica: '14px' }[n.estilo];
  return `
:root{
  color-scheme:light;
  --marca:${p.marca};--oscuro:${p.oscuro};--acento:${p.acento};--fondo:${p.fondo};--tinta:${p.tinta};
  --sup:#fff;
  --tinta-2:color-mix(in srgb,var(--tinta) 72%,var(--fondo));
  --linea:color-mix(in srgb,var(--tinta) 13%,transparent);
  --marca-suave:color-mix(in srgb,var(--marca) 9%,#fff);
  --wa:#25D366;--wa-tinta:#063A1D;
  --ok:#12804A;--ko:#B4361E;
  --f-tit:${e.titulo};--f-txt:${e.texto};
  --r:18px;--rb:${radioBoton};
  --ancho:1140px;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--fondo);color:var(--tinta);font:400 17px/1.6 var(--f-txt);-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto;display:block}
a{color:inherit}
p{margin:0}
ul,ol{margin:0;padding:0;list-style:none}
h1,h2,h3{font-family:var(--f-tit);font-weight:${e.pesoTitulo};letter-spacing:${e.espaciadoTitulo};line-height:1.06;margin:0;text-wrap:balance}
h3{line-height:1.2}
.i{width:1em;height:1em;flex:none}
:focus-visible{outline:3px solid var(--acento);outline-offset:3px;border-radius:4px}
.env{max-width:var(--ancho);margin-inline:auto;padding-inline:20px}
.estrecho{max-width:820px}
.antetitulo{font:650 13px/1.3 var(--f-txt);letter-spacing:.09em;text-transform:uppercase;color:var(--marca)}

/* Aviso de propuesta: neutro a propósito, para que no se confunda con el diseño */
.demo{background:#15171B;color:#E9EAEC;font-size:14px;line-height:1.45}
.demo-in{display:flex;gap:10px 18px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding-block:10px}
.demo p{flex:1 1 380px;min-width:0}
.demo strong{color:#fff}
.demo a{flex:none;background:#fff;color:#15171B;border-radius:999px;padding:7px 16px;font-weight:650;text-decoration:none}

/* Cabecera */
.cab{background:var(--sup);border-bottom:1px solid var(--linea)}
.cab-in{display:flex;align-items:center;gap:20px;min-height:68px}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none;font:${e.pesoTitulo} 22px/1.1 var(--f-tit);letter-spacing:${e.espaciadoTitulo};min-width:0}
.logo span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.logo-ico{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:var(--oscuro);color:var(--acento);flex:none}
.logo-ico .i{width:21px;height:21px}
.menu{display:flex;gap:26px;margin-left:auto;font-weight:550;font-size:16px}
.menu a{text-decoration:none;color:var(--tinta-2)}
.menu a:hover{color:var(--tinta)}
.cab-tel{display:inline-flex;align-items:center;gap:8px;font-weight:700;text-decoration:none;color:var(--marca);font-variant-numeric:tabular-nums;white-space:nowrap}
.cab-tel .i{width:18px;height:18px}

/* Portada */
.hero{padding-block:56px 64px;background:
  radial-gradient(1200px 420px at 85% -10%,color-mix(in srgb,var(--marca) 13%,transparent),transparent 70%),var(--fondo)}
.hero-in{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:56px;align-items:center}
.hero-txt{display:flex;flex-direction:column;gap:22px;min-width:0}
.hero h1{font-size:clamp(2.5rem,5.4vw,4.4rem)}
.hero h1 .resalte{display:block;color:var(--marca);font-size:.62em;line-height:1.12;margin-top:.18em}
.entradilla{font-size:19px;color:var(--tinta-2);max-width:36em}
.botones{display:flex;flex-wrap:wrap;gap:12px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:54px;padding:0 24px;border-radius:var(--rb);font:650 17px/1.2 var(--f-txt);text-decoration:none;border:2px solid transparent;transition:transform .15s ease,box-shadow .15s ease;font-variant-numeric:tabular-nums}
.btn .i{width:20px;height:20px}
.btn:hover{transform:translateY(-1px)}
.btn-pri{background:var(--marca);color:#fff;box-shadow:0 10px 24px -12px color-mix(in srgb,var(--marca) 80%,transparent)}
.btn-wa{background:var(--wa);color:var(--wa-tinta)}
.btn-sec{background:var(--sup);color:var(--tinta);border-color:var(--linea)}
.btn-claro{background:#fff;color:var(--oscuro)}
.btn-borde{background:transparent;color:#fff;border-color:color-mix(in srgb,#fff 45%,transparent)}
.sellos{display:flex;flex-wrap:wrap;gap:8px 22px;color:var(--tinta-2);font-size:15px;font-weight:550}
.sellos li{display:flex;align-items:center;gap:7px}
.sellos .i{color:var(--marca);width:18px;height:18px}

/* Estado abierto/cerrado */
.estado{display:inline-flex;align-items:center;gap:8px;text-transform:none;letter-spacing:0;font-weight:650}
.estado::before{content:"";width:9px;height:9px;border-radius:50%;background:currentColor;opacity:.35;flex:none}
.estado.abierto{color:var(--ok)}
.estado.cerrado{color:var(--ko)}
.estado.abierto::before,.estado.cerrado::before{opacity:1;box-shadow:0 0 0 4px color-mix(in srgb,currentColor 18%,transparent)}
.antetitulo .estado{font-size:14px}

/* El rótulo de la portada */
.rotulo{border-radius:var(--r);min-width:0}
.r-ico{display:grid;place-items:center;flex:none}
.r-nombre{display:block;font-family:var(--f-tit);font-weight:${e.pesoTitulo};letter-spacing:${e.espaciadoTitulo};line-height:1.05;overflow-wrap:anywhere}
.r-act{display:block}
.r-nota{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600}
.r-nota .i{color:var(--acento);fill:var(--acento)}

.r-rotulo{background:var(--oscuro);color:#fff;overflow:hidden;box-shadow:0 30px 60px -30px color-mix(in srgb,var(--oscuro) 75%,transparent)}
.r-franja{height:20px;background:repeating-linear-gradient(-45deg,var(--acento) 0 16px,var(--oscuro) 16px 32px)}
.r-rotulo .r-cuerpo{display:flex;flex-direction:column;gap:12px;padding:26px 28px 30px}
.r-rotulo .r-cab{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.r-rotulo .r-ico{width:52px;height:52px;border-radius:14px;background:color-mix(in srgb,var(--acento) 16%,transparent);color:var(--acento)}
.r-rotulo .r-ico .i{width:28px;height:28px}
.r-rotulo .estado{font-size:13px;background:#fff;border-radius:999px;padding:5px 12px}
.r-rotulo .r-nombre{font-size:clamp(2rem,3.6vw,2.7rem);text-transform:uppercase;margin-top:6px}
.r-rotulo .r-act{color:color-mix(in srgb,#fff 72%,var(--oscuro));font-size:15px}
.r-rotulo .r-tel{font:700 clamp(2.3rem,4.6vw,3.3rem)/1 'Barlow Condensed','Arial Narrow',sans-serif;color:var(--acento);text-decoration:none;letter-spacing:.01em;font-variant-numeric:tabular-nums;margin-top:6px}
.r-rotulo .r-nota{color:color-mix(in srgb,#fff 85%,var(--oscuro))}

.r-salon{background:var(--oscuro);color:#fff;padding:14px;box-shadow:0 30px 60px -30px color-mix(in srgb,var(--oscuro) 80%,transparent)}
.r-salon .r-marco{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:34px 24px 30px;border:1.5px solid var(--acento);border-radius:calc(var(--r) - 6px);outline:1px solid color-mix(in srgb,var(--acento) 45%,transparent);outline-offset:-8px}
.r-salon .r-ico{width:58px;height:58px;border-radius:50%;border:1.5px solid var(--acento);color:var(--acento)}
.r-salon .r-ico .i{width:28px;height:28px}
.r-salon .r-desde{font:650 12px/1 var(--f-txt);letter-spacing:.24em;text-transform:uppercase;color:var(--acento);margin-top:6px}
.r-salon .r-nombre{font-size:clamp(2rem,3.8vw,2.9rem)}
.r-salon .r-act{font-size:15px;letter-spacing:.06em;color:color-mix(in srgb,#fff 70%,var(--oscuro))}
.r-salon .estado{font-size:14px;background:#fff;border-radius:999px;padding:6px 14px;margin-top:8px}
.r-salon .r-hoy{font-size:14px;color:color-mix(in srgb,#fff 78%,var(--oscuro));font-variant-numeric:tabular-nums}
.r-salon .r-nota{color:#fff}

.r-clinica{background:var(--sup);border:1px solid var(--linea);padding:28px;display:flex;flex-direction:column;gap:12px;box-shadow:0 30px 60px -36px color-mix(in srgb,var(--marca) 55%,transparent)}
.r-clinica .r-cab{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.r-clinica .r-ico{width:52px;height:52px;border-radius:16px;background:var(--marca-suave);color:var(--marca)}
.r-clinica .r-ico .i{width:28px;height:28px}
.r-clinica .estado{font-size:13px}
.r-clinica .r-nombre{font-size:clamp(1.7rem,2.8vw,2.2rem);margin-top:8px}
.r-clinica .r-act{color:var(--tinta-2);font-size:15px}
.r-lista{display:grid;gap:8px;margin-block:8px 6px;font-size:15.5px}
.r-lista li{display:flex;gap:9px;align-items:center}
.r-lista .i{color:var(--marca);width:18px;height:18px}
.r-boton{display:flex;align-items:center;justify-content:center;gap:9px;min-height:50px;border-radius:var(--rb);background:var(--wa);color:var(--wa-tinta);font-weight:650;text-decoration:none}
.r-boton .i{width:20px;height:20px}
.r-boton-tel{background:var(--marca);color:#fff}
.r-clinica .r-nota{color:var(--tinta-2)}

/* Bloques */
.bloque{padding-block:84px}
.bloque-alt{background:var(--sup);border-block:1px solid var(--linea)}
.bloque-cab{display:flex;flex-direction:column;gap:12px;margin-bottom:40px;max-width:40em}
.bloque-cab h2{font-size:clamp(2rem,3.6vw,2.9rem)}

.servicios{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.servicio{display:flex;flex-direction:column;gap:16px;background:var(--sup);border:1px solid var(--linea);border-radius:var(--r);padding:26px}
.servicio h3{font-size:${n.estilo === 'rotulo' ? '25px' : '21px'};margin-bottom:6px}
.servicio p{color:var(--tinta-2);font-size:16px}
.servicio .precio{color:var(--marca);font-weight:700;margin-top:10px}
.s-ico{display:grid;place-items:center;width:48px;height:48px;border-radius:13px;background:var(--marca-suave);color:var(--marca)}
.s-ico .i{width:24px;height:24px}

.galeria{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.galeria img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--r)}

.pasos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;counter-reset:paso}
.pasos li{display:flex;flex-direction:column;gap:10px;padding-top:22px;border-top:3px solid var(--marca)}
.p-num{font:${e.pesoTitulo} 46px/1 var(--f-tit);color:var(--marca)}
.pasos h3{font-size:${n.estilo === 'rotulo' ? '26px' : '22px'}}
.pasos p{color:var(--tinta-2);font-size:16px}

.nota-global{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:17px}
.estrellas{display:inline-flex;gap:2px}
.estrellas .i{width:18px;height:18px;color:color-mix(in srgb,var(--tinta) 25%,transparent)}
.estrellas .on .i{color:#E8A317;fill:#E8A317}
.resenas{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.resena{margin:0;display:flex;flex-direction:column;gap:14px;background:var(--sup);border:1px solid var(--linea);border-radius:var(--r);padding:24px}
.resena blockquote{margin:0;font-size:16.5px}
.resena figcaption{color:var(--tinta-2);font-size:14px;font-weight:600;margin-top:auto}
.aviso-ejemplo,.mas-resenas{margin-top:18px;color:var(--tinta-2);font-size:14px}
.mas-resenas a{display:inline-flex;align-items:center;gap:6px;font-weight:650;color:var(--marca)}

.dos-col{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:22px}
.tarjeta{background:var(--sup);border:1px solid var(--linea);border-radius:var(--r);padding:30px;display:flex;flex-direction:column;gap:16px;min-width:0}
.tarjeta h2{font-size:clamp(1.7rem,2.6vw,2.2rem)}
.estado-linea .estado{font-size:16px}
.tabla-horario{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:16px}
.tabla-horario th,.tabla-horario td{padding:11px 0;border-bottom:1px solid var(--linea);text-align:left;vertical-align:top}
.tabla-horario th{font-weight:600;padding-right:16px;white-space:nowrap}
.tabla-horario td{color:var(--tinta-2);text-align:right}
.tramo{white-space:nowrap}
.tramo+.tramo::before{content:" · "}
.tabla-horario tr.hoy th,.tabla-horario tr.hoy td{color:var(--marca);font-weight:700}
.tabla-horario tr.hoy th::after{content:"Hoy";margin-left:8px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;background:var(--marca);color:#fff;border-radius:999px;padding:2px 8px;vertical-align:2px}
.nota-urgencias{font-weight:600;color:var(--tinta)}
address{font-style:normal;font-size:17px}
.zona-txt{color:var(--tinta-2);font-size:15px}
.zona{display:flex;flex-wrap:wrap;gap:8px;margin-top:-6px}
.zona li{background:var(--marca-suave);color:var(--oscuro);border-radius:999px;padding:5px 13px;font-size:15px;font-weight:550}
.mapa{position:relative;display:flex;align-items:flex-end;min-height:170px;border-radius:14px;overflow:hidden;text-decoration:none;color:var(--tinta);border:1px solid var(--linea);
  background:
    linear-gradient(115deg,transparent 46%,color-mix(in srgb,var(--sup) 92%,transparent) 46% 50%,transparent 50%),
    linear-gradient(18deg,transparent 60%,color-mix(in srgb,var(--sup) 92%,transparent) 60% 63%,transparent 63%),
    repeating-linear-gradient(0deg,color-mix(in srgb,var(--marca) 7%,transparent) 0 1px,transparent 1px 26px),
    repeating-linear-gradient(90deg,color-mix(in srgb,var(--marca) 7%,transparent) 0 1px,transparent 1px 26px),
    color-mix(in srgb,var(--marca) 8%,var(--fondo))}
.mapa-pin{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);display:grid;place-items:center;width:46px;height:46px;border-radius:50% 50% 50% 4px;rotate:-45deg;background:var(--marca);color:#fff;box-shadow:0 10px 20px -8px color-mix(in srgb,var(--marca) 80%,transparent)}
.mapa-pin .i{rotate:45deg;width:22px;height:22px}
.mapa-txt{display:inline-flex;align-items:center;gap:8px;margin:14px;background:var(--sup);border-radius:999px;padding:8px 16px;font-weight:650;font-size:15px;box-shadow:0 4px 14px -6px color-mix(in srgb,var(--tinta) 35%,transparent)}
.contacto{display:grid;gap:10px;font-size:16px}
.contacto li{display:flex;align-items:center;gap:10px;min-width:0}
.contacto .i{color:var(--marca);width:19px;height:19px}
.contacto a{font-weight:600;text-decoration:none;overflow-wrap:anywhere}

.faqs{display:grid;gap:10px}
.faqs details{background:var(--sup);border:1px solid var(--linea);border-radius:14px;padding:0 22px}
.faqs summary{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:62px;font-weight:650;font-size:17px;cursor:pointer;list-style:none}
.faqs summary::-webkit-details-marker{display:none}
.faqs summary .i{width:20px;height:20px;color:var(--marca);transition:rotate .2s ease}
.faqs details[open] summary .i{rotate:180deg}
.faqs details p{padding-bottom:20px;color:var(--tinta-2)}

.cierre{background:var(--oscuro);color:#fff;padding-block:80px;position:relative;overflow:hidden}
.e-rotulo .cierre{border-top:14px solid transparent;border-image:repeating-linear-gradient(-45deg,var(--acento) 0 14px,var(--oscuro) 14px 28px) 14}
.cierre-in{display:flex;flex-direction:column;align-items:center;text-align:center;gap:20px}
.cierre h2{font-size:clamp(2rem,4.4vw,3.4rem);max-width:18em}
.cierre-tel a{font:700 clamp(2rem,4vw,2.8rem)/1 var(--f-tit);color:var(--acento);text-decoration:none;font-variant-numeric:tabular-nums}
.cierre .botones{justify-content:center}

.pie{background:color-mix(in srgb,var(--oscuro) 92%,#000);color:color-mix(in srgb,#fff 78%,var(--oscuro));font-size:15px;padding-block:40px}
.pie-in{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}
.pie-in>div{display:flex;flex-direction:column;gap:6px;min-width:0}
.pie-nombre{font:${e.pesoTitulo} 20px/1.2 var(--f-tit);color:#fff}
.pie a{color:#fff}
.pie-legal{text-align:right}

.barra{display:none}

@media (max-width:900px){
  .hero-in{grid-template-columns:1fr;gap:36px}
  .servicios,.resenas{grid-template-columns:repeat(2,minmax(0,1fr))}
  .menu{display:none}
  .cab-tel{margin-left:auto}
}
@media (max-width:640px){
  body{font-size:16.5px;padding-bottom:calc(78px + env(safe-area-inset-bottom,0px))}
  .env{padding-inline:18px}
  .cab-in{min-height:60px}
  .logo{font-size:19px}
  .logo-ico{width:34px;height:34px}
  .cab-tel span{display:none}
  .cab-tel{width:42px;height:42px;justify-content:center;border-radius:12px;background:var(--marca-suave)}
  .hero{padding-block:34px 44px}
  .entradilla{font-size:17.5px}
  .botones .btn{flex:1 1 100%}
  .servicios,.resenas,.pasos{grid-template-columns:1fr}
  .servicio{flex-direction:row;align-items:flex-start;padding:20px}
  .bloque{padding-block:60px}
  .bloque-cab{margin-bottom:28px}
  .tarjeta{padding:22px}
  .tramo{display:block}
  .tramo+.tramo::before{content:none}
  .pie-legal{text-align:left}
  .barra{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:10px;position:fixed;left:0;right:0;bottom:0;z-index:30;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));background:color-mix(in srgb,var(--sup) 94%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid var(--linea)}
  .barra a{display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border-radius:12px;font-weight:700;text-decoration:none;font-size:16px}
  .barra .i{width:20px;height:20px}
  .barra-tel{background:var(--marca);color:#fff}
  .barra-wa{background:var(--wa);color:var(--wa-tinta)}
}
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  .btn,.faqs summary .i{transition:none}
}
`;
}

/** Página de aviso legal, privacidad y cookies para la versión publicada. */
export function paginaAvisoLegal(n, opciones) {
  const t = n.titular_legal ?? n.legal ?? {};
  const titular = t.nombre ?? n.nombre;
  const nif = t.nif ?? '[NIF/CIF pendiente]';
  const domicilio = t.domicilio ?? [n.direccion, n.cp, n.ciudad, n.provincia].filter(Boolean).join(', ');
  const email = t.email ?? n.email ?? '[correo pendiente]';
  const sitio = n.dominio ?? 'esta web';
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aviso legal y privacidad · ${esc(n.nombre)}</title>
<meta name="robots" content="noindex">
<link rel="icon" href="${favicon(n)}">
<style>
${fontFace(...n.estiloTipo.fuentes)}
${css(n)}
.legal{padding-block:56px 80px}
.legal h1{font-size:clamp(2rem,4vw,2.8rem);margin-bottom:28px}
.legal h2{font-size:1.5rem;margin:36px 0 12px}
.legal p,.legal li{color:var(--tinta-2);margin-bottom:10px}
.legal ul{list-style:disc;padding-left:22px}
.legal a{color:var(--marca)}
</style>
</head>
<body class="e-${n.estilo}">
<header class="cab"><div class="env cab-in"><a class="logo" href="../"><span class="logo-ico">${icono(n.icono)}</span><span>${esc(n.nombre)}</span></a></div></header>
<main class="env estrecho legal">
<h1>Aviso legal y privacidad</h1>

<h2>Quién está detrás de esta web</h2>
<p>En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI), te informamos de que ${esc(sitio)} es propiedad de:</p>
<ul>
  <li>Titular: ${esc(titular)}</li>
  <li>NIF: ${esc(nif)}</li>
  <li>Domicilio: ${esc(domicilio)}</li>
  <li>Teléfono: ${esc(telefonoLegible(n.telefono))}</li>
  <li>Correo electrónico: ${esc(email)}</li>
  ${t.registro ? `<li>${esc(t.registro)}</li>` : ''}
</ul>

<h2>Uso de la web</h2>
<p>El acceso a esta web es gratuito y no requiere registro. Quien la visita se compromete a hacer un uso adecuado de sus contenidos. Los textos, imágenes y logotipos son de ${esc(titular)} o se usan con permiso, y no pueden reproducirse sin autorización.</p>

<h2>Protección de datos</h2>
<p>Esta web no tiene formularios ni recoge datos por sí misma. Si nos llamas, nos escribes por WhatsApp o nos mandas un correo, el responsable de los datos que nos facilites es ${esc(titular)} (contacto: ${esc(email)}).</p>
<ul>
  <li><strong>Para qué:</strong> atender tu consulta, darte presupuesto o gestionar tu cita o encargo.</li>
  <li><strong>Base legal:</strong> tu consentimiento al contactarnos y, si nos contratas, la ejecución del servicio.</li>
  <li><strong>Cuánto tiempo:</strong> el necesario para atenderte y, si hay relación comercial, lo que exija la ley (por ejemplo, la fiscal).</li>
  <li><strong>A quién se comunican:</strong> a nadie, salvo obligación legal.</li>
  <li><strong>Tus derechos:</strong> puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a ${esc(email)}. Si crees que no hemos tratado bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).</li>
</ul>
<p>Si nos escribes por WhatsApp, ese servicio lo presta WhatsApp Ireland Limited con sus propias condiciones.</p>

<h2>Cookies</h2>
<p>Esta web no usa cookies propias ni de terceros, ni herramientas de analítica o publicidad. Por eso no te mostramos ningún aviso de cookies.</p>

<h2>Enlaces externos</h2>
<p>Los enlaces a Google Maps o WhatsApp llevan a servicios de terceros que tienen sus propias políticas de privacidad.</p>

<p style="margin-top:36px">Última actualización: ${esc(opciones.fecha)}.</p>
</main>
</body>
</html>
`;
}
