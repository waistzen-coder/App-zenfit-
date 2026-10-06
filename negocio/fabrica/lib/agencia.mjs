// La web de la propia agencia: Mostrador.
// Fachada de tienda de barrio: rótulo verde, toldo a rayas, precios en ticket de caja.

import { icono, iconoWhatsapp } from './iconos.mjs';
import { fontFace } from './fuentes.mjs';
import { esc, enlaceWhatsapp } from './utils.mjs';

const euros = (n) => `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/** `ejemplos`: [{ slug, actividad, ciudad, nombre }] de las webs de ejemplo ya generadas. */
export function paginaAgencia(a, ejemplos) {
  const p = a.precios;
  const wa = enlaceWhatsapp(a.whatsapp, 'Hola, quiero ver cómo quedaría la web de mi negocio. Se llama: ');
  const waPack = (pack) => enlaceWhatsapp(a.whatsapp, `Hola, me interesa la ${pack}. Mi negocio se llama: `);
  const zonaTexto = a.pueblos.slice(0, -1).join(', ') + ' y ' + a.pueblos[a.pueblos.length - 1];
  const descripcion = `Te preparamos la web de tu negocio y la ves antes de pagar nada. Si te gusta, publicada en 72 horas desde ${p.esencial} €. ${zonaTexto}.`;

  const ticket = ({ num, nombre, items, total, pie, cta, destacado, nota }) => `
      <div class="t-sombra${destacado ? ' t-sombra-destacada' : ''}">
        ${destacado ? '<span class="etiqueta etiqueta-peq"><strong>Recomendada</strong></span>' : ''}
        <article class="ticket">
          <header class="t-cab">
            <p class="t-tienda">${esc(a.nombre.toUpperCase())}</p>
            <p>${esc(a.lema)}</p>
            <p>Ticket ${num} · ${esc(nombre)}</p>
          </header>
          <ul class="t-items">
            ${items.map((i) => `<li><span>1</span><span>${esc(i)}</span><span aria-label="incluido">✓</span></li>`).join('\n            ')}
          </ul>
          <p class="t-total"><span>TOTAL</span><span>${esc(total)}</span></p>
          <p class="t-pie">${esc(pie)}</p>
          ${nota ? `<p class="t-nota">${esc(nota)}</p>` : ''}
          <div class="t-barras" aria-hidden="true"></div>
          <a class="btn btn-ticket" href="${esc(cta)}" target="_blank" rel="noopener">${iconoWhatsapp()}La quiero</a>
        </article>
      </div>`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(a.nombre)} · Webs para negocios de ${esc(a.zona)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${esc(a.web.replace(/\/?$/, '/'))}">
<meta name="theme-color" content="#0A3A2C">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
<meta property="og:title" content="${esc(`${a.nombre} · Primero ves tu web. Luego decides.`)}">
<meta property="og:description" content="${esc(descripcion)}">
<link rel="icon" href="${favicon()}">
<style>
${fontFace('barlowCondensed', 'figtree', 'plexMono')}
${css()}
</style>
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: a.nombre,
    description: descripcion,
    url: a.web,
    email: a.email,
    areaServed: a.pueblos.map((z) => ({ '@type': 'City', name: z })),
    priceRange: `${p.esencial}-${p.completa} €`,
  }).replace(/</g, '\\u003c')}</script>
</head>
<body>
<header class="fachada">
  <div class="env fachada-in">
    <a class="marca" href="#inicio" aria-label="${esc(a.nombre)}, inicio">${esc(a.nombre.toUpperCase())}</a>
    <nav class="menu" aria-label="Secciones">
      <a href="#como">Cómo funciona</a>
      <a href="#ejemplos">Ejemplos</a>
      <a href="#precios">Precios</a>
      <a href="#preguntas">Preguntas</a>
    </nav>
    <a class="btn-cab" href="${esc(wa)}" target="_blank" rel="noopener">${iconoWhatsapp()}<span>Pedir mi propuesta</span></a>
  </div>
</header>
<div class="toldo" aria-hidden="true"></div>

<main id="inicio">
<section class="portada">
  <div class="env portada-in">
    <div class="portada-txt">
      <p class="ante">${esc(a.lema)} · ${esc(a.zona.charAt(0).toUpperCase() + a.zona.slice(1))}</p>
      <h1>Primero ves tu web. <span>Luego decides.</span></h1>
      <p class="entradilla">Preparamos la web de tu negocio sin compromiso y te la mandamos al móvil. Si te gusta, la publicamos en 72&nbsp;horas desde ${p.esencial}&nbsp;€, con dominio incluido. Si no, no pagas nada.</p>
      <div class="botones">
        <a class="btn btn-wa" href="${esc(wa)}" target="_blank" rel="noopener">${iconoWhatsapp()}Quiero ver mi web</a>
        <a class="btn btn-sec" href="#ejemplos">Ver ejemplos</a>
      </div>
      <ul class="garantias">
        <li>${icono('check')}Sin permanencia</li>
        <li>${icono('check')}Factura con IVA</li>
        <li>${icono('check')}La web es tuya</li>
      </ul>
    </div>
    <div class="portada-movil">
      <div class="movil"><span class="pantalla"><img src="img/ejemplo-barberia.jpg" alt="Web de ejemplo de una barbería, vista en el móvil" width="390" height="844"></span></div>
      <div class="etiqueta etiqueta-portada" aria-label="Desde ${p.esencial} euros más IVA"><span>desde</span><strong>${p.esencial} €</strong><span>+ IVA</span></div>
    </div>
  </div>
</section>

<section class="dato">
  <div class="env">
    <div class="dato-in">
      <p class="cifra">7 de cada 10</p>
      <div>
        <p class="dato-txt">negocios pequeños en España no tienen web propia. Cuando alguien busca «fontanero en Motril» en el móvil, llama al primero que le da confianza. Que ese seas tú.</p>
        <p class="fuente">Fuente: INE, uso de TIC en empresas de menos de 10 empleados, 2025.</p>
      </div>
    </div>
  </div>
</section>

<section class="bloque" id="como">
  <div class="env">
    <div class="cab-bloque">
      <p class="ante">Cómo funciona</p>
      <h2>Tres pasos, y el primero es gratis</h2>
    </div>
    <ol class="pasos">
      <li>
        <span class="num">1</span>
        <h3>Nos dices tu negocio</h3>
        <p>Mándanos el nombre por WhatsApp. Si tienes ficha en Google Maps, sacamos de ahí el horario, la dirección y lo que haces.</p>
      </li>
      <li>
        <span class="num">2</span>
        <h3>Te enseñamos tu web</h3>
        <p>En uno o dos días te llega un enlace con tu web ya hecha. La miras en el móvil con calma y sin compromiso.</p>
      </li>
      <li>
        <span class="num">3</span>
        <h3>En 72 horas, publicada</h3>
        <p>Si te gusta, afinamos contigo textos, fotos y precios, y la dejamos funcionando con tu dominio. Pagas cuando la ves terminada.</p>
      </li>
    </ol>
  </div>
</section>

<section class="bloque bloque-oscuro" id="ejemplos">
  <div class="env">
    <div class="cab-bloque">
      <p class="ante">Escaparate</p>
      <h2>Webs como la que tendrás</h2>
      <p>Negocios inventados, diseños reales. Ábrelos en el móvil: así se verá la tuya, con tus datos.</p>
    </div>
    <div class="escaparate">
      ${ejemplos.map((e) => `<a class="ej" href="demo/${esc(e.slug)}/">
        <span class="movil movil-peq"><span class="pantalla"><img src="img/${esc(e.slug)}.jpg" alt="Web de ejemplo: ${esc(e.actividad.toLowerCase())} en ${esc(e.ciudad)}" width="390" height="844" loading="lazy"></span></span>
        <span class="ej-sector">${esc(e.actividad)}</span>
        <span class="ej-ver">Ver la web ${icono('arrow-right')}</span>
      </a>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="bloque" id="incluye">
  <div class="env">
    <div class="cab-bloque">
      <p class="ante">Qué lleva</p>
      <h2>Todo lo que un cliente busca antes de llamarte</h2>
    </div>
    <ul class="incluye">
      ${[
    ['smartphone', 'Hecha para el móvil', 'Es donde te buscan tus clientes. Se lee bien y se usa con un dedo.'],
    ['phone', 'Llamada y WhatsApp en un toque', 'Los botones están siempre a mano, también abajo de la pantalla.'],
    ['clock', '«Abierto ahora»', 'Tu horario en vivo, con la hora de aquí. Nadie tendrá que llamar para preguntar si abres.'],
    ['navigation', 'Cómo llegar', 'Un toque y Google Maps les lleva a tu puerta.'],
    ['search', 'Preparada para Google', 'Lleva los datos de negocio local que Google usa para entender qué haces y dónde.'],
    ['shield-check', 'Sin cookies', 'No usa cookies ni rastreadores, así que no necesita el aviso de cookies.'],
    ['file-text', 'Aviso legal y privacidad', 'Los textos legales que pide la ley, con tus datos.'],
    ['zap', 'Rapidísima', 'Una sola página ligera que carga al momento, incluso con poca cobertura.'],
    ['globe', 'Tu dominio .es', 'tunegocio.es, a tu nombre. El primer año va incluido.'],
  ].map(([i, t, d]) => `<li><span class="inc-ico">${icono(i)}</span><div><h3>${t}</h3><p>${d}</p></div></li>`).join('\n      ')}
    </ul>
  </div>
