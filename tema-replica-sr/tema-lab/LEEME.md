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

## Venta (10-11): la caja de compra y el camino al pago

Se comprobó la tienda real antes de tocar nada: el checkout ya está en
español y ofrece tarjeta, PayPal, Bizum, Klarna y «Pago contra entrega» sin
recargo; la página de Envíos promete contrareembolso «sin recargo» y entrega
en 24–48 h laborables. La ficha anterior decía lo contrario (recargo de 5 €)
y obligaba a pasar por el carrito.

| Cambio | Por qué | Dónde |
|---|---|---|
| Botón principal «Comprar ahora · total» que va directo al checkout con el pack elegido; «Añadir al carrito» pasa a enlace de texto | Un paso menos entre la decisión y el pago | `sections/lab-product`, `lab.js` (`buy`, `toCheckout`) |
| «Pagar al recibirlo» sin recargo como segundo botón, que abre el mismo checkout | Coincide con lo que ya ofrece la tienda. El recargo vuelve con un interruptor | *Ajustes del tema › Pago al recibirlo* (`lab_cod_fee`) |
| Fecha de entrega estimada («Recíbelo entre el martes 11 y el miércoles 12») con hora de corte, fines de semana y festivos nacionales | Una fecha se entiende mejor que «24–48 h» ([Baymard](https://baymard.com/blog/shipping-speed-vs-delivery-date)) | `snippets/lab-eta`, `lab.js` (`eta`), *Ajustes del tema › Entrega estimada* |
| Precio de 1 unidad con el código de primer pedido ya restado (44,96 €, 49,95 € tachado, «−10 %») y la condición escrita debajo | Es el precio que se paga de verdad en el checkout | `lab-product`, `lab-close` |
| Devolución, garantía y ayuda justo debajo de los botones, con enlace a la página que lo prueba | La duda aparece al lado del botón ([pruebas de Blend Commerce](https://blendcommerce.com/blogs/ab-tests-shopify/30-33-increase-in-conversion-rate)) | `.lab-assure` |
| Sección de cierre con los tres packs y su botón al checkout, en ficha y portada | Quien lee hasta abajo ya no tiene los botones a la vista | `sections/lab-close` |
| Barra fija: en móvil sale al perder de vista los botones; en ordenador es una píldora centrada; se aparta en el cierre | [Prueba de barra fija](https://blendcommerce.com/blogs/ab-tests-shopify/better-placed-sticky-add-to-cart-product-page-conversion) | `lab.css`, `lab.js` (`pdp`) |
| Importes en formato español («44,96 €») también en el carrito | El formato de la tienda es «€44,96» | `snippets/lab-money`, *Ajustes del tema › Precios* (`lab_price_es`) |
| Carrito: aviso del código de primer pedido, fecha de entrega y garantías junto al botón de pagar | Lo mismo que en la ficha, en el último paso | `lab-cart-upsell`, `lab-cart-trust` |
| Galería en móvil con la foto siguiente asomando y contador | Se ve que hay más fotos ([Baymard](https://baymard.com/blog/always-use-thumbnails-additional-images)) | `lab.css` |
| Iconos de pago: solo los que se usan en España | Menos ruido bajo el botón | ajuste `pay_hide` de la ficha |

Eventos: `lab_buy_now` y `lab_cod_checkout` llevan ahora `qty` y `place`
(`ficha`, `barra` o `cierre`).

Una limitación de Shopify que conviene recordar: una sección con bloque de
app (`@app`) no admite ajustes de tipo «página». Por eso los enlaces de
devolución y ayuda de la ficha son de texto.

## Auditoría (15-11): la tienda real, pantalla a pantalla

Se recorrió la tienda real con el tema en vista previa, como un visitante de
España: todas las páginas, en móvil y en ordenador, en claro y en oscuro, y
todos los enlaces. Esto es lo que salió y lo que se cambió.

| Defecto | Arreglo | Dónde |
|---|---|---|
| El aviso de cookies de Shopify ocupaba el 59 % de la pantalla del móvil (496 px) y tapaba el precio y el botón | Queda abajo, compacto (219 px), con «Aceptar» y «Rechazar» iguales y en la misma fila | `lab.css` |
| El enlace «Política de privacidad» del aviso daba 404 (Shopify lo pone con «/es/», que en esta tienda no existe) | Se cambia por la dirección buena al aparecer el aviso | `lab.js` (`cookieLink`) |
| Los iconos de pago del pie salían apilados en columna | En fila | `lab.css` |
| El visor 3D arrancaba con el aparato diminuto: el primer fotograma podía llevar un paso de tiempo negativo y la cámara se alejaba | El paso nunca baja de cero y el primer fotograma ya sale con la vista de su función | `src/lab-3d/main.js` |
| «Comprar» de la cabecera y de la barra de oferta sacaban de la ficha a la portada | En la ficha bajan a los packs; desde el resto de la tienda llevan a la ficha | `lab-header`, `lab-offer` |
| La página del carrito era la de Dawn: «Featured collection» en inglés con el producto del recargo, importes «€49,95 EUR» y botón de Shop Pay que saltaba el checkout en español | Importes en formato español, propuesta de pack, garantías bajo el botón y «Tramitar pedido»; sin colección ni pago exprés | `empaquetar_lab.py`, `templates/cart.json` |
| «Todos los productos» y la búsqueda listaban el producto del recargo y tachaban 99,95 € con la insignia «Oferta» | La colección enseña los tres packs; la búsqueda usa las reglas de precio de la ficha y no lista el recargo | `templates/collection.json`, `snippets/price`, `card-product` |
| La barra fija de ordenador tapaba el pie | Se aparta al llegar al pie | `lab.js` (`pdp`) |
| Sin icono en la pestaña del navegador | El punto rojo del logo, hasta que se suba uno en Ajustes del tema | `assets/lab-favicon.svg` |

Y lo que se añadió tras comparar con las fichas de dropshipping que mejor
venden (son cifras de agencias: orientación, no garantía):

| Cambio | Por qué | Dónde |
|---|---|---|
| Las tres funciones con icono bajo el precio, en la primera pantalla | Poner los beneficios junto a la caja de compra subió la conversión en móvil en las pruebas de [Bluestout](https://bluestout.com/cro-wins/we-increased-mobile-conversions-by-moving-2-icons/) | `snippets/lab-feats` |
| La fecha de entrega sube junto a «En stock», antes de los packs | Es lo primero que se pregunta quien desconfía de una tienda nueva | `lab-product` |
| Comparativa con las ventosas manuales: cuatro filas de funciones, sin nombrar marcas ni comparar resultados | Una tabla frente a la alternativa genérica ayudó; nombrando competidores, empeoró ([AdsX](https://www.adsx.com/blog/shopify-comparison-table-pdp-conversion)) | `sections/lab-compare` |
| «Lo pides hoy, llega en 24–48 h»: del pedido a casa en cuatro pasos (hoy, 24–48 h, primer uso, 30 días) | Sustituye a «Cuatro pasos, con cabeza», que hablaba de revisar el paquete | `lab-scrolly`, `plantillas.py` |
| Fuera de la ficha el bloque «Pruebas, no promesas» y su guía de revisión | Repetía lo que ya dicen las garantías, las preguntas y el ticket; sigue en la portada y en la página de calidad | `plantillas.py` |
| En el carrito, el botón rojo es el de pagar y «Llevar 2» pasa a secundario | Antes el botón que más llamaba era el de añadir, no el de pagar | `lab.css`, `lab-cart-upsell` |
| Cabecera sin lupa | Con un solo producto no hace falta y quita sitio en el móvil | `lab-header` (ajuste «Lupa de búsqueda») |

Evento nuevo: `lab_compare_cta`.

Cosas de la tienda (no del tema) que salieron en la auditoría y que el tema
no puede arreglar: las páginas de Envíos y Devoluciones tienen una
traducción «al español» que en realidad es un borrador antiguo en inglés, y
es la que ve el cliente; y la política de reembolso de Shopify dice que la
devolución la paga el cliente, al revés que la página de Devoluciones.

## Reglas que sigue

- Los precios de los packs se calculan con los descuentos de *Ajustes del
  tema › ReliefPath Lab* (20 % y 30 %). Si cambias los descuentos en Shopify,
  cambia también esos dos números.
- Los textos editables admiten marcas que se cambian por el importe real:
  `[p1] [p2] [p3]` total del pack, `[u2] [u3]` o `[desde]` precio por unidad,
  `[d2] [d3]` descuento, `[fee]` recargo del contrareembolso (vacío si no
  hay), `[cod]` «sin recargo» o el recargo en frase y `[codfee]` lo mismo en
  corto.
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
