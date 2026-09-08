"""Proponer y responder cambios de hora, con nombre y apellidos.

El dominio ya sabía hacer esto: una propuesta, y una respuesta de la otra parte
que la acepta o deja constancia del desacuerdo. Lo que faltaba era exponerlo,
y sobre todo dejar claro **quién** actúa.

**Quién.** Cuando ficha o propone el trabajador, el autor es él. Cuando actúa la
gestoría en nombre de la empresa, la parte es la empresa pero el autor es **la
persona concreta del panel que lo hizo**. Poner ahí el identificador de la
empresa habría sido cómodo y habría borrado el dato que de verdad hace falta el
día que alguien pregunte quién cambió aquella hora: se puede decir «lo propuso
Ana Pérez, de la gestoría, en nombre de la empresa», y no «lo propuso la
empresa».

**Qué no se toca.** Nada. La propuesta, su motivo, quién la hizo, la respuesta y
quién respondió quedan los cinco escritos, estén de acuerdo o no. Un desacuerdo
no borra la propuesta ni cambia la hora; se queda anotado.
"""

from dataclasses import dataclass
from datetime import datetime

from .postgres import LibroPostgres
from .registro import FICHAJES, RESOLUCIONES, Anotacion, Parte, Tipo


@dataclass(frozen=True)
class Correccion:
    """Una propuesta y, si la hubo, su respuesta. Para enseñarla entera."""

    propuesta: Anotacion
    respuesta: Anotacion | None
    original: Anotacion

    @property
    def pendiente(self) -> bool:
        return self.respuesta is None

    @property
    def aceptada(self) -> bool:
        return self.respuesta is not None and \
            self.respuesta.tipo is Tipo.CORRECCION_ACEPTADA

    @property
    def hay_desacuerdo(self) -> bool:
        return self.respuesta is not None and not self.aceptada

    @property
    def estado(self) -> str:
        if self.pendiente:
            return "pendiente"
        return "aceptada" if self.aceptada else "discrepancia"


def correcciones_de(anotaciones: list[Anotacion],
                    trabajador_id: str | None = None) -> list[Correccion]:
    """Todas las correcciones del libro, o las de una persona."""
    por_numero = {a.numero: a for a in anotaciones}
    respuestas = {a.corrige: a for a in anotaciones if a.tipo in RESOLUCIONES}
    salida = []
    for a in anotaciones:
        if a.tipo is not Tipo.CORRECCION_PROPUESTA:
            continue
        if trabajador_id and a.trabajador_id != trabajador_id:
            continue
        original = por_numero.get(a.corrige)
        if original is not None:
            salida.append(Correccion(a, respuestas.get(a.numero), original))
    return salida


def pendientes_de(anotaciones: list[Anotacion],
                  trabajador_id: str | None = None) -> list[Correccion]:
    return [c for c in correcciones_de(anotaciones, trabajador_id) if c.pendiente]


def esperando_a(anotaciones: list[Anotacion], parte: Parte,
                trabajador_id: str | None = None) -> list[Correccion]:
    """Las que esperan respuesta de esta parte: las propuso la otra."""
    return [c for c in pendientes_de(anotaciones, trabajador_id)
            if c.propuesta.parte is not parte]


def proponer(libro: LibroPostgres, clave: str, numero_fichaje: int,
             momento_propuesto: datetime, motivo: str, autor_id: str,
             parte: Parte, ahora: datetime) -> tuple[Anotacion, bool]:
    """Propone cambiar la hora de un fichaje. No cambia nada todavía."""
    from .registro import campos_propuesta
    return libro.una_sola_vez(clave, decidir=lambda cur: campos_propuesta(
        libro._anotacion_en(cur, numero_fichaje), momento_propuesto, motivo,
        autor_id, parte, ahora,
        hay_pendiente=libro._pendiente_en(cur, numero_fichaje)))


def responder(libro: LibroPostgres, clave: str, numero_propuesta: int,
              acepta: bool, autor_id: str, parte: Parte,
              ahora: datetime) -> tuple[Anotacion, bool]:
    """Acepta la propuesta, o deja constancia del desacuerdo."""
    from .registro import campos_resolucion
    return libro.una_sola_vez(clave, decidir=lambda cur: campos_resolucion(
        libro._anotacion_en(cur, numero_propuesta),
        libro._resuelta_en(cur, numero_propuesta), acepta, autor_id, parte, ahora))


def nombre_del_autor(conexion, autor_id: str) -> str:
    """Quién es ese identificador: un trabajador o alguien de la gestoría.

    Se busca en los dos sitios porque el autor de una corrección puede ser
    cualquiera de los dos, y enseñar un UUID a un inspector no explica nada.
    """
    fila = conexion.execute(
        "select nombre, 'trabajador' from trabajador where id = %s "
        "union all select u.nombre, 'gestoría ' || g.nombre from usuario_gestoria u "
        "join gestoria g on g.id = u.gestoria_id where u.id = %s limit 1",
        (autor_id, autor_id)).fetchone()
    return f"{fila[0]} ({fila[1]})" if fila else "—"
