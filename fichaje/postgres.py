"""El libro guardado en PostgreSQL.

El dominio no sabe que esto existe. Aquí no se decide ninguna regla laboral: las
anotaciones se construyen con `construir_anotacion` y se validan con las mismas
funciones que usa el libro en memoria, porque dos copias de una regla acaban
siempre discrepando.

Lo que sí se decide aquí es cómo se escribe sin romper la cadena cuando dos
personas fichan a la vez, que es el único problema de verdad de esta capa.

**El bloqueo.** Antes de leer la última anotación se pide
`pg_advisory_xact_lock` sobre la empresa. Es un bloqueo que dura lo que dura la
transacción y se suelta solo, incluso si el proceso se muere. Bloquea *una
empresa*, no la tabla: los fichajes de un bar no esperan a los de un taller.
Dos empresas distintas pueden coincidir en la misma clave del bloqueo, porque
`hashtext` devuelve un entero de 32 bits; cuando pasa, una espera a la otra unos
milisegundos. Es una molestia rarísima, no un error.

**La red debajo.** Si algún día ese bloqueo fallara —un `INSERT` a mano, un
proceso que se lo salta— la tabla tiene `unique (empresa_id, huella_anterior)`:
dos anotaciones no pueden decir que cuelgan de la misma. Una bifurcación de la
cadena es literalmente imposible de escribir, la pida quien la pida.

**Solo se añade.** El rol de la aplicación tiene `SELECT` e `INSERT` sobre las
anotaciones y nada más, y un disparador rechaza cualquier `UPDATE` o `DELETE`
aunque lo intente el dueño de la tabla. Ninguna de las dos cosas detiene a un
superusuario: eso no lo detiene nadie, y por eso está la cadena de huellas, que
no lo impide pero lo delata.
"""

import os
from dataclasses import dataclass
from datetime import datetime

import psycopg

from .registro import (
    Anotacion,
    AnotacionInvalida,
    Parte,
    Tipo,
    Veredicto,
    campos_fichaje,
    campos_propuesta,
    campos_resolucion,
    construir_anotacion,
    verificar_cadena,
)

DSN_POR_DEFECTO = "postgresql://postgres@127.0.0.1:5433/fichaje"


def dsn() -> str:
    return os.environ.get("FICHAJE_DSN", DSN_POR_DEFECTO)


def conectar(cadena: str | None = None) -> psycopg.Connection:
    """Una conexión que siempre habla en UTC y no se queda a medias.

    La zona de sesión se fija en UTC: sin eso PostgreSQL devolvería los
    instantes en el huso del servidor y la huella dejaría de recalcularse igual
    al releerla, que es justo lo que no puede pasar.

    Y `autocommit`, que no es un atajo. Sin él psycopg abre una transacción con
    la primera consulta y la deja abierta hasta que alguien confirma, así que
    una conexión que solo ha leído se queda «ociosa en transacción» reteniendo
    un bloqueo sobre la tabla y frenando a las demás. Las escrituras que de
    verdad tienen que ser indivisibles abren su transacción a mano, con
    `with conexion.transaction()`.
    """
    conexion = psycopg.connect(cadena or dsn(), autocommit=True)
    conexion.execute("set time zone 'UTC'")
    return conexion


CAMPOS = (
    "empresa_id::text, numero, version, centro_id::text, trabajador_id::text, "
    "tipo, momento, anotado_en, zona_horaria, autor_id::text, parte, origen, "
    "motivo, corrige, momento_propuesto, huella_anterior, huella"
)


def crear_esquema(conexion: psycopg.Connection | None = None) -> None:
    """Deja la base con la forma que toca, aplicando las migraciones.

    Aquí vivía el esquema entero copiado en una constante. Era la segunda
    versión de la verdad, y pasó lo que pasa siempre: se añadió un tipo nuevo de
    anotación en una migración y esta copia se quedó atrás, así que las pruebas
    que la usaban rechazaban datos que la base real aceptaba. La forma de la
    base de datos se define en `migraciones/`, y en ningún otro sitio.
    """
    from .migrar import aplicar
    aplicar()


def _fila_a_anotacion(fila) -> Anotacion:
    (empresa_id, numero, version, centro_id, trabajador_id, tipo, momento,
     anotado_en, zona_horaria, autor_id, parte, origen, motivo, corrige,
     momento_propuesto, huella_anterior, huella) = fila
    return Anotacion(
        version=version, empresa_id=empresa_id, centro_id=centro_id,
        trabajador_id=trabajador_id, numero=numero, tipo=Tipo(tipo),
        momento=momento, anotado_en=anotado_en, zona_horaria=zona_horaria,
        autor_id=autor_id, parte=Parte(parte), origen=origen, motivo=motivo,
        corrige=corrige, momento_propuesto=momento_propuesto,
        huella_anterior=huella_anterior.strip(), huella=huella.strip(),
    )


