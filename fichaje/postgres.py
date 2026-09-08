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


ESQUEMA = """
create table if not exists empresa (
    id          uuid primary key,
    nombre      text not null,
    creada_en   timestamptz not null default now()
);

create table if not exists centro (
    id            uuid primary key,
    empresa_id    uuid not null references empresa(id),
    nombre        text not null,
    zona_horaria  text not null,
    creado_en     timestamptz not null default now()
);

create table if not exists trabajador (
    id          uuid primary key,
    empresa_id  uuid not null references empresa(id),
    nombre      text not null,
    activo      boolean not null default true,
    alta_en     timestamptz not null default now()
);

create table if not exists anotacion (
    empresa_id         uuid not null references empresa(id),
    numero             integer not null,
    version            smallint not null,
    centro_id          uuid not null references centro(id),
    trabajador_id      uuid not null references trabajador(id),
    tipo               text not null,
    momento            timestamptz not null,
    anotado_en         timestamptz not null,
    zona_horaria       text not null,
    autor_id           uuid not null,
    parte              text not null,
    origen             text not null default '',
    motivo             text not null default '',
    corrige            integer,
    momento_propuesto  timestamptz,
    huella_anterior    char(64) not null,
    huella             char(64) not null,

    primary key (empresa_id, numero),

    -- Una bifurcación de la cadena no se puede ni escribir: dos anotaciones no
    -- pueden colgar de la misma.
    constraint sin_bifurcacion unique (empresa_id, huella_anterior),
    constraint huella_unica unique (huella),

    constraint numero_desde_uno check (numero >= 1),
    constraint no_se_anota_el_futuro check (momento <= anotado_en),
    constraint tipo_conocido check (tipo in (
        'entrada', 'salida', 'pausa_inicio', 'pausa_fin',
        'correccion_propuesta', 'correccion_aceptada', 'correccion_rechazada')),
    constraint parte_conocida check (parte in ('empresa', 'trabajador')),
    constraint solo_las_correcciones_corrigen check (
        corrige is null or tipo in (
            'correccion_propuesta', 'correccion_aceptada', 'correccion_rechazada'))
);

create index if not exists anotacion_por_trabajador
    on anotacion (empresa_id, trabajador_id, numero);

-- El libro solo admite añadir. Esto no para a un superusuario decidido, pero sí
-- para un UPDATE despistado de la propia aplicación, que es el accidente que de
-- verdad va a ocurrir algún día.
create or replace function prohibir_cambios_en_el_libro() returns trigger
language plpgsql as $$
begin
    raise exception
        'El libro de fichajes solo admite añadir; se ha intentado % sobre la '
        'anotación %/% . Una corrección es una anotación nueva.',
        tg_op, old.empresa_id, old.numero;
end $$;

drop trigger if exists anotacion_solo_anadir on anotacion;
create trigger anotacion_solo_anadir
    before update or delete on anotacion
    for each row execute function prohibir_cambios_en_el_libro();
"""

CAMPOS = (
    "empresa_id::text, numero, version, centro_id::text, trabajador_id::text, "
    "tipo, momento, anotado_en, zona_horaria, autor_id::text, parte, origen, "
    "motivo, corrige, momento_propuesto, huella_anterior, huella"
)


def crear_esquema(conexion: psycopg.Connection) -> None:
    conexion.execute(ESQUEMA)
    conexion.commit()


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

    def _anadir(self, **campos) -> Anotacion:
        """Encadena y escribe, todo dentro de una transacción.

        Leer la última anotación y escribir la siguiente tiene que ser
        indivisible: si dos fichajes leyeran la misma «última», los dos
        construirían la número siguiente y uno de los dos sobraría.
        """
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
        return anotacion

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
        return self._anadir(**campos_fichaje(
            trabajador_id, centro_id, tipo, momento, zona_horaria, anotado_en,
            origen, autor_id, parte))

    def proponer_correccion(self, numero: int, momento_propuesto: datetime, motivo: str,
                            autor_id: str, parte: Parte, anotado_en: datetime) -> Anotacion:
        return self._anadir(**campos_propuesta(
            self.anotacion(numero), momento_propuesto, motivo, autor_id, parte,
            anotado_en))

    def resolver_correccion(self, numero: int, acepta: bool, autor_id: str,
                            parte: Parte, anotado_en: datetime) -> Anotacion:
        propuesta = self.anotacion(numero)
        return self._anadir(**campos_resolucion(
            propuesta, self._resuelta(numero), acepta, autor_id, parte, anotado_en))

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
            from .registro import AnotacionInvalida
            raise AnotacionInvalida(f"No existe la anotación {numero}")
        return _fila_a_anotacion(fila)

    def _resuelta(self, numero: int) -> bool:
        cur = self.conexion.execute(
            "select 1 from anotacion where empresa_id = %s and corrige = %s "
            "and tipo in ('correccion_aceptada', 'correccion_rechazada') limit 1",
            (self.empresa_id, numero))
        return cur.fetchone() is not None

    def verificar(self) -> Veredicto:
        """Lee el libro entero de la base de datos y lo comprueba.

        Usa la misma función que el libro en memoria a propósito: si la
        verificación de la base de datos fuera otra, podría dar por buena una
        cadena que el dominio rechaza.
        """
        return verificar_cadena(self.anotaciones(), self.empresa_id)
