"""El registro de jornada: un libro al que solo se puede añadir.

La idea entera del producto está en este fichero. Lo que hace falta no es una
app de fichar, sino un registro que aguante que lo miren, y eso son cinco cosas:

**Nada se borra ni se reescribe.** Un fichaje mal puesto no se corrige
machacándolo: se añade una corrección que apunta al original. Los dos quedan.

**Cada anotación va encadenada a la anterior por su huella.** Si alguien edita
la base de datos por detrás, la cadena se rompe y `verificar` dice dónde.

**Lo que se firma son identidades, no nombres.** La empresa, el centro y la
persona entran en la huella por su identificador estable. Los nombres viven en
`organizacion.py` y se pueden corregir sin invalidar nada: si el nombre formara
parte de la firma, arreglar una errata rompería el libro entero.

**El instante es inequívoco.** Todas las fechas llevan zona horaria y se firman
en UTC; el huso del centro se guarda al lado, como identificador IANA, para
poder reconstruir la hora local sin ambigüedad. Un desfase fijo no serviría:
cambia dos veces al año.

**La hora no puede fabricarse a posteriori sin que se vea.** La cadena solo
prueba el orden en que se escribió. Así que el libro guarda además cuándo se
escribió cada anotación, exige que ese momento nunca retroceda, prohíbe anotar
el futuro, y marca como retroactiva toda anotación escrita mucho después del
instante que dice registrar. Insertar un fichaje viejo sigue siendo posible
—a veces hay que hacerlo— pero llega a la nómina con la etiqueta puesta.

Y una corrección necesita a los dos: es una propuesta que la otra parte acepta
o rechaza, y hasta que la acepta no cuenta para nada.
"""

import hashlib
import json
from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta, timezone
from enum import Enum

from .organizacion import validar_zona


class Tipo(str, Enum):
    ENTRADA = "entrada"
    SALIDA = "salida"
    PAUSA_INICIO = "pausa_inicio"
    PAUSA_FIN = "pausa_fin"
    CORRECCION_PROPUESTA = "correccion_propuesta"
    CORRECCION_ACEPTADA = "correccion_aceptada"
    CORRECCION_DISCREPANCIA = "correccion_discrepancia"
    # Se escribía así antes de llamar a las cosas por su nombre. No se escribe
    # nunca más, pero se sigue leyendo: las anotaciones que ya lo llevan
    # calcularon su huella con esta palabra, y cambiársela las invalidaría.
    CORRECCION_RECHAZADA = "correccion_rechazada"


class Parte(str, Enum):
    EMPRESA = "empresa"
    TRABAJADOR = "trabajador"


FICHAJES = {Tipo.ENTRADA, Tipo.SALIDA, Tipo.PAUSA_INICIO, Tipo.PAUSA_FIN}

# Una propuesta se cierra aceptándola o dejando constancia del desacuerdo. Las
# dos cosas la cierran; ninguna borra nada.
RESOLUCIONES = {Tipo.CORRECCION_ACEPTADA, Tipo.CORRECCION_DISCREPANCIA,
                Tipo.CORRECCION_RECHAZADA}

# La huella de la que cuelga la primera anotación de cada empresa.
ORIGEN = "0" * 64

# A partir de cuánto retraso entre lo que se registra y cuándo se registra
# consideramos que la anotación es retroactiva y hay que decirlo.
UMBRAL_RETROACTIVO = timedelta(minutes=5)

# Versión de la representación canónica. Sube cuando cambie QUÉ se firma o CÓMO
# se serializa, nunca en silencio: las anotaciones viejas se siguen verificando
# con la versión con la que nacieron.
#
#   1 · (retirada antes de existir ningún dato) nombres como identidad, fechas
#       sin zona horaria, serialización derivada del orden de los campos.
#   2 · identidades estables, fechas con zona horaria firmadas en UTC, y una
#       lista de campos explícita y ordenada a mano.
VERSION_ACTUAL = 2


class AnotacionInvalida(Exception):
    """Se ha intentado escribir algo que el registro no admite."""


class VersionDesconocida(Exception):
    """La anotación dice usar una versión que este código no sabe verificar."""


class IntegridadRota(Exception):
    """Se iba a escribir detrás de una anotación que alguien ha manipulado."""


