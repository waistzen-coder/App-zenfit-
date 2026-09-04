# Contexto completo del proyecto (para pegar en ChatGPT)

Actúa como un desarrollador senior de Shopify y consultor de ecommerce en
España. Te doy el contexto entero de un proyecto que ya está a medio hacer.
Léelo todo antes de responder. Al final te digo qué necesito de ti.

---

## 1. Quién soy y qué vendo

Tengo una tienda Shopify en `waistzen.com` (contacto: waistzen@gmail.com,
Motril, Granada). Vendo un solo producto en una landing larga:

- **Producto:** ReliefPath™ Ventosas Inteligentes con Terapia de Luz Roja
  (ventosa eléctrica con succión, calor hasta 50 °C y luz roja).
- **Handle:** `juego-de-ventosa-electrica-con-cable`
- **ID de variante:** `59286832939353`
- **Precio:** 49,95 € · **Precio comparativo (tachado):** 99,95 € → −50 %
- **Público:** gente de 35-55 años que juega al pádel y se carga la
  musculatura. La landing está escrita en ese tono.

Tengo descuentos automáticos configurados en la tienda:
**−20 % a partir de 2 unidades** y **−30 % a partir de 3**.

El tema se llama **ReliefPath — Calmia Clone (Claude 31-07)**
(`gid://shopify/OnlineStoreTheme/203751620953`) y **todavía no está
publicado**. Las cuatro plantillas que comparten esta landing son idénticas:
`product.reliefpatch.json`, `product.ventosa.json`, `product.padel.json` e
`index.json`.

---

## 2. Qué pedí y por qué (histórico, en orden)

1. Que recuperásemos todo lo trabajado en una conversación anterior.
2. Que me dijeran si merecía la pena seguir pagando la app **EasySell COD
   Form** o si era mejor hacerlo por mi cuenta.
3. **El encargo principal:** *«simula todo lo que hace esa aplicación y hazlo
   tú, para hacer contrareembolso; que al pedir pueda elegir contrareembolso
   pero pagando 5 € más, o con tarjeta al precio original. Haz un buen
   cuestionario para que la tasa de entrega del contrareembolso sea lo más
   alta posible.»*
4. Que me confirmaran que el método de pago manual de contrareembolso estaba
   activo, y que me dieran algo para previsualizarlo.
5. Que **el módulo de contrareembolso subiera al principio de la página**, al
   sitio donde estaba el selector de packs del hero (junto a la foto), que
   toda la página fuese coherente, que me dijeran si había que editar también
   la página del carrito o la de pago, y que hicieran un pedido simulado
   completo corrigiendo todos los errores.
6. Que **todo lo que escribe el comprador en el cuestionario llegue a mi
   ficha del pedido**, sin perder ni un dato.
7. Que hicieran una simulación entera sin un solo fallo.
8. Un enlace directo para verlo.
9. **El último fallo que encontré yo:** el hero ponía «Ahorras 119,98 € hoy»
   justo al lado de un precio de 49,95 €, lo cual no tiene ningún sentido.
   Pedí que **todos los errores de ese tipo se arreglaran**.

---

## 3. Qué se ha construido ya

En vez de la app, se hizo **una sección de tema autocontenida**:
`sections/calmia-cod.liquid`. No necesita servidor, ni suscripción, ni
permisos de app. Hace esto:

**Elección de pack** (1, 2 o 3 unidades) con el precio ya descontado. Los
porcentajes se configuran en el editor de temas y **tienen que coincidir con
los descuentos automáticos de la tienda**, o el precio que se enseña no será
el que cobre el checkout.

**Dos formas de pago**, con el recargo sacado del precio de un producto de
servicio (no escrito a mano en ningún sitio):

| Unidades | Con tarjeta | Contrareembolso | Precio tachado |
| -------- | ----------- | --------------- | -------------- |
| 1        | 49,95 €     | 54,95 €         | 99,95 €        |
| 2        | 79,92 €     | 84,92 €         | 199,90 €       |
| 3        | 104,89 €    | 109,89 €        | 299,85 €       |

El recargo son **5,00 €** y sale del producto *Contrareembolso — gastos de
gestión* (handle `contrareembolso-gastos-de-gestion`, variante
`59250983928153`). Estaba **en borrador**, que habría hecho fallar todos los
pedidos contrareembolso; ya está activo, publicado en la Tienda online, sin
inventario y sin requerir envío.

**Cuestionario de reparto** que solo aparece al elegir contrareembolso:
nombre y apellidos, móvil, correo, código postal (la provincia se rellena
sola), localidad, calle con número, piso y puerta, franja horaria y una
segunda persona que pueda recoger el paquete.

