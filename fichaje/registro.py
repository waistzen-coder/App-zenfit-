"""El registro de jornada: un libro al que solo se puede añadir.

La idea entera del producto está en este fichero. El decreto no pide una app de
fichar; pide un registro que aguante una inspección, y eso son cuatro cosas:

**Nada se borra ni se reescribe.** Un fichaje mal puesto no se corrige
machacándolo: se añade una corrección que apunta al original. Los dos quedan.
Cuando la Inspección pregunte «¿esta hora se ha tocado?», la respuesta está en
el propio libro.

**Cada anotación va encadenada a la anterior por su huella.** Si alguien edita
la base de datos por detrás para arreglar un mes entero, la cadena se rompe y
`verificar` dice exactamente en qué anotación.

**El libro de una empresa no vale en otra.** La empresa entra en la huella, así
que un bloque de anotaciones trasplantado de otro libro no verifica. Sin esto,
las anotaciones de un bar servían tal cual en el libro de un taller.

**La hora no puede fabricarse a posteriori sin que se vea.** La cadena solo
prueba el orden en que se escribió, no que la hora sea verdad, así que el libro
guarda además cuándo se escribió cada anotación, exige que ese momento nunca
retroceda, prohíbe fichar en el futuro y marca como retroactiva toda anotación
escrita mucho después del instante que dice registrar. Un fichaje inventado tres
meses tarde sigue pudiendo escribirse —a veces hay que hacerlo, y por eso no se
prohíbe— pero llega a la nómina con la etiqueta puesta.

Y una corrección necesita a los dos. El decreto dice que corregir un fichaje
exige el acuerdo entre empresa y persona trabajadora. Así que aquí una
corrección no es un cambio: es una propuesta que la otra parte acepta o rechaza,
y hasta que la acepta no cuenta para nada.
"""

import hashlib
import json
from dataclasses import asdict, dataclass, field, replace
from datetime import datetime, timedelta
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


FICHAJES = {Tipo.ENTRADA, Tipo.SALIDA, Tipo.PAUSA_INICIO, Tipo.PAUSA_FIN}

# La huella de la que cuelga la primera anotación de cada empresa.
ORIGEN = "0" * 64

# A partir de cuánto retraso entre lo que se registra y cuándo se registra
# consideramos que la anotación es retroactiva y hay que decirlo.
UMBRAL_RETROACTIVO = timedelta(minutes=5)


@dataclass(frozen=True)
class Anotacion:
    empresa: str                 # entra en la huella: ata la anotación a su libro
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

    @property
    def retroactiva(self) -> bool:
        """El fichaje se escribió bastante después de la hora que dice registrar."""
        return self.tipo in FICHAJES and self.anotado_en - self.momento > UMBRAL_RETROACTIVO


class RegistroCorrupto(Exception):
    """La cadena no cuadra: alguien ha tocado el libro por detrás."""


class AnotacionInvalida(Exception):
    """Se ha intentado escribir algo que el registro no admite."""


# Nombre anterior, conservado para no romper a quien lo importe.
CorreccionInvalida = AnotacionInvalida