def _utc(momento: datetime | None) -> str | None:
    """Un instante, siempre en UTC y siempre con el mismo aspecto.

    Se exige que venga con zona horaria: un datetime «desnudo» significa cosas
    distintas según quién lo lea, y eso no puede entrar en una firma.
    """
    if momento is None:
        return None
    if momento.tzinfo is None or momento.utcoffset() is None:
        raise AnotacionInvalida(
            "Las fechas del libro tienen que llevar zona horaria. Un instante "
            "sin huso no significa nada fuera del ordenador que lo escribió."
        )
    return momento.astimezone(timezone.utc).isoformat()


@dataclass(frozen=True)
class Anotacion:
    version: int
    empresa_id: str
    centro_id: str
    trabajador_id: str
    numero: int                  # posición en el libro de la empresa, desde 1
    tipo: Tipo
    momento: datetime            # el instante que se registra
    anotado_en: datetime         # cuándo se escribió en el libro
    zona_horaria: str            # huso IANA del centro al escribirla
    autor_id: str                # quién la escribe
    parte: Parte                 # y en nombre de quién: empresa o trabajador
    origen: str = ""             # móvil, QR, panel…
    motivo: str = ""             # obligatorio al proponer una corrección
    corrige: int | None = None   # número de la anotación a la que se refiere
    momento_propuesto: datetime | None = None
    huella_anterior: str = ORIGEN
    huella: str = ""

    # ------------------------------------------------- serialización canónica

    def _campos_v2(self) -> list[str | int | None]:
        """Los campos que se firman, en este orden y con esta representación.

        La lista está escrita a mano a propósito. Derivarla de la clase haría
        que añadir un campo cambiase la huella sin que nadie lo decidiera: así,
        tocar la firma obliga a venir aquí y a subir la versión.
        """
        return [
            self.version,
            self.empresa_id,
            self.centro_id,
            self.trabajador_id,
            self.numero,
            self.tipo.value,
            _utc(self.momento),
            _utc(self.anotado_en),
            self.zona_horaria,
            self.autor_id,
            self.parte.value,
            self.origen,
            self.motivo,
            self.corrige,
            _utc(self.momento_propuesto),
            self.huella_anterior,
        ]

    def cuerpo_canonico(self) -> bytes:
        """Los bytes exactos que se pasan por SHA-256.

        Un array JSON, no un objeto: el orden es explícito y no depende de cómo
        ordene las claves nadie. Sin espacios, sin escapar acentos, y con la
        versión de primera, para que dos versiones jamás produzcan los mismos
        bytes.
        """
        if self.version != 2:
            raise VersionDesconocida(
                f"La anotación {self.numero} dice usar la versión {self.version} "
                f"de la representación, y este código solo conoce la 2."
            )
        return json.dumps(self._campos_v2(), ensure_ascii=False,
                          separators=(",", ":")).encode("utf-8")

    def calcular_huella(self) -> str:
        return hashlib.sha256(self.cuerpo_canonico()).hexdigest()

    @property
    def retroactiva(self) -> bool:
        """El fichaje se escribió bastante después de la hora que dice registrar."""
        return self.tipo in FICHAJES and self.anotado_en - self.momento > UMBRAL_RETROACTIVO

    def local(self, momento: datetime | None = None) -> datetime:
        """El instante visto desde el centro de trabajo."""
        from zoneinfo import ZoneInfo
        return (momento or self.momento).astimezone(ZoneInfo(self.zona_horaria))


class RegistroCorrupto(Exception):
    """La cadena no cuadra: alguien ha tocado el libro por detrás."""


# ----------------------------------------------------------- construir y validar

