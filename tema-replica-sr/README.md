# Tema nuevo: réplica de ShoulderReliever para ReliefPath (opositores)

La estructura de venta de `shoulderreliever.com` (portada y ficha de producto)
aplicada a ReliefPath™, con el ángulo «Método Pausa» para opositores, montada
en un **tema nuevo** sobre Dawn 15.4.1, el tema base oficial de Shopify.

**En la tienda:** `ReliefPath SR · tema nuevo (25-09)`
(`gid://shopify/OnlineStoreTheme/207247638873`), **sin publicar**.

- Portada: `https://waistzen.com/?preview_theme_id=207247638873`
- Producto: `https://waistzen.com/products/juego-de-ventosa-electrica-con-cable?preview_theme_id=207247638873`

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
    python3 preview/comportamiento.py # 38 comprobaciones en navegador
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
3. **Borrar el tema intermedio** «ReliefPath · Réplica SR opositores (24-09)»,
   ya no hace falta.
4. **App de reseñas** (Judge.me, Loox…) y añadir su bloque a «SR · Opiniones».
5. **Precio tachado.** En España, si se anuncia una rebaja, el precio anterior
   tiene que ser el más bajo de los 30 días previos. Si 99,95 € no ha sido
   precio real de venta, conviene quitar el precio comparativo del producto.

## Archivos

    construir_plantillas.py   textos y orden de portada y ficha
    contrareembolso.json      ajustes de la caja de contrareembolso
    anuncio.json              barra de anuncios (va al grupo de cabecera)
    empaquetar.py             Dawn + todo esto → dist/reliefpath-sr.zip
    locales-extra/            textos waistzen_* del tema publicado
    comprobar.py, preview/    pruebas
