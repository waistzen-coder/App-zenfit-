"""El registro de jornada: un libro al que solo se puede añadir.

La idea entera del producto está en este fichero. El decreto no pide una app de
fichar; pide un registro que aguante una inspección, y eso son tres cosas:

**Nada se borra ni se reescribe.** Un fichaje mal puesto no se corrige
machacándolo: se añade una corrección que apunta al original. Los dos quedan.
Cuando la Inspección pregunte «¿esta hora se ha tocado?», la respuesta está en
el propio libro.

**Cada anotación va encadenada a la anterior por su huella.** Si alguien edita
la base de datos por detrás para arreglar un mes entero, la cadena se rompe y
`verificar` dice exactamente en qué anotación. Es lo que separa un registro
inalterable de un Excel con buena voluntad.

**Una corrección necesita a los dos.** El decreto dice que corregir un fichaje
exige el acuerdo entre empresa y persona trabajadora. Así que aquí una
corrección no es un cambio: es una propuesta que la otra parte acepta o rechaza,
y hasta que la acepta no cuenta para nada. Si la propone la empresa, la acepta
el trabajador; si la propone el trabajador, la acepta la empresa.
"""

import hashlib
import json
from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum


class Tipo(str, Enum):
    ENTRADA = "entrada"
    SALIDA = "salida"
    PAUSA_INICIO = "pausa_inicio"
    PAUSA_FIN = "pausa_fin"
    CORRECCION_PROPUESTA = "correccion_propuesta"
    CORRECCION_ACEPTADA = "correccion_aceptada"
    CORRECCION_RECHAZADA = "correccion_rechazada"


class Parte(str, Enum):
    EMPRESA = "empresa"
    TRABAJADOR = "trabajador"


# La huella de la que cuelga la primera anotación de cada empresa.
ORIGEN = "0" * 64


@dataclass(frozen=True)
class Anotacion:
    numero: int                  # posición en el libro de la empresa, desde 1
    trabajador: str
    tipo: Tipo
    momento: datetime            # el instante que se registra
    anotado_en: datetime         # cuándo se escribió en el libro
    autor: str
    parte: Parte                 # quién escribe: la empresa o el trabajador
    origen: str = ""             # móvil, QR, web…
    motivo: str = ""             # obligatorio al proponer una corrección
    corrige: int | None = None   # número de la anotación a la que se refiere
    momento_propuesto: datetime | None = None
    huella_anterior: str = ORIGEN
    huella: str = ""

    def _cuerpo(self) -> str:
        datos = asdict(self)
        datos.pop("huella")
        datos["tipo"] = self.tipo.value
        datos["parte"] = self.parte.value
        for campo in ("momento", "anotado_en", "momento_propuesto"):
            valor = datos[campo]
            datos[campo] = valor.isoformat() if isinstance(valor, datetime) else None
        return json.dumps(datos, sort_keys=True, ensure_ascii=False, separators=(",", ":"))

    def calcular_huella(self) -> str:
        return hashlib.sha256(self._cuerpo().encode("utf-8")).hexdigest()


class RegistroCorrupto(Exception):
    """La cadena no cuadra: alguien ha tocado el libro por detrás."""


class CorreccionInvalida(Exception):
    """Se ha intentado corregir de una forma que el decreto no admite."""