def construir_anotacion(anterior: Anotacion | None, empresa_id: str,
                        **campos) -> Anotacion:
    """Encadena una anotación nueva detrás de la última.

    Vive fuera de `Libro` a propósito: la implementación en memoria y la de
    PostgreSQL tienen que construir las anotaciones con este mismo código, o
    dejarían de producir libros idénticos.
    """
    momento = campos["momento"]
    anotado_en = campos["anotado_en"]
    if anotado_en is None:
        # Quien ficha en vivo no pasa hora de escritura: la pone el libro aquí,
        # ya dentro del bloqueo, que es el último instante posible antes de
        # encadenar.
        anotado_en = datetime.now(timezone.utc)
    _utc(momento), _utc(anotado_en)          # exige zona horaria en ambas
    validar_zona(campos["zona_horaria"])

    if momento > anotado_en:
        raise AnotacionInvalida(
            f"No se puede anotar un momento futuro: {momento.isoformat()} se "
            f"está escribiendo el {anotado_en.isoformat()}"
        )
    if anterior is not None:
        # Fallar cerrado. Encadenar detrás de una anotación manipulada la
        # convertiría en parte de una cadena aparentemente sana, y cada fichaje
        # nuevo enterraría un poco más el problema. Comprobar solo la última es
        # O(1); verificar el libro entero en cada fichaje no escalaría, y para
        # eso está `verificar_cadena`.
        if anterior.huella != anterior.calcular_huella():
            raise IntegridadRota(
                f"La anotación {anterior.numero} del libro de {empresa_id} no "
                f"cuadra con su propia huella. No se escribe nada más encima "
                f"hasta que alguien lo mire."
            )
        if anterior.empresa_id != empresa_id:
            raise AnotacionInvalida(
                "La anotación anterior es del libro de otra empresa"
            )
        if anotado_en < anterior.anotado_en:
            # El libro no retrocede, pero rechazar aquí sería un error caro.
            #
            # Con cien personas fichando a la vez, cada petición lee el reloj
            # cuando entra y el orden de escritura lo decide el bloqueo, que es
            # otro. Dos fichajes separados por milisegundos pueden capturar las
            # horas en un orden y llegar al libro en el contrario, y el que
            # llega segundo con la hora anterior es un fichaje perfectamente
            # legítimo: rechazarlo deja a alguien sin fichar a las ocho de la
            # mañana. Medido antes de este ajuste: 29 de cada 100 rechazados.
            #
            # Así que se ajusta la hora de ESCRITURA a la de la anotación
            # anterior, que además es lo cierto —se está escribiendo ahora,
            # después de aquella—, y no se toca la hora del FICHAJE, que es el
            # dato laboral. Como efecto secundario, esto también impide fechar
            # una escritura en el pasado: ya no hay forma de decir que algo se
            # escribió antes de lo que se escribió.
            anotado_en = anterior.anotado_en

    campos = {**campos, "anotado_en": anotado_en}
    borrador = Anotacion(
        version=VERSION_ACTUAL,
        empresa_id=empresa_id,
        numero=anterior.numero + 1 if anterior else 1,
        huella_anterior=anterior.huella if anterior else ORIGEN,
        **campos,
    )
    return replace(borrador, huella=borrador.calcular_huella())



# ------------------------------------------- las reglas, en un solo sitio
#
# Devuelven los campos de la anotación que toca escribir, ya validados. Las usan
# por igual el libro en memoria y el de PostgreSQL: si cada implementación
# llevara su copia, tarde o temprano una aceptaría lo que la otra rechaza.

def campos_fichaje(trabajador_id: str, centro_id: str, tipo: Tipo, momento: datetime,
                   zona_horaria: str, anotado_en: datetime | None = None,
                   origen: str = "movil", autor_id: str | None = None,
                   parte: Parte = Parte.TRABAJADOR) -> dict:
    if tipo not in FICHAJES:
        raise AnotacionInvalida(f"{tipo.value} no es un fichaje")
    return dict(
        centro_id=centro_id, trabajador_id=trabajador_id, tipo=tipo,
        momento=momento, anotado_en=anotado_en or momento,
        zona_horaria=zona_horaria, autor_id=autor_id or trabajador_id,
        parte=parte, origen=origen,
    )


def campos_propuesta(original: Anotacion, momento_propuesto: datetime, motivo: str,
                     autor_id: str, parte: Parte, anotado_en: datetime,
                     hay_pendiente: bool = False) -> dict:
    if original.tipo not in FICHAJES:
        raise AnotacionInvalida("Solo se corrigen fichajes, no correcciones")
    if hay_pendiente:
        # Un fichaje con dos propuestas abiertas a la vez no tiene respuesta
        # buena: si se aceptan las dos, ¿cuál manda? Si se acepta una y se
        # discrepa de la otra, ¿qué queda escrito? Se resuelve la que hay y
        # luego se propone otra.
        raise AnotacionInvalida(
            f"El fichaje {original.numero} ya tiene una propuesta de cambio sin "
            f"contestar. Hay que resolver esa antes de proponer otra."
        )
    if not motivo.strip():
        raise AnotacionInvalida(
            "Una corrección sin motivo no se puede justificar después. "
            "Escribe por qué se cambia."
        )
    return dict(
        centro_id=original.centro_id, trabajador_id=original.trabajador_id,
        tipo=Tipo.CORRECCION_PROPUESTA, momento=original.momento,
        momento_propuesto=momento_propuesto, anotado_en=anotado_en,
        zona_horaria=original.zona_horaria, autor_id=autor_id, parte=parte,
        motivo=motivo, corrige=original.numero,
    )


