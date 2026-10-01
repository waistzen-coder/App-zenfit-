# Tema nuevo: réplica de ShoulderReliever para ReliefPath (opositores)

La estructura de venta de `shoulderreliever.com` (portada y ficha de producto)
aplicada a ReliefPath™, con el ángulo «Método Pausa» para opositores, montada
en un **tema nuevo** sobre Dawn 15.4.1, el tema base oficial de Shopify.

**En la tienda:** `ReliefPath SR · v3 skills (01-10)`
(`gid://shopify/OnlineStoreTheme/207708619097`), **sin publicar**. Es una copia
de `ReliefPath SR · tema nuevo (25-09)` (`207247638873`) con las mejoras de las
skills de abajo; el tema anterior se queda tal cual para comparar.

- Portada: `https://waistzen.com/?preview_theme_id=207708619097`
- Producto: `https://waistzen.com/products/juego-de-ventosa-electrica-con-cable?preview_theme_id=207708619097`

Todos los archivos propios del tema tienen en la tienda el mismo md5 que en
esta carpeta.

## Qué hay en el tema

- **Dawn** limpio: cabecera, pie, carrito, buscador, cuentas, páginas legales.
  Colores de la marca (azul marino y rojo) en los esquemas de Dawn.
- **Barra de anuncios** azul encima de la cabecera (`sr-announce`, en el
  grupo de cabecera).
- **Secciones `sr-*`** de la réplica: hero, confianza, ciclo, método en dos
  momentos, cómo funciona, qué incluye, comparativa, primer mes, historia,
  opiniones, garantía, FAQ, cierre, ficha con caja de compra y barra fija.
- **Contrareembolso** (`calmia-cod` y sus estilos), copiado byte a byte del
  tema publicado.
- **Textos del sistema en castellano.** El idioma principal de la tienda es
  el inglés, así que Shopify usa `en.default.json`: lleva el castellano de
  Dawn más los textos `waistzen_*` que usa la caja de contrareembolso.
- **`page.tracking`**, la plantilla de «Seguir mi pedido», que Dawn no trae.

Además, el **menú principal** de la tienda tiene ahora un enlace al producto
(Inicio · ReliefPath™ · Seguir mi pedido · Contacto). El menú es de la tienda,
no del tema: también sale en el tema publicado.

## v3 · skill shopify-ecommerce-suite

Auditoría con su flujo (recorrido anuncio → ficha → pack → checkout) y sus
listas técnicas de tema, SEO y medición. Hecha con los archivos del tema, la
vista previa local y los datos de la tienda por API; sin pedidos reales.

**Veredicto:** el tema está listo para probar en el móvil. Lo que más frena
ahora la venta no está en el tema sino en la tienda:

1. **Política de envío en inglés y de Reino Unido** («Standard UK Shipping
   3–7 business days», «costs calculated at checkout»), cuando el envío real a
   España es gratis. Contradice la ficha justo cuando el cliente duda.
2. **Política de devoluciones en inglés** que dice que los artículos rebajados
   no se devuelven («we cannot accept returns on sale items»), y ReliefPath
   está rebajado. Choca con «30 días para devolverlo».
3. **La portada no tenía descripción para Google** (Preferencias vacías) y su
   título era solo «Waistzen». Arreglado en el tema; mejor aún rellenarlo en
   Preferencias.

