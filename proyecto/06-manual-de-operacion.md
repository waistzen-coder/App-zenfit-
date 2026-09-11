# Manual de operación

Comandos copiables. No hace falta entender el código para seguirlos.

Todos se ejecutan desde la carpeta del proyecto. Los que llevan `<algo>` son los
que hay que rellenar con lo que ha devuelto el comando anterior.

---

## Lo que hace falta la primera vez

```bash
pip install psycopg[binary] yoyo-migrations flask segno
```

Dos variables de entorno. La contraseña la eliges tú y **no se guarda en el
repositorio**:

```bash
export FICHAJE_DSN='postgresql://usuario@servidor:5432/fichaje'
export FICHAJE_APP_PASSWORD='una-contraseña-larga-y-tuya'
export FICHAJE_PORTAL_PASSWORD='otra-distinta-para-el-portal'
export FICHAJE_SECRETO="$(python3 -c 'import secrets;print(secrets.token_hex(32))')"
export FICHAJE_PANEL_SECRETO="$(python3 -c 'import secrets;print(secrets.token_hex(32))')"
export FICHAJE_PORTAL_SECRETO="$(python3 -c 'import secrets;print(secrets.token_hex(32))')"
export FICHAJE_URL='https://tu-dominio'      # lo que se codifica en el QR
export FICHAJE_HTTPS=1                        # solo en producción
```

Son tres secretos distintos y tres contraseñas porque son **tres aplicaciones
distintas**: el fichaje, el panel y el portal de la representación. Compartir
una cookie o una clave entre ellas haría que una sesión de una valiera en otra,
que es justo lo que no puede pasar.

Preparar la base de datos:

```bash
python3 -m fichaje.migrar        # crea o actualiza las tablas
python3 -m fichaje.despliegue    # crea los dos usuarios limitados
```

`despliegue` crea dos usuarios de base de datos: `fichaje_app`, que puede leer y
añadir anotaciones pero nunca modificarlas ni borrarlas, y `fichaje_portal`,
que sobre el libro **solo puede leer**. El portal corre con el segundo, así que
si algún día apareciera un fallo que intentara escribir desde ahí, PostgreSQL lo
rechaza; no hay que confiar en que el código no lo intente.

`migrar` se puede repetir las veces que haga falta: aplica solo lo que falte.

## Dar de alta una empresa

```bash
python3 -m fichaje.admin empresa "Bar Casa Paco"
# devuelve el identificador de la empresa
```

## Dar de alta un centro de trabajo

```bash
python3 -m fichaje.admin centro <empresa> "Local de la playa" Europe/Madrid
# devuelve el identificador del centro y la dirección del QR
```

La zona horaria importa: en Canarias es `Atlantic/Canary`. **Nunca pongas un
desfase tipo `UTC+1`**: cambia dos veces al año y el programa lo rechaza.

## Dar de alta a una persona y ponerle su PIN

```bash
python3 -m fichaje.admin trabajador <empresa> "Lucía García" 1042
# devuelve el identificador de la persona

python3 -m fichaje.admin pin <trabajador> 482913
```

El **código** (1042) no es secreto: es como se identifica. El **PIN** sí, y
tiene que ser de seis cifras o más. Nadie puede recuperarlo, ni tú: si se
olvida, se le pone uno nuevo con el mismo comando.

## Imprimir el cartel del QR

```bash
python3 -m fichaje.admin qr <centro> cartel.svg
```

Sale un SVG con el QR, «Escanea para fichar» y el nombre del centro. Se imprime
y se pega en la pared. No lleva ningún dato personal.

## Si alguien fotografía el cartel y lo publica

```bash
python3 -m fichaje.admin rotar-qr <centro>
python3 -m fichaje.admin qr <centro> cartel-nuevo.svg
```

El enlace anterior deja de funcionar en el acto. Los fichajes ya registrados no
se tocan.

## Cuando alguien deja la empresa

```bash
python3 -m fichaje.admin baja <trabajador>
```

Deja de poder fichar inmediatamente, incluso si tenía la sesión abierta en el
móvil. Sus fichajes anteriores siguen en el libro: no se borran nunca. Para
readmitir a alguien, `alta` en vez de `baja`.

## Si alguien se ha quedado bloqueado por fallar el PIN

Se desbloquea solo al cuarto de hora. Si hay prisa:

```bash
python3 -m fichaje.admin desbloquear <centro> 1042
```

## Arrancar la web