def campos_resolucion(propuesta: Anotacion, ya_resuelta: bool, acepta: bool,
                      autor_id: str, parte: Parte, anotado_en: datetime) -> dict:
    """La respuesta de la otra parte: acepta, o deja constancia del desacuerdo.

    No hay una tercera opción, y la discrepancia no borra nada: la propuesta, su
    motivo, quién la hizo y quién no estuvo de acuerdo quedan los cuatro
    escritos. Ocultar el conflicto sería justamente perder el dato que hace
    falta el día que alguien pregunte.
    """
    if propuesta.tipo is not Tipo.CORRECCION_PROPUESTA:
        raise AnotacionInvalida(f"La anotación {propuesta.numero} no es una propuesta")
    if parte is propuesta.parte:
        raise AnotacionInvalida(
            "Una corrección exige el acuerdo de las dos partes: no puede "
            "aceptarla quien la propuso"
        )
    if ya_resuelta:
        raise AnotacionInvalida(f"La propuesta {propuesta.numero} ya está resuelta")
    return dict(
        centro_id=propuesta.centro_id, trabajador_id=propuesta.trabajador_id,
        tipo=Tipo.CORRECCION_ACEPTADA if acepta else Tipo.CORRECCION_DISCREPANCIA,
        momento=propuesta.momento, momento_propuesto=propuesta.momento_propuesto,
        anotado_en=anotado_en, zona_horaria=propuesta.zona_horaria,
        autor_id=autor_id, parte=parte, corrige=propuesta.numero,
    )


@dataclass(frozen=True)
class Veredicto:
    """El resultado de verificar un libro, para poder actuar sobre él."""

    valido: bool
    comprobadas: int
    primera_fallida: int | None = None
    motivo: str = ""

    def __bool__(self) -> bool:
        return self.valido


def verificar_cadena(anotaciones: list[Anotacion], empresa_id: str) -> Veredicto:
    """Recorre la cadena entera y dice si cuadra, y dónde deja de cuadrar.

    Es la misma función para el libro en memoria y para el que llega de la base
    de datos: si divergieran, la base de datos podría aceptar cosas que el
    dominio no.
    """
    anterior = ORIGEN
    anotado_en_previo: datetime | None = None

    for posicion, a in enumerate(anotaciones, start=1):
        def mal(motivo: str) -> Veredicto:
            return Veredicto(False, posicion - 1, a.numero, motivo)

        if a.version != VERSION_ACTUAL:
            return mal(f"usa la versión {a.version} de la representación, "
                       f"desconocida para este código")
        if a.numero != posicion:
            return mal(f"está en la posición {posicion} y dice ser la {a.numero}: "
                       f"se ha quitado o reordenado algo")
        if a.empresa_id != empresa_id:
            return mal(f"pertenece al libro de la empresa {a.empresa_id} y está "
                       f"en el de {empresa_id}")
        if a.huella_anterior != anterior:
            return mal("no engancha con la anterior: falta una anotación por el medio")
        if a.huella != a.calcular_huella():
            return mal(f"({a.tipo.value}, {a.momento.isoformat()}) se ha "
                       f"modificado después de escribirse")
        if a.momento > a.anotado_en:
            return mal(f"registra un momento futuro: {a.momento.isoformat()} "
                       f"escrito el {a.anotado_en.isoformat()}")
        if anotado_en_previo is not None and a.anotado_en < anotado_en_previo:
            return mal("dice haberse escrito antes que la anterior: el libro no "
                       "puede retroceder en el tiempo")

        anterior = a.huella
        anotado_en_previo = a.anotado_en

    return Veredicto(True, len(anotaciones))


# --------------------------------------------------------------------- el libro

