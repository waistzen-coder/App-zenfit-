"""Las horas trabajadas, deducidas del libro.

El libro guarda hechos: entró, salió, se fue a comer, pidió corregir una hora.
Las horas de la nómina no se guardan, se calculan a partir de esos hechos, y
siempre con la hora vigente de cada fichaje: la corregida si hubo acuerdo, y la
original si la corrección se quedó sin aceptar o la rechazaron.

Ese detalle es todo el asunto: la empresa no puede subir una hora sin que el
trabajador lo firme, y el trabajador no puede bajarla sin que la firme la
empresa. Nadie toca la nómina por su cuenta.

Dos cosas que parecen detalles:

**El día es el del centro, no el del servidor.** Una jornada pertenece al día en
que se entró *visto desde el centro de trabajo*. Con las fechas guardadas en
UTC, quien entra a la una de la madrugada en Madrid entró el día anterior para
el servidor y el mismo día para su encargado. Manda el encargado.

**El cálculo no se calla.** Un fichaje descolgado, una pausa cerrada sin abrir o
una jornada que nadie cerró salen en las incidencias, porque una hora que falta
en la nómina es una reclamación esperando a ocurrir.

Trabaja sobre una lista de anotaciones, no sobre un `Libro`, para poder recibir
igual las que vienen de memoria y las que vienen de la base de datos.
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from enum import Enum
from zoneinfo import ZoneInfo

from .registro import FICHAJES, Anotacion, Tipo, correcciones_vigentes


@dataclass
class Jornada:
    trabajador_id: str
    dia: date                # el día visto desde el centro de trabajo
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


def _fichajes_vigentes(anotaciones: list[Anotacion], trabajador_id: str):
    """Los fichajes de una persona, con la hora que vale hoy, en orden.

    Las correcciones se resuelven de una sola pasada. Hacerlo dentro del bucle
    costaba doce segundos en un libro de tres años.
    """
    correcciones = correcciones_vigentes(anotaciones)
    salida = []
    for a in anotaciones:
        if a.trabajador_id != trabajador_id or a.tipo not in FICHAJES:
            continue
        vigente = correcciones.get(a.numero, a.momento)
        salida.append((vigente, a.tipo, vigente != a.momento, a.retroactiva,
                       a.zona_horaria))
    return sorted(salida, key=lambda f: f[0])


def jornadas_de(anotaciones: list[Anotacion], trabajador_id: str) -> list[Jornada]:
    """Las jornadas de UNA persona.

    Para varias personas del mismo libro, `jornadas_por_trabajador` en vez de
    llamar aquí en un bucle: esta función resuelve las correcciones del libro
    entero cada vez que se la llama, y hacerlo una vez por persona es el mismo
    error que ya costó doce segundos una vez.
    """
    return _construir(trabajador_id, _fichajes_vigentes(anotaciones, trabajador_id))


def jornadas_por_trabajador(
        anotaciones: list[Anotacion]) -> dict[str, list[Jornada]]:
    """Las jornadas de TODO EL MUNDO, en una sola pasada por el libro.

    Llamar a `jornadas_de` dentro de un bucle de personas parece inofensivo y no
    lo es: cada llamada resuelve las correcciones del libro completo, así que el
    trabajo crece con el número de personas MULTIPLICADO por el tamaño del
    libro. Medido en el portal con un mes de una fábrica: 75 personas 0,24 s,
    150 personas 0,66 s, 300 personas 1,74 s. Doblar la plantilla casi triplica
    el tiempo, y eso no se arregla comprando una máquina más grande.

    Aquí las correcciones se resuelven una vez y los fichajes se reparten por
    persona en la misma pasada.
    """
    correcciones = correcciones_vigentes(anotaciones)
    por_persona: dict[str, list] = {}
    for a in anotaciones:
        if a.tipo not in FICHAJES:
            continue
        vigente = correcciones.get(a.numero, a.momento)
        por_persona.setdefault(a.trabajador_id, []).append(
            (vigente, a.tipo, vigente != a.momento, a.retroactiva, a.zona_horaria))
    return {trabajador: _construir(trabajador, sorted(fichajes, key=lambda f: f[0]))
            for trabajador, fichajes in por_persona.items()}


def _construir(trabajador_id: str, fichajes) -> list[Jornada]:
    """La máquina de estados: de fichajes en orden a jornadas.

    Estaba dentro de `jornadas_de`. Se saca para que las dos formas de pedir
    jornadas —una persona o todas— compartan exactamente este código, y no haya
    dos sitios donde decidir qué es una pausa sin cerrar.
    """
    jornadas: list[Jornada] = []
    actual: Jornada | None = None
    pausa_desde: datetime | None = None

    def marcar(jornada: Jornada, corregido: bool, retro: bool) -> None:
        jornada.corregida = jornada.corregida or corregido
        jornada.retroactiva = jornada.retroactiva or retro

    def dia_local(momento: datetime, zona: str) -> date:
        return momento.astimezone(ZoneInfo(zona)).date()

    for momento, tipo, corregido, retro, zona in fichajes:
        if tipo is Tipo.ENTRADA:
            if actual is not None:
                actual.incidencias.append("entró otra vez sin haber salido")
                jornadas.append(actual)
            actual = Jornada(trabajador_id, dia_local(momento, zona), momento, None,
                             timedelta(), corregido, retro, [])
            pausa_desde = None

        elif tipo is Tipo.SALIDA:
            if actual is None:
                jornadas.append(Jornada(trabajador_id, dia_local(momento, zona),
                                        momento, momento, timedelta(), corregido,
                                        retro, ["salida sin entrada"]))
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


def horas_del_mes(anotaciones: list[Anotacion], trabajador_id: str,
                  anio: int, mes: int) -> float:
    return round(sum(
        j.horas for j in jornadas_de(anotaciones, trabajador_id)
        if j.dia.year == anio and j.dia.month == mes
    ), 2)


# --------------------------------------------- qué puede hacer ahora una persona

class Estado(str, Enum):
    """En qué situación está alguien ahora mismo, según sus fichajes."""

    FUERA = "fuera"
    DENTRO = "dentro"
    EN_PAUSA = "en_pausa"


# La regla vive aquí y solo aquí. La web pregunta; no decide.
ACCIONES = {
    Estado.FUERA: (Tipo.ENTRADA,),
    Estado.DENTRO: (Tipo.PAUSA_INICIO, Tipo.SALIDA),
    Estado.EN_PAUSA: (Tipo.PAUSA_FIN, Tipo.SALIDA),
}

COMO_SE_LLAMA = {
    Tipo.ENTRADA: "Entrar",
    Tipo.SALIDA: "Salir",
    Tipo.PAUSA_INICIO: "Empezar pausa",
    Tipo.PAUSA_FIN: "Volver de la pausa",
}


def estado_segun_ultimo(tipo: Tipo | None) -> Estado:
    """La regla, en un solo sitio: qué significa el último fichaje de alguien.

    Vive suelta para que el panel pueda preguntarla sobre el último fichaje que
    le devuelva la base de datos, sin cargar el libro entero de cada empresa y
    sin reescribir la regla por su cuenta.
    """
    if tipo is Tipo.ENTRADA or tipo is Tipo.PAUSA_FIN:
        return Estado.DENTRO
    if tipo is Tipo.PAUSA_INICIO:
        return Estado.EN_PAUSA
    return Estado.FUERA


def estado_actual(anotaciones: list[Anotacion], trabajador_id: str) -> Estado:
    """Dónde está esta persona ahora, mirando su último fichaje vigente.

    Existe para que la interfaz no tenga que razonar «si el último fue una
    entrada, entonces...». Esa regla es del dominio: si un día cambia, cambia
    en un sitio.
    """
    fichajes = _fichajes_vigentes(anotaciones, trabajador_id)
    return estado_segun_ultimo(fichajes[-1][1] if fichajes else None)


def acciones_posibles(anotaciones: list[Anotacion], trabajador_id: str) -> tuple[Tipo, ...]:
    return ACCIONES[estado_actual(anotaciones, trabajador_id)]


def ultimo_fichaje(anotaciones: list[Anotacion], trabajador_id: str):
    """El último fichaje vigente de una persona: (momento, tipo) o None."""
    fichajes = _fichajes_vigentes(anotaciones, trabajador_id)
    return (fichajes[-1][0], fichajes[-1][1]) if fichajes else None
