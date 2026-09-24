# Réplica ShoulderReliever · ReliefPath para opositores

La estructura de venta de `shoulderreliever.com` (portada y ficha de producto)
aplicada a ReliefPath™, con el ángulo «Método Pausa» para opositores.

**En la tienda:** tema `ReliefPath · Réplica SR opositores (24-09)`
(`gid://shopify/OnlineStoreTheme/207216509273`), **sin publicar**. Es una copia
del tema publicado («Calmia Clone»), así que conserva cabecera, pie, carrito y
el formulario de contrareembolso.

- Portada: `https://waistzen.com/?preview_theme_id=207216509273`
- Producto: `https://waistzen.com/products/juego-de-ventosa-electrica-con-cable?preview_theme_id=207216509273`

Los 20 archivos `sr-*` del tema tienen el mismo md5 que los de esta carpeta.

## De la referencia a ReliefPath

La web de referencia no se pudo abrir desde esta sesión (la red la bloquea).
La estructura se reconstruyó a partir de lo que tienen indexado los buscadores
de su portada, su ficha, su FAQ y su página «5 razones».

| ShoulderReliever | Aquí | Sección |
|---|---|---|
| Barra superior: envío y garantía | Envío gratis · contrareembolso · 30 días | `sr-announce` |
| Hero «Drug-Free Shoulder Pain Relief, Guaranteed» | «Tu temario puede esperar. Tu pausa, no.» | `sr-hero` |
| Franja de confianza | Envío, contrareembolso, devolución, atención | `sr-trust` |
| «Break the shoulder-pain cycle» | «El ciclo del temario», 4 pasos | `sr-cycle` |
| Sistema de dos partes: de día / de noche | Método Pausa: entre bloques / al cerrar el día | `sr-method` |
| «5 minutos al día» en 3 pasos | Cómo funciona: manual, ajustes, pausa | `sr-steps` |
| What's in the box | Qué incluye | `sr-box` |
| Comparativa frente a cirugía y pastillas | Frente a la pausa con el móvil y la cita de masaje | `sr-compare` |
| «Biggest gains by day 40» | Primer mes: de aparato nuevo a hábito | `sr-timeline` |
| Médico fundador | La tienda (Waistzen, Motril) | `sr-story` |
| Reseñas | Solo reseñas reales o app; vacía no se muestra | `sr-reviews` |
| Garantía de 60 días | Sello de 30 días (la política real) | `sr-guarantee` |
| FAQ | FAQ con datos estructurados | `sr-faq` |
| Cierre con oferta | Cierre con precio y botón | `sr-cta` |
| Ficha con galería, precio, viñetas y sellos | Igual, y el botón baja a la caja de compra | `sr-product` |

En la ficha, la caja de compra sigue siendo la sección de contrareembolso
(`calmia-cod`), justo debajo de la ficha: packs de 1/2/3 con −20 % y −30 %
(los descuentos automáticos), tarjeta o contrareembolso. Es la única caja de
compra, como se decidió antes. Todos los botones llevan a ella.

### Qué se ha cambiado respecto a la referencia, y por qué

- **Sin claims de salud.** La referencia promete alivio del dolor garantizado.
  La tienda ya pasó una auditoría que prohíbe prometer alivio, dar zonas o
  tiempos de sesión. Aquí se vende la pausa, el ritual y el hábito, no un
  resultado médico.
- **Sin cifras ni reseñas inventadas.** No hay «75.000 vendidos» ni estrellas:
  la valoración solo aparece si el producto tiene el metacampo `reviews.rating`
  de una app de reseñas, y la sección de opiniones solo pinta bloques reales.
- **Sin médico fundador.** Se cuenta la tienda, que es lo que existe.
- **Sin llamadas sobre las fotos.** El marco las admite (`x,y,texto`), pero no
  se han puesto porque desde aquí no se pueden ver las imágenes y una flecha
  mal puesta queda peor que ninguna.

## El estilo de foto

Todas las imágenes pasan por el mismo marco (`snippets/sr-photo.liquid`):
fondo azul muy claro, esquinas redondeadas, etiqueta arriba a la izquierda
(«Entre bloques», «Al cerrar el día», «Paso 1»…) y llamadas opcionales con
punto rojo. Así las fotos que ya hay en la tienda se leen como una sola serie.

**Fotos nuevas.** Esta sesión no puede generar ni subir imágenes. Para
completar la serie al estilo de la referencia (producto limpio en estudio +
escenas reales en casa), faltan estas, todas con luz natural suave, fondo claro
y el aparato rojo y negro bien visible:

1. Producto solo, en estudio sobre fondo azul muy claro, vista 3/4.
2. Producto sobre un escritorio con apuntes subrayados y un temporizador.
3. Opositor/a de 25-35 años en su silla, apuntes cerrados, con el aparato en
   la mesa (sin mostrarlo aplicado en ninguna zona concreta).
4. La misma persona en el sofá al final del día, aparato en la mesa baja.
5. Detalle del panel de control, en macro.
6. Detalle de la copa con la luz roja encendida, fondo oscuro.
7. Contenido de la caja, cenital, todo ordenado sobre fondo claro.

Se suben en Contenido → Archivos y se cambian desde el editor del tema.

## El ángulo: por qué opositores

Es el último ángulo trabajado en la tienda (imágenes de estudio del 23-09 y el
tema «Método Opositor»). Es un océano azul: nadie vende ventosas eléctricas a
opositores, el público está muy concentrado (academias, foros, TikTok de
#opositores) y tiene un ritual diario —bloques de estudio con temporizador— en
el que el producto encaja sin prometer nada médico.

Si se prefiere el ángulo pádel, basta con cambiar los textos en el editor: las
secciones no dependen del ángulo.

## Lo que falta

1. **Verlo en un navegador real.** Desde aquí no se llega a `waistzen.com`.
   La vista previa local (`preview/`) renderiza las secciones con marcadores en
   lugar de fotos y no tiene la cabecera ni la caja de contrareembolso.
2. **Publicar el tema** cuando esté revisado (Tienda online → Temas).
3. **Instalar una app de reseñas** y añadir su bloque a «SR · Opiniones».

## Archivos

    construir_plantillas.py   genera templates/*.json con todos los textos
    contrareembolso.json      ajustes de la caja de compra (copiados del tema publicado)
    comprobar.py              comprueba plantillas contra los schemas
    preview/render.py         vista previa local con python-liquid
    preview/shots.py          capturas a 390 y 1440 px con Playwright
    sections/header-group.json  cabecera con la cinta morada desactivada