```bash
python3 -m fichaje.web           # escucha en el puerto 5000
```

En producción, detrás de un servidor con HTTPS y con `FICHAJE_HTTPS=1`, para que
la cookie de sesión viaje cifrada.

## Comprobar que todo está bien

```bash
python3 -m fichaje.pruebas                   # el registro de jornada
python3 -m fichaje.pruebas_postgres          # la base de datos
python3 -m fichaje.pruebas_web               # el fichaje desde el móvil
python3 -m fichaje.pruebas_panel             # el panel y su aislamiento
python3 -m fichaje.pruebas_correcciones      # las correcciones de hora
python3 -m fichaje.pruebas_exportacion       # el expediente y su verificador
python3 -m fichaje.pruebas_representantes    # el portal de la representación
python3 -m fichaje.pruebas_retencion         # los cuatro años
python3 -m fichaje.pruebas_extremo_a_extremo # los tres contextos, de punta a punta
python3 -m fichaje.pruebas_sellos            # el recorte del libro
python3 -m fichaje.pruebas_lenguaje          # lo que afirmamos sobre la ley
python3 -m fichaje.copia comprobar           # copia, restauración y cadena
```

Todas menos las dos últimas **borran y recrean sus tablas**: no las apuntes
nunca a la base de datos de un cliente.

Las mismas se ejecutan solas en GitHub Actions con cada subida, sobre una
máquina limpia y una base recién creada. Que pasen aquí no dice gran cosa; que
pasen allí, sí.

## Si la base de datos está en este ordenador y no arranca

```bash
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl \
  -D /var/lib/postgresql/fichaje-test \
  -o '-c listen_addresses=127.0.0.1 -p 5433' start"
```

## Lo que NO se puede hacer, y es a propósito

- **Borrar un fichaje.** No hay comando y no lo va a haber: el libro solo admite
  añadir. Una corrección es una anotación nueva que necesita el acuerdo de la
  empresa y de la persona.
- **Cambiar la hora de un fichaje a mano.** Lo mismo.
- **Ver el PIN de alguien.** No se guarda: solo se guarda algo derivado de él,
  del que no se puede volver atrás. Se pone uno nuevo y ya está.

---

# El panel de la gestoría

Desde aquí una asesoría lleva sus empresas cliente sin que nosotros toquemos la
base de datos.

## Crear la primera gestoría y su administrador

Esto se hace una vez por cliente nuevo, desde el terminal, porque todavía no hay
alta comercial automática:

```bash
python3 -m fichaje.admin gestoria "Asesoría Pérez"
# devuelve el identificador de la gestoría

python3 -m fichaje.admin usuario <gestoria> ana@asesoria.es "Ana Pérez" admin
# pide la contraseña por teclado, dos veces
```

La contraseña **se teclea, no se pasa como argumento**: un argumento queda en el
historial del terminal y en la lista de procesos, donde lo ve cualquiera que
esté en la misma máquina. Mínimo doce caracteres; una frase que recuerdes vale
más que un símbolo raro.

El último argumento es el permiso: `admin` para quien manda, cualquier otra cosa
para uso diario.

## Arrancar el panel

```bash
python3 -m fichaje.panel        # escucha en el puerto 5001
```

Es una aplicación **distinta** de la del fichaje, y va en otro puerto a
propósito. Necesita su propia clave:

```bash
export FICHAJE_PANEL_SECRETO="$(python3 -c 'import secrets;print(secrets.token_hex(32))')"
```

## Lo que ya puede hacer la gestoría sola, sin ti

Entrando en `/panel/entrar` con su correo y contraseña:

- **Dar de alta empresas cliente** y renombrarlas.
- **Crear centros de trabajo** con su zona horaria.
- **Descargar el cartel del QR** de cada centro, e imprimirlo.
- **Rotar el QR** si alguien fotografía el cartel.
- **Dar de alta personas**, con su código y su PIN inicial.
- **Resetear un PIN** cuando a alguien se le olvide.
- **Dar de baja** a quien se va.
- **Ver quién está trabajando ahora**, la jornada de cualquier día y las
  incidencias.
- **Crear más usuarios** del panel, y desactivarlos.

## Comprobar la integridad de los libros

Verificar una cadena es recorrerla entera, así que **no se hace al abrir una
página**: se ejecuta una vez al día, y el panel enseña el último resultado con
su fecha.

```bash
python3 -m fichaje.admin verificar
```

