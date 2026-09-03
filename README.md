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

## Cómo entra el pedido

Al enviar se construye un enlace permanente de carrito:

    /cart/{variante}:{unidades},{recargo}:1?attributes[...]&checkout[...]

Ese enlace reemplaza el carrito entero —así no se duplica el pedido si el
cliente ya había pulsado el botón del hero—, guarda las respuestas como
atributos que Shopify enseña en la ficha del pedido, y deja el checkout con la
dirección ya rellenada.

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

## Puesta en marcha

1. El producto **Contrareembolso — gastos de gestión** tiene que estar en estado
   *Activo* y publicado en la Tienda online. En borrador, el pedido falla.
2. En el editor de temas, añadir la sección *Calmia · Contrareembolso* y elegir
   ese producto en «Producto del recargo».
3. Comprobar que los descuentos de cada pack coinciden con los automáticos.
4. Activar el método de pago manual de contrareembolso.
