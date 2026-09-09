# El acceso de la representación de la plantilla

**Revisión: 9 de septiembre de 2026.** Estado normativo en
[`08-estado-normativo.md`](08-estado-normativo.md).

## Por qué existe, dicho sin exagerar

La obligación vigente del artículo 34.9 es que el registro esté **disponible**
para la persona trabajadora, para quien la representa y para la Inspección. No
dice cómo. Entregar una copia legible cuando se pide la satisface, y eso ya se
podía hacer: el expediente se exporta desde el panel.

Así que esto no se construye porque la ley lo exija. Se construye porque el
camino manual tiene un defecto que no se arregla poniendo más cuidado: **no deja
constancia**. Si un día se discute si la empresa facilitó el registro, «se lo
dimos» sin rastro vale poco, y quien lo pidió tampoco puede demostrar que lo
pidió. Con el portal, las dos partes miran el mismo apunte.

## Qué puede hacer, y qué no

| | |
| --- | --- |
| Ver la jornada de su ámbito | Sí |
| Descargarla en CSV | Sí |
| Ver quién ha consultado, incluido él | Sí |
| Proponer una corrección | **No** |
| Ver datos personales que no sean el nombre | **No** |
| Ver otra plantilla, u otro centro fuera de su ámbito | **No** |
| Ver algo anterior a su mandato | **No** |
| Ver algo de hace más de cuatro años | **No** |

**No propone correcciones** a propósito. Quien puede pedir que se cambie una
hora es la persona a la que se le apuntó y la empresa. Que un tercero reescriba
la jornada de otro no es representación, es otra cosa.

## Lo que no se guarda de nadie

**No hay campo de sindicato, ni de afiliación, ni de sección sindical.** La
afiliación sindical es una categoría especial de datos —artículo 9.1 del RGPD— y
guardarla exigiría una base de licitud y unas garantías que no tenemos, para una
función que no la necesita: para dar acceso al registro basta con saber que esta
persona representa a esta plantilla y hasta cuándo.

Que un campo sea fácil de añadir no es razón para añadirlo. Un dato que no está
no se filtra, no se pierde y no hay que justificarlo ante nadie. Hay una prueba
que recorre las columnas de la tabla y falla si alguna vez aparece.

## Las cuatro fronteras, y dónde están

Ninguna es un `if` posterior a la consulta. Las cuatro van dentro del `where` de
la misma sentencia que trae los datos, porque entre una consulta y una
comprobación siempre acaba colándose alguien.

1. **La empresa.** Sale de la identidad de la sesión, nunca del formulario.
2. **El ámbito.** Toda la plantilla, o un centro. Si es de un centro, el resto
   de la plantilla no existe para él: ni en la lista, ni pidiéndolo por URL.
3. **La vigencia.** El mandato empieza, puede acabar y se puede revocar. Se
   comprueba **en cada petición**, no solo al entrar: una sesión de ocho horas
   abierta a las nueve sobreviviría a una revocación de las diez.
4. **La retención.** Cuatro años hacia atrás como mucho, y nunca antes del
   inicio de su mandato. Conservar y exhibir no son lo mismo.

## El solo-lectura lo garantiza PostgreSQL

El portal corre con un usuario de base de datos propio, `fichaje_portal`, que
sobre `anotacion` tiene `SELECT` y nada más. Puede escribir en tres tablas
suyas —su sesión, sus intentos de acceso y el registro de consultas— y en
ninguna otra.

Esto importa más de lo que parece. «Es de solo lectura» dicho de un código es
una promesa que dura hasta el siguiente cambio. Dicho de un permiso que no
existe, es una propiedad: si mañana alguien añade aquí un formulario para
corregir una hora, no funciona.

## Cómo se sabe que esto funciona

Hay 127 comprobaciones en `pruebas_representantes.py`. Pero pasar no demuestra
gran cosa: unas pruebas que no prueban nada también pasan. Así que se rompieron
diez defensas a propósito, de una en una, para ver si las pruebas se enteraban.

Las cuatro primeras veces, **dos de cada cuatro sabotajes pasaron
inadvertidos**. El motivo era el mismo en los dos casos: había dos capas
haciendo lo mismo por caminos distintos, y con una rota la otra tapaba el
agujero. Las pruebas demostraban «al menos una de las dos funciona», que no es
lo que hacía falta saber. Se añadieron pruebas que miden cada capa por separado,
y ahora los diez sabotajes se detectan.

Uno de ellos destapó además un fallo real: cuando la segunda capa actuaba, lo
hacía con un error interno y una traza en pantalla en vez de mandar a la puerta.
Fallaba cerrado, que es lo importante, pero de una forma pésima delante de
alguien que solo quería mirar sus horas.

## Lo que sigue sin estar

- **Nadie confirma desde el lado de la plantilla** que quien se da de alta sea
  de verdad su representante. El alta la hace la gestoría, queda apuntada con
  nombre, y ahí acaba la garantía.
- **El portal enseña la jornada, no el expediente firmado.** Lo que se descarga
  es un CSV de un periodo, y un CSV de un periodo no se puede verificar contra
  la cadena: para verificar hace falta el libro entero. Se dice así en su sitio
  y no se le llama expediente auditable, porque no lo es.