Conviene dejarlo en una tarea programada nocturna, junto al sellado y la copia.
**La tarea nocturna entera, los tres comandos en orden:**

```bash
python3 -m fichaje.admin verificar   # ¿cuadra cada cadena?
python3 -m fichaje.sello sellar      # deja constancia de cuántas hay hoy
python3 -m fichaje.copia comprobar   # copia, restaura y vuelve a verificar
```

El orden importa poco salvo en una cosa: sellar después de verificar evita
sellar un libro que ya sabes que está roto. Si alguna empresa sale mal,
aparece en rojo en el resumen de su gestoría y en su ficha.

**No hay ningún botón de reparar, y no lo va a haber.** Un libro que no cuadra
es un incidente que hay que mirar, no algo que se arregla recalculando las
huellas: recalcularlas sería precisamente borrar la prueba.

## Sellar los libros, y por qué hace falta

La cadena de huellas detecta que alguien **cambie** una anotación. No detecta
que alguien **borre las últimas**, porque un trozo del principio de una cadena
válida también es una cadena válida. Y ese es justo el borrado que interesaría a
quien quiere esconder horas extra: las de ayer, no las del año pasado.

Un sello es una fila que dice «el día tal este libro tenía N anotaciones y la
última era la X». Si mañana hay menos, se ve.

```bash
python3 -m fichaje.sello sellar      # una vez al día
python3 -m fichaje.sello comprobar   # ¿siguen cuadrando?
```

Los sellos van dentro del expediente, así que un recorte se ve también con el
ZIP en la mano, sin acceso a la base de datos.

**Lo que esto no es:** un anclaje externo. Los sellos los generamos nosotros.
Quien tenga la base entera puede recortar el libro y recortar los sellos: son
dos tablas y dos disparadores en vez de uno, más caro y más ruidoso, pero no
imposible. Publicar la huella donde no mandemos nosotros sigue pendiente.

## Ver las horas del mes

Desde el panel, en la ficha de la empresa: **Horas del mes**. Salen las horas
por persona y mes, con las correcciones acordadas ya aplicadas, y son
exactamente las mismas que van en el expediente: las calcula el mismo código.

## Si alguien de la gestoría se queda fuera

Se desbloquea solo al cuarto de hora. Para cambiarle la contraseña:

```bash
python3 -m fichaje.admin contrasena <usuario>
```

## Lo que el panel NO puede hacer, y es a propósito

- **Cambiar la hora de un fichaje.** No hay ruta, ni formulario, ni comando.
- **Borrar un fichaje o una jornada.** Lo mismo.
- **Ver el PIN de nadie.** No se guarda.
- **Ver nada de otra gestoría.** Un identificador ajeno responde «no
  encontrado», sin confirmar siquiera que exista.

Las equivocaciones en los fichajes se corrigen añadiendo hechos nuevos con el
acuerdo de la empresa y de la persona. Es lo que contempla el proyecto de real
decreto, que **todavía no está en vigor**: ver
[`08-estado-normativo.md`](08-estado-normativo.md).

---

# El portal de la representación de la plantilla

El tercer sitio donde se entra, y el único que **solo lee**.

## Por qué existe, dicho sin exagerar

Lo que el artículo 34.9 obliga es a que el registro esté **disponible** para la
persona trabajadora, para quien la representa y para la Inspección. No dice
cómo: entregar una copia legible cuando se pide ya lo cumple, y eso se podía
hacer desde el primer día con **Exportar registro**.

Esto no se construyó porque la ley lo exija. Se construyó porque el camino
manual no deja constancia: si un día se discute si la empresa facilitó el
registro, «se lo dimos» sin rastro vale poco, y quien lo pidió tampoco puede
demostrar que lo pidió. Aquí las dos partes ven el mismo apunte.

## Arrancarlo

```bash
python3 -m fichaje.portal        # escucha en el puerto 5002
```

Tercera aplicación, tercer puerto, tercera cookie. Y corre con
`fichaje_portal`, el usuario de base de datos que sobre el libro solo tiene
lectura.

## Dar acceso a alguien

Lo hace la gestoría desde el panel: ficha de la empresa → **Representación** →
*Dar acceso*. Hacen falta nombre, correo, contraseña y el ámbito —toda la
plantilla o un centro concreto—, y opcionalmente la fecha en que termina el
mandato.

**Si no se pone fecha de fin, el acceso dura hasta que se revoque a mano.**
Ponerla es lo sensato: un representante que dejó de serlo hace dos años y sigue
entrando es una fuga de datos con la puerta abierta desde dentro.

