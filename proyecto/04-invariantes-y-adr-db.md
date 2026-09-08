# Invariantes del libro y elección de base de datos

Fases 0, 1 y 2. Todo lo de aquí está extraído del código real de
`fichaje/registro.py` y `fichaje/jornada.py`, no de lo que se recordaba.

---

## Invariantes del libro

Cada una con el sitio del código que la sostiene. Si un día una implementación
con base de datos rompe cualquiera de estas, ha cambiado el dominio.

**INV-001 · Solo se añade.** `Libro` no expone ningún método que borre o
modifique. Todo pasa por `_anadir`, y `Anotacion` es un dataclass congelado.

**INV-002 · Numeración densa desde 1.** `numero = len(anotaciones) + 1`, y
`verificar()` exige que la anotación en la posición *n* diga ser la *n*. No
puede haber huecos ni saltos.

**INV-003 · Cada anotación cuelga de la anterior.** `huella_anterior` de la
anotación *n* es la `huella` de la *n−1*. La primera cuelga de `ORIGEN`, 64
ceros.

**INV-004 · La huella es SHA-256 de un JSON canónico.** Claves ordenadas, sin
espacios, `ensure_ascii=False`, todos los campos menos `huella`, los enums por
su `.value` y las fechas en ISO-8601. Cambiar un nombre de campo o el formato de
fecha invalida todos los libros existentes: eso es una migración, no un retoque.

**INV-005 · Un libro no vale en otra empresa.** `empresa` entra en la huella y
`verificar()` comprueba que toda anotación pertenece al libro donde está.

**INV-006 · No se registra el futuro.** `momento <= anotado_en`, comprobado al
escribir y al verificar.

**INV-007 · El libro no retrocede.** `anotado_en` nunca es menor que el de la
anotación anterior. Comprobado al escribir y al verificar.

**INV-008 · La retroactividad es derivada, no almacenada.** Un fichaje es
retroactivo si `anotado_en − momento > 5 minutos`. No se guarda: se calcula.

**INV-009 · Corregir son tres actos.** Propuesta (con motivo no vacío, sobre un
fichaje y nunca sobre otra corrección) → aceptada o rechazada por la parte
contraria, una sola vez.

**INV-010 · Solo una corrección aceptada cambia la hora.** Si hubo varias sobre
el mismo fichaje, manda la última del libro. Las demás siguen ahí.

**INV-011 · Las horas no se guardan.** Se deducen de las anotaciones vigentes.
No hay ningún total almacenado que pueda desincronizarse.

**INV-012 · Los tipos son cerrados.** Fichajes: `entrada`, `salida`,
`pausa_inicio`, `pausa_fin`. Correcciones: `correccion_propuesta`,
`correccion_aceptada`, `correccion_rechazada`.

**INV-013 · La identidad es texto libre.** `empresa: str` y `trabajador: str`.
No existe entidad de empresa, ni de trabajador, ni de centro de trabajo.

## Riesgos encontrados

**R-01 · La identidad es una cadena de texto.** «Lucía» y «lucia» son dos
personas distintas para el libro. No hay trabajadores dados de alta, ni activos
ni inactivos, ni PIN, ni forma de saber si alguien sigue en la empresa. La web
necesita identidades de verdad, y eso es un cambio de dominio que hay que
decidir a conciencia. **Bloquea la fase web.**

**R-02 · No existe el centro de trabajo**, que es justo lo que el QR tiene que
identificar. **Bloquea la fase web.**

**R-03 · Las fechas no llevan zona horaria.** Son `datetime` naive. Con el
cambio de hora de octubre y marzo, y con un servidor en UTC, esto da problemas
reales. La propia lista de pruebas pide un caso de cambio de hora: hoy no se
puede escribir. **Bloquea la fase web**, porque la hora la pone el servidor.

**R-04 · `Libro.anotaciones` es una lista pública y mutable.** Cualquiera puede
hacer `libro.anotaciones.append(...)` y saltarse todas las validaciones.
`verificar()` lo detecta después, pero nada lo impide antes. Con base de datos
esto empeora: la lista deja de ser la única puerta.