</section>

<section class="bloque bloque-alt" id="precios">
  <div class="env">
    <div class="cab-bloque">
      <p class="ante">Precios</p>
      <h2>Claros, como un ticket de caja</h2>
      <p>No pagas nada hasta que ves tu web terminada. Precios sin IVA.</p>
    </div>
    <div class="tickets">
      ${ticket({
    num: '001', nombre: 'Web Esencial', total: euros(p.esencial), pie: '+ IVA · pago único', cta: waPack('Web Esencial'),
    items: ['Web de una página para tu sector', 'Botones de llamada y WhatsApp', 'Horario en vivo y cómo llegar', 'Datos para Google (SEO local)', 'Aviso legal y privacidad', 'Dominio .es y alojamiento, 1.er año', 'Publicada en 72 horas'],
  })}
      ${ticket({
    num: '002', nombre: 'Web Completa', total: euros(p.completa), pie: '+ IVA · pago único', cta: waPack('Web Completa'), destacado: true,
    items: ['Todo lo de la Web Esencial', 'Ficha de Google Maps revisada y mejorada', 'Textos y fotos a medida, en visita o videollamada', 'Secciones extra: carta, tarifas o galería', 'Cartel con código QR para tu local', 'Dos rondas de cambios'],
  })}
      ${ticket({
    num: '003', nombre: 'Mantenimiento', total: `${euros(p.mantenimiento)}/mes`, pie: '+ IVA · sin permanencia', cta: waPack('opción de mantenimiento'),
    items: ['Alojamiento y certificado de seguridad', 'Renovación del dominio', 'Cambios de horario, precios y textos', 'Copias de seguridad', 'Ayuda por WhatsApp'],
    nota: `Si no lo quieres, desde el segundo año el alojamiento y el dominio cuestan ${p.renovacion} € al año.`,
  })}
    </div>
    <p class="garantia">${icono('shield-check')}<span><strong>Garantía de 14 días.</strong> Si después de publicarla no te convence, te devolvemos el dinero.</span></p>
  </div>
