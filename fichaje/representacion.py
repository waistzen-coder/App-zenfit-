"""Quién representa a la plantilla, hasta cuándo, y qué puede ver.

Este módulo es la frontera del tercer contexto de acceso. Todo lo que el portal
enseña sale de aquí, y todo lo que sale de aquí lleva dentro de la consulta —no
en un `if` posterior— las tres condiciones que lo delimitan:

1. **La empresa.** Un representante ve una plantilla, la suya. La empresa no es
   un parámetro que llegue del formulario: sale de la identidad de la sesión.
2. **El ámbito.** O toda la empresa, o un centro. Si es de un centro, el resto
   de la plantilla no existe para él.
3. **La vigencia.** Un mandato empieza, acaba y se puede revocar. Se comprueba
   en cada petición y no solo al entrar, porque una sesión de ocho horas abierta
   a las nueve de la mañana sobreviviría a una revocación de las diez.

Y una cuarta, la retención: no se enseña nada de hace más de cuatro años. Lo que
la ley obliga a conservar cuatro años no obliga a enseñarlo para siempre, y un
registro laboral de hace diez años es un dato personal que ya no hace falta.

**Aquí no se escribe en el libro.** Ni una función de este módulo hace INSERT
sobre `anotacion`, y por si algún día alguien la añade sin darse cuenta, el
usuario de base de datos del portal no tiene ese permiso.
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from .credenciales import (
    comprobar_contrasena,
    derivar_contrasena,
    huella_de_token,
    nuevo_token,
)
from .organizacion import nuevo_id

# Cuatro años, que es lo que el artículo 34.9 manda conservar. Se usa como
# tope de lo que el portal enseña: conservar y exhibir no son lo mismo.
RETENCION = timedelta(days=4 * 365 + 1)

AMBITOS = ("empresa", "centro")


class NoExiste(Exception):
    """No está, o no es de este representante. No se distingue a propósito:
    decir «existe pero no es tuyo» ya es contar algo."""


class DatoInvalido(Exception):
    """Lo que se quiere guardar no se sostiene."""


@dataclass(frozen=True)
class Representante:
    id: str
    empresa_id: str
    empresa: str
    nombre: str
    email: str
    ambito: str
    centro_id: str | None
    centro: str | None
    vigente_desde: date
    vigente_hasta: date | None
    revocado_en: datetime | None

    def vigente(self, hoy: date | None = None) -> bool:
        hoy = hoy or datetime.now(timezone.utc).date()
        if self.revocado_en is not None:
            return False
        if hoy < self.vigente_desde:
            return False
        return self.vigente_hasta is None or hoy <= self.vigente_hasta

    def desde_minimo(self, hoy: date | None = None) -> date:
        """La fecha más antigua que puede ver: ni antes de su mandato, ni más
        allá de la retención.

        Lo primero no es una tecnicidad. Quien empezó a representar en marzo no
        tiene por qué ver la jornada de enero: el acceso viene del cargo, y el
        cargo tiene fecha de inicio.
        """
        hoy = hoy or datetime.now(timezone.utc).date()
        return max(self.vigente_desde, hoy - RETENCION)


# --------------------------------------------------------------------- alta

def crear(conexion, empresa_id: str, nombre: str, email: str, contrasena: str,
          vigente_desde: date, vigente_hasta: date | None = None,
          centro_id: str | None = None, creado_por: str | None = None) -> str:
    """Da de alta un representante. Lo hace la gestoría o la empresa, no él."""
    email = (email or "").strip().lower()
    if "@" not in email:
        raise DatoInvalido("Hace falta un correo.")
    if not (nombre or "").strip():
        raise DatoInvalido("Hace falta un nombre.")
    if vigente_hasta is not None and vigente_hasta < vigente_desde:
        raise DatoInvalido("El mandato no puede terminar antes de empezar.")
    if centro_id is not None:
        suyo = conexion.execute(
            "select 1 from centro where id = %s and empresa_id = %s",
            (centro_id, empresa_id)).fetchone()
        if not suyo:
            raise DatoInvalido("Ese centro no es de esa empresa.")

    identificador = nuevo_id()
    conexion.execute(
        "insert into representante (id, empresa_id, nombre, email, "
        "contrasena_derivada, ambito, centro_id, vigente_desde, vigente_hasta, "
        "creado_por) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (identificador, empresa_id, nombre.strip(), email,
         derivar_contrasena(contrasena),
         "centro" if centro_id else "empresa", centro_id,
         vigente_desde, vigente_hasta, creado_por))
    return identificador


def revocar(conexion, representante_id: str) -> int:
    """Corta el acceso ya, sin esperar a la fecha de fin.

    Cierra también las sesiones abiertas. Marcar la fila y dejar viva una sesión
    de ocho horas sería revocar a medias, que es lo mismo que no revocar.
    """
    conexion.execute(
        "update representante set revocado_en = now() where id = %s "
        "and revocado_en is null", (representante_id,))
    return conexion.execute(
        "update sesion_representante set cerrada_en = now() "
        "where representante_id = %s and cerrada_en is null",
        (representante_id,)).rowcount


# --------------------------------------------------------------- identidad

_CAMPOS = (
    "r.id::text, r.empresa_id::text, e.nombre, r.nombre, r.email, r.ambito, "
    "r.centro_id::text, c.nombre, r.vigente_desde, r.vigente_hasta, r.revocado_en"
)
_DE = ("from representante r join empresa e on e.id = r.empresa_id "
       "left join centro c on c.id = r.centro_id")


def por_email(conexion, email: str) -> tuple | None:
    """Devuelve la fila y el derivado de la contraseña, para el acceso."""
    return conexion.execute(
        f"select {_CAMPOS}, r.contrasena_derivada {_DE} "
        f"where lower(r.email) = %s", ((email or "").strip().lower(),)).fetchone()


def por_sesion(conexion, huella: str) -> Representante | None:
    """La identidad de una sesión abierta, si el mandato sigue vivo.

    La vigencia va en el WHERE y no fuera: si se comprobara después, habría un
    instante —y una consulta— en que el representante revocado sigue siendo
    alguien.
    """
    fila = conexion.execute(
        f"select {_CAMPOS} {_DE} "
        f"join sesion_representante s on s.representante_id = r.id "
        f"where s.id = %s and s.cerrada_en is null and s.expira_en > now() "
        f"and r.revocado_en is null and r.vigente_desde <= current_date "
        f"and (r.vigente_hasta is null or r.vigente_hasta >= current_date) "
        f"and e.activa", (huella,)).fetchone()
    return Representante(*fila) if fila else None


def abrir_sesion(conexion, representante_id: str, horas: int = 8) -> str:
    testigo = nuevo_token()
    conexion.execute(
        "insert into sesion_representante (id, representante_id, expira_en) "
        "values (%s,%s,%s)",
        (huella_de_token(testigo), representante_id,
         datetime.now(timezone.utc) + timedelta(hours=horas)))
    return testigo


def cerrar_sesion(conexion, testigo: str) -> None:
    conexion.execute(
        "update sesion_representante set cerrada_en = now() where id = %s",
        (huella_de_token(testigo),))


def acceso_correcto(conexion, email: str, contrasena: str) -> tuple | None:
    """Comprueba el acceso en tiempo constante respecto a si el correo existe.

    Se deriva la contraseña aunque no haya nadie con ese correo: contestar antes
    cuando no existe le diría a quien prueba qué correos están dados de alta, y
    los correos de los representantes de una plantilla no son cosa suya.
    """
    fila = por_email(conexion, email)
    correcta = comprobar_contrasena(contrasena, fila[11] if fila else None)
    return fila if (fila and correcta) else None


# ------------------------------------------------------------ lo que ve

def _frontera(representante: Representante) -> tuple[str, list]:
    """El trozo de WHERE que delimita el ámbito, y sus parámetros."""
    if representante.ambito == "centro":
        return "a.empresa_id = %s and a.centro_id = %s", [
            representante.empresa_id, representante.centro_id]
    return "a.empresa_id = %s", [representante.empresa_id]


def trabajadores(conexion, representante: Representante) -> list[dict]:
    """La plantilla de su ámbito.

    Salen los que tienen alguna anotación en el ámbito, no los dados de alta:
    un representante de un centro no tiene por qué saber quién más está en
    nómina de la empresa.
    """
    if representante.ambito == "centro":
        condicion = ("t.empresa_id = %s and exists (select 1 from anotacion a "
                     "where a.trabajador_id = t.id and a.centro_id = %s)")
        parametros = [representante.empresa_id, representante.centro_id]
    else:
        condicion = "t.empresa_id = %s"
        parametros = [representante.empresa_id]
    filas = conexion.execute(
        f"select t.id::text, t.nombre, t.activo from trabajador t "
        f"where {condicion} order by t.nombre", parametros).fetchall()
    # Sale también quien ya no está de alta: dejó de trabajar aquí, pero sus
    # jornadas siguen en el registro y siguen siendo consultables.
    return [{"id": f[0], "nombre": f[1], "activo": f[2]} for f in filas]


def anotaciones(conexion, representante: Representante, desde: date, hasta: date,
                trabajador_id: str | None = None) -> list:
    """Las anotaciones del ámbito y del periodo, ya recortadas.

    `desde` se recorta contra el mandato y la retención aquí dentro. Si el
    recorte se hiciera en la vista, cualquier ruta nueva que olvidara llamarla
    enseñaría de más, y ese olvido no daría ningún error.
    """
    from .postgres import CAMPOS, _fila_a_anotacion

    if not representante.vigente():
        raise NoExiste("El mandato no está vigente.")
    desde = max(desde, representante.desde_minimo())
    if hasta < desde:
        return []

    condicion, parametros = _frontera(representante)
    if trabajador_id is not None:
        # El trabajador llega del formulario, así que se filtra CONTRA el
        # ámbito en la misma consulta. Comprobarlo aparte y luego consultar es
        # la forma clásica de que dos cambios independientes abran un agujero.
        condicion += " and a.trabajador_id = %s"
        parametros.append(trabajador_id)
    parametros += [desde, hasta]
    # CAMPOS no lleva alias de tabla y aquí la tabla se llama «a», así que se
    # le pone: la lista de columnas sigue viviendo en un solo sitio.
    columnas = ", ".join("a." + c.strip() for c in CAMPOS.split(","))
    filas = conexion.execute(
        f"select {columnas} from anotacion a "
        f"where {condicion} and a.momento >= %s and a.momento < (%s::date + 1) "
        f"order by a.numero", parametros).fetchall()
    return [_fila_a_anotacion(f) for f in filas]


# ---------------------------------------------------------- registro de accesos

def apuntar(conexion, representante: Representante, accion: str,
            detalle: str = "", origen: str = "") -> None:
    conexion.execute(
        "insert into acceso_representante (representante_id, empresa_id, "
        "accion, detalle, origen) values (%s,%s,%s,%s,%s)",
        (representante.id, representante.empresa_id, accion[:40],
         detalle[:200], origen[:45]))


def accesos(conexion, representante_id: str, limite: int = 200) -> list[dict]:
    filas = conexion.execute(
        "select momento, accion, detalle from acceso_representante "
        "where representante_id = %s order by momento desc limit %s",
        (representante_id, limite)).fetchall()
    return [{"momento": f[0], "accion": f[1], "detalle": f[2]} for f in filas]


def accesos_de_empresa(conexion, empresa_id: str, limite: int = 200) -> list[dict]:
    """Lo mismo, para que la empresa vea quién ha consultado su registro.

    Las dos partes ven el mismo apunte. Un registro de accesos que solo pudiera
    ver una de ellas serviría para vigilar, no para dar constancia.
    """
    filas = conexion.execute(
        "select a.momento, r.nombre, a.accion, a.detalle "
        "from acceso_representante a join representante r on r.id = a.representante_id "
        "where a.empresa_id = %s order by a.momento desc limit %s",
        (empresa_id, limite)).fetchall()
    return [{"momento": f[0], "quien": f[1], "accion": f[2], "detalle": f[3]}
            for f in filas]


def de_empresa(conexion, empresa_id: str) -> list[dict]:
    """Los representantes dados de alta en una empresa, para el panel."""
    filas = conexion.execute(
        f"select {_CAMPOS} {_DE} where r.empresa_id = %s "
        f"order by r.revocado_en nulls first, r.nombre", (empresa_id,)).fetchall()
    return [{"r": Representante(*f)} for f in filas]
