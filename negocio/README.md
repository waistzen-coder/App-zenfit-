# Mostrador · el negocio de los 1.000 €

Me diste 1.000 € y libertad total para montar el negocio que yo viera mejor, con
la condición de ver dinero pronto. Esta carpeta es ese negocio: la decisión, el
plan, el producto ya fabricado y el kit para venderlo.

## La decisión: una agencia de webs para negocios de barrio

**Mostrador** hace webs para negocios locales (fontaneros, barberías, fisios,
restaurantes, talleres…) con un método que casi nadie usa: **primero les
enseñamos su web ya hecha y luego deciden si la quieren**.

Lo elijo por cinco razones:

1. **Se cobra antes de gastar.** No hay stock ni anuncios que pagar por
   adelantado: el cliente paga y entonces se publica. Los 1.000 € casi no se
   tocan el primer mes: son el colchón, no el combustible.
2. **Margen de casi el 100 %.** Una web cuesta unos 10 € (el dominio) y se vende
   a 290 € o 490 €. El hosting es gratis.
3. **Yo fabrico en minutos lo que una agencia tarda semanas.** Eso permite
   regalar la propuesta: el dueño ve *su* web, con *su* nombre, antes de pagar.
   Es la forma más fácil de vender que existe.
4. **Hay muchísimo mercado.** Según el INE, 7 de cada 10 empresas españolas de
   menos de 10 empleados no tienen web propia.
5. **Deja ingresos que se repiten.** El mantenimiento son 19 €/mes por cliente,
   y se va acumulando.

Lo que descarté, y por qué:

| Opción | Por qué no |
| --- | --- |
| Dropshipping con anuncios | Con 1.000 € el presupuesto de pruebas se quema en dos o tres semanas, y el margen es fino |
| Trading, cripto, apuestas | No es un negocio, es jugar con el dinero |
| Productos digitales | Sin audiencia propia tardan meses en vender |
| Comprar y revender | Todo el trabajo recae en ti y yo no aporto casi nada |

## Los números (objetivo, no promesa)

Precio medio estimado por venta: **370 €** (mezcla de webs de 290 € y 490 €),
más IVA.

| Mes 1 | Prudente | Objetivo | Si va bien |
| --- | --- | --- | --- |
| Ventas | 2 | **4** | 8 |
| Facturado (sin IVA) | 740 € | **1.480 €** | 2.960 € |
| Mantenimientos activos | 1 | 2 | 4 |
| Gastado de los 1.000 € | ~50 € | ~60 € | ~250 € |

Con **3 ventas** se factura lo mismo que la inversión, y casi sin haberla
tocado. Las tasas de conversión son una hipótesis: las mediremos en la primera
semana y ajustaremos. Si tras unos 100 contactos no hay ni una venta, cambiamos
oferta, sector o canal antes de gastar un euro más. Ver
[plan/plan-30-dias.md](plan/plan-30-dias.md).

## Quién hace qué

**Yo (dirección y fábrica):** estrategia, precios, la web de la agencia, las
webs de propuesta de cada negocio, todos los textos y guiones, la entrega de las
webs finales, los cambios de mantenimiento y el repaso de números cada semana.

**Tú (socio comercial, unas 2 horas al día):**

- Pasarme nombres de negocios de tu zona que no tengan web (o la tengan vieja).
- Visitarlos o llamarlos con el guion y enseñarles su propuesta.
- Cobrar y facturar (yo no puedo tener cuentas ni firmar nada).
- Pagar los pocos gastos cuando toque: el primero es el dominio, unos 10 €.

Yo no puedo llamar a puertas ni tener dinero: el dinero está siempre en tu
cuenta y cada gasto lo apruebas tú.

## Qué hay ya hecho

| Carpeta | Qué es |
| --- | --- |
| [`web/`](web/) | La web de Mostrador, lista para publicar, con su escaparate de ejemplos |
| [`fabrica/`](fabrica/) | La fábrica: de la ficha de un negocio a su web en un comando ([cómo se usa](fabrica/README.md)) |
| [`plan/`](plan/) | [Plan de 30 días](plan/plan-30-dias.md), [presupuesto de los 1.000 €](plan/presupuesto.md) y [lo legal y fiscal](plan/legal-fiscal.md) |
| [`ventas/`](ventas/) | [Oferta y precios](ventas/oferta.md), [cómo encontrar clientes](ventas/prospeccion.md), [guiones](ventas/guiones.md), [objeciones](ventas/objeciones.md) y [hoja de encargo](ventas/hoja-de-encargo.md) |

Cada web de propuesta incluye: diseño según el sector, botones de llamada y
WhatsApp, horario con «abierto ahora» calculado en vivo, cómo llegar, datos
estructurados para Google, cero cookies y aviso legal en la versión final. Todo
en un único archivo de unos 100 KB.

## El panel del negocio

[**Panel Mostrador**](https://claude.ai/artifact/XxDb7akeeWoV3grGX6wa5j) (privado,
solo lo abres tú): números, embudo de clientes, caja y plan de 30 días, con la
web de la agencia y las demos de ejemplo. Apunta ahí cada negocio y cada euro;
yo lo leo cuando me escribes para preparar propuestas y repasar números. Su
código está en [`panel/panel.html`](panel/panel.html); los datos no se guardan
en el repositorio.

## Cómo trabajamos cada día

1. Me escribes la lista de negocios del día (nombre y pueblo, o el enlace de
   Google Maps).
2. Te devuelvo sus propuestas publicadas y el mensaje para cada uno.
3. Visitas o llamas, y apuntas en el panel cómo ha ido.
4. Los viernes repasamos los números y decido qué cambiar.

## Lo que necesito de ti para arrancar

1. **Tu nombre de pila** para los mensajes, y **un número de WhatsApp** para el
   negocio (puede ser el tuyo con WhatsApp Business).
2. **Comprar el dominio `mostradorweb.es`** (unos 10 € en cualquier registrador;
   lo comprobé libre el 6 de octubre de 2026, pero eso puede cambiar).
3. **Tu ciudad o zona**, si no es la Costa Tropical (lo deduje del briefing de
   tu tienda).
4. **Una lista de 20 negocios de tu zona sin web.** Con nombre y pueblo me
   basta; si me pegas el teléfono y el horario de Google Maps, mejor.

Con eso te devuelvo sus 20 webs de propuesta y el guion para enseñarlas.

## Una cosa sobre este repositorio

El repositorio es **público**. Por eso no guardo aquí nada de clientes reales:
las demos que no son ejemplos, las entregas y la carpeta `privado/` están en el
`.gitignore`. Si lo pones en privado (GitHub → Settings → General → Change
visibility), puedo guardar aquí también el trabajo con clientes reales.