</section>

<section class="bloque" id="preguntas">
  <div class="env estrecho">
    <div class="cab-bloque">
      <p class="ante">Preguntas</p>
      <h2>Lo que nos suelen preguntar</h2>
    </div>
    <div class="faqs">
      ${[
    ['¿Por qué cuesta tan poco, si una agencia cobra 1.500 €?', 'Porque trabajamos con un sistema propio que nos permite hacer en horas lo que antes llevaba semanas. No pagas reuniones ni horas muertas: pagas una web terminada.'],
    ['¿La web es mía?', 'Sí. El dominio va a tu nombre y, si un día te quieres ir, te damos la web completa para que la lleves donde quieras.'],
    ['¿Qué tengo que darte?', 'Para la propuesta, solo el nombre del negocio. Después afinamos contigo los textos, las fotos y los precios.'],
    ['Ya tengo Instagram o Facebook, ¿para qué quiero web?', 'La web los enlaza, no los sustituye. Pero cuando alguien busca lo que haces en Google, lo que aparece es tu web y tu ficha de Maps, no tu perfil de Instagram.'],
    ['¿Hay permanencia?', 'No. El mantenimiento es mes a mes y lo dejas cuando quieras.'],
    ['¿Cómo se paga?', 'Por transferencia o Bizum, con factura. Pagas cuando ves tu web terminada, antes de publicarla.'],
    [`¿Solo trabajáis en ${a.zona}?`, 'Empezamos aquí porque nos gusta conocer a los negocios en persona, pero todo se puede hacer por WhatsApp y videollamada, estés donde estés.'],
  ].map(([q, r]) => `<details><summary>${esc(q)}${icono('chevron-down')}</summary><p>${esc(r)}</p></details>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="final">
  <div class="toldo" aria-hidden="true"></div>
  <div class="env final-in">
    <h2>¿Cómo quedaría la web de tu negocio?</h2>
    <p>Mándanos el nombre por WhatsApp. En uno o dos días te la enseñamos, sin compromiso.</p>
    <a class="btn btn-wa btn-grande" href="${esc(wa)}" target="_blank" rel="noopener">${iconoWhatsapp()}Quiero ver mi web</a>
    <p class="final-mail">¿Prefieres correo? <a href="mailto:${esc(a.email)}">${esc(a.email)}</a></p>
  </div>
</section>
</main>

<footer class="pie">
  <div class="env pie-in">
    <div>
      <p class="marca marca-pie">${esc(a.nombre.toUpperCase())}</p>
      <p>${esc(a.lema)}. ${esc(zonaTexto)}.</p>
    </div>
    <div class="pie-der">
      <p><a href="mailto:${esc(a.email)}">${esc(a.email)}</a></p>
      <p><a href="aviso-legal/">Aviso legal y privacidad</a> · Esta web no usa cookies</p>
    </div>
  </div>
</footer>
</body>
</html>
`;
}

function favicon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0A3A2C"/><path d="M5 8h22v8H5z" fill="#fff"/><path d="M5 8h4.4v8H5zM13.8 8h4.4v8h-4.4zM22.6 8H27v8h-4.4z" fill="#3DBE84"/><g fill="#3DBE84"><circle cx="7.2" cy="16" r="2.2"/><circle cx="16" cy="16" r="2.2"/><circle cx="24.8" cy="16" r="2.2"/></g><g fill="#fff"><circle cx="11.6" cy="16" r="2.2"/><circle cx="20.4" cy="16" r="2.2"/></g><path d="M7 24h18" stroke="#FFD84D" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function css() {
  return `
/* Fachada de tienda: rótulo verde botella, toldo a rayas, etiqueta amarilla de precio, ticket de caja */
:root{
  color-scheme:light;
  --toldo:#0F5A43;--toldo-osc:#0A3A2C;--toldo-claro:#3DBE84;
  --etiqueta:#FFD84D;--etiqueta-tinta:#3A2E00;
  --fondo:#F2F4F0;--papel:#FFFFFF;--tinta:#12201A;--tinta-2:#4B5B53;--linea:rgba(18,32,26,.12);
  --wa:#25D366;--wa-tinta:#063A1D;
  --f-rotulo:'Barlow Condensed','Arial Narrow',system-ui,sans-serif;
  --f-txt:'Figtree',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;
  --f-ticket:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace;
  --ancho:1160px;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--fondo);color:var(--tinta);font:400 17px/1.6 var(--f-txt);-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto;display:block}
a{color:inherit}
p{margin:0}
ul,ol{margin:0;padding:0;list-style:none}
h1,h2,h3{margin:0;font-family:var(--f-rotulo);font-weight:700;line-height:1;text-wrap:balance}
.i{width:1em;height:1em;flex:none}
:focus-visible{outline:3px solid var(--etiqueta);outline-offset:3px;border-radius:4px}
.env{max-width:var(--ancho);margin-inline:auto;padding-inline:22px}
.estrecho{max-width:840px}
.ante{font:650 13px/1.3 var(--f-txt);letter-spacing:.12em;text-transform:uppercase;color:var(--toldo)}

/* Rótulo de la fachada */
.fachada{background:var(--toldo-osc);color:#fff}
.fachada-in{display:flex;align-items:center;gap:28px;min-height:70px}
.marca{font:700 30px/1 var(--f-rotulo);letter-spacing:.2em;text-decoration:none;color:#fff;padding-left:.2em}
.menu{display:flex;gap:28px;margin-left:auto;font-weight:550;font-size:16px}
.menu a{text-decoration:none;color:rgba(255,255,255,.78)}
.menu a:hover{color:#fff}
.btn-cab{display:inline-flex;align-items:center;gap:8px;background:var(--etiqueta);color:var(--etiqueta-tinta);font-weight:700;font-size:15px;text-decoration:none;border-radius:999px;padding:10px 18px;white-space:nowrap}
.btn-cab .i{width:18px;height:18px}

/* Toldo a rayas con el borde festoneado */
.toldo{position:relative;height:46px;background:repeating-linear-gradient(90deg,var(--toldo) 0 48px,#fff 48px 96px);filter:drop-shadow(0 6px 4px rgba(10,58,44,.14));z-index:2}
.toldo::after{content:"";position:absolute;left:0;right:0;top:100%;height:24px;
  background:
    radial-gradient(circle at 24px 0,var(--toldo) 23px,transparent 24px) 0 0/96px 24px repeat-x,
    radial-gradient(circle at 72px 0,#fff 23px,transparent 24px) 0 0/96px 24px repeat-x}

/* Portada */
.portada{padding-block:64px 72px;overflow:hidden}
.portada-in{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:48px;align-items:center}
.portada-txt{display:flex;flex-direction:column;gap:24px;min-width:0}
.portada h1{font-size:clamp(3.2rem,7.4vw,6.2rem);text-transform:uppercase;letter-spacing:.005em;line-height:.92}
.portada h1 span{display:block;color:var(--toldo)}
.entradilla{font-size:20px;color:var(--tinta-2);max-width:32em}
.botones{display:flex;flex-wrap:wrap;gap:12px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:56px;padding:0 26px;border-radius:12px;font:700 17px/1.2 var(--f-txt);text-decoration:none;border:2px solid transparent;transition:transform .15s ease}
.btn:hover{transform:translateY(-1px)}
.btn .i{width:21px;height:21px}
.btn-wa{background:var(--wa);color:var(--wa-tinta)}
.btn-sec{background:var(--papel);border-color:var(--linea);color:var(--tinta)}
.btn-grande{min-height:64px;font-size:19px;padding:0 34px}
.garantias{display:flex;flex-wrap:wrap;gap:8px 22px;font-size:15px;font-weight:600;color:var(--tinta-2)}
.garantias li{display:flex;align-items:center;gap:7px}
.garantias .i{color:var(--toldo);width:18px;height:18px}

.portada-movil{position:relative;justify-self:center;padding:10px 40px 10px 0}
.movil{display:block;width:min(300px,72vw);aspect-ratio:390/844;border-radius:44px;background:#0E1311;padding:11px;box-shadow:0 40px 80px -30px rgba(10,58,44,.55),inset 0 0 0 2px #2A322E;position:relative}
.movil::before{content:"";position:absolute;top:21px;left:50%;translate:-50% 0;width:84px;height:24px;border-radius:20px;background:#0E1311;z-index:1}
.pantalla{display:block;height:100%;border-radius:34px;overflow:hidden;background:#fff;padding-top:40px}
.pantalla img{width:100%;height:100%;object-fit:cover;object-position:top}
.movil-peq{width:100%;border-radius:34px;padding:8px}
.movil-peq::before{top:15px;width:62px;height:18px}
.movil-peq .pantalla{border-radius:27px;padding-top:30px}

/* Etiqueta de precio colgando */
.etiqueta{display:inline-flex;flex-direction:column;align-items:center;background:var(--etiqueta);color:var(--etiqueta-tinta);padding:14px 22px 14px 34px;border-radius:6px;
  clip-path:polygon(16px 0,100% 0,100% 100%,16px 100%,0 50%);font-family:var(--f-txt);line-height:1.1;box-shadow:0 10px 20px -10px rgba(0,0,0,.4)}
.etiqueta::before{content:"";position:absolute;left:16px;top:50%;width:9px;height:9px;margin-top:-4.5px;border-radius:50%;background:var(--fondo)}
.etiqueta span{font-size:13px;font-weight:600;letter-spacing:.04em}
.etiqueta strong{font:700 44px/1 var(--f-rotulo)}
.etiqueta-portada{position:absolute;right:0;bottom:22%;rotate:-9deg}
.etiqueta-peq{position:absolute;top:-14px;right:18px;z-index:3;rotate:6deg;padding:8px 14px 8px 28px}
.etiqueta-peq strong{font:700 17px/1 var(--f-txt);letter-spacing:.02em}
.etiqueta-peq::before{left:13px}

/* Dato */
.dato{padding-block:8px 24px}
.dato-in{display:grid;grid-template-columns:auto minmax(0,1fr);gap:20px 34px;align-items:center;background:var(--papel);border:1px solid var(--linea);border-radius:20px;padding:30px 34px}
.cifra{font:700 clamp(3rem,7vw,5rem)/.9 var(--f-rotulo);color:var(--toldo);text-transform:uppercase;white-space:nowrap}
.dato-txt{font-size:19px;max-width:40em}
.fuente{font-size:13px;color:var(--tinta-2);margin-top:8px}

/* Bloques */
.bloque{padding-block:90px}
.bloque-alt{background:var(--papel);border-block:1px solid var(--linea)}
.bloque-oscuro{background:var(--toldo-osc);color:#fff}
.bloque-oscuro .ante{color:var(--toldo-claro)}
.bloque-oscuro .cab-bloque p:not(.ante){color:rgba(255,255,255,.75)}
.cab-bloque{display:flex;flex-direction:column;gap:14px;margin-bottom:44px;max-width:44em}
.cab-bloque h2{font-size:clamp(2.4rem,5vw,3.8rem);text-transform:uppercase;line-height:.95}
.cab-bloque p:not(.ante){font-size:18px;color:var(--tinta-2)}

.pasos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px}
.pasos li{display:flex;flex-direction:column;gap:12px;background:var(--papel);border:1px solid var(--linea);border-radius:20px;padding:30px}
.num{display:grid;place-items:center;width:54px;height:54px;border-radius:50%;background:var(--etiqueta);color:var(--etiqueta-tinta);font:700 30px/1 var(--f-rotulo)}
.pasos h3{font-size:30px;text-transform:uppercase}
.pasos p{color:var(--tinta-2);font-size:16.5px}

.escaparate{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px}
.ej{display:flex;flex-direction:column;gap:12px;text-decoration:none;color:#fff;min-width:0}
.ej-sector{font:700 26px/1 var(--f-rotulo);text-transform:uppercase;letter-spacing:.02em;margin-top:6px}
.ej-ver{display:inline-flex;align-items:center;gap:6px;color:var(--etiqueta);font-weight:650;font-size:15px}
.ej:hover .movil{transform:translateY(-4px)}
.ej .movil{transition:transform .2s ease}

.incluye{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:30px 36px}
.incluye li{display:flex;gap:16px;align-items:flex-start;min-width:0}
.inc-ico{display:grid;place-items:center;width:48px;height:48px;border-radius:14px;background:color-mix(in srgb,var(--toldo) 11%,#fff);color:var(--toldo);flex:none}
.inc-ico .i{width:24px;height:24px}
.incluye h3{font-size:25px;text-transform:uppercase;margin:4px 0 6px}
.incluye p{color:var(--tinta-2);font-size:16px}

/* Tickets de caja */
.tickets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:30px;align-items:start}
.t-sombra{position:relative;filter:drop-shadow(0 22px 22px rgba(18,32,26,.16))}
.t-sombra:nth-child(1){rotate:-1.2deg}
.t-sombra:nth-child(3){rotate:1deg}
.t-sombra-destacada{translate:0 -10px}
.ticket{background:#FFFFFF;color:#1C1D1A;font:500 14px/1.5 var(--f-ticket);padding:36px 26px 34px;display:flex;flex-direction:column;gap:16px;
  -webkit-mask:conic-gradient(from 135deg at top,#0000,#000 1deg 89deg,#0000 90deg) top/16px 51% repeat-x,conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) bottom/16px 51% repeat-x;
  mask:conic-gradient(from 135deg at top,#0000,#000 1deg 89deg,#0000 90deg) top/16px 51% repeat-x,conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) bottom/16px 51% repeat-x}
.t-cab{text-align:center;display:flex;flex-direction:column;gap:2px;padding-bottom:14px;border-bottom:1px dashed #9A9C95;font-size:13px;color:#4A4C46}
.t-tienda{font:700 28px/1 var(--f-rotulo);letter-spacing:.22em;color:#1C1D1A;margin-bottom:6px}
.t-items{display:grid;gap:7px}
.t-items li{display:grid;grid-template-columns:2ch minmax(0,1fr) auto;gap:10px;align-items:baseline}
.t-items li span:last-child{color:var(--toldo);font-weight:600}
.t-total{display:flex;justify-content:space-between;align-items:baseline;border-top:1px dashed #9A9C95;padding-top:14px;font-weight:600;font-size:15px}
.t-total span:last-child{font:700 34px/1 var(--f-rotulo);letter-spacing:.01em;font-variant-numeric:tabular-nums}
.t-pie{text-align:right;color:#4A4C46;font-size:12.5px;margin-top:-10px}
.t-nota{font-size:12.5px;color:#4A4C46;border:1px dashed #9A9C95;padding:8px 10px}
.t-barras{height:42px;margin-top:4px;background:repeating-linear-gradient(90deg,#1C1D1A 0 2px,#fff 2px 4px,#1C1D1A 4px 7px,#fff 7px 8px,#1C1D1A 8px 9px,#fff 9px 13px,#1C1D1A 13px 16px,#fff 16px 17px)}
.btn-ticket{background:var(--toldo);color:#fff;min-height:50px;font-family:var(--f-txt);border-radius:10px}
.garantia{display:flex;gap:14px;align-items:center;justify-content:center;text-align:left;margin-top:44px;font-size:17px}
.garantia .i{width:30px;height:30px;color:var(--toldo)}

.faqs{display:grid;gap:10px}
.faqs details{background:var(--papel);border:1px solid var(--linea);border-radius:14px;padding:0 22px}
.faqs summary{display:flex;justify-content:space-between;align-items:center;gap:16px;min-height:64px;font-weight:650;font-size:17px;cursor:pointer;list-style:none}
.faqs summary::-webkit-details-marker{display:none}
.faqs summary .i{width:20px;height:20px;color:var(--toldo);transition:rotate .2s ease}
.faqs details[open] summary .i{rotate:180deg}
.faqs details p{padding-bottom:20px;color:var(--tinta-2)}

.final{background:var(--toldo);color:#fff;position:relative}
.final .toldo{filter:none;background:repeating-linear-gradient(90deg,var(--toldo-osc) 0 48px,#fff 48px 96px)}
.final .toldo::after{background:radial-gradient(circle at 24px 0,var(--toldo-osc) 23px,transparent 24px) 0 0/96px 24px repeat-x,radial-gradient(circle at 72px 0,#fff 23px,transparent 24px) 0 0/96px 24px repeat-x}
.final-in{display:flex;flex-direction:column;align-items:center;text-align:center;gap:22px;padding-block:90px 84px}
.final h2{font-size:clamp(2.6rem,6vw,4.6rem);text-transform:uppercase;line-height:.95;max-width:14em}
.final-in>p{font-size:19px;color:rgba(255,255,255,.85);max-width:30em}
.final-mail{font-size:15px}
.final-mail a{color:var(--etiqueta)}

.pie{background:var(--toldo-osc);color:rgba(255,255,255,.75);font-size:15px;padding-block:36px}
.pie-in{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}
.pie-in>div{display:flex;flex-direction:column;gap:6px;min-width:0}
.marca-pie{font-size:24px}
.pie a{color:#fff}
.pie-der{text-align:right}

@media (max-width:960px){
  .menu{display:none}
  .btn-cab{margin-left:auto}
  .portada-in{grid-template-columns:1fr}
  .portada-movil{padding-right:30px}
  .escaparate{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:minmax(190px,46%);overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:14px}
  .ej{scroll-snap-align:start}
  .incluye{grid-template-columns:repeat(2,minmax(0,1fr))}
  .tickets{grid-template-columns:minmax(0,440px);justify-content:center;gap:40px}
  .pasos{grid-template-columns:1fr}
}
@media (max-width:620px){
  body{font-size:16.5px}
  .env{padding-inline:18px}
  .fachada-in{min-height:62px;gap:14px}
  .marca{font-size:24px}
  .btn-cab span{display:none}
  .btn-cab{padding:10px}
  .btn-cab .i{width:22px;height:22px}
  .toldo{height:34px;background-size:auto}
  .portada{padding-block:52px 40px}
  .entradilla{font-size:18px}
  .botones .btn{flex:1 1 100%}
  .dato-in{grid-template-columns:1fr;padding:24px}
  .bloque{padding-block:64px}
  .incluye{grid-template-columns:1fr}
  .escaparate{grid-auto-columns:minmax(170px,62%)}
  .pie-der{text-align:left}
  .t-sombra:nth-child(n){rotate:0deg;translate:none}
}
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  .btn,.ej .movil,.faqs summary .i{transition:none}
}
`;
}

