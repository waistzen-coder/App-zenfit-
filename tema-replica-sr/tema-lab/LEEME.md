# ReliefPath · Lab

Tema nuevo para waistzen.com con el estilo «laboratorio de confianza»
(skill `web-tienda-catalogo`). Se apoya en Dawn 15.4.1 y no toca ningún
otro tema de la tienda.

## Qué trae

| Página | Secciones |
|---|---|
| Portada (`index.json`) | Barra de oferta · cabecera fija · hero con cifras enlazadas · catálogo con barra fija (01 Packs, 02 El aparato) · calidad y documentos · vídeo real (solo si se sube) · por qué comprar aquí · reseñas (solo app real) · preguntas · sobre nosotros · cierre «Tu pedido, sin sorpresas.» · aviso del sector · pie |
| Ficha (`product.json`, `product.reliefpatch.json`) | Galería · packs 1/2/3 · añadir al carrito (carrito lateral) · comprar ahora (checkout en español) · contrareembolso con su recargo · barra fija en móvil · acordeón · Product + Offer + Breadcrumb |
| Páginas | `page.json` (envíos, devoluciones…), `page.contact`, `page.tracking`, `page.calidad`, `page.faq`, `page.guia`, `page.sobre`, `page.landing-espana` |

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

El zip se sube como tema nuevo con `themeCreate`.
