"""Los usuarios de la base de datos, y qué puede hacer cada uno.

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

**El del portal de representantes** es de solo lectura de verdad, no por
convenio: sobre el libro tiene `SELECT` y nada más. Puede escribir en tres
tablas suyas —su sesión, sus intentos de acceso y el registro de quién consultó—
y en ninguna otra. Si mañana apareciera un fallo en el portal que intentara
añadir una anotación, PostgreSQL lo rechaza; no hay que confiar en que el código
no lo intente. Un contexto de acceso que solo mira es el sitio donde esa
garantía sale más barata, así que se toma.

Las contraseñas se toman de `FICHAJE_APP_PASSWORD` y `FICHAJE_PORTAL_PASSWORD`,
y no se escriben en ningún sitio del repositorio.
"""

import os
import sys
from urllib.parse import quote, urlsplit, urlunsplit

import psycopg
from psycopg import sql

from .postgres import conectar, dsn

ROL = os.environ.get("FICHAJE_APP_ROL", "fichaje_app")

# Lo que la aplicación necesita para funcionar, y ni una cosa más.
# El panel administra entidades, así que la aplicación necesita poder crear y
# editar empresas, centros y personas. Lo que NO cambia, y es lo único que de
# verdad importa: sobre `anotacion` puede leer y añadir, nunca modificar ni
# borrar. Ese permiso no existe para nadie salvo el dueño del esquema, y ni
# siquiera para él, porque además está el disparador.
PERMISOS = [
    ("gestoria", "select"),
    ("usuario_gestoria", "select, insert, update"),
    ("empresa", "select, insert, update"),
    ("centro", "select, insert, update"),
    ("trabajador", "select, insert, update"),
    ("anotacion", "select, insert"),           # jamás update ni delete
    ("sesion", "select, insert, update"),
    ("sesion_panel", "select, insert, update"),
    ("intento_acceso", "select, insert"),
    ("intento_panel", "select, insert"),
    ("peticion_fichaje", "select, insert"),
    ("registro_administrativo", "select, insert"),
    ("verificacion_libro", "select, insert, update"),
    # El panel da de alta representantes y los revoca; no necesita borrarlos.
    # Un representante que se borra se lleva por delante el registro de lo que
    # consultó, y ese registro es la mitad de la razón de que exista la figura.
    ("representante", "select, insert, update"),
    ("acceso_representante", "select"),     # la empresa lo lee, nadie lo edita
    ("sesion_representante", "select, update"),   # para poder cerrarlas al revocar
    # Sellar es añadir. Nunca modificar ni borrar: un sello que se puede editar
    # no sirve para nada, porque quien recorta el libro editaría el sello.
    ("sello", "select, insert"),
]

SECUENCIAS = ["intento_acceso_id_seq", "intento_panel_id_seq",
              "registro_administrativo_id_seq"]

ROL_PORTAL = os.environ.get("FICHAJE_PORTAL_ROL", "fichaje_portal")

# Lo que el portal de representantes necesita. Obsérvese lo que NO está:
# `anotacion` aparece con `select` y sin `insert`. El portal no ficha, no
# corrige y no propone nada, y eso deja de ser una promesa del código para ser
# un permiso que no existe.
PERMISOS_PORTAL = [
    ("empresa", "select"),
    ("centro", "select"),
    ("trabajador", "select"),
    ("anotacion", "select"),                   # jamás insert, update ni delete
    ("representante", "select"),
    ("sesion_representante", "select, insert, update"),
    ("intento_representante", "select, insert"),
    ("acceso_representante", "select, insert"),   # el registro tampoco se edita
]

SECUENCIAS_PORTAL = ["intento_representante_id_seq", "acceso_representante_id_seq"]


def configurar_rol(conexion: psycopg.Connection, rol: str = ROL,
                   contrasena: str | None = None,
                   permisos: list[tuple[str, str]] | None = None,
                   secuencias: list[str] | None = None,
                   variable: str = "FICHAJE_APP_PASSWORD") -> None:
    """Crea o pone al día un usuario de la base. Se puede repetir."""
    permisos = PERMISOS if permisos is None else permisos
    secuencias = SECUENCIAS if secuencias is None else secuencias
    contrasena = contrasena or os.environ.get(variable)
    if not contrasena:
        raise SystemExit(
            f"Falta {variable}. Las contraseñas de los usuarios de la base no "
            f"se guardan en el repositorio."
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

    for tabla, permisos_tabla in permisos:
        conexion.execute(sql.SQL("grant {} on {} to {}").format(sql.SQL(permisos_tabla), sql.Identifier(tabla), sql.Identifier(rol)))

    # Las tablas con bigserial necesitan además su secuencia.
    for secuencia in secuencias:
        conexion.execute(sql.SQL("grant usage, select on sequence {} to {}").format(
            sql.Identifier(secuencia), sql.Identifier(rol)))


def dsn_aplicacion(rol: str = ROL, contrasena: str | None = None) -> str:
    """La cadena de conexión de la aplicación, con su usuario restringido.

    Se deriva de `FICHAJE_DSN`: **el mismo servidor, la misma base, el mismo
    puerto**, y lo único que cambia son las credenciales. Esa es la razón de que
    exista esta función y de que nadie escriba una cadena de conexión a mano en
    ninguna otra parte. Un sitio que escriba «127.0.0.1:5433» por su cuenta
    funciona en el portátil de quien lo escribió y falla en cualquier otro
    ordenador, que es exactamente lo que pasó.

    El usuario y la contraseña se escapan: una contraseña con una arroba o una
    barra partiría la dirección y acabaríamos conectando a otro sitio.
    """
    contrasena = contrasena or os.environ.get("FICHAJE_APP_PASSWORD", "")
    partes = urlsplit(dsn())
    autoridad = f"{quote(rol, safe='')}:{quote(contrasena, safe='')}@{partes.hostname or ''}"
    if partes.port:
        autoridad += f":{partes.port}"
    return urlunsplit(("postgresql", autoridad, partes.path,
                       partes.query, partes.fragment))


def configurar_rol_portal(conexion: psycopg.Connection,
                          contrasena: str | None = None) -> None:
    """Crea o pone al día el usuario de solo lectura del portal."""
    configurar_rol(conexion, ROL_PORTAL, contrasena,
                   PERMISOS_PORTAL, SECUENCIAS_PORTAL,
                   variable="FICHAJE_PORTAL_PASSWORD")


def dsn_portal(contrasena: str | None = None) -> str:
    """La cadena de conexión del portal, con su usuario de solo lectura."""
    return dsn_aplicacion(ROL_PORTAL,
                          contrasena or os.environ.get("FICHAJE_PORTAL_PASSWORD", ""))


if __name__ == "__main__":
    with conectar(sys.argv[1] if len(sys.argv) > 1 else None) as conexion:
        configurar_rol(conexion)
        configurar_rol_portal(conexion)
    print(f"Usuario «{ROL}» configurado: puede leer y añadir anotaciones, "
          f"y no puede modificarlas, borrarlas ni tocar el esquema.")
    print(f"Usuario «{ROL_PORTAL}» configurado: solo lectura del libro; "
          f"escribe únicamente su sesión y el registro de accesos.")
