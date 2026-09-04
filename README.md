# App-zenfit- · Contrareembolso propio para Waistzen

Sustituto de la app **EasySell COD Form** para la tienda Shopify `waistzen.com`,
hecho como sección del tema en vez de como app.

## Qué hay aquí

    shopify-theme/sections/calmia-cod.liquid

Una sola sección, autocontenida, que se coloca en la página de producto (o en la
portada) desde el editor de temas. No necesita servidor, ni suscripción, ni
permisos de app.

## Qué hace

**Elección de pack.** 1, 2 o 3 unidades, con el precio ya descontado. Los
porcentajes de cada pack se configuran en el editor y tienen que coincidir con
los descuentos automáticos de la tienda (hoy: −20 % a partir de 2 unidades,
−30 % a partir de 3).

**Dos formas de pago.**

| Opción           | Precio                        |
| ---------------- | ----------------------------- |
| Tarjeta          | el normal, sin recargo        |
| Contrareembolso  | el normal + el recargo (5 €)  |

El recargo no está escrito a mano en ninguna parte: sale del precio del producto
de servicio *Contrareembolso — gastos de gestión*. Si un día pasa a 4 € o a 6 €,
se cambia el precio del producto y toda la sección se recalcula sola.

**Cuestionario de reparto.** Solo aparece al elegir contrareembolso. Pide nombre
y apellidos, móvil, correo, código postal, localidad, calle con número, piso y
puerta, franja horaria y una segunda persona que pueda recoger el paquete. La
provincia se rellena sola a partir del código postal.

**Filtros pensados para que el paquete se entregue a la primera.** Son los que
mueven de verdad la tasa de entrega:

- Móviles imposibles: los que no son españoles, los de un solo dígito repetido,
  las escaleras tipo `612345678` y una lista de falsos habituales.
- Direcciones sin número de calle, que son entregas fallidas casi seguras.
- Provincias donde no se sirve contrareembolso. Por defecto Las Palmas, Santa
  Cruz de Tenerife, Ceuta y Melilla; se cambia desde el editor.
- Pedidos duplicados: mismo móvil dos veces en media hora avisa antes de pasar.
- Bots: un campo trampa invisible y un tiempo mínimo rellenando el formulario.

**Compromiso explícito.** El cliente ve el importe exacto que tendrá que dar al
repartidor y marca dos casillas: que lo tendrá preparado y que habrá alguien en
casa. Es la pieza que más reduce el rechazo en la puerta.

**Recuperación del formulario a medias.** Lo que escriba se guarda en su
navegador y se le devuelve si vuelve dentro de una semana. Es lo más parecido a
la recuperación de carritos que puede hacer un tema.

## Cómo entra el pedido, y dónde ves lo que ha escrito

Al enviar se construye un enlace permanente de carrito:

    /cart/{variante}:{unidades},{recargo}:1?attributes[...]&note=...&checkout[...]

