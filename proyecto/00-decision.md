# Qué vamos a construir, y por qué esto y no otra cosa

Decisión tomada el 7 de septiembre de 2026, después de mirar cuatro mercados.

**El producto: cumplimiento fiscal Verifactu para tiendas Shopify y
WooCommerce españolas.**

---

## Las cuatro opciones que había sobre la mesa

1. Convertir `calmia-cod.liquid` en una app de contrareembolso.
2. Vender el motor anti-devoluciones como API a 3PL y agencias.
3. Un vertical fuera del ecommerce.
4. Software para clubes de pádel.

## Por qué se descartó la del contrareembolso, que era la favorita

Era la favorita porque el código ya existe en este repositorio, probado y
funcionando. Se cayó por los precios:

- Releasit: gratis hasta 60 pedidos al mes, 9,99 $ hasta 360, 29,99 $ ilimitado.
  490+ reseñas acumuladas.
- La diferencia que íbamos a construir —cobrar un anticipo parcial para matar
  el pedido fantasma— ya la venden COD King, Partialy y Split2Ship.

Entrar ahí es pelear por 9,99 $ contra gente con tres años de ventaja y veinte
idiomas. Y la categoría se estrecha: el contrareembolso en España es ya el 2,1 %
de las compras online, bajando desde el 7,8 % de 2020, y en MENA ha caído del
41 % al 20 % en cuatro años.

## Por qué Verifactu

**No hay que convencer al cliente.** Es obligatorio por ley: 1 de enero de 2027
para sociedades, 1 de julio de 2027 para autónomos y resto de obligados.
Facturar con Excel o Word pasa a estar prohibido y sancionado.

**El precio está anclado a una multa, no a una app.** Hasta 50.000 € por
ejercicio por usar software no certificado, y 1.000 € por cada factura emitida
sin el QR obligatorio. Contra eso, 39 €/mes no es una decisión de compra
difícil. Es la diferencia de fondo con el contrareembolso, donde el techo son
9,99 $.

**La barrera de entrada es nuestra ventaja.** Ley española, en español, con la
AEAT al otro lado. El 76,6 % de las apps de Shopify solo existen en inglés y no
van a entrar. Shopify no cumple de forma nativa y no lo va a arreglar por
España.

**La complejidad protege.** Huella SHA-256 encadenada registro a registro,
inalterabilidad demostrable, XML, QR obligatorio, servicio web de la AEAT,
trazabilidad de anulaciones y rectificativas. No se copia en un fin de semana.

**El momento es ahora.** Septiembre de 2026: a las sociedades les quedan cuatro
meses. La ola de compra son los próximos diez meses.

## Los riesgos, escritos antes de empezar para no olvidarlos después

**Ya hay guerra de precios.** Verifacturamos 9 €/mes, BeeL 4 €/NIF, Comply
gratis, Quaderno 29 $. No es un desierto. El ángulo es que todos ellos son
facturadores genéricos que valen igual para un fontanero: nuestro producto hace
lo que un ecommerce necesita y ellos hacen mal —reconstruir el pedido de Shopify
con el IVA correcto, OSS para ventas intracomunitarias, contrareembolso,
devoluciones parciales y rectificativas automáticas.

**La declaración responsable la firma una persona.** La AEAT obliga al
productor del software a entregar un documento formal, regulado en la Orden
HAC/1177/2024, certificando el cumplimiento. Con nombre y apellidos. Si el
software falla, responde quien firma. Es también la razón por la que la mayoría
de desarrolladores no entra, y por la que se puede cobrar.

**El plazo ya se movió una vez**, de 2026 a 2027. Puede moverse otra. No mata el
negocio; retrasa la ola.

## El plan

**Fase 0 · dos semanas · la prueba de fuego.** Solo el núcleo legal: registro de
facturación, huella encadenada, XML y QR, validado contra el entorno de pruebas
de la AEAT. Si la Agencia acepta nuestros registros, la tesis está probada y lo
demás es trabajo. Si no, paramos habiendo perdido dos semanas.

**Fase 1 · un mes.** La app: OAuth con Shopify, escucha de pedidos, factura por
venta, PDF con QR, envío a la AEAT, panel. Alta en el App Store.

**Fase 2 · un mes.** Lo que los genéricos no hacen: OSS, rectificativas,
contrareembolso, devoluciones, exportación para la gestoría. Y WooCommerce, que
en España tiene más tiendas que Shopify.

**Primer cliente: nosotros.** waistzen.com necesita esto antes de julio de 2027.
Los fallos van a salir usándolo, igual que salieron en el formulario de
contrareembolso.

## El reparto del trabajo

| Claude | La persona |
| ------ | ---------- |
| Software, pruebas, documentación técnica, textos de venta | Alta como desarrollador de Shopify |
| | Declaración responsable ante la AEAT |
| | Soporte y reseñas |
| | Gestorías y agencias: un gestor con 200 clientes trae 200 tiendas |

## Bloqueo actual

El proxy de red de la sesión bloquea `sede.agenciatributaria.gob.es`. Hacen
falta las especificaciones técnicas oficiales dentro del repositorio:

- El documento de diseño del registro de facturación.
- Los esquemas XSD.
- La guía del servicio web y la dirección del entorno de pruebas.

Sin eso no se puede escribir la huella ni el XML sin inventárselos, y aquí
inventarse el formato no es una opción.

## Las fuentes

- Plazos y sanciones: https://www.verifactu.com/plazos-verifactu/
- Declaración responsable y Orden HAC/1177/2024: https://www.verifactu.com/declaracion-responsable-verifactu/
- Requisitos técnicos: https://www.verifactu.com/requisitos-verifactu/
- Shopify no cumple de forma nativa: https://leyfacturaelectronica.com/adaptar-shopify-verifactu/
- Precios de la competencia: https://verifacturamos.com/programas-facturacion-gratis-espana y https://quaderno.io/es/articulos/shopify-verifactu/
- Contrareembolso en España, 2,1 %: https://stripe.com/resources/more/cash-on-delivery-spain
- Caída del contrareembolso en MENA: https://easysellapp.com/blogs/wiki/cod-dying-mena-merchant-payment-shift-2026
- Precios de Releasit: https://www.digismoothie.com/app/releasit-cod-form
- Ingresos reales de las apps de Shopify: https://weekonelabs.com/blog/shopify-app-revenue-benchmarks-2026/
- 76,6 % de apps solo en inglés: https://www.appstorepulse.com/reports/state-of-shopify-app-store-may-2026