**Filtros antifraude**, que son los que de verdad mueven la tasa de entrega:

- Móviles imposibles: los que no son españoles, los de un solo dígito
  repetido, las escaleras tipo `612345678` y una lista de falsos habituales.
- Direcciones sin número de calle (entrega fallida casi segura).
- Provincias donde no se sirve contrareembolso: por defecto Las Palmas (35),
  Santa Cruz de Tenerife (38), Ceuta (51) y Melilla (52).
- Pedidos duplicados: mismo móvil dos veces en media hora avisa antes de
  pasar.
- Bots: un campo trampa invisible y un tiempo mínimo rellenando el
  formulario.

**Compromiso explícito:** el cliente ve el importe exacto que tendrá que dar
al repartidor y marca dos casillas (que lo tendrá preparado y que habrá
alguien en casa). Es la pieza que más reduce el rechazo en la puerta.

**Recuperación del formulario a medias:** lo que escriba se guarda en su
navegador y se le devuelve si vuelve dentro de una semana.

---

## 4. Cómo entra el pedido

Al enviar se construye un **enlace permanente de carrito**:

    /cart/{variante}:{unidades},{recargo}:1?attributes[...]&note=...&checkout[...]

Reemplaza el carrito entero, así que no se duplica el pedido. Según la
documentación de Shopify sobre enlaces permanentes, `note` y `attributes`
**salen en la ficha del pedido**, y los `checkout[...]` dejan la dirección ya
rellenada.

Así que todo lo que escribe el comprador me llega por dos vías:

**La nota**, arriba del todo en la ficha del pedido:

    CONTRAREEMBOLSO · COBRAR 54,95 €
    Pedido: 1 unidad
    Nombre: María García López
    Teléfono: 645210337
    Correo: maria.garcia@gmail.com
    Dirección: Calle Mayor, 24, 3º B · 28806 Alcalá de Henares (Madrid)
    Entrega: Tarde (14:00 - 19:00)
    Si no está, recoge: Mi vecina del 2º A
    Avisar por WhatsApp: sí
    Compromiso aceptado: 03/09/2026 20:45

**Los atributos**, uno por dato, en los detalles adicionales del pedido:
forma de pago, importe a cobrar, pack, nombre declarado, teléfono, correo,
piso y puerta, franja horaria, quién puede recogerlo, aviso por WhatsApp y
compromiso de pago. Los atributos y la nota guardan lo que **declaró el
comprador**, y no cambian aunque él toque algo luego en el checkout.

---

## 5. Límites reales de Shopify (esto no es opinable)

- **Shopify no deja preseleccionar la forma de pago desde fuera del
  checkout.** Ninguna plantilla puede, por muy bien escrita que esté. Una app
  con servidor propio se lo salta creando el pedido directamente por la API
  de administración; una sección de tema, no. Por eso el aviso de «en la
  pantalla de pago, elige Contrareembolso» es parte del diseño.
- **La página del checkout no se puede editar** sin Shopify Plus.
- **La página del carrito no hace falta tocarla**, porque el enlace permanente
  lleva directo al checkout sin pasar por el carrito.
- No hay verificación del móvil por SMS ni recuperación de formularios
  abandonados desde la tienda: las dos cosas necesitan un servidor propio.

---

## 6. Dónde vive en la página, y el fallo que hubo que arreglar

El módulo va **justo debajo de la foto**, donde estaba el selector de packs
del hero. Para no tener dos cajas de compra peleándose, la sección apaga los
packs y el botón del hero desde su propio CSS.

**Pero apagarlos con CSS no bastaba**, y este fue el fallo que detecté yo: el
hero calcula su «Ahorras … hoy», el precio de su botón y el precio de la barra
fija de abajo **a partir del pack preseleccionado**. Con el pack de 2 marcado
pero escondido, salía «Ahorras 119,98 €» al lado de un precio de 49,95 €, y la
barra fija de abajo decía 79,92 €. La solución fue **quitar los tres bloques
de pack del hero en la plantilla JSON**. Sin packs, el hero vuelve a hablar de
una unidad: 99,95 € tachado → 49,95 €, −50 %, ahorras 50,00 €.

Del mismo tipo se arregló otro: los packs del contrareembolso tachaban el
precio de venta por unidades (2 uds. tachaba 99,90 €, una cifra tan pegada a
los 99,95 € de una unidad que parecía una errata). Ahora tachan el **precio
comparativo** por unidades: 199,90 €.

