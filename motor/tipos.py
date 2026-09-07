"""Los tipos de interés de demora de la Ley 3/2004, semestre a semestre.

El artículo 7.2 dice cómo se fija el tipo: el que aplicó el BCE a su más
reciente operación principal de financiación, más ocho puntos porcentuales. Y
dice también que el tipo del primer semestre es el vigente a 1 de enero, y el
del segundo el vigente a 1 de julio. Así que no es un tipo, son dos por año, y
el Ministerio de Economía los publica en el BOE cada seis meses.

Aquí no se calcula ninguno. Se copian, y cada uno lleva al lado la referencia
del BOE donde se puede comprobar. Un tipo sin referencia no entra en esta tabla:
si falta el semestre, el motor se niega a calcular ese tramo y lo dice. Es la
diferencia entre una herramienta que se puede llevar a un juzgado y una que no.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Tipo:
    """Un tipo semestral, con su procedencia."""

    anio: int
    semestre: int          # 1 o 2
    porcentaje: float      # el tipo total, BCE + 8, no solo el del BCE
    fuente: str            # dónde comprobarlo

    @property
    def clave(self) -> tuple[int, int]:
        return (self.anio, self.semestre)


# Los tipos verificados. La tabla está deliberadamente casi vacía: completarla
# desde el BOE es la primera tarea del proyecto, y hasta entonces el motor solo
# sabe calcular los tramos que caen en los semestres que hay aquí.
TIPOS = {
    t.clave: t
    for t in [
        Tipo(
            anio=2026,
            semestre=1,
            porcentaje=10.5,
            fuente="BCE 2,5 % + 8 puntos; primer semestre de 2026. "
                   "Pendiente de citar la Resolución del Tesoro en el BOE.",
        ),
    ]
}


class SemestreSinTipo(Exception):
    """Se ha pedido calcular un tramo de un semestre que no está verificado."""

    def __init__(self, anio: int, semestre: int):
        self.anio = anio
        self.semestre = semestre
        super().__init__(
            f"No hay tipo verificado para el {semestre}º semestre de {anio}. "
            f"Búscalo en el BOE (Resolución semestral de la Secretaría General "
            f"del Tesoro) y añádelo a motor/tipos.py con su referencia. "
            f"El motor no se inventa tipos."
        )


def tipo_de(anio: int, semestre: int) -> Tipo:
    clave = (anio, semestre)
    if clave not in TIPOS:
        raise SemestreSinTipo(anio, semestre)
    return TIPOS[clave]


def semestres_cubiertos() -> list[tuple[int, int]]:
    return sorted(TIPOS)
