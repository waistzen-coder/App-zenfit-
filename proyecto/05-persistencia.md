# El libro en PostgreSQL

Cómo se guarda el registro de jornada, qué lo protege y qué **no** lo protege.
Esta última parte es la importante: prometer inalterabilidad absoluta es fácil y
es mentira.

---

## La representación que se firma · versión 2

Lo que entra en la huella SHA-256, en este orden exacto, como array JSON sin
espacios y sin escapar acentos:

    versión · empresa_id · centro_id · trabajador_id · número · tipo ·
    momento (UTC) · anotado_en (UTC) · zona_horaria · autor_id · parte ·
    origen · motivo · corrige · momento_propuesto (UTC) · huella_anterior

Tres decisiones y su motivo:

**La lista está escrita a mano.** Derivarla de los atributos de la clase hacía
que añadir un campo cambiase la huella sin que nadie lo decidiera. Ahora tocar la
firma obliga a editar esa lista y a subir la versión.

**La versión va la primera.** Así dos versiones no pueden producir jamás los
mismos bytes, ni por casualidad.

**Se firman identificadores, no nombres.** Los nombres se corrigen —una errata,
un apellido, una razón social— y si formaran parte de la firma, corregirlos
invalidaría el libro entero.

### Versionado

`VERSION_ACTUAL = 2`. Una anotación con otra versión no se recalcula: el
verificador la marca como no comprobable y dice cuál es. La versión 1 se retiró
antes de que existiera ningún dato persistido, así que no hay nada que
verificar con ella y no se ha escrito un verificador que nadie usaría. Cuando
llegue una versión 3, las anotaciones nacidas en la 2 se seguirán verificando
con las reglas de la 2. **Nunca se recalcula la historia para que encaje.**

## El esquema

Cuatro tablas: `empresa`, `centro`, `trabajador` y `anotacion`. Los nombres
viven en las tres primeras y se pueden editar; la cuarta solo guarda
identificadores.

Restricciones que impiden estados imposibles antes de que Python opine:

| Restricción | Qué impide |
| ----------- | ---------- |
| `primary key (empresa_id, numero)` | Dos anotaciones con el mismo número |
| `unique (empresa_id, huella_anterior)` | **Una bifurcación de la cadena** |
| `unique (huella)` | Dos anotaciones idénticas |
| `check (momento <= anotado_en)` | Registrar el futuro |
| `check (numero >= 1)` | Numeración fuera de rango |
| `check (tipo in …)` · `check (parte in …)` | Valores inventados |
| `check` sobre `corrige` | Que un fichaje diga corregir algo |

La de la bifurcación es la más importante: hace que dos anotaciones no puedan
decir que cuelgan de la misma, así que una rama de la cadena **no se puede
escribir**, la pida quien la pida y se salte lo que se salte.

## Escribir sin romper la cadena

Leer la última anotación y escribir la siguiente tiene que ser indivisible: si
dos fichajes leyeran la misma «última», los dos construirían la número siguiente
y uno sobraría.

**Qué se bloquea:** una empresa, con `pg_advisory_xact_lock(hashtext(empresa_id))`.
**Cuánto:** lo que dura la transacción; se suelta solo, incluso si el proceso
muere.
**Por qué ese y no otro:** no toca la tabla, no deja filas bloqueadas y no
necesita una fila contador que mantener.
**Dos empresas distintas:** no se esperan. `hashtext` devuelve un entero de 32
bits, así que dos empresas pueden coincidir en la misma clave; cuando ocurre,
una espera unos milisegundos a la otra. Es una molestia rarísima, no un error.

Medido: **cien fichajes simultáneos sobre la misma empresa dan cien números
consecutivos, cien huellas distintas, ninguna bifurcación y cadena válida**, en
poco más de medio segundo.

## Prevención, detección y límites

Tres cosas distintas que conviene no confundir nunca al hablar con un cliente.

### Lo que se PREVIENE

- La aplicación no ofrece ninguna forma de modificar el pasado. Corregir es
  añadir.
- El rol de la aplicación tiene `SELECT` e `INSERT` sobre las anotaciones y nada
  más. Un `UPDATE` desde el código falla por permisos.
- Un disparador rechaza `UPDATE` y `DELETE` sobre `anotacion` aunque los intente
  el dueño de la tabla.
- Las restricciones de arriba impiden escribir estados imposibles.

### Lo que se DETECTA

Manipulando la base directamente, con el disparador desactivado —lo que haría
quien tiene acceso de administrador— el verificador caza **las diez**:

cambiar el trabajador · cambiar la hora · cambiar el tipo · cambiar el centro ·
cambiar la zona horaria · cambiar la versión · cambiar la huella anterior ·
cambiar la huella propia · borrar una anotación del medio · reordenar

### Lo que NO se detecta, y hay que decirlo

**Cortar el libro por el final.** Si alguien con acceso total borra las últimas
anotaciones, lo que queda es una cadena impecable: cada eslabón engancha con el
anterior y **dentro del libro no hay nada que diga cuántos eslabones debería
haber**. Está probado y escrito como tal.

**Reescribir el libro entero.** Quien controle a la vez la aplicación, la base
de datos y el proceso de escritura puede rehacer todas las anotaciones y volver
a encadenarlas. La cadena es coherente otra vez y nadie lo nota desde dentro.

Las dos se cierran solo desde fuera, y las dos son **endurecimiento futuro**, no
implementado hoy: guardar periódicamente en otro sitio la última huella y el
número de anotaciones de cada empresa. Con ese ancla, cortar por el final y
reescribir la historia dejan de colar. No se ha hecho todavía porque el dominio
actual no lo exige, pero **no se va a prometer a ningún cliente una
inalterabilidad que hoy no tenemos**.

## Copia y restauración

Una copia que no se ha restaurado nunca no es una copia. Por eso el
procedimiento no se documenta: se ejecuta.

    python3 -m fichaje.copia comprobar

Vuelca con `pg_dump -Fc`, tira la base de destino, la vuelve a crear, restaura
con `pg_restore` y **vuelve a verificar la cadena** de cada empresa, comparando
huella a huella con el original. Si el libro restaurado no verifica, la copia no
vale por muy bien que se haya generado.

Probado: 17 anotaciones, copia de 11 KB, cadena válida y huellas idénticas tras
la restauración.

En producción las copias las hace el proveedor gestionado, con recuperación a un
punto en el tiempo. Lo que el proveedor no hace es comprobar que lo restaurado
sigue siendo un libro válido. Eso es nuestro.

## Rendimiento medido

Sobre PostgreSQL 16 local, 1.000 anotaciones:

| Operación | Tiempo |
| --------- | ------ |
| Escribir un fichaje | **1,3 ms** |
| Leer el libro entero | 10 ms |
| Verificar la cadena entera | 13 ms |
| Calcular la nómina de una persona | < 1 ms |
| 100 fichajes concurrentes | 0,66 s |

A ocho fichajes por segundo en el pico de las ocho de la mañana, sobra.