Todos los demás botones de la página llevan al formulario: la banda negra de
arriba, el botón de «Por qué cuesta lo que cuesta», la barra fija de abajo y
el cierre.

El orden de las secciones de la página es: `marquesina, aviso, hero,
contrareembolso, entrega, problemas, mecanismo, video, zonas, incluye,
comparativa, valor, quien, valoran, resenas, garantia, pago, faq, cierre,
barra, chat`.

---

## 7. Las pruebas que ya existen

Hay un arnés que renderiza la sección con Liquid de verdad y ejecuta su
JavaScript en un navegador simulado, haciendo pedidos completos. **117
comprobaciones, todas en verde**, contra los bytes exactos que están subidos
al tema:

    python3 pruebas/render.py     # renderiza la sección
    node pruebas/test.js          # 29 comprobaciones de la lógica
    node pruebas/simulacro.js     # 58 · un pedido narrado + datos hostiles
    python3 pruebas/coherencia.py # 30 · que todas las cifras cuadren entre sí

`simulacro.js` hace un pedido con datos retorcidos a propósito («Mª Ángeles
Fernández-Bermúdez», «+34 645 21 03 37», un correo con `+`, una dirección con
paréntesis y `&`) y **vuelve a parsear la URL generada** para comprobar campo
por campo que nada se corrompe.

`coherencia.py` nació del fallo del «Ahorras 119,98 €»: renderiza el hero, el
contrareembolso, la barra fija y el cierre con los ajustes reales de la
plantilla y comprueba que ninguna cifra contradice a otra.

Lo que las pruebas **no** cubren, porque desde ahí no se llega a
`waistzen.com`: que el checkout acepte la dirección prerrellenada y que el
método de pago manual aparezca. Eso solo se ve en la tienda.

El código está en GitHub: `waistzen-coder/App-zenfit-`, rama
`claude/review-last-conversation-ieyeos`.

---

## 8. Lo que queda pendiente

1. **Activar el contrareembolso** en Ajustes → Pagos → Métodos de pago
   manuales. Sin esto el cliente rellena el formulario, llega al checkout y no
   encuentra la opción que acaba de elegir. **Es el único punto que rompe el
   flujo entero.** No se pudo comprobar por API porque `manualPaymentMethods`
   solo existe a partir de la versión 2025-07 de la Admin API.
2. **Publicar el tema**, que sigue sin publicar.
3. **Verlo renderizado en un navegador real.** Nadie lo ha visto todavía en
   `waistzen.com`.
4. **Decidir qué hacer con la Protección de envío** (producto
   `proteccion-de-envio`, 2,95 €). Era un *order bump* que vivía dentro del
   formulario del hero y ahora está oculto, porque el formulario del hero
   está apagado. O se trae al módulo de contrareembolso, o se pierde ese
   ingreso.
5. Las secciones de **reseñas** (`resenas`) y **estadísticas** (`valoran`)
   están desactivadas con datos de ejemplo, pendientes de poner cifras reales.

---

## 9. Qué necesito de ti

Trabaja sobre todo lo anterior y dame, en español y sin rodeos:

1. **Una auditoría crítica del planteamiento.** ¿Hay algo mal pensado?
   ¿Algún caso que se me escape y que vaya a hacer que un pedido falle o que
   un cliente se quede a medias? Especialmente en el paso del enlace
   permanente al checkout.
2. **Instrucciones paso a paso, clic a clic**, para activar el método de pago
   manual de contrareembolso en Shopify y para publicar el tema, contándome
   qué tengo que ver en cada pantalla para saber que está bien.
3. **Una recomendación sobre la Protección de envío:** si la traigo al módulo
   de contrareembolso o la dejo fuera, y por qué, sabiendo que el cliente que
   paga contrareembolso ya está pagando 5 € de recargo.
4. **Cómo medir si esto funciona:** qué números tengo que mirar para saber si
   la tasa de entrega del contrareembolso es buena o mala en España, cuál es
   un porcentaje normal de paquetes rechazados en la puerta, y qué podría
   tocar del cuestionario o de los filtros para mejorarlo.
5. **Ideas para subir el ticket medio y la conversión** en esta página
   concreta, sabiendo el precio, el producto y el público.

**Reglas:** no cambies los precios ni los porcentajes sin decírmelo
explícitamente, porque tienen que cuadrar con los descuentos automáticos de
la tienda. No des por hecho que puedes tocar mi tienda: no tienes acceso, así
que todo lo que sea modificar la tienda dímelo como instrucciones para que lo
haga yo. Si algo de lo que te cuento te parece que está mal hecho, dímelo
claro.