def _insertar(cur, a: Anotacion) -> None:
    cur.execute(
        "insert into anotacion (empresa_id, numero, version, centro_id, "
        "trabajador_id, tipo, momento, anotado_en, zona_horaria, autor_id, "
        "parte, origen, motivo, corrige, momento_propuesto, huella_anterior, "
        "huella) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (a.empresa_id, a.numero, a.version, a.centro_id, a.trabajador_id,
         a.tipo.value, a.momento, a.anotado_en, a.zona_horaria, a.autor_id,
         a.parte.value, a.origen, a.motivo, a.corrige, a.momento_propuesto,
         a.huella_anterior, a.huella),
    )


@dataclass
class LibroPostgres:
    """El libro de una empresa, guardado. Mismas operaciones que el de memoria."""

    empresa_id: str
    conexion: psycopg.Connection

    # ------------------------------------------------------------- escribir

    def _anadir(self, campos: dict | None = None, decidir=None) -> Anotacion:
        """Encadena y escribe, todo dentro de una transacción.

        Leer la última anotación y escribir la siguiente tiene que ser
        indivisible: si dos fichajes leyeran la misma «última», los dos
        construirían la número siguiente y uno de los dos sobraría.

        `decidir` es para las operaciones que además necesitan **mirar el estado
        del libro antes de decidir si pueden escribir**, como resolver una
        corrección. Recibe el cursor y devuelve los campos, y se ejecuta ya
        dentro del bloqueo.

        Esto no es un adorno arquitectónico: cuando esas lecturas se hacían
        fuera, cien intentos simultáneos de resolver la misma propuesta
        escribían nueve resoluciones. Todos pasaban el control antes de que
        ninguno hubiera escrito.
        """
        with self.conexion.transaction():
            cur = self.conexion.cursor()
            cur.execute("select pg_advisory_xact_lock(hashtext(%s))",
                        (self.empresa_id,))
            if decidir is not None:
                campos = decidir(cur)
            cur.execute(
                f"select {CAMPOS} from anotacion where empresa_id = %s "
                f"order by numero desc limit 1", (self.empresa_id,))
            fila = cur.fetchone()
            anterior = _fila_a_anotacion(fila) if fila else None
            anotacion = construir_anotacion(anterior, self.empresa_id, **campos)
            _insertar(cur, anotacion)
        return anotacion

    # Lecturas que se hacen con el cursor de la transacción en curso, para que
    # lo que se lee y lo que se escribe no puedan separarse.

    def _anotacion_en(self, cur, numero: int) -> Anotacion:
        cur.execute(f"select {CAMPOS} from anotacion where empresa_id = %s "
                    f"and numero = %s", (self.empresa_id, numero))
        fila = cur.fetchone()
        if fila is None:
            raise AnotacionInvalida(f"No existe la anotación {numero}")
        return _fila_a_anotacion(fila)

    def _resuelta_en(self, cur, numero: int) -> bool:
        cur.execute(
            "select 1 from anotacion where empresa_id = %s and corrige = %s "
            "and tipo in ('correccion_aceptada', 'correccion_discrepancia', "
            "'correccion_rechazada') limit 1",
            (self.empresa_id, numero))
        return cur.fetchone() is not None

    def _pendiente_en(self, cur, numero_fichaje: int) -> bool:
        """Si el fichaje tiene una propuesta esperando respuesta."""
        cur.execute(
            "select 1 from anotacion p where p.empresa_id = %s and p.corrige = %s "
            "and p.tipo = 'correccion_propuesta' and not exists ("
            "  select 1 from anotacion r where r.empresa_id = p.empresa_id "
            "  and r.corrige = p.numero and r.tipo in ('correccion_aceptada',"
            "  'correccion_discrepancia','correccion_rechazada')) limit 1",
            (self.empresa_id, numero_fichaje))
        return cur.fetchone() is not None

    def resultado_de(self, clave: str) -> Anotacion | None:
        """Lo que se escribió con esta clave, si ya se escribió algo.

        Hay que poder preguntarlo ANTES de validar nada más: un reintento de la
        red repite una petición que en su día fue legítima, y el estado del
        trabajador ya ha cambiado por culpa de la primera.
        """
        fila = self.conexion.execute(
            "select numero from peticion_fichaje where clave = %s", (clave,)).fetchone()
        return self.anotacion(fila[0]) if fila else None

    def fichar_una_sola_vez(self, clave: str, **campos) -> tuple[Anotacion, bool]:
        """Ficha, y si la misma petición vuelve, devuelve lo que ya se escribió.

        Un doble toque, un reenvío de Safari al volver la cobertura o un
        refresco de pantalla no pueden convertirse en dos fichajes. La clave de
        la petición se escribe en la **misma transacción** que la anotación, así
        que o entran las dos o no entra ninguna; no hay ventana en la que exista
        la anotación y no su clave.

        Devuelve (anotación, ya_estaba).
        """
        ya = self.conexion.execute(
            "select numero from peticion_fichaje where clave = %s", (clave,)).fetchone()
        if ya:
            return self.anotacion(ya[0]), True
        try:
            with self.conexion.transaction():
                cur = self.conexion.cursor()
                cur.execute("select pg_advisory_xact_lock(hashtext(%s))",
                            (self.empresa_id,))
                cur.execute(
                    f"select {CAMPOS} from anotacion where empresa_id = %s "
                    f"order by numero desc limit 1", (self.empresa_id,))
                fila = cur.fetchone()
                anterior = _fila_a_anotacion(fila) if fila else None
                anotacion = construir_anotacion(anterior, self.empresa_id, **campos)
                _insertar(cur, anotacion)
                cur.execute(
                    "insert into peticion_fichaje (clave, empresa_id, numero) "
                    "values (%s, %s, %s)",
                    (clave, self.empresa_id, anotacion.numero))
            return anotacion, False
        except psycopg.errors.UniqueViolation:
            # Dos peticiones idénticas a la vez: una escribió, la otra chocó
            # contra la clave. La que chocó devuelve lo que escribió la primera.
            ya = self.conexion.execute(
                "select numero from peticion_fichaje where clave = %s",
                (clave,)).fetchone()
            if ya:
                return self.anotacion(ya[0]), True
            raise

    def fichar(self, trabajador_id: str, centro_id: str, tipo: Tipo,
               momento: datetime, zona_horaria: str, anotado_en: datetime | None = None,
               origen: str = "movil", autor_id: str | None = None,
               parte: Parte = Parte.TRABAJADOR) -> Anotacion:
        return self._anadir(campos_fichaje(
            trabajador_id, centro_id, tipo, momento, zona_horaria, anotado_en,
            origen, autor_id, parte))

    def proponer_correccion(self, numero: int, momento_propuesto: datetime, motivo: str,
                            autor_id: str, parte: Parte, anotado_en: datetime) -> Anotacion:
        """Propone cambiar la hora de un fichaje.

        Mira dentro del bloqueo si ese fichaje ya tiene una propuesta sin
        contestar: dos abiertas a la vez no tienen respuesta buena.
        """
        return self._anadir(decidir=lambda cur: campos_propuesta(
            self._anotacion_en(cur, numero), momento_propuesto, motivo, autor_id,
            parte, anotado_en, hay_pendiente=self._pendiente_en(cur, numero)))

    def resolver_correccion(self, numero: int, acepta: bool, autor_id: str,
                            parte: Parte, anotado_en: datetime) -> Anotacion:
        """Acepta o registra discrepancia sobre una propuesta.

        La comprobación de «sigue sin resolver» ocurre dentro del bloqueo. Fuera
        de él, cien intentos simultáneos escribían nueve resoluciones.
        """
        return self._anadir(decidir=lambda cur: campos_resolucion(
            self._anotacion_en(cur, numero), self._resuelta_en(cur, numero),
            acepta, autor_id, parte, anotado_en))

    # -------------------------------------------------------------- consultar

    def anotaciones(self) -> list[Anotacion]:
        cur = self.conexion.execute(
            f"select {CAMPOS} from anotacion where empresa_id = %s order by numero",
            (self.empresa_id,))
        return [_fila_a_anotacion(f) for f in cur.fetchall()]

    def anotacion(self, numero: int) -> Anotacion:
        cur = self.conexion.execute(
            f"select {CAMPOS} from anotacion where empresa_id = %s and numero = %s",
            (self.empresa_id, numero))
        fila = cur.fetchone()
        if fila is None:
            raise AnotacionInvalida(f"No existe la anotación {numero}")
        return _fila_a_anotacion(fila)

    def _resuelta(self, numero: int) -> bool:
        cur = self.conexion.execute(
            "select 1 from anotacion where empresa_id = %s and corrige = %s "
            "and tipo in ('correccion_aceptada', 'correccion_discrepancia', "
            "'correccion_rechazada') limit 1",
            (self.empresa_id, numero))
        return cur.fetchone() is not None

    def verificar(self) -> Veredicto:
        """Lee el libro entero de la base de datos y lo comprueba.

        Usa la misma función que el libro en memoria a propósito: si la
        verificación de la base de datos fuera otra, podría dar por buena una
        cadena que el dominio rechaza.
        """
        return verificar_cadena(self.anotaciones(), self.empresa_id)
