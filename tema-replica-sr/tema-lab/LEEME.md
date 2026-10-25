# ReliefPath · Lab

Tema nuevo para waistzen.com con el estilo «laboratorio de confianza»
(skill `web-tienda-catalogo`). Se apoya en Dawn 15.4.1 y no toca ningún
otro tema de la tienda.

## Qué trae

| Página | Secciones |
|---|---|
| Portada (`index.json`) | Barra de oferta · cabecera fija · hero con cifras enlazadas · catálogo con barra fija (01 Packs, 02 El aparato) · visita 3D · cómo usarlo · calculadora de packs · calidad y documentos · vídeo real (solo si se sube) · reseñas (solo app real) · preguntas · sobre nosotros · ticket «Tu pedido, sin sorpresas.» · aviso del sector · pie |
| Ficha (`product.json`, `product.reliefpatch.json`) | Galería · packs 1/2/3 · visita 3D · añadir al carrito (carrito lateral) · comprar ahora (checkout en español) · contrareembolso con su recargo · barra fija en móvil · acordeón · Product + Offer + Breadcrumb |
| Páginas | `page.json` (envíos, devoluciones…), `page.contact`, `page.tracking`, `page.calidad`, `page.faq`, `page.guia`, `page.sobre`, `page.landing-espana` |

## Lab 2.0 (24-10): movimiento e interacción

Ideas tomadas de las webs de producto que mejor funcionan hoy (Apple, tiendas
DTC de referencia, ganadoras de Awwwards) y de las guías de rendimiento de
Shopify. Todo es mejora progresiva: sin soporte, sin JavaScript o con
«movimiento reducido», la página se ve completa y quieta.

| Idea | Dónde | Cómo |
|---|---|---|
| Visor 3D del aparato con modos (succión, calor, luz roja) y puntos de interés | Hero | `snippets/lab-stage`, `assets/lab-3d.js` (Three.js, se carga después de pintar la página; antes se ve el póster) |
| Fondo aurora con rejilla técnica y entrada escalonada | Hero | CSS (`.lab-aurora`, `.lab-in`) |
| Cifras que cuentan, botón magnético | Hero | `lab.js` (`counters`, `pointerFx`) |
| Cinta de garantías sin fin | Portada y ficha | `sections/lab-marquee` |
| Bento con dibujos vivos y foco que sigue al ratón | Portada y ficha | `sections/lab-bento` |
| Banda oscura de luz roja ligada al scroll | Portada | `sections/lab-glow` (`animation-timeline: view()`) |
| «Cómo usarlo» con imagen fija y pasos | Portada y ficha | `sections/lab-scrolly` |
| Calculadora de packs con precio que rueda y barras | Portada | `sections/lab-builder` |
| Pack de 3 con borde de color | Catálogo y ficha | `.lab-best` |
| Vuelo al carrito y contador que salta | Todo «Añadir al carrito» | `lab.js` (`fly`) |
| «Llévate 1 más por X €» dentro del carrito lateral | Carrito de Dawn | `snippets/lab-cart-upsell` + parche en `snippets/cart-drawer.liquid` |
| Zoom al pasar el ratón y visor a pantalla completa | Galería de la ficha | `lab.js` (`gallery`) |
| Transición entre páginas (la foto vuela de la tarjeta a la ficha) | Todo el tema | `@view-transition` + `view-transition-name`, se cancela al tocar |
| Precarga de enlaces al pasar el ratón | Todo el tema | `<script type="speculationrules">` (sin carrito, checkout ni cuenta) |
| Cabecera que se esconde al bajar, barra de progreso | Todo el tema | `lab.js` (`header`), `.lab-progress` |
| Acordeones con altura animada | Preguntas y ficha | `interpolate-size` + `::details-content` |

Se activan o desactivan en *Ajustes del tema › ReliefPath Lab*.

## Conversión (25-10)