/** Aviso legal de la agencia. Los datos del titular salen de config.json. */
export function paginaAvisoLegalAgencia(a, fecha) {
  const t = a.titular;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aviso legal y privacidad · ${esc(a.nombre)}</title>
<meta name="robots" content="noindex">
<link rel="icon" href="${favicon()}">
<style>
${fontFace('barlowCondensed', 'figtree')}
${css()}
.legal{padding-block:56px 80px}
.legal h1{font-size:clamp(2.4rem,5vw,3.4rem);text-transform:uppercase;margin-bottom:28px}
.legal h2{font-size:1.8rem;text-transform:uppercase;margin:36px 0 12px}
.legal p,.legal li{color:var(--tinta-2);margin-bottom:10px}
.legal ul{list-style:disc;padding-left:22px}
</style>
</head>
<body>
<header class="fachada"><div class="env fachada-in"><a class="marca" href="../">${esc(a.nombre.toUpperCase())}</a></div></header>
<main class="env estrecho legal">
<h1>Aviso legal y privacidad</h1>
<h2>Titular</h2>
<p>En cumplimiento del artículo 10 de la Ley 34/2002 (LSSI), te informamos de que ${esc(a.web)} es propiedad de:</p>
<ul>
  <li>Titular: ${esc(t.nombre)}</li>
  <li>NIF: ${esc(t.nif)}</li>
  <li>Domicilio: ${esc(t.domicilio)}</li>
  <li>Correo electrónico: ${esc(a.email)}</li>
</ul>
<h2>Protección de datos</h2>
<p>Esta web no tiene formularios. Si nos escribes por WhatsApp o por correo, el responsable de tus datos es ${esc(t.nombre)}. Los usamos solo para preparar tu propuesta, contestarte y, si nos contratas, prestar el servicio y facturarlo. La base legal es tu consentimiento al contactarnos y la ejecución del contrato. Los guardamos mientras dure la relación y lo que exija la ley. No los cedemos a nadie salvo obligación legal.</p>
<p>Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a ${esc(a.email)}, y reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>
<h2>Propuestas de diseño</h2>
<p>Las propuestas que preparamos para un negocio usan información pública de ese negocio (nombre, dirección, horario y teléfono), se enseñan solo a su dueño, no se indexan en buscadores y se borran si no nos contrata. Si eres el titular de un negocio y quieres que borremos la tuya antes, escríbenos.</p>
<h2>Cookies</h2>
<p>Esta web no usa cookies propias ni de terceros, ni herramientas de analítica o publicidad.</p>
<p style="margin-top:36px">Última actualización: ${esc(fecha)}.</p>
</main>
</body>
</html>
`;
}
