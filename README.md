# Fichaje digital para microempresas españolas

Un QR pegado en la pared, el trabajador lo escanea con su móvil, se identifica y
ficha. Sin instalar ninguna aplicación. Y detrás, un registro al que solo se
puede añadir, encadenado criptográficamente, que se puede poner delante de un
inspector.

La gestoría lleva sus empresas cliente desde un panel aparte, sin que nadie
toque la base de datos.

---

## Por qué existe

El artículo 34.9 del Estatuto de los Trabajadores obliga desde 2019 a registrar
la jornada diaria con el horario concreto de inicio y final, a conservarlo
cuatro años y a tenerlo disponible para la persona trabajadora, sus
representantes y la Inspección de Trabajo.

Hay además un proyecto de real decreto que endurecería los requisitos técnicos.
**No está en vigor.** Lo que este producto afirma y lo que no, con las fechas y
las fuentes, está en [`proyecto/08-estado-normativo.md`](proyecto/08-estado-normativo.md).

## Cómo está montado

    fichaje/
      registro.py        el libro: solo se añade, encadenado con SHA-256
      jornada.py         las horas, deducidas de los hechos del libro
      organizacion.py    empresa, centro de trabajo y persona
      credenciales.py    PIN y contraseñas (scrypt)
      postgres.py        cómo se guarda sin que la cadena se bifurque
      gestoria.py        la frontera entre gestorías, y quién puede qué
      web.py             el fichaje desde el móvil, con QR
      panel.py           el panel de la gestoría
      admin.py           administración por línea de comandos
      migrar.py          aplicar las migraciones
      despliegue.py      el usuario restringido de la base de datos
      copia.py           copia de seguridad, y su restauración comprobada
      caracterizacion.py el libro canónico, vara de medir de todo
      pruebas*.py        las suites

    migraciones/         la forma de la base de datos, un fichero por cambio
    proyecto/            por qué está hecho como está, y qué se descartó

## Para empezar

    pip install "psycopg[binary]" yoyo-migrations flask segno

    export FICHAJE_DSN='postgresql://usuario@servidor:5432/fichaje'
    export FICHAJE_APP_PASSWORD='una-contraseña-larga-y-tuya'
    export FICHAJE_SECRETO="$(python3 -c 'import secrets;print(secrets.token_hex(32))')"
    export FICHAJE_PANEL_SECRETO="$(python3 -c 'import secrets;print(secrets.token_hex(32))')"

    python3 -m fichaje.migrar        # crea o actualiza las tablas
    python3 -m fichaje.despliegue    # crea el usuario limitado de la aplicación

## Arrancar

    python3 -m fichaje.web      # el fichaje del trabajador, puerto 5000
    python3 -m fichaje.panel    # el panel de la gestoría, puerto 5001

Son dos aplicaciones separadas a propósito: si compartieran sesión, un
trabajador con el móvil en la mano estaría a un enlace de la administración de
su empresa.

## Las pruebas

    python3 -m fichaje.pruebas             # el dominio, sin base de datos
    python3 -m motor.pruebas               # el motor de morosidad (otro módulo)
    python3 -m fichaje.pruebas_postgres    # persistencia, concurrencia, manipulación
    python3 -m fichaje.pruebas_web         # el fichaje desde el móvil
    python3 -m fichaje.pruebas_panel       # el panel y su aislamiento entre gestorías
    python3 -m fichaje.copia comprobar     # copia, restauración y cadena

Las que tocan PostgreSQL **borran y recrean sus tablas**: no apuntarlas nunca a
la base de datos de un cliente.

### PostgreSQL para desarrollo

    su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl \
      -D /var/lib/postgresql/fichaje-test \
      -o '-c listen_addresses=127.0.0.1 -p 5433' start"

## Documentación

En [`proyecto/`](proyecto/), en orden de lectura:

| | |
| --- | --- |
| [`08-estado-normativo.md`](proyecto/08-estado-normativo.md) | **Qué está en vigor y qué es solo un proyecto** |
| [`02-decision-fichaje.md`](proyecto/02-decision-fichaje.md) | Por qué este producto y no otro |
| [`04-invariantes-y-adr-db.md`](proyecto/04-invariantes-y-adr-db.md) | Las reglas del libro, y por qué PostgreSQL |
| [`05-persistencia.md`](proyecto/05-persistencia.md) | Qué se previene, qué se detecta y qué **no** |
| [`07-adr-tenancy.md`](proyecto/07-adr-tenancy.md) | La frontera entre gestorías |
| [`06-manual-de-operacion.md`](proyecto/06-manual-de-operacion.md) | Comandos copiables para operar |
| [`09-matriz-cobertura.md`](proyecto/09-matriz-cobertura.md) | Qué requisito está cubierto y cuál no |

Y los caminos que se descartaron, con el motivo, para no repetirlos:
[`00`](proyecto/00-decision.md) contrareembolso y Verifactu ·
[`01`](proyecto/01-decision-morosidad.md) morosidad ·
[`03`](proyecto/03-hubspot-descartado.md) HubSpot.

## Lo que este producto NO afirma

- No dice que el registro sea «inalterable». La cadena **detecta**
  modificaciones internas; quien controle a la vez la aplicación y la base de
  datos puede rehacer una historia entera y volver a encadenarla.
- No dice que exista un formato oficial de exportación para la Inspección: a
  fecha de hoy no hay especificación técnica publicada en el BOE.
- No dice que cumpla ninguna norma. Dice qué guarda y cómo, y deja la
  valoración jurídica a quien corresponda.

---

# Otro proyecto en este mismo repositorio · LEGACY

Las carpetas `shopify-theme/`, `pruebas/` y el fichero `prompt-chatgpt.md` son
de un proyecto **anterior y sin relación**: un formulario de contrareembolso
para una tienda Shopify. Se conservan porque su historia está en este
repositorio, pero **no forman parte del fichaje** y no comparten ni código ni
dependencias.

`motor/` es un tercer módulo, del cálculo de intereses de demora, también
independiente. Se conserva y sus pruebas siguen pasando.