| Cambio | Por qué |
|---|---|
| Al pagar desde el carrito se va al checkout en español (`locale=es`) con las mismas líneas | El idioma principal de la tienda es el inglés: el botón de Dawn llevaba a un checkout en inglés |
| RELIEF10 se enseña en 1 unidad y va ya aplicado al pagar 1 unidad | Es la oferta real de primera compra; con 2 o 3 manda el descuento del pack |
| Ficha en móvil: sin migas ni miniaturas (contador sobre la foto), título más compacto | Precio y compra en la primera pantalla |
| Barra fija visible desde que se entra en la ficha (se oculta con los botones a la vista) | El botón de compra siempre a mano |
| «o 34,97 €/ud en el pack de 3» bajo el precio | Lleva al pack con mejor precio por unidad |
| Garantías debajo del botón de pagar del carrito | La duda aparece justo antes de pagar |
| Eventos propios (`lab_pack_select`, `lab_buy_now`, `lab_cod_open`, `lab_cod_checkout`, `lab_upsell`, `lab_checkout`, `lab_3d_mode`, `lab_gallery_zoom`) | Para medir qué piezas venden |

## Lab 3.0 (25-10): un solo momento y menos ruido

Ideas de skills públicas para crear webs ([anthropics/skills · frontend-design](https://github.com/anthropics/skills),
[iart-ai/web-animation-skills](https://github.com/iart-ai/web-animation-skills),
[freshtechbro/claudedesignskills](https://github.com/freshtechbro/claudedesignskills),
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)):
un momento memorable bien orquestado vale más que efectos repartidos por
todas las secciones, y solo se animan `transform` y `opacity`.

| Cambio | Dónde |
|---|---|
| Visita 3D fija al bajar: el aparato se queda en pantalla y pasa por succión, calor y luz roja; la cámara, la luz y el tono del fondo cambian con cada capítulo; raíl con las tres funciones; botón a los packs con el precio desde | `sections/lab-tour`, `lab.js` (`tour`) |
| Mientras la visita está fija se apartan la cabecera y la barra de compra | `html.lab-tour-on` |
| El motor 3D se pide una sola vez (visor del hero y visita lo comparten) y la visita lo monta al acercarse, con el navegador libre | `lab.js` (`can3d`, `load3d`) |
| Cierre de confianza en forma de ticket: envío 0,00 €, plazos, devolución, garantía, pago con tarjeta sin recargo, pago al recibirlo con su recargo real y «Sorpresas 0,00 €». Se imprime línea a línea una vez | `sections/lab-receipt` (sustituye a `lab-trust` en todas las plantillas) |
| Apariciones al bajar apagadas por defecto | *Ajustes del tema › Aparición de los bloques al bajar* (`lab_reveals`) |
| Fuera la inclinación 3D y el foco que sigue al ratón en las tarjetas, el borde que giraba sin parar en el pack de 3 y el pulso del «En stock» | `lab-card`, `.lab-best`, `.lab-stock` |
| Flechas solo en los botones principales; los enlaces de texto van subrayados | `lab-cols`, `lab-faq`, `lab-bento` |
| Cejas solo donde dan un dato (tienda, calidad, ficha); en el resto, opcionales y vacías | secciones `lab-*` |
| Sin `filter: blur` animado (entrada del hero y aurora) y puntos del visor con `transform` en vez de `box-shadow` | `lab.css` |

Eventos nuevos: `lab_tour_chapter`, `lab_tour_cta`, `lab_receipt_view`.

## Reglas que sigue

- Los precios de los packs se calculan con los descuentos de *Ajustes del
  tema › ReliefPath Lab* (20 % y 30 %). Si cambias los descuentos en Shopify,
  cambia también esos dos números.
- Los textos editables admiten marcas que se cambian por el importe real:
  `[p1] [p2] [p3]` total del pack, `[u2] [u3]` o `[desde]` precio por unidad,
  `[d2] [d3]` descuento y `[fee]` recargo del contrareembolso.
- No hay reseñas, notas ni certificados inventados. Los documentos sin enlace
  (manual, declaración CE) y el vídeo solo se ven en el editor, marcados como
  PENDIENTE.
- El precio comparado del producto (99,95 €) no se tacha salvo que se active
  en los ajustes: en la UE el precio anterior debe ser el más bajo de los
  últimos 30 días.

## Cómo se genera

```
git clone --depth 1 --branch v15.4.1 https://github.com/Shopify/dawn.git <dawn>
python3 plantillas.py            # plantillas JSON y grupos de cabecera/pie
python3 empaquetar_lab.py <dawn> # dist/reliefpath-lab.zip
```

El visor 3D se compila aparte (Three.js + esbuild):

```
cd <carpeta con node_modules de three y esbuild> && sh <tema-lab>/src/lab-3d/build.sh <tema-lab>
```

El zip se sube como tema nuevo con `themeCreate`.
