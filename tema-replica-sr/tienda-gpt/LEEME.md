# Arreglos sobre la versión retocada por ChatGPT (tema 207708619097)

ChatGPT editó el tema v3 directamente en la tienda el 02-10. Estos dos archivos
parten de su versión, no de las secciones de esta carpeta:

- `locales/en.default.json`: el idioma principal de la tienda es el inglés, así
  que Shopify pinta con este archivo. Llevaba en inglés los 44 textos `rp.*`
  (cabecera, portada, caja de compra, contrareembolso, barra fija, pie). Ahora es
  igual que `es.json`.
- `sections/sr-product.liquid`: el enlace al checkout (tarjeta y contrareembolso)
  vuelve a llevar `locale=es`; con `request.locale.iso_code` salía `en`.

## Gráficos en movimiento (05-10)

Sobre la versión del tema del 02-10 (con el vídeo real de los controles):

- `assets/rp-motion.css` y `assets/rp-motion.js` (cargados en `layout/theme.liquid`):
  aparición suave de secciones, resplandor de luz roja alrededor de la foto de
  portada y sello flotante, iconos de las funciones animados (succión que
  late, calor que parpadea, luz roja que brilla), líneas del Método Pausa que
  se dibujan.
- `sections/rp-ticker.liquid` «RP · Cinta en movimiento»: ventajas en bucle
  (se para al pasar el ratón y fuera de pantalla).
- `sections/rp-stats.liquid` «RP · En cifras»: contadores que suben y anillos
  que se dibujan, con datos reales (3 funciones, 0 € envío, 30 días, −30 % en
  el pack de 3).
- Plantillas: cinta tras la portada/ficha y cifras tras «funciones».

Solo se anima transform, opacity y sombras (no mueve la maqueta) y nada toca
la foto principal. Con «reducir movimiento» del sistema, en el editor de
Shopify o sin JavaScript, todo se ve quieto y completo.

## Escena con scroll e intro (05-10, inspiradas en el vídeo de referencia)

- `sections/rp-intro.liquid` «RP · Intro de entrada» (solo portada): el aparato
  flota sobre una línea de luz que pasa de verde (succión) a naranja (calor) y
  rojo (luz roja); la cortina sube a los 2,2 s. Una vez por visita, se salta con
  un toque, y no sale con «reducir movimiento» ni en el editor.
- `sections/rp-showcase.liquid` «RP · Escena con scroll» (portada tras la caja de
  compra, ficha tras la cinta): el aparato queda fijo mientras pasan palabras
  gigantes, la frase se enciende palabra a palabra, el halo y la pastilla del
  modo cambian (succión → calor → luz roja) y termina en fondo lima con
  «TU PAUSA. Tus reglas.» y el botón a la caja de compra.
- La imagen es la del hero; con un PNG sin fondo del aparato queda más
  parecido al vídeo (se cambia en el editor).

## Portada 3D interactiva (12-10)

Sustituye a «RP · Portada 3D» de ChatGPT (`rp-cinema`, un vídeo renderizado), que
se ha quitado del tema; su copia está en `retirado/`.

- `sections/rp-hero3d.liquid` «RP · Portada 3D»: portada oscura con el aparato en
  3D en tiempo real dentro de un anillo de luz. Se gira con el dedo o el ratón (y
  con las flechas del teclado), tiene tres puntos de interés (panel, cuerpo, copa)
  y botones de función: Succión (anillos que salen de la copa), Calor (resplandor
  naranja y el icono del panel encendido) y Luz roja (los LED de la copa se
  encienden). Si nadie toca, las funciones se van enseñando solas.
- `assets/rp-3d.js`: el modelo (geometría propia, sin archivos .glb) con Three.js
  0.186, empaquetado con esbuild desde `src/rp-3d/main.js` (`src/rp-3d/build.sh`).
  Se descarga después de pintar la página, solo si hay WebGL y sin ahorro de datos.
- `assets/rp-3d-poster.webp`: imagen renderizada del mismo modelo; es lo primero
  que se ve y el 3D la sustituye sin salto. Sin WebGL se queda la imagen.
- `assets/rp-3d.css`: estilos; el anillo, los textos y el fondo cambian de color
  con cada función. Cabecera oscura cuando esta portada va arriba.
- Con «reducir movimiento» no gira ni cambia de función solo.