Reemplaza el carrito entero —así no se duplica el pedido si ya se había pulsado
otro botón—, y según la [documentación de Shopify sobre enlaces permanentes](https://shopify.dev/docs/apps/build/checkout/create-cart-permalinks)
los parámetros `note` y `attributes` **salen en la ficha del pedido**, mientras
que los `checkout[...]` dejan la dirección rellenada.

Así que todo lo que escribe el comprador te llega por dos vías:

**La nota**, arriba del todo en la ficha del pedido, en diez líneas:

    CONTRAREEMBOLSO · COBRAR 54,95 €
    Pedido: 1 unidad
    Nombre: María García López
    Teléfono: 645210337
    Correo: maria.garcia@gmail.com
    Dirección: Calle Mayor, 24, 3º B, escalera izquierda · 28806 Alcalá de Henares (Madrid)
    Entrega: Tarde (14:00 - 19:00)
    Si no está, recoge: Mi vecina del 2º A
    Avisar por WhatsApp: sí
    Compromiso aceptado: 03/09/2026 20:45

**Los atributos**, en los detalles adicionales, uno por dato: forma de pago,
importe a cobrar, pack, nombre declarado, teléfono, correo, piso y puerta,
franja horaria, quién puede recogerlo, aviso por WhatsApp y compromiso de pago.

La diferencia entre los dos no es capricho: los atributos y la nota guardan lo
que declaró el comprador en el formulario, y no cambian aunque luego toque algo
en el checkout. La dirección de envío del pedido sí puede cambiarla él. Si un
día no cuadran, la nota te dice qué escribió de verdad.

## Lo que esto no puede hacer

Shopify no deja preseleccionar la forma de pago desde fuera del checkout.
Ninguna plantilla puede, por muy bien escrita que esté. Una app con servidor
propio se lo salta creando el pedido directamente por la API de administración;
una sección de tema, no.

Consecuencias prácticas:

1. Hay que tener **activado el método de pago manual** en Ajustes → Pagos →
   Métodos de pago manuales, o el cliente llega al checkout y no encuentra la
   opción que acaba de elegir.
2. El aviso de «en la pantalla de pago, elige Contrareembolso» es parte del
   diseño, no un adorno.

Tampoco hay verificación del móvil por SMS ni recuperación de formularios
abandonados por parte de la tienda: las dos cosas necesitan un servidor.

## Dónde vive en la página

Va **justo debajo de la foto**, en el sitio donde antes estaba el selector de
packs del hero. Para no tener dos cajas de compra peleándose, la sección apaga
los packs y el botón del hero desde su propio CSS: se activa con la casilla
«Apagar los packs y el botón de arriba» y se desactiva desmarcándola, sin tocar
código. La foto, el stock, la fecha de entrega y los sellos del hero se quedan.

Todos los demás botones de la página llevan aquí: la banda negra de arriba, el
botón de «Por qué cuesta lo que cuesta», la barra fija de abajo y el cierre.
Para eso, la barra fija y el cierre tienen una opción nueva en el editor,
«Llevar al formulario de contrareembolso».

## Las pruebas

En `pruebas/` hay un arnés que renderiza la sección con Liquid y ejecuta su
JavaScript de verdad en un navegador simulado, haciendo pedidos completos:

    python3 pruebas/render.py     # renderiza la sección
    node pruebas/test.js          # 29 comprobaciones de la lógica
    node pruebas/simulacro.js     # un pedido narrado, paso a paso, + datos hostiles

**`test.js`** cubre la lógica: compra con tarjeta de 1 y 3 unidades, cambio a
contrareembolso, formulario vacío, móvil falso, calle sin número, nombre de una
palabra, correo mal escrito, CP de Canarias, compromisos sin marcar, trampa de
robots, envío instantáneo, direcciones larguísimas, pack de 2 y duplicados.

**`simulacro.js`** hace un pedido entero con datos retorcidos a propósito
—`Mª Ángeles Fernández-Bermúdez`, `+34 645 21 03 37`, un correo con `+`, una
dirección con paréntesis y `&`, una segunda persona con `=`— y luego **vuelve a
parsear la URL generada** para comprobar campo por campo que nada se ha
corrompido. Los `&` y `=` dentro de un texto no parten el enlace, las tildes
llegan intactas y el cero delante del CP se conserva. También comprueba que se
puede corregir un error sin recargar: pones Tenerife, te frena, cambias a
Madrid y el pedido sale con Madrid, no con el dato viejo.

Lo que las pruebas **no** cubren, porque desde aquí no se llega a
`waistzen.com`: que el checkout acepte la dirección prerrellenada y que el
método de pago manual aparezca. Eso solo se ve en la tienda.

## Estado en la tienda

Ya hecho y verificado contra la API:

- El producto **Contrareembolso — gastos de gestión** (5,00 €) estaba en
  *borrador*, que es lo que habría hecho fallar todos los pedidos
  contrareembolso. Está **activo, publicado en la Tienda online y disponible
  para la venta**. No lleva inventario ni requiere envío, así que no interfiere
  con los gastos de envío.
- La sección está subida al tema **ReliefPath — Calmia Clone (Claude 31-07)**
  (`OnlineStoreTheme/203751620953`), byte a byte igual que el archivo de este
  repositorio.
- Está **colocada en la página**, entre la sección de pago y las preguntas
  frecuentes, con el producto y el recargo ya asignados, los tres packs
  cuadrados con los descuentos automáticos de la tienda (−20 % desde 2 uds,
  −30 % desde 3) y la entrega en 24-48 h, igual que el hero y la barra fija.
- La banda superior de «CONTRAREEMBOLSO» ahora **enlaza al formulario**, para
  que quien llegue buscando eso no tenga que recorrer la página entera.
- Las cuatro plantillas que comparten esta landing (`product.reliefpatch`,
  `product.ventosa`, `product.padel` e `index`) están sincronizadas.

## Lo que falta, y no lo puedo hacer yo

1. **Activar el contrareembolso** en Ajustes → Pagos → Métodos de pago
   manuales. Sin esto el cliente rellena el formulario, llega al checkout y no
   encuentra la opción que acaba de elegir. Es el único punto que rompe el
   flujo entero.
2. **Publicar el tema**, que sigue sin publicar.
3. Comprobar cómo se ve. El proxy de esta sesión no llega a `waistzen.com`,
   así que la sección no se ha visto renderizada en un navegador real.
