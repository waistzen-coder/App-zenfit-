# Arreglos sobre la versión retocada por ChatGPT (tema 207708619097)

ChatGPT editó el tema v3 directamente en la tienda el 02-10. Estos dos archivos
parten de su versión, no de las secciones de esta carpeta:

- `locales/en.default.json`: el idioma principal de la tienda es el inglés, así
  que Shopify pinta con este archivo. Llevaba en inglés los 44 textos `rp.*`
  (cabecera, portada, caja de compra, contrareembolso, barra fija, pie). Ahora es
  igual que `es.json`.
- `sections/sr-product.liquid`: el enlace al checkout (tarjeta y contrareembolso)
  vuelve a llevar `locale=es`; con `request.locale.iso_code` salía `en`.
