"""Las horas trabajadas, deducidas del libro.

El libro guarda hechos: entró, salió, se fue a comer, pidió corregir una hora.
Las horas de la nómina no se guardan, se calculan a partir de esos hechos, y
siempre con la hora vigente de cada fichaje: la corregida si hubo acuerdo, y la
original si la corrección se quedó sin aceptar o la rechazaron.

Ese detalle es todo el asunto: la empresa no puede subir una hora sin que el
trabajador lo firme, y el trabajador no puede bajarla sin que la firme la
empresa. Nadie puede tocar la nómina por su cuenta, y el libro conserva quién
pidió qué y por qué.

Una jornada pertenece al día en que se entró, aunque se salga de madrugada. Y
lo que el cálculo no puede hacer nunca es callarse: un fichaje descolgado, una
pausa sin abrir o una jornada que nadie cerró salen en las incidencias, porque
una hora que falta en la nómina es una reclamación esperando a ocurrir.
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from .registro import FICHAJES, Libro, Tipo


@dataclass
class Jornada:
    trabajador: str
    dia: date
    entrada: datetime
    salida: datetime | None
    pausas: timedelta
    corregida: bool          # alguna de sus horas se cambió con acuerdo
    retroactiva: bool        # algún fichaje suyo se escribió mucho después
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
    """Los fichajes de una persona, con la hora que vale hoy, en orden.

    Las correcciones se resuelven de una sola pasada sobre el libro. Hacerlo
    dentro del bucle costaba doce segundos en un libro de tres años.
    """
    correcciones = libro.correcciones_vigentes()
    salida = []
    for a in libro.anotaciones:
        if a.trabajador != trabajador or a.tipo not in FICHAJES:
            continue
        vigente = correcciones.get(a.numero, a.momento)
        salida.append((vigente, a.tipo, vigente != a.momento, a.retroactiva))
    return sorted(salida, key=lambda f: f[0])


def jornadas_de(libro: Libro, trabajador: str) -> list[Jornada]:
    jornadas: list[Jornada] = []
    actual: Jornada | None = None
    pausa_desde: datetime | None = None

    def marcar(jornada: Jornada, corregido: bool, retro: bool) -> None:
        jornada.corregida = jornada.corregida or corregido
        jornada.retroactiva = jornada.retroactiva or retro

    for momento, tipo, corregido, retro in _fichajes_vigentes(libro, trabajador):
        if tipo is Tipo.ENTRADA:
            if actual is not None:
                actual.incidencias.append("entró otra vez sin haber salido")
                jornadas.append(actual)
            actual = Jornada(trabajador, momento.date(), momento, None,
                             timedelta(), corregido, retro, [])
            pausa_desde = None

        elif tipo is Tipo.SALIDA:
            if actual is None:
                jornadas.append(Jornada(trabajador, momento.date(), momento, momento,
                                        timedelta(), corregido, retro,
                                        ["salida sin entrada"]))
                continue
            if pausa_desde is not None:
                actual.pausas += momento - pausa_desde
                actual.incidencias.append("salió sin volver de la pausa")
                pausa_desde = None
            actual.salida = momento
            marcar(actual, corregido, retro)
            jornadas.append(actual)
            actual = None

        elif tipo is Tipo.PAUSA_INICIO:
            if actual is None:
                continue
            if pausa_desde is not None:
                actual.incidencias.append("empezó una pausa sin cerrar la anterior")
            pausa_desde = momento
            marcar(actual, corregido, retro)

        elif tipo is Tipo.PAUSA_FIN:
            if actual is None:
                continue
            if pausa_desde is None:
                actual.incidencias.append("volvió de una pausa que no había empezado")
                continue
            actual.pausas += momento - pausa_desde
            marcar(actual, corregido, retro)
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