**R-05 · Nada persiste.** Todo vive en memoria y muere con el proceso.

**R-06 · `momento_vigente()` sigue recorriendo el libro entero** en cada
llamada. Está documentado y `jornadas_de` usa la versión de una pasada, pero es
una trampa esperando a quien lo llame dentro de un bucle.

---

# ADR-DB-001 · PostgreSQL gestionado

## Contexto

Hay que persistir un libro append-only encadenado por huellas, con un orden
total por empresa. El volumen es pequeño: veinte personas fichando cuatro veces
al día son ochenta filas diarias por empresa. En el pico de las 08:00, cinco mil
trabajadores repartidos en diez minutos son unas ocho escrituras por segundo.

Lo que no es pequeño es la consecuencia de perder los datos: son registros que
la ley obliga a conservar y a enseñar a un inspector, y el fundador trabaja solo
y no es técnico.

## Opciones

**SQLite.** Un fichero, cero servicios, ACID de verdad, y en modo WAL aguanta de
sobra estas cifras. Su famosa limitación —un solo escritor a la vez— es aquí una
ventaja: da el orden total gratis. `BEGIN IMMEDIATE` reserva el bloqueo de
escritura al empezar la transacción, `PRAGMA synchronous=FULL` asegura cada
commit y `VACUUM INTO` hace copias en caliente.

**PostgreSQL gestionado.** Un servicio más, pero con copias automáticas y
recuperación a un punto en el tiempo sin que nadie tenga que acordarse de nada.
El orden total por empresa se consigue con `pg_advisory_xact_lock()` sobre la
empresa dentro de la transacción, más un `UNIQUE (empresa, numero)` como red de
seguridad: si dos escrituras se cuelan a la vez, la segunda choca contra la
restricción y reintenta.

## Decisión

**PostgreSQL gestionado.**

## Por qué

No por rendimiento. **Por volumen, SQLite sobra**, y conviene decirlo claro para
no engañarse: aquí no se compra velocidad.

Se compra durabilidad y operación. Estos datos son obligatorios por ley durante
años, y perderlos no es una incidencia: es el fin del negocio y un problema
legal para el cliente. Con SQLite, esa durabilidad depende de que una persona
que no es técnica ejecute y verifique copias de seguridad. Con un Postgres
gestionado, las copias y la recuperación a un punto en el tiempo vienen dadas y
no dependen de que nadie se acuerde.

El segundo motivo es el despliegue: SQLite obliga a un disco persistente y a un
único proceso escritor, lo que descarta buena parte del alojamiento barato.
Postgres gestionado está disponible en cualquier sitio, con capa gratuita para
empezar.

## Lo que aceptamos a cambio

- Un servicio más que puede caerse, y una dependencia de driver.
- Latencia de red en cada escritura: milisegundos, irrelevante a ocho por
  segundo.
- Para desarrollar en local hace falta un Postgres levantado. Las pruebas del
  núcleo siguen sin dependencias; solo las de persistencia lo necesitarán.
- Las capas gratuitas pueden pausar la base de datos o caducar. Antes del primer
  cliente de pago hay que estar en un plan que no lo haga.

## Camino de migración

El dominio no habla SQL. Entre el dominio y la base de datos va una frontera con
dos implementaciones: la actual en memoria, que se queda como referencia, y la
de Postgres. `fichaje/caracterizacion.py` construye siempre el mismo libro y
fija sus valores observables, huella final incluida, así que la implementación
con base de datos tendrá que reproducirlos clavados o las pruebas se rompen.

Si algún día Postgres estorba, esa misma frontera permite volver a SQLite sin
tocar el núcleo.

## Lo que esta decisión NO afirma

Que el registro sea inalterable en sentido absoluto. Lo que hay es: una
aplicación que no ofrece forma de modificar el pasado, una cadena criptográfica
que **detecta** la alteración, y restricciones de base de datos que la dificultan.
Quien controle a la vez la aplicación, la base de datos y el proceso de
escritura puede reescribir el libro entero y volver a encadenarlo. Eso se
mitiga con copias externas y sellado periódico, no con la cadena por sí sola, y
no se va a prometer lo contrario a ningún cliente.
