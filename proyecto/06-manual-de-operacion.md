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
export FICHAJE_SECRETO="$(python3 -c 'import secrets;print(secrets.token_hex(32))')"
export FICHAJE_URL='https://tu-dominio'      # lo que se codifica en el QR
export FICHAJE_HTTPS=1                        # solo en producción
```

Preparar la base de datos:

```bash
python3 -m fichaje.migrar        # crea o actualiza las tablas
python3 -m fichaje.despliegue    # crea el usuario limitado de la aplicación
```

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
python3 -m fichaje.pruebas             # el registro de jornada
python3 -m fichaje.pruebas_postgres    # la base de datos
python3 -m fichaje.pruebas_web         # el fichaje desde el móvil
python3 -m fichaje.copia comprobar     # copia, restauración y cadena
```

Las tres primeras **borran y recrean sus tablas**: no las apuntes nunca a la
base de datos de un cliente.

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