@dataclass
class Libro:
    """El registro de una empresa. Solo se le añade; nunca se le quita."""

    empresa: str
    anotaciones: list[Anotacion] = field(default_factory=list)

    # ------------------------------------------------------------- escribir

    def _anadir(self, **campos) -> Anotacion:
        anterior = self.anotaciones[-1].huella if self.anotaciones else ORIGEN
        sin_huella = Anotacion(
            numero=len(self.anotaciones) + 1,
            huella_anterior=anterior,
            **campos,
        )
        anotacion = Anotacion(**{**asdict(sin_huella),
                                 "tipo": sin_huella.tipo,
                                 "parte": sin_huella.parte,
                                 "huella": sin_huella.calcular_huella()})
        self.anotaciones.append(anotacion)
        return anotacion

    def fichar(self, trabajador: str, tipo: Tipo, momento: datetime,
               anotado_en: datetime | None = None, origen: str = "movil",
               autor: str | None = None, parte: Parte = Parte.TRABAJADOR) -> Anotacion:
        if tipo not in {Tipo.ENTRADA, Tipo.SALIDA, Tipo.PAUSA_INICIO, Tipo.PAUSA_FIN}:
            raise CorreccionInvalida(f"{tipo.value} no es un fichaje")
        return self._anadir(
            trabajador=trabajador, tipo=tipo, momento=momento,
            anotado_en=anotado_en or momento, autor=autor or trabajador,
            parte=parte, origen=origen,
        )

    def proponer_correccion(self, numero: int, momento_propuesto: datetime, motivo: str,
                            autor: str, parte: Parte, anotado_en: datetime) -> Anotacion:
        """Propone cambiar la hora de un fichaje. No cambia nada todavía."""
        original = self.anotacion(numero)
        if original.tipo not in {Tipo.ENTRADA, Tipo.SALIDA, Tipo.PAUSA_INICIO, Tipo.PAUSA_FIN}:
            raise CorreccionInvalida("Solo se corrigen fichajes, no correcciones")
        if not motivo.strip():
            raise CorreccionInvalida("El decreto exige constancia de por qué se cambió")
        return self._anadir(
            trabajador=original.trabajador, tipo=Tipo.CORRECCION_PROPUESTA,
            momento=original.momento, momento_propuesto=momento_propuesto,
            anotado_en=anotado_en, autor=autor, parte=parte,
            motivo=motivo, corrige=numero,
        )

    def resolver_correccion(self, numero: int, acepta: bool, autor: str,
                            parte: Parte, anotado_en: datetime) -> Anotacion:
        """Acepta o rechaza una propuesta. Tiene que hacerlo la otra parte."""
        propuesta = self.anotacion(numero)
        if propuesta.tipo is not Tipo.CORRECCION_PROPUESTA:
            raise CorreccionInvalida(f"La anotación {numero} no es una propuesta")
        if parte is propuesta.parte:
            raise CorreccionInvalida(
                "Una corrección exige el acuerdo de las dos partes: no puede "
                "aceptarla quien la propuso"
            )
        if self._resolucion_de(numero) is not None:
            raise CorreccionInvalida(f"La propuesta {numero} ya está resuelta")
        return self._anadir(
            trabajador=propuesta.trabajador,
            tipo=Tipo.CORRECCION_ACEPTADA if acepta else Tipo.CORRECCION_RECHAZADA,
            momento=propuesta.momento, momento_propuesto=propuesta.momento_propuesto,
            anotado_en=anotado_en, autor=autor, parte=parte, corrige=numero,
        )

    # -------------------------------------------------------------- consultar

    def anotacion(self, numero: int) -> Anotacion:
        if not 1 <= numero <= len(self.anotaciones):
            raise CorreccionInvalida(f"No existe la anotación {numero}")
        return self.anotaciones[numero - 1]

    def _resolucion_de(self, numero: int) -> Anotacion | None:
        for a in self.anotaciones:
            if a.corrige == numero and a.tipo in {Tipo.CORRECCION_ACEPTADA,
                                                  Tipo.CORRECCION_RECHAZADA}:
                return a
        return None

    def momento_vigente(self, numero: int) -> datetime:
        """La hora que vale hoy de un fichaje: la corregida si se aceptó."""
        fichaje = self.anotacion(numero)
        vigente = fichaje.momento
        for a in self.anotaciones:
            if a.tipo is not Tipo.CORRECCION_ACEPTADA:
                continue
            propuesta = self.anotacion(a.corrige)
            if propuesta.corrige == numero and propuesta.momento_propuesto:
                vigente = propuesta.momento_propuesto
        return vigente

    def verificar(self) -> None:
        """Recorre la cadena entera. Si algo no cuadra, dice dónde."""
        anterior = ORIGEN
        for posicion, a in enumerate(self.anotaciones, start=1):
            if a.numero != posicion:
                raise RegistroCorrupto(
                    f"La anotación en la posición {posicion} dice ser la {a.numero}: "
                    f"se ha quitado o reordenado algo"
                )
            if a.huella_anterior != anterior:
                raise RegistroCorrupto(
                    f"La anotación {a.numero} no engancha con la anterior: "
                    f"falta una anotación por el medio"
                )
            if a.huella != a.calcular_huella():
                raise RegistroCorrupto(
                    f"La anotación {a.numero} ({a.tipo.value} de {a.trabajador}, "
                    f"{a.momento:%d/%m/%Y %H:%M}) se ha modificado después de escribirse"
                )
            anterior = a.huella
