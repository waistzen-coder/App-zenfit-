"""Quién es quién: empresa, centro de trabajo y persona.

Hasta ahora el libro identificaba a la gente por su nombre, y «Lucía» y «lucia»
eran dos personas distintas. Aquí aparecen las identidades estables.

La regla que manda: **el nombre nunca es la identidad**. Un nombre se corrige,
se casa, cambia de razón social; si formara parte de la huella, corregir una
errata invalidaría el libro entero. Así que lo que se firma es el
identificador, y el nombre vive aquí, donde se puede editar sin consecuencias.

La zona horaria cuelga del centro, no de la empresa, porque una cadena con un
local en Motril y otro en Las Palmas trabaja en dos husos distintos el mismo
día. Se guarda el identificador IANA («Europe/Madrid», «Atlantic/Canary») y
nunca un desfase fijo como «UTC+1»: en marzo y en octubre ese desfase cambia y
la hora escrita dejaría de significar lo que significaba.
"""

import uuid
from dataclasses import dataclass, field
from zoneinfo import ZoneInfo


def nuevo_id() -> str:
    """Un identificador opaco, no adivinable y no secuencial.

    UUID versión 4: 122 bits de azar, tipo nativo en PostgreSQL y formato que
    todo el mundo reconoce. No secuencial a propósito, porque el del centro va a
    acabar dentro de un código QR pegado en una pared: si fuera un número
    correlativo, cualquiera podría probar el del centro de al lado.
    """
    return str(uuid.uuid4())


class ZonaInvalida(Exception):
    """La zona horaria no es un identificador IANA que este sistema conozca."""


def validar_zona(zona: str) -> str:
    """Comprueba que la zona existe. El navegador no decide esto: lo decide el
    servidor, con la zona del centro de trabajo."""
    try:
        ZoneInfo(zona)
    except Exception as fallo:
        raise ZonaInvalida(
            f"«{zona}» no es una zona horaria IANA válida. Se esperaba algo como "
            f"Europe/Madrid o Atlantic/Canary."
        ) from fallo
    return zona


@dataclass(frozen=True)
class Empresa:
    nombre: str
    id: str = field(default_factory=nuevo_id)


@dataclass(frozen=True)
class Centro:
    """Un centro de trabajo: el sitio físico donde se ficha."""

    empresa_id: str
    nombre: str
    zona_horaria: str = "Europe/Madrid"
    id: str = field(default_factory=nuevo_id)

    def __post_init__(self) -> None:
        validar_zona(self.zona_horaria)


@dataclass(frozen=True)
class Trabajador:
    empresa_id: str
    nombre: str
    activo: bool = True
    id: str = field(default_factory=nuevo_id)
