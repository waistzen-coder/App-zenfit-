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