@dataclass
class Libro:
    """El registro de una empresa, en memoria. Solo se le añade.

    Es la implementación de referencia: la de PostgreSQL tiene que producir
    exactamente los mismos libros.
    """

    empresa_id: str
    anotaciones: list[Anotacion] = field(default_factory=list)

    @property
    def ultima(self) -> Anotacion | None:
        return self.anotaciones[-1] if self.anotaciones else None

    def _anadir(self, **campos) -> Anotacion:
        anotacion = construir_anotacion(self.ultima, self.empresa_id, **campos)
        self.anotaciones.append(anotacion)
        return anotacion

    def fichar(self, trabajador_id: str, centro_id: str, tipo: Tipo,
               momento: datetime, zona_horaria: str, anotado_en: datetime | None = None,
               origen: str = "movil", autor_id: str | None = None,
               parte: Parte = Parte.TRABAJADOR) -> Anotacion:
        return self._anadir(**campos_fichaje(
            trabajador_id, centro_id, tipo, momento, zona_horaria, anotado_en,
            origen, autor_id, parte))

    def proponer_correccion(self, numero: int, momento_propuesto: datetime, motivo: str,
                            autor_id: str, parte: Parte, anotado_en: datetime) -> Anotacion:
        """Propone cambiar la hora de un fichaje. No cambia nada todavía."""
        return self._anadir(**campos_propuesta(
            self.anotacion(numero), momento_propuesto, motivo, autor_id, parte,
            anotado_en, hay_pendiente=self.hay_propuesta_pendiente(numero)))

    def resolver_correccion(self, numero: int, acepta: bool, autor_id: str,
                            parte: Parte, anotado_en: datetime) -> Anotacion:
        """Acepta o rechaza una propuesta. Tiene que hacerlo la otra parte."""
        propuesta = self.anotacion(numero)
        return self._anadir(**campos_resolucion(
            propuesta, self._resolucion_de(numero) is not None, acepta, autor_id,
            parte, anotado_en))

    # -------------------------------------------------------------- consultar

    def anotacion(self, numero: int) -> Anotacion:
        if not 1 <= numero <= len(self.anotaciones):
            raise AnotacionInvalida(f"No existe la anotación {numero}")
        return self.anotaciones[numero - 1]

    def hay_propuesta_pendiente(self, numero_fichaje: int) -> bool:
        """Si ese fichaje tiene una propuesta esperando respuesta."""
        for a in self.anotaciones:
            if (a.tipo is Tipo.CORRECCION_PROPUESTA and a.corrige == numero_fichaje
                    and self._resolucion_de(a.numero) is None):
                return True
        return False

    def _resolucion_de(self, numero: int) -> Anotacion | None:
        for a in self.anotaciones:
            if a.corrige == numero and a.tipo in RESOLUCIONES:
                return a
        return None

    def correcciones_vigentes(self) -> dict[int, datetime]:
        """Las horas que hoy sustituyen a las originales, en una sola pasada.

        Si un mismo fichaje llegó a tener dos correcciones aceptadas, manda la
        última acordada: el libro conserva las dos, pero la nómina usa la de
        arriba.
        """
        return correcciones_vigentes(self.anotaciones)

    def momento_vigente(self, numero: int) -> datetime:
        """La hora que vale hoy de un fichaje: la corregida si se aceptó.

        Recorre el libro entero. Para calcular muchas de golpe usa
        `correcciones_vigentes()` una vez, en lugar de llamar aquí en un bucle.
        """
        return self.correcciones_vigentes().get(numero, self.anotacion(numero).momento)

    def retroactivas(self) -> list[Anotacion]:
        """Los fichajes escritos mucho después de la hora que dicen registrar."""
        return [a for a in self.anotaciones if a.retroactiva]

    def verificar(self) -> Veredicto:
        veredicto = verificar_cadena(self.anotaciones, self.empresa_id)
        if not veredicto:
            raise RegistroCorrupto(
                f"La anotación {veredicto.primera_fallida} {veredicto.motivo}"
            )
        return veredicto


def correcciones_vigentes(anotaciones: list[Anotacion]) -> dict[int, datetime]:
    """Igual que el método del libro, pero sobre una lista suelta.

    Lo necesita el libro que llega de la base de datos, que es una lista y no un
    `Libro`.
    """
    por_numero = {a.numero: a for a in anotaciones}
    vigentes: dict[int, datetime] = {}
    for a in anotaciones:
        if a.tipo is not Tipo.CORRECCION_ACEPTADA:
            continue
        propuesta = por_numero.get(a.corrige)
        if propuesta and propuesta.corrige is not None and propuesta.momento_propuesto:
            vigentes[propuesta.corrige] = propuesta.momento_propuesto
    return vigentes
