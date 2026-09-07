# Proyecto nuevo: cobrar los intereses de demora que nadie reclama

Decidido el 7 de septiembre de 2026. Sustituye a la idea anterior de Verifactu y
no tiene nada que ver con la tienda ni con Shopify.

**El producto: un motor que lee la contabilidad de una empresa, encuentra todas
las facturas que le pagaron tarde en los últimos años y calcula, factura a
factura, el dinero que la ley dice que le deben por ello.**

---

## De qué dinero hablamos

La Ley 3/2004 de lucha contra la morosidad reconoce dos cosas al que cobra
tarde, y las reconoce solas, sin pedirlas:

1. **Intereses de demora** al tipo del BCE más ocho puntos. En el primer
   semestre de 2026, el 10,5 %. Frente a la Administración, el 8 %.
2. **40 € fijos por factura**, artículo 8.1, *«que se añadirá en todo caso y sin
   necesidad de petición expresa a la deuda principal»*. Sin demostrar ningún
   coste y sin ir al juzgado.

Tres detalles que cambian el tamaño del asunto:

**Son 40 € por cada factura, no por deuda.** Se discutió durante años y el
Tribunal Supremo lo zanjó en la STS 5012/2025: por cada una de las facturas
abonadas con demora. Una empresa con 400 facturas cobradas tarde no tiene una
reclamación de 40 €; tiene una de 16.000 € solo por este concepto.

**El derecho sobrevive al cobro.** No hablamos de facturas impagadas. Un
contratista puede reclamar los intereses *aunque ya haya percibido el pago de la
factura*. Es dinero devengado sobre facturas que están cobradas y cerradas.

**Va hacia atrás cuatro o cinco años.** Cuatro años en contratos públicos desde
la liquidación; cinco como regla general del artículo 1964 del Código Civil, y
el plazo se interrumpe con cada reclamación fehaciente. Cada día que pasa
prescribe una parte y desaparece.

## Por qué hay tanto sin reclamar

- El **58 %** de autónomos y pymes no reclama nunca los intereses de demora.
- Solo el **2 %** los calcula al tipo legal correcto.
- El plazo medio de pago en España: **67 días en el sector privado** (límite
  legal 60) y **70 días en el sector público** (límite legal 30).
- El **85 %** de las grandes empresas paga fuera de plazo.

## Por qué no lo ha hecho ya un software

Sí se hace, pero a mano y como servicio jurídico: Emerita Legal, Recuperia,
Robinfy, Auren y despachos parecidos lo tramitan cliente a cliente, con un
abogado por expediente. Por eso solo llegan a empresas grandes: a un despacho no
le renta calcular la reclamación de una pyme con 300 facturas.

El error de todos es el mismo. **El cálculo no es jurídico, es aritmético**:
fechas, importes y un tipo que cambia cada semestre. Es lo que un ordenador hace
en un segundo y una persona hace mal.

Lo que no existe: *«sube el fichero de facturas de tu contabilidad y te digo,
factura a factura, cuánto te deben»*, gratis y en treinta segundos.

## El modelo

**El gancho:** informe gratuito. No hay que explicar nada ni crear una
necesidad; se le enseña a alguien un número calculado con sus propias facturas.

**El cobro:** un porcentaje de lo efectivamente recuperado. El cliente no
arriesga nada, que es lo que hace que diga que sí. Y suscripción para el canal.

**El canal, que es lo que de verdad decide:** gestorías, asesorías y despachos.
Una gestoría con 200 clientes trae 200 reclamaciones y se lleva una línea de
ingresos nueva sin trabajo. No competimos con los despachos: les damos producto.

## El foso

No es la idea, que es pública. Es lo que hay que construir bien:

- Leer exportaciones de A3, Sage, Holded, Contasimple, FacturaDirecta.
- Casar cada factura con su cobro real en el banco.
- Aplicar el tipo correcto de cada semestre cuando un retraso cruza varios.
- Distinguir deudor público de privado, con plazos legales distintos.
- Controlar la prescripción factura a factura.
- Redactar el escrito de reclamación y seguir el expediente.

Son meses de trabajo, y es donde quien lo copie lo hará mal.

## Los riesgos, escritos antes de empezar

**Reclamar a un cliente puede costarte el cliente.** Es la objeción real. Se
ataca con el orden: primero administraciones públicas —pagan a 70 días con
límite legal de 30, están obligadas por ley y no se pierde al Ayuntamiento como
cliente—, después clientes ya perdidos, y solo al final los activos. El software
tiene que dejar marcar a quién no se toca.

**No somos abogados.** Construimos la herramienta que calcula y redacta; quien
reclama es el usuario o su despacho. No es un parche: es lo que hace que el
canal de gestorías funcione.

**El cálculo tiene que ser impecable.** Si el número está mal, el producto no
vale nada y encima hace daño. Por eso la Fase 0 es solo el motor y sus pruebas.

## Fase 0 · dos semanas

El motor de cálculo y nada más. Entran facturas con fecha de emisión,
vencimiento y cobro real; sale la reclamación desglosada y auditable, con el
tipo de cada tramo semestral aplicado por separado.

Se prueba contra facturas reales: las de waistzen.com y las de dos o tres
conocidos con empresa. Si el número es grande y defendible, hay negocio. Si sale
ridículo, se sabe en dos semanas.

**Bloqueo conocido:** los tipos de interés de demora los publica el Ministerio de
Economía cada semestre en el BOE. El motor no debe inventárselos: cada tipo
entra en la tabla con su referencia del BOE, y para los semestres sin verificar
el motor se niega a calcular. Es la única forma honesta de escribir esto.

## Las fuentes

- Ley 3/2004, texto consolidado: https://www.boe.es/buscar/act.php?id=BOE-A-2004-21830
- STS 5012/2025, los 40 € por cada factura (análisis de PwC): https://periscopiofiscalylegal.pwc.es/el-supremo-considera-que-el-deudor-moroso-debe-abonar-40-euros-por-cada-factura-pagada-fuera-de-plazo/
- El derecho persiste tras el cobro, y prescripción: https://derecholocal.es/consulta/contratacion-publica-reclamacion-al-ayuntamiento-de-intereses-de-demora-por-facturas-abonadas-con-retraso-prescripcion-del-plazo-de-reclamacion
- Tipo BCE + 8 y los 40 €, con el 10,5 % de 2026: https://www.marsof.es/blog/ley-3-2004-morosidad-explicada
- El 58 % que no reclama y el 2 % que calcula bien: https://copilotgestoria.com/blog/reclamar-40-euros-factura-impagada-autonomos-derecho-2026-guia-gestorias
- Plazos medios de pago 67 y 70 días, y el 85 % de grandes empresas: https://www.creditback.es/morosidad-espana-empresas-pagan-tarde/
- Reclamación a la Administración, artículo 198 LCSP: https://www.emerita.legal/blog/administrativo/contratos-publicos/reclamacion-intereses-demora-administracion-publica-137094/