| Problema | Evidencia | Consecuencia probable | Cambio | Prioridad | Esfuerzo | Verificación |
|---|---|---|---|---|---|---|
| Políticas de envío y devolución contradicen la oferta | API: textos de `SHIPPING_POLICY` y `REFUND_POLICY` | Desconfianza y reclamaciones | **Tienda**: reescribirlas en castellano con lo real (envío gratis a España, plazo, 30 días, quién paga la vuelta) | Alta | 30 min | Leer /policies/* en el móvil |
| Portada sin meta descripción y con título genérico | API: `shop.description` vacío | Peor resultado en Google | Tema: si faltan, usa `waistzen_audit.meta_*` | Alta | Hecho | Prueba de la lógica en local |
| Fuentes de Google bloquean el pintado | `sr-head`: hoja de fonts.googleapis.com | Primera pantalla más lenta | Tema: Inter, Jakarta y Fraunces servidas desde el tema | Media | Hecho | Prueba: 0 peticiones a Google Fonts |
| La caja de contrareembolso descargaba Playfair y Jost sin usarlas | `calmia-base` + `sr.css` cambia sus fuentes | Hoja extra que bloquea el pintado | Tema: quitada | Media | Hecho | Prueba: sin Playfair ni Jost |
| Datos para Google incompletos | JSON-LD solo con una foto, sin envío ni migas | Menos opciones de resultado enriquecido | Tema: todas las fotos, envío gratis a ES (perfil «productos», 0 €), BreadcrumbList; devoluciones con ajuste (0 = no se declara hasta arreglar la política) | Media | Hecho | Prueba: JSON válido y campos |
| Fotos de galería sin alt si vienen de Archivos | `sr-photo` | Accesibilidad y SEO de imágenes | Tema: alt de reserva con el nombre del producto | Baja | Hecho | Prueba: todas con alt |
| Eventos `InitiateCheckout`/`AddPaymentInfo` desde el tema | `sr-product`: `fbq('track',…)` | Contarían dos veces con los del checkout y saltan el consentimiento | Tema: eventos propios `reliefpath:*` con `Shopify.analytics.publish` | Media | Hecho | Prueba: eventos con pack, importe y moneda; 0 llamadas a fbq |
| Estilos en línea en 6 secciones | `style="color:#…"` | No se pueden tocar desde el editor | Tema: pasados a clases | Baja | Hecho | Vista previa igual |

**Eventos que lanza el tema** (llegan a los píxeles de Ajustes → Eventos de
cliente, con el consentimiento de cookies que aplica Shopify):
`reliefpath:pack_selected`, `reliefpath:card_checkout`, `reliefpath:cod_selected`
(con producto, variante, unidades, importe y moneda) y
`reliefpath:offer_shown`, `reliefpath:offer_applied`, `reliefpath:offer_copied`.
Para verlos en Meta o GA4 hay que crear un píxel personalizado que los
escuche; los de compra (checkout iniciado, compra) los manda ya Shopify.

**Comprobado:** Theme Check (0 errores en los archivos propios, 0 avisos de
recursos externos), 61 pruebas en navegador, vista previa a 390 px.
**No comprobado:** velocidad real en la tienda (hay que medirla con PageSpeed
Insights en el enlace de vista previa antes y después de publicar), pago exprés
en vivo y un pedido de prueba de cada tipo.

### Plan de medición

| | Definición |
|---|---|
| Métrica principal | Pedidos pagados (tarjeta) + pedidos COD **entregados y cobrados** ÷ sesiones en la ficha, por semana |
| De control | Tasa de checkout completado, % de COD rechazados o devueltos, valor medio por pedido |
| Embudo del tema | `pack_selected` → `card_checkout` / `cod_selected` → checkout iniciado (Shopify) → compra |

Con el tráfico actual no hay muestra para un A/B fiable. Primero: publicar
v3, medir dos semanas completas sin cambiar precio ni campañas y comparar con
las dos anteriores, sabiendo que un antes/después no prueba causa. Cuando
haya unas 200 compras al mes, las dos primeras pruebas (una cada vez, 50/50
por visitante, mínimo dos semanas): pack de 2 marcado por defecto frente a
pack de 1; y oferta de bienvenida a los 25 s frente a sin ventana.

## v3: lo que han aportado las skills

| Skill | Qué se ha hecho |
|---|---|
| shopify-cro-audit | **Pago exprés** (Shop Pay, Apple Pay, Google Pay) bajo los botones de compra, con la cantidad del pack elegido. **Aviso de stock real** («Quedan N unidades») solo si Shopify lleva el inventario y quedan 10 o menos; nunca se inventa. **Carrito lateral** en vez de aviso. |
| shopify-theme-best-practices, review-ai-shopify-liquid | Textos de la interfaz fuera del código, en el archivo de idioma (`sr.*`), también los del JavaScript. `routes.all_products_collection_url` en vez de `/collections/all`. Los textos propios se copian a los 31 idiomas de Dawn. theme-check: 0 errores en los archivos propios (solo queda el aviso de los 77 ajustes de la caja de contrareembolso, que se deja así a propósito). |
| page-cro, landing-page-optimizer | La foto principal de cada página carga con prioridad alta (`fetchpriority="high"`); la caja de compra de la portada, que está más abajo, ya no compite con el hero. |
| product-page-conversion-review-ecommerce, copywriting | Texto de lectura a 14 px como mínimo en el móvil (notas, packs, confianza, oferta). |
| ecom-landing-pages | La página ya sigue su estructura (hero, problema, método, prueba, oferta, garantía, FAQ, cierre); no se ha cambiado. |
| review-objection-miner-ecommerce, review-to-faq-builder | Sin reseñas reales no hay nada que analizar. Cuando haya app de reseñas, se pueden pasar por estas skills para rehacer la FAQ. |

Preguntas de compra que la ficha aún no responde, porque faltan los datos del
proveedor: medidas y peso, batería o cable y autonomía, niveles de calor, qué
trae la caja exactamente y plazo de entrega real.

## La compra (lo que más mueve la conversión)

Como en la referencia, la compra está junto a la galería, sin bajar:

1. **Packs** de 1, 2 y 3 unidades con −20 % y −30 % (los descuentos automáticos
   de la tienda). Los importes se calculan con la misma fórmula que la caja de
   contrareembolso: 49,95 € · 79,92 € · 104,91 €.
2. **«Comprar ahora»**: va directo al checkout con el pack elegido (enlace
   permanente de carrito, en español, con el pack en los atributos del pedido).
3. **«Pagar al recibirlo en casa»**: abre el formulario de contrareembolso de
   más abajo con el mismo pack ya elegido.

Los dos selectores de pack (el de arriba y el de la caja de contrareembolso) se
mantienen sincronizados en los dos sentidos.

- La **portada** también tiene la caja de compra. Como allí no hay formulario
  de contrareembolso, su botón lleva a la ficha con `?pack=N&pago=cod`, y la
  ficha abre directamente el formulario con ese pack.
- La **barra fija** enseña el pack y el precio elegidos, aparece al pasar la
  caja de compra y se esconde sobre el formulario de contrareembolso para no
  taparlo.
- Todos los botones de la página («Quiero mi ReliefPath», cierre, barra fija)
  llevan a la caja de compra (`#comprar`).

## La primera pantalla y los reclamos

Lo que hacen las tiendas de dropshipping que mejor convierten, sin inventar
nada:

- **Portada en el móvil:** el hero ocupa la pantalla con la foto de fondo,
  el titular, el precio con el −50 % y el botón «Comprar ahora» a la vista.
- **Ficha en el móvil:** insignia «−50 %» y pastilla «Envío gratis a España»
  sobre la primera foto, «Ahorras 50,00 €», confianza bajo el precio y la
  **barra fija de compra visible desde el primer momento**, para que siempre
  haya un botón de compra en pantalla.
- **Botón principal con brillo** (se apaga si el móvil pide menos movimiento).
- **Barra superior roja** con el −10 % de bienvenida, envío, pago al recibir y
  devoluciones.
- **Cinta en movimiento** con las ventajas justo bajo la primera pantalla.
- **«Menos de 1 € a la semana»**: el precio repartido entre 52 semanas, que se
  calcula solo a partir del precio del producto.
- **Oferta de bienvenida** con el código real **RELIEF10** (10 %, una vez por
  cliente, no se suma a los packs). Aparece una vez por visita a los 25 s o al
  bajar media página, se puede cerrar y deja una pestaña. «Aplicar» lo manda
  solo al checkout al pagar con tarjeta, y solo con 1 unidad; con los packs
  avisa de que no se suma.
- **Las secciones aparecen suavemente** al llegar a ellas.

## Paleta «luz roja cálida»

| Uso | Color | Por qué |
|---|---|---|
| Texto y secciones oscuras | Tinta `#1B2140` | Confianza y lectura (14:1 sobre crema) |
| Fondos alternos | Crema `#FBF4EC`, arena `#F4E6D7` | Los neutros cálidos se sienten cercanos; los fríos, clínicos |
| Comprar y ofertas | Rojo coral `#D92D3F` → `#B81D36` | Solo en botones de compra, «−50 %» y ofertas: así destacan más. Blanco encima, 4,8:1 |
| Calor y detalles | Ámbar `#F5A524` | Cinta, estrellas, iconos de la barra superior y cifras en secciones oscuras |
| Ahorro | Verde `#15803D` | «Ahorras…» y precio por unidad (5:1) |

Las palabras destacadas de los titulares van en **Fraunces cursiva**. Las
secciones oscuras llevan un brillo cálido rojo y ámbar. El pie de página es
oscuro, y la caja de contrareembolso usa la misma paleta cambiando solo sus
variables de color, sin tocar su código.

## De la referencia a ReliefPath

La web de referencia no se pudo abrir desde esta sesión (la red la bloquea).
La estructura se reconstruyó a partir de lo que tienen indexado los buscadores
de su portada, su ficha, su FAQ y su página «5 razones».

| ShoulderReliever | Aquí |
|---|---|
| Barra superior: envío y garantía | Envío gratis · contrareembolso · 30 días |
| Hero «Drug-Free Shoulder Pain Relief, Guaranteed» | «Tu temario puede esperar. Tu pausa, no.» |
| Compra junto a la galería | Packs + tarjeta + contrareembolso |
| «Break the shoulder-pain cycle» | «El ciclo del temario» |
| Sistema de dos partes: de día / de noche | Método Pausa: entre bloques / al cerrar el día |
| «5 minutos al día» en 3 pasos | Cómo funciona: manual, ajustes, pausa |
| What's in the box | Qué incluye |
| Comparativa frente a cirugía y pastillas | Frente a la pausa con el móvil y la cita de masaje |
| «Biggest gains by day 40» | Primer mes: de aparato nuevo a hábito |
| Médico fundador | La tienda (Waistzen, Motril) |
| Reseñas | Solo reseñas reales o app; vacía no se muestra |
| Garantía de 60 días | 30 días (la política real) |
| FAQ | FAQ ordenada por objeciones, con datos estructurados |

### Lo que no se ha copiado, a propósito

- **Claims de salud.** La referencia promete alivio del dolor garantizado. La
  tienda ya pasó una auditoría que prohíbe prometer alivio, dar zonas o
  tiempos de sesión. Aquí se vende la pausa, el ritual y el hábito.
- **Cifras y reseñas inventadas.** Nada de «75.000 vendidos». La valoración
  solo aparece si hay una app de reseñas que rellene `reviews.rating`.
- **Médico fundador.** Se cuenta la tienda, que es lo que existe.

## El estilo de foto

Todas las imágenes pasan por el mismo marco (`snippets/sr-photo.liquid`):
fondo azul muy claro, esquinas redondeadas y etiqueta arriba a la izquierda,
para que las fotos que ya hay se lean como una sola serie. La galería abre con
el producto y, en segundo lugar, la **foto real** del aparato en la mano.

Fotos que faltan para completar la serie (luz natural, fondo claro, el aparato
rojo y negro bien visible, sin mostrarlo aplicado en ninguna zona concreta):

1. Producto solo, en estudio sobre fondo azul muy claro, vista 3/4.
2. Producto sobre un escritorio con apuntes subrayados y un temporizador.
3. Opositor/a de 25-35 años en su silla, apuntes cerrados, aparato en la mesa.
4. La misma persona en el sofá al final del día, aparato en la mesa baja.
5. Detalle del panel de control, en macro.
6. Detalle de la copa con la luz roja encendida, fondo oscuro.
7. Contenido de la caja, cenital, sobre fondo claro.

## Pruebas

    python3 construir_plantillas.py   # genera templates/*.json y anuncio.json
    python3 comprobar.py              # plantillas contra los schemas
    python3 preview/render.py         # vista previa local (fotos = marcadores)
    python3 preview/comportamiento.py # 61 comprobaciones en navegador
    python3 preview/shots.py          # capturas a 390 y 1440 px

`comportamiento.py` comprueba precios de cada pack, que la caja de arriba y la
de contrareembolso no se contradicen, el enlace de pago online (pack, idioma y
sin recargo), la apertura del formulario de contrareembolso, la barra fija, la
portada, la llegada con `?pack=2&pago=cod`, el código de bienvenida (solo con
1 unidad) y que ninguna sección se quede invisible con la animación.

Lo que no cubren: que el checkout real aplique los descuentos automáticos al
céntimo (la caja de contrareembolso y esta usan la misma fórmula) ni cómo se
ve con las fotos reales. Eso solo se ve en la tienda.

## Lo que falta

1. **Revisarlo en el móvil** con los dos enlaces de arriba y hacer un pedido de
   prueba con tarjeta y otro con contrareembolso.
2. **Publicarlo** (Tienda online → Temas → Publicar).
3. **Borrar los temas que sobran**: «ReliefPath · Réplica SR opositores (24-09)»
   y, si te quedas con la v3, «ReliefPath SR · tema nuevo (25-09)».
4. **Reescribir las políticas de envío y devolución** en castellano y con las
   condiciones reales; después, poner los días en «Datos estructurados: días
   de devolución» de la ficha.
5. **Rellenar título y descripción de la portada** en Preferencias.
6. **App de reseñas** (Judge.me, Loox…) y añadir su bloque a «SR · Opiniones».
7. **Precio tachado.** En España, si se anuncia una rebaja, el precio anterior
   tiene que ser el más bajo de los 30 días previos. Si 99,95 € no ha sido
   precio real de venta, conviene quitar el precio comparativo del producto.

## Archivos

    construir_plantillas.py   textos y orden de portada y ficha
    contrareembolso.json      ajustes de la caja de contrareembolso
    anuncio.json              barra de anuncios (va al grupo de cabecera)
    empaquetar.py             Dawn + todo esto → dist/reliefpath-sr.zip
    locales-extra/            textos waistzen_* del tema publicado
    comprobar.py, preview/    pruebas
