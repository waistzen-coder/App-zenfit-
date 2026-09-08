"""Los dos usuarios de la base de datos, y qué puede hacer cada uno.

`python3 -m fichaje.despliegue`

Son dos a propósito:

**El de las migraciones** es el dueño del esquema. Puede crear y cambiar tablas.
Se usa una vez, al desplegar, y luego se guarda.

**El de la aplicación** es el que está encendido las veinticuatro horas
atendiendo peticiones de internet. Ese es el que puede acabar mal si un día hay
un fallo en el código, así que se le da lo justo: puede leer, puede añadir
anotaciones, y **no puede modificar ni borrar ninguna**, ni tocar el esquema, ni
crear tablas. Si mañana un error intentara un UPDATE sobre el libro, la base de
datos lo rechaza antes de que llegue el disparador.

La contraseña se toma de `FICHAJE_APP_PASSWORD` y no se escribe en ningún sitio
del repositorio.
"""

import os
import sys

import psycopg
from psycopg import sql

from .postgres import conectar, dsn

ROL = os.environ.get("FICHAJE_APP_ROL", "fichaje_app")

# Lo que la aplicación necesita para funcionar, y ni una cosa más.
PERMISOS = [
    ("empresa", "select"),
    ("centro", "select"),
    ("trabajador", "select"),
    ("anotacion", "select, insert"),      # jamás update ni delete
    ("sesion", "select, insert, update"),  # se cierra marcando cerrada_en
    ("intento_acceso", "select, insert"),
    ("peticion_fichaje", "select, insert"),
]


def configurar_rol(conexion: psycopg.Connection, rol: str = ROL,
                   contrasena: str | None = None) -> None:
    """Crea o pone al día el usuario de la aplicación. Se puede repetir."""
    contrasena = contrasena or os.environ.get("FICHAJE_APP_PASSWORD")
    if not contrasena:
        raise SystemExit(
            "Falta FICHAJE_APP_PASSWORD. La contraseña del usuario de la "
            "aplicación no se guarda en el repositorio."
        )

    # CREATE ROLE y ALTER ROLE no admiten parámetros: son sentencias de
    # utilidad. Se componen con psycopg.sql, que escapa el identificador y el
    # literal como es debido; pegar cadenas a mano aquí sería una inyección
    # esperando a una contraseña con una comilla.
    existe = conexion.execute(
        "select 1 from pg_roles where rolname = %s", (rol,)).fetchone()
    conexion.execute(sql.SQL("{} {} with login password {}").format(
        sql.SQL("alter role" if existe else "create role"),
        sql.Identifier(rol),
        sql.Literal(contrasena),
    ))

    # De cero: se quita todo y se vuelve a dar solo lo necesario, para que este
    # comando deje siempre el mismo estado aunque antes hubiera otra cosa.
    conexion.execute(sql.SQL("revoke all on all tables in schema public from {}").format(sql.Identifier(rol)))
    conexion.execute(sql.SQL("revoke all on all sequences in schema public from {}").format(sql.Identifier(rol)))
    conexion.execute(sql.SQL("revoke create on schema public from {}").format(sql.Identifier(rol)))
    conexion.execute(sql.SQL("grant usage on schema public to {}").format(sql.Identifier(rol)))

    for tabla, permisos in PERMISOS:
        conexion.execute(sql.SQL("grant {} on {} to {}").format(sql.SQL(permisos), sql.Identifier(tabla), sql.Identifier(rol)))

    # intento_acceso lleva un bigserial: sin esto no puede escribir.
    conexion.execute(sql.SQL("grant usage, select on sequence intento_acceso_id_seq to {}").format(sql.Identifier(rol)))


def dsn_aplicacion(rol: str = ROL, contrasena: str | None = None) -> str:
    """La cadena de conexión de la aplicación, con su usuario restringido."""
    contrasena = contrasena or os.environ.get("FICHAJE_APP_PASSWORD", "")
    base = dsn()
    resto = base.split("://", 1)[1]
    resto = resto.split("@", 1)[1] if "@" in resto else resto
    return f"postgresql://{rol}:{contrasena}@{resto}"


if __name__ == "__main__":
    with conectar(sys.argv[1] if len(sys.argv) > 1 else None) as conexion:
        configurar_rol(conexion)
    print(f"Usuario «{ROL}» configurado: puede leer y añadir anotaciones, "
          f"y no puede modificarlas, borrarlas ni tocar el esquema.")