Solo puede darlo quien tenga permiso de administración en la gestoría, y queda
apuntado con su nombre. El día que alguien pregunte por qué esa persona veía la
jornada de una plantilla, la respuesta tiene nombre.

## Quitarlo

Mismo sitio, botón **Revocar**. El acceso se corta en el acto, incluso si tenía
la sesión abierta.

## Qué ve, y qué no

Ve las horas de su ámbito, con las correcciones acordadas ya aplicadas, y se las
puede descargar en CSV. Ve también quién ha consultado el registro, incluido él.

No ve otra plantilla, ni otro centro fuera de su ámbito, ni nada anterior al
inicio de su mandato, ni nada de hace más de cuatro años. No ve correos,
teléfonos ni PIN de nadie: nombre y horas.

Y **no puede cambiar nada**. No hay formulario para corregir una hora ni para
proponerla, porque quien puede pedir que se cambie una hora es la persona a la
que se le apuntó y la empresa.

## Lo que NO se guarda de nadie

**No hay campo de sindicato, ni de afiliación, ni de sección sindical**, y no es
un olvido. Es categoría especial de datos y para dar acceso al registro no hace
falta. Hay una prueba que recorre las columnas de la tabla y falla si alguna vez
aparece.

## Lo que la plantilla ve de todo esto

Cada persona, en **Mis registros** desde su móvil, ve quién puede consultar sus
horas y hasta cuándo, con el aviso de que si ahí aparece alguien que no
representa a su plantilla lo diga.

Eso no es confirmación: nadie del lado de los trabajadores da el visto bueno
para que el acceso exista. Lo que cambia es que un acceso silencioso pasa a ser
uno que se puede ver y discutir. La confirmación de verdad sigue pendiente y
está escrita como el riesgo número uno en
[`10-pre-mortem.md`](10-pre-mortem.md).

## Descargar el CSV del portal no es el expediente

Son cosas distintas y conviene no confundirlas al hablar con un cliente:

| | |
| --- | --- |
| **CSV del portal** | Las horas de un periodo. Cómodo de leer. **No se puede verificar contra la cadena**, porque para eso hace falta el libro entero |
| **Expediente** (`Exportar registro`) | El libro completo, con sus huellas y sus sellos. Se comprueba sin base de datos y sin nosotros |

---

# El expediente auditable

Cuando alguien pida el registro de una empresa —la propia empresa, un abogado,
un inspector— se le da esto.

## Generarlo

Desde el panel, en la ficha de la empresa: **Exportar registro**. Sale un ZIP.

## Qué lleva dentro

| | |
| --- | --- |
| `registro.csv` | Los fichajes, con la hora original y la vigente. Se abre en Excel |
| `correcciones.csv` | Cada cambio pedido: motivo, quién lo pidió, qué contestaron |
| `totales-mensuales.csv` | Horas por persona y mes, ya con las correcciones aplicadas |
| `libro.jsonl` | El libro tal como se firmó, para poder comprobarlo |
| `sellos.jsonl` | Los sellos: cuántas anotaciones había cada día. Detecta recortes |
| `manifest.json` | Qué hay dentro y la huella de cada archivo |
| `LEEME.txt` | Qué significa todo, y qué **no** demuestra |

## Comprobarlo

```bash
python3 -m fichaje.verificar_exportacion expediente.zip
```

**No necesita base de datos, ni conexión, ni acceso a la aplicación.** Ese es el
punto: cualquiera puede comprobarlo por su cuenta, sin fiarse de nosotros.

Si alguien ha cambiado una hora, un motivo o una huella, si falta una línea o si
están desordenadas, el comando lo dice y señala dónde.

## Lo que hay que decir al entregarlo, y lo que no

**Se puede decir:** que el registro no se ha modificado por dentro desde que se
escribió, que cualquiera puede comprobarlo con el comando de arriba, y que cada
corrección conserva quién la pidió, por qué y qué contestó la otra parte.

**No se puede decir:** que sea un formato oficial de la Inspección —no existe
ninguno publicado—, que sea inalterable, ni que cumpla ninguna norma. Eso último
lo dice un inspector o un juez, no nosotros.

## Lo que se descarga el trabajador

Desde su móvil, en **Mis registros → Descargar mis registros**: sus jornadas en
CSV. Solo las suyas, nunca las de un compañero.
