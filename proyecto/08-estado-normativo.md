# Estado normativo

**Fecha de revisión: 8 de septiembre de 2026.**

Este documento existe porque es fácil —y peligroso— escribir «el decreto exige»
sobre una norma que todavía no se ha publicado. Un cliente que lea eso puede
tomar decisiones creyendo que hay una obligación que no existe, y un inspector o
un abogado que lo lea nos retira la credibilidad de todo lo demás.

Aquí se separa lo que está en vigor, lo que es solo un proyecto y lo que
todavía no está definido.

---

## VIGENTE

**Artículo 34.9 del Estatuto de los Trabajadores.** En vigor desde 2019.
Exige, entre otras cosas:

- Registro **diario** de la jornada.
- **Horario concreto de inicio y finalización** de cada persona trabajadora.
- **Conservación durante cuatro años.**
- Disponibilidad para **la persona trabajadora**.
- Disponibilidad para **sus representantes**.
- Disponibilidad para **la Inspección de Trabajo**.

**Qué significa «disponibilidad», y qué no.** El artículo exige que el registro
esté a disposición de esas tres partes. No dice cómo. No exige un portal en
línea, ni acceso remoto, ni autoservicio: entregar una copia legible cuando se
pide satisface la obligación. De ahí que en este repositorio no se escriba que
la ley obligue a tener un portal de representantes, ni que no tenerlo sea un
incumplimiento. Lo que sí se puede escribir es que sin un mecanismo propio la
disponibilidad depende de un paso manual, y eso es una debilidad operativa
nuestra, no una infracción declarada.

Esto es lo único que se puede afirmar hoy como obligación legal, y es la base
sobre la que se construye el producto.

## PROYECTO · no está en vigor

**El Proyecto de Ley 121/000058 de 2025 fue rechazado.** El Congreso lo devolvió
el 10-11 de septiembre de 2025. **No es ley y no se puede citar como tal.**

**Existe un Proyecto de Real Decreto** sobre el registro de jornada, publicado
pero no aprobado. Contempla, entre otras cosas:

- Registro por medios **digitales**.
- Objetividad, fiabilidad y accesibilidad.
- **Huella clara de las modificaciones y de su autoría.**
- Asientos personales, directos e inmediatos.
- Identificación del trabajador, comienzo y final de jornada, **pausas**.
- **Totalización diaria y mensual.**
- Identificación, autorizaciones y autoría de las modificaciones.
- Cuatro años de conservación.
- **Consulta y copia por la persona trabajadora.**
- Acceso de la Inspección, presencial y **remoto**.
- Formatos tratables, legibles y compatibles con formatos generalizados.

Y un punto que condiciona directamente cómo está hecho nuestro motor de
correcciones:

> Una modificación debe contar con autorización de empresa y trabajador. **Pero
> en ausencia de acuerdo, la empresa reflejará la modificación y la persona
> trabajadora su discrepancia.**

Es decir: el desacuerdo **no bloquea** la modificación, pero **queda
registrado**. Por eso nuestro modelo no borra nada cuando no hay acuerdo.

**Existe además una consulta pública de 2026** para una futura Orden con los
requisitos técnicos y de seguridad.

## NO DEFINIDO TODAVÍA

**No hay fecha de entrada en vigor.** El borrador dice «veinte días desde su
publicación en el BOE». Mientras no se publique, **la fecha exacta no existe**.
Cualquier cifra concreta —marzo de 2027, abril de 2027— es una estimación de
prensa, no un dato.

**No hay especificación técnica publicada.** No existe un formato oficial de
exportación para la Inspección de Trabajo. Nuestra exportación es un
**expediente auditable** propio, y se llama así a propósito.

**No hay requisitos técnicos y de seguridad definitivos.** La Orden está en
consulta pública.

---

## Qué se puede decir y qué no

| Prohibido escribir | Se escribe |
| ------------------ | ---------- |
| «El decreto exige…» | «El proyecto normativo contempla…» |
| «Obligatorio desde marzo de 2027» | «Sin fecha: veinte días desde su publicación en el BOE» |
| «Formato oficial de la Inspección» | «Expediente auditable» |
| «Cumple la ley» | «Guarda esto, así, y lo puede demostrar así» |
| «Registro inalterable» | «Registro que detecta modificaciones» |

La regla de fondo: **el producto se está preparando para el escenario del
proyecto, pero no afirma que una norma no publicada esté en vigor.**

Prepararse tiene sentido comercial —cuando salga, quien ya lo tenga hecho gana
tiempo— y no cuesta nada decirlo con precisión. Lo que sí costaría es que un
cliente descubriera que le vendimos una urgencia que no existía.

## Cuándo revisar esto

Cuando se publique el Real Decreto en el BOE, y cuando se publique la Orden de
requisitos técnicos. Ese día hay que volver a
[`09-matriz-cobertura.md`](09-matriz-cobertura.md) y rehacerla contra el texto
real.