@dataclass
class Libro:
    """El registro de una empresa. Solo se le añade; nunca se le quita."""

    empresa: str
    anotaciones: list[Anotacion] = field(default_factory=list)

    # ------------------------------------------------------------- escribir

    def _anadir(self, **campos) -> Anotacion:
        ultima = self.anotaciones[-1] if self.anotaciones else None

        anotado_en = campos["anotado_en"]
        if campos["momento"] > anotado_en:
            raise AnotacionInvalida(
                f"No se puede anotar un momento futuro: "
                f"{campos['momento']:%d/%m/%Y %H:%M} se está escribiendo el "
                f"{anotado_en:%d/%m/%Y %H:%M}"
            )
        if ultima is not None and anotado_en < ultima.anotado_en:
            raise AnotacionInvalida(
                f"El libro no puede retroceder: la anotación {ultima.numero} se "
                f"escribió el {ultima.anotado_en:%d/%m/%Y %H:%M} y esta dice "
                f"escribirse el {anotado_en:%d/%m/%Y %H:%M}"
            )

        borrador = Anotacion(
            empresa=self.empresa,
            numero=len(self.anotaciones) + 1,
            huella_anterior=ultima.huella if ultima else ORIGEN,
            **campos,
        )
        anotacion = replace(borrador, huella=borrador.calcular_huella())
        self.anotaciones.append(anotacion)
        return anotacion

    def fichar(self, trabajador: str, tipo: Tipo, momento: datetime,
               anotado_en: datetime | None = None, origen: str = "movil",
               autor: str | None = None, parte: Parte = Parte.TRABAJADOR) -> Anotacion:
        if tipo not in FICHAJES:
            raise AnotacionInvalida(f"{tipo.value} no es un fichaje")
        return self._anadir(
            trabajador=trabajador, tipo=tipo, momento=momento,
            anotado_en=anotado_en or momento, autor=autor or trabajador,
            parte=parte, origen=origen,
        )

    def proponer_correccion(self, numero: int, momento_propuesto: datetime, motivo: str,
                            autor: str, parte: Parte, anotado_en: datetime) -> Anotacion:
        """Propone cambiar la hora de un fichaje. No cambia nada todavía."""
        original = self.anotacion(numero)
        if original.tipo not in FICHAJES:
            raise AnotacionInvalida("Solo se corrigen fichajes, no correcciones")
        if not motivo.strip():
            raise AnotacionInvalida("El decreto exige constancia de por qué se cambió")
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
            raise AnotacionInvalida(f"La anotación {numero} no es una propuesta")
        if parte is propuesta.parte:
            raise AnotacionInvalida(
                "Una corrección exige el acuerdo de las dos partes: no puede "
                "aceptarla quien la propuso"
            )
        if self._resolucion_de(numero) is not None:
            raise AnotacionInvalida(f"La propuesta {numero} ya está resuelta")
        return self._anadir(
            trabajador=propuesta.trabajador,
            tipo=Tipo.CORRECCION_ACEPTADA if acepta else Tipo.CORRECCION_RECHAZADA,
            momento=propuesta.momento, momento_propuesto=propuesta.momento_propuesto,
            anotado_en=anotado_en, autor=autor, parte=parte, corrige=numero,
        )

    # -------------------------------------------------------------- consultar

    def anotacion(self, numero: int) -> Anotacion:
        if not 1 <= numero <= len(self.anotaciones):
            raise AnotacionInvalida(f"No existe la anotación {numero}")
        return self.anotaciones[numero - 1]

    def _resolucion_de(self, numero: int) -> Anotacion | None:
        for a in self.anotaciones:
            if a.corrige == numero and a.tipo in {Tipo.CORRECCION_ACEPTADA,
                                                  Tipo.CORRECCION_RECHAZADA}:
                return a
        return None

    def correcciones_vigentes(self) -> dict[int, datetime]:
        """Las horas que hoy sustituyen a las originales, en una sola pasada.

        Si un mismo fichaje llegó a tener dos correcciones aceptadas, manda la
        última acordada: el libro conserva las dos, pero la nómina usa la de
        arriba.
        """
        vigentes: dict[int, datetime] = {}
        for a in self.anotaciones:
            if a.tipo is not Tipo.CORRECCION_ACEPTADA:
                continue
            propuesta = self.anotacion(a.corrige)
            if propuesta.corrige is not None and propuesta.momento_propuesto is not None:
                vigentes[propuesta.corrige] = propuesta.momento_propuesto
        return vigentes

    def momento_vigente(self, numero: int) -> datetime:
        """La hora que vale hoy de un fichaje: la corregida si se aceptó.

        Recorre el libro entero. Para calcular muchas de golpe, usa
        `correcciones_vigentes()` una vez en lugar de llamar aquí en un bucle.
        """
        return self.correcciones_vigentes().get(numero, self.anotacion(numero).momento)

    def retroactivas(self) -> list[Anotacion]:
        """Los fichajes escritos mucho después de la hora que dicen registrar."""
        return [a for a in self.anotaciones if a.retroactiva]

    def verificar(self) -> None:
        """Recorre la cadena entera. Si algo no cuadra, dice dónde."""
        anterior = ORIGEN
        anotado_en_previo: datetime | None = None
        for posicion, a in enumerate(self.anotaciones, start=1):
            if a.numero != posicion:
                raise RegistroCorrupto(
                    f"La anotación en la posición {posicion} dice ser la {a.numero}: "
                    f"se ha quitado o reordenado algo"
                )
            if a.empresa != self.empresa:
                raise RegistroCorrupto(
                    f"La anotación {a.numero} pertenece al libro de «{a.empresa}» "
                    f"y está en el de «{self.empresa}»"
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
            if a.momento > a.anotado_en:
                raise RegistroCorrupto(
                    f"La anotación {a.numero} registra un momento futuro: "
                    f"{a.momento:%d/%m/%Y %H:%M} escrito el "
                    f"{a.anotado_en:%d/%m/%Y %H:%M}"
                )
            if anotado_en_previo is not None and a.anotado_en < anotado_en_previo:
                raise RegistroCorrupto(
                    f"La anotación {a.numero} dice haberse escrito antes que la "
                    f"anterior: el libro no puede retroceder en el tiempo"
                )
            anterior = a.huella
            anotado_en_previo = a.anotado_en
