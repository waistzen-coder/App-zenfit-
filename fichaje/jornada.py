"""Las horas trabajadas, deducidas del libro.

El libro guarda hechos: entró, salió, se fue a comer, pidió corregir una hora.
Las horas de la nómina no se guardan, se calculan a partir de esos hechos, y
siempre con la hora vigente de cada fichaje: la corregida si hubo acuerdo, y la
original si la corrección se quedó sin aceptar o la rechazaron.

Ese detalle es todo el asunto: la empresa no puede subir una hora sin que el
trabajador lo firme, y el trabajador no puede bajarla sin que la firme la
empresa. Nadie puede tocar la nómina por su cuenta, y el libro conserva quién
pidió qué y por qué.

Una jornada pertenece al día en que se entró, aunque se salga de madrugada.
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from .registro import Libro, Tipo

FICHAJES = {Tipo.ENTRADA, Tipo.SALIDA, Tipo.PAUSA_INICIO, Tipo.PAUSA_FIN}


@dataclass
class Jornada:
    trabajador: str
    dia: date
    entrada: datetime
    salida: datetime | None
    pausas: timedelta
    corregida: bool          # alguna de sus horas se cambió con acuerdo
    incidencias: list[str]

    @property
    def abierta(self) -> bool:
        return self.salida is None

    @property
    def trabajado(self) -> timedelta:
        if self.salida is None:
            return timedelta()
        return max(self.salida - self.entrada - self.pausas, timedelta())

    @property
    def horas(self) -> float:
        return round(self.trabajado.total_seconds() / 3600, 2)


def _fichajes_vigentes(libro: Libro, trabajador: str):
    """Los fichajes de una persona, con la hora que vale hoy, en orden."""
    salida = []
    for a in libro.anotaciones:
        if a.trabajador != trabajador or a.tipo not in FICHAJES:
            continue
        vigente = libro.momento_vigente(a.numero)
        salida.append((vigente, a.tipo, vigente != a.momento))
    return sorted(salida, key=lambda f: f[0])


def jornadas_de(libro: Libro, trabajador: str) -> list[Jornada]:
    jornadas: list[Jornada] = []
    actual: Jornada | None = None
    pausa_desde: datetime | None = None

    for momento, tipo, corregido in _fichajes_vigentes(libro, trabajador):
        if tipo is Tipo.ENTRADA:
            if actual is not None:
                actual.incidencias.append("entró otra vez sin haber salido")
                jornadas.append(actual)
            actual = Jornada(trabajador, momento.date(), momento, None,
                             timedelta(), corregido, [])
            pausa_desde = None

        elif tipo is Tipo.SALIDA:
            if actual is None:
                jornadas.append(Jornada(trabajador, momento.date(), momento, momento,
                                        timedelta(), corregido,
                                        ["salida sin entrada"]))
                continue
            if pausa_desde is not None:
                actual.pausas += momento - pausa_desde
                actual.incidencias.append("salió sin volver de la pausa")
                pausa_desde = None
            actual.salida = momento
            actual.corregida = actual.corregida or corregido
            jornadas.append(actual)
            actual = None

        elif tipo is Tipo.PAUSA_INICIO:
            if actual is None:
                continue
            pausa_desde = momento
            actual.corregida = actual.corregida or corregido

        elif tipo is Tipo.PAUSA_FIN:
            if actual is None or pausa_desde is None:
                continue
            actual.pausas += momento - pausa_desde
            actual.corregida = actual.corregida or corregido
            pausa_desde = None

    if actual is not None:
        actual.incidencias.append("jornada sin cerrar")
        jornadas.append(actual)

    return jornadas


def horas_del_mes(libro: Libro, trabajador: str, anio: int, mes: int) -> float:
    return round(sum(
        j.horas for j in jornadas_de(libro, trabajador)
        if j.dia.year == anio and j.dia.month == mes
    ), 2)
