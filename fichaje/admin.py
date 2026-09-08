"""Administración por línea de comandos. `python3 -m fichaje.admin`

Todavía no hay panel, y no hace falta para probar el fichaje. Esto es lo mínimo
para dar de alta una empresa, su centro, su gente y sus PIN, y para imprimir el
cartel con el QR.

Usa el usuario dueño del esquema, no el de la aplicación: dar de alta gente y
cambiar PIN son cosas de administración, y el proceso que atiende internet no
tiene por qué poder hacerlas.

    python3 -m fichaje.admin empresa "Bar Casa Paco"
    python3 -m fichaje.admin centro <empresa> "Local de la playa" Europe/Madrid
    python3 -m fichaje.admin trabajador <empresa> "Lucía García" 1042
    python3 -m fichaje.admin pin <trabajador> 482913
    python3 -m fichaje.admin qr <centro> cartel.svg
    python3 -m fichaje.admin rotar-qr <centro>
    python3 -m fichaje.admin baja <trabajador>
    python3 -m fichaje.admin desbloquear <centro> 1042
"""

import os
import sys

import segno

from .credenciales import derivar, nuevo_token, validar
from .organizacion import nuevo_id, validar_zona
from .postgres import conectar

RAIZ = os.environ.get("FICHAJE_URL", "http://localhost:5000")


def url_del_centro(token: str) -> str:
    return f"{RAIZ.rstrip('/')}/f/{token}"


def crear_empresa(conexion, nombre: str) -> str:
    identificador = nuevo_id()
    conexion.execute("insert into empresa (id, nombre) values (%s, %s)",
                     (identificador, nombre))
    return identificador


def crear_centro(conexion, empresa_id: str, nombre: str,
                 zona: str = "Europe/Madrid") -> tuple[str, str]:
    validar_zona(zona)
    identificador, token = nuevo_id(), nuevo_token()
    conexion.execute(
        "insert into centro (id, empresa_id, nombre, zona_horaria, token_publico,"
        " token_rotado_en) values (%s, %s, %s, %s, %s, now())",
        (identificador, empresa_id, nombre, zona, token))
    return identificador, token


def rotar_token(conexion, centro_id: str) -> str:
    """Invalida el QR anterior y devuelve el nuevo.

    Para cuando alguien fotografía el cartel y lo publica: el enlace viejo deja
    de existir en cuanto se imprime el nuevo.
    """
    token = nuevo_token()
    filas = conexion.execute(
        "update centro set token_publico = %s, token_rotado_en = now() "
        "where id = %s returning id", (token, centro_id)).fetchall()
    if not filas:
        raise SystemExit(f"No existe el centro {centro_id}")
    return token


def crear_trabajador(conexion, empresa_id: str, nombre: str, codigo: str) -> str:
    identificador = nuevo_id()
    conexion.execute(
        "insert into trabajador (id, empresa_id, nombre, codigo) "
        "values (%s, %s, %s, %s)", (identificador, empresa_id, nombre, codigo))
    return identificador


def poner_pin(conexion, trabajador_id: str, pin: str) -> None:
    validar(pin)
    filas = conexion.execute(
        "update trabajador set pin_derivado = %s, pin_actualizado_en = now() "
        "where id = %s returning id", (derivar(pin), trabajador_id)).fetchall()
    if not filas:
        raise SystemExit(f"No existe el trabajador {trabajador_id}")


def cambiar_actividad(conexion, trabajador_id: str, activo: bool) -> None:
    conexion.execute("update trabajador set activo = %s where id = %s",
                     (activo, trabajador_id))


def desbloquear(conexion, centro_id: str, codigo: str) -> int:
    """Borra los intentos fallidos de alguien que se ha quedado fuera.

    Los intentos no son un hecho laboral: son un contador de seguridad, y
    borrarlos no toca el libro.
    """
    return conexion.execute(
        "delete from intento_acceso where centro_id = %s and codigo = %s "
        "and not acertado", (centro_id, codigo)).rowcount


def cartel(conexion, centro_id: str, destino: str | None = None) -> str:
    """El cartel para imprimir: un QR, el nombre del centro y nada más.

    Sin datos personales y sin el nombre de la empresa: acaba pegado en una
    pared donde entra gente de la calle.
    """
    fila = conexion.execute(
        "select nombre, token_publico from centro where id = %s",
        (centro_id,)).fetchone()
    if not fila or not fila[1]:
        raise SystemExit(f"El centro {centro_id} no existe o no tiene QR")
    nombre, token = fila
    url = url_del_centro(token)
    qr = segno.make(url, error="m")
    svg = qr.svg_inline(scale=8, border=2)
    pagina = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="420" height="520" '
        'viewBox="0 0 420 520">'
        '<rect width="420" height="520" fill="#ffffff"/>'
        f'<g transform="translate(60,60)">{svg}</g>'
        '<text x="210" y="440" text-anchor="middle" font-family="system-ui,sans-serif" '
        'font-size="26" fill="#111">Escanea para fichar</text>'
        f'<text x="210" y="475" text-anchor="middle" font-family="system-ui,sans-serif" '
        f'font-size="18" fill="#555">{nombre}</text>'
        '</svg>'
    )
    if destino:
        with open(destino, "w", encoding="utf-8") as fichero:
            fichero.write(pagina)
    return url


ORDENES = {
    "empresa": lambda c, a: print(crear_empresa(c, a[0])),
    "trabajador": lambda c, a: print(crear_trabajador(c, a[0], a[1], a[2])),
    "pin": lambda c, a: (poner_pin(c, a[0], a[1]), print("PIN actualizado"))[1],
    "baja": lambda c, a: (cambiar_actividad(c, a[0], False), print("De baja"))[1],
    "alta": lambda c, a: (cambiar_actividad(c, a[0], True), print("De alta"))[1],
    "rotar-qr": lambda c, a: print(url_del_centro(rotar_token(c, a[0]))),
    "desbloquear": lambda c, a: print(f"{desbloquear(c, a[0], a[1])} intentos borrados"),
}


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 1
    orden, resto = argv[1], argv[2:]
    with conectar() as conexion:
        if orden == "centro":
            identificador, token = crear_centro(
                conexion, resto[0], resto[1],
                resto[2] if len(resto) > 2 else "Europe/Madrid")
            print(identificador)
            print(url_del_centro(token))
        elif orden == "qr":
            print(cartel(conexion, resto[0], resto[1] if len(resto) > 1 else None))
        elif orden in ORDENES:
            ORDENES[orden](conexion, resto)
        else:
            print(__doc__)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
