"""El PIN del trabajador: cómo se guarda y cómo se comprueba.

Un PIN no se guarda nunca en claro, y tampoco con SHA-256 «a secas». Esos hashes
están hechos para ir rápido, que es justo lo contrario de lo que hace falta aquí:
si alguien se lleva la tabla, con una tarjeta gráfica prueba millones por
segundo. Lo que hace falta es una función deliberadamente lenta y con sal.

Se usa **scrypt**, que está en la biblioteca estándar de Python y no añade
ninguna dependencia. Con n=2^14, r=8, p=1 cada comprobación cuesta unos 50 ms y
unos 16 MB de memoria, que es imperceptible para quien ficha y carísimo para
quien prueba a ciegas.

Y ahora lo incómodo, escrito aquí para que nadie lo olvide: **un PIN de seis
cifras son un millón de combinaciones**. Contra alguien que se haya llevado la
base de datos, scrypt encarece el ataque pero no lo impide; un millón de
intentos a 50 ms son unas catorce horas de una sola máquina. Lo que de verdad
protege al PIN es que la base no se filtre y que los intentos por la web estén
limitados. Por eso el mínimo son seis cifras y no cuatro, y por eso el límite de
intentos no es opcional.

El PIN no entra jamás en el libro. El libro guarda hechos laborales; esto es
autenticación, y son dos cosas distintas.
"""

import base64
import hashlib
import secrets

ALGORITMO = "scrypt"
N, R, P = 2**14, 8, 1
LONGITUD_CLAVE = 32
LONGITUD_SAL = 16
MEMORIA_MAXIMA = 64 * 1024 * 1024
CIFRAS_MINIMAS = 6


class PinInvalido(Exception):
    """El PIN no cumple lo mínimo para poder protegerlo."""


def validar(pin: str) -> str:
    if not pin.isdigit():
        raise PinInvalido("El PIN son solo cifras.")
    if len(pin) < CIFRAS_MINIMAS:
        raise PinInvalido(
            f"El PIN necesita al menos {CIFRAS_MINIMAS} cifras. Con cuatro hay "
            f"diez mil combinaciones, que es muy poco si alguien se lleva la "
            f"base de datos."
        )
    if len(set(pin)) == 1:
        raise PinInvalido("Un PIN de una cifra repetida se adivina a la primera.")
    return pin


def _derivar(pin: str, sal: bytes) -> bytes:
    return hashlib.scrypt(pin.encode("utf-8"), salt=sal, n=N, r=R, p=P,
                          dklen=LONGITUD_CLAVE, maxmem=MEMORIA_MAXIMA)


def derivar(pin: str) -> str:
    """Devuelve lo que se guarda en la base: algoritmo, parámetros, sal y clave.

    Los parámetros van dentro a propósito: el día que haya que subirlos, los
    PIN viejos se seguirán pudiendo comprobar con los suyos.
    """
    validar(pin)
    sal = secrets.token_bytes(LONGITUD_SAL)
    clave = _derivar(pin, sal)
    return "${}${}${}${}${}$".format(
        ALGORITMO, N, R, P,
        base64.b64encode(sal).decode() + "$" + base64.b64encode(clave).decode()
    ).strip("$")


def comprobar(pin: str, guardado: str | None) -> bool:
    """Compara sin filtrar por el tiempo de respuesta si el trabajador existe.

    Cuando no hay PIN guardado igualmente se deriva uno falso, para que tardar
    menos no delate que ese código de trabajador no existe.
    """
    if not guardado:
        _derivar(pin or "000000", b"\x00" * LONGITUD_SAL)
        return False
    try:
        algoritmo, n, r, p, sal64, clave64 = guardado.split("$")
        if algoritmo != ALGORITMO:
            return False
        candidata = hashlib.scrypt(
            (pin or "").encode("utf-8"), salt=base64.b64decode(sal64),
            n=int(n), r=int(r), p=int(p), dklen=LONGITUD_CLAVE,
            maxmem=MEMORIA_MAXIMA)
    except (ValueError, TypeError):
        return False
    return secrets.compare_digest(candidata, base64.b64decode(clave64))


def nuevo_token(bytes_de_azar: int = 24) -> str:
    """Un testigo opaco para el QR de un centro o para una sesión."""
    return secrets.token_urlsafe(bytes_de_azar)


def huella_de_token(token: str) -> str:
    """Lo que se guarda de una sesión: nunca el testigo, solo su huella.

    Si alguien lee la tabla de sesiones no puede suplantar a nadie, igual que
    con las contraseñas. Aquí sí vale SHA-256: el testigo tiene 192 bits de
    azar, así que no hay nada que adivinar y no hace falta encarecer nada.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
