"""La gestoría: quién ve qué, y por dónde se pregunta.

Aquí vive la frontera entre inquilinos, que es lo único que de verdad no puede
fallar en este panel. Una gestoría lleva las empresas de otros; si un día ve las
de otra gestoría, el producto está muerto y el problema es de protección de
datos, no un fallo de software cualquiera.

**La regla de la que cuelga todo:** ninguna consulta busca por identificador a
secas. Toda consulta pregunta «esta entidad, *dentro de* esta gestoría», y la
frontera va en el `where` de la misma sentencia que trae los datos. No se
consulta primero y se comprueba después: entre la consulta y la comprobación
siempre acaba colándose alguien.

**Y lo que no está concedido, está denegado.** El permiso se comprueba en el
servidor, en la propia función. Esconder un botón no es seguridad.

Nada de este módulo escribe en el libro de fichajes. El panel administra
entidades: empresas, centros, personas y credenciales. La historia laboral no se
toca desde aquí, y no hay ninguna función que lo permita.
"""

import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from enum import Enum

from .credenciales import derivar_contrasena, nuevo_token
from .jornada import Estado, estado_segun_ultimo
from .organizacion import nuevo_id, validar_zona
from .registro import Tipo


class Rol(str, Enum):
    ADMIN = "gestoria_admin"
    USUARIO = "gestoria_user"


class Permiso(str, Enum):
    VER = "ver"                          # empresas, trabajadores, jornadas
    GESTIONAR_TRABAJADORES = "gestionar_trabajadores"   # alta, baja, PIN
    GESTIONAR_EMPRESAS = "gestionar_empresas"           # empresas y centros
    ROTAR_QR = "rotar_qr"
    GESTIONAR_USUARIOS = "gestionar_usuarios"


# Dos roles y cinco permisos. Con doce roles nadie sabe quién puede qué, y el
# día que hay que revisarlo no se revisa.
#
# El reparto sale del trabajo real de una asesoría laboral: la persona que
# atiende el teléfono da de alta gente y le resetea el PIN todo el día, y eso no
# puede necesitar al jefe. Dar de alta una empresa cliente, rotar un QR o crear
# usuarios sí son decisiones de quien manda.
PERMISOS: dict[Rol, frozenset[Permiso]] = {
    Rol.ADMIN: frozenset(Permiso),
    Rol.USUARIO: frozenset({Permiso.VER, Permiso.GESTIONAR_TRABAJADORES}),
}


def puede(rol: Rol | str, permiso: Permiso) -> bool:
    """Lo que no está concedido, está denegado. Un rol raro no puede nada."""
    try:
        return permiso in PERMISOS[Rol(rol)]
    except (ValueError, KeyError):
        return False


class NoAutorizado(Exception):
    """El usuario no tiene ese permiso."""


class NoExiste(Exception):
    """La entidad no existe, o no es de esta gestoría. A propósito no se
    distingue: decir «existe pero no es tuya» ya es contar algo."""


@dataclass(frozen=True)
class Usuario:
    id: str
    gestoria_id: str
    gestoria: str
    email: str
    nombre: str
    rol: str
    activo: bool

    def puede(self, permiso: Permiso) -> bool:
        return self.activo and puede(self.rol, permiso)

    def exige(self, permiso: Permiso) -> None:
        if not self.puede(permiso):
            raise NoAutorizado(permiso.value)


# ------------------------------------------------------ registro administrativo

def apuntar(conexion, actor: Usuario | None, accion: str, entidad: str,
            entidad_id: str | None = None, resultado: str = "ok",
            detalle: dict | None = None) -> None:
    """Deja constancia de lo que hace el personal de la gestoría.

    No es el libro laboral y no se encadena con él. Son dos cosas distintas:
    una cuenta las horas de quien trabaja y la otra quién tocó qué en el panel.
    Mezclarlas ensuciaría el libro con hechos que no son de ningún trabajador.
    """
    conexion.execute(
        "insert into registro_administrativo (actor_id, gestoria_id, accion, "
        "entidad, entidad_id, resultado, detalle) values (%s,%s,%s,%s,%s,%s,%s)",
        (actor.id if actor else None, actor.gestoria_id if actor else None,
         accion, entidad, entidad_id, resultado,
         json.dumps(detalle or {}, ensure_ascii=False)))


# --------------------------------------------------------------- alta inicial

def crear_gestoria(conexion, nombre: str) -> str:
    identificador = nuevo_id()
    conexion.execute("insert into gestoria (id, nombre) values (%s, %s)",
                     (identificador, nombre))
    return identificador


def crear_usuario(conexion, gestoria_id: str, email: str, nombre: str,
                  contrasena: str, rol: Rol = Rol.USUARIO) -> str:
    identificador = nuevo_id()
    conexion.execute(
        "insert into usuario_gestoria (id, gestoria_id, email, nombre, "
        "contrasena_derivada, rol, contrasena_cambiada_en) "
        "values (%s, %s, %s, %s, %s, %s, now())",
        (identificador, gestoria_id, email.strip().lower(), nombre,
         derivar_contrasena(contrasena), Rol(rol).value))
    return identificador


def cambiar_contrasena(conexion, usuario_id: str, contrasena: str) -> None:
    conexion.execute(
        "update usuario_gestoria set contrasena_derivada = %s, "
        "contrasena_cambiada_en = now() where id = %s",
        (derivar_contrasena(contrasena), usuario_id))


def usuario_por_email(conexion, email: str) -> tuple | None:
    return conexion.execute(
        "select u.id::text, u.gestoria_id::text, g.nombre, u.email, u.nombre, "
        "u.rol, u.activo, u.contrasena_derivada, g.activa "
        "from usuario_gestoria u join gestoria g on g.id = u.gestoria_id "
        "where u.email = %s", (email.strip().lower(),)).fetchone()


def usuario_por_sesion(conexion, huella: str) -> Usuario | None:
    fila = conexion.execute(
        "select u.id::text, u.gestoria_id::text, g.nombre, u.email, u.nombre, "
        "u.rol, u.activo from sesion_panel s "
        "join usuario_gestoria u on u.id = s.usuario_id "
        "join gestoria g on g.id = u.gestoria_id "
        "where s.id = %s and s.cerrada_en is null and s.expira_en > now() "
        "and u.activo and g.activa", (huella,)).fetchone()
    return Usuario(*fila) if fila else None


def abrir_sesion(conexion, usuario_id: str, horas: int = 8) -> str:
    testigo = nuevo_token()
    from .credenciales import huella_de_token
    conexion.execute(
        "insert into sesion_panel (id, usuario_id, expira_en) values (%s,%s,%s)",
        (huella_de_token(testigo), usuario_id,
         datetime.now(timezone.utc) + timedelta(hours=horas)))
    return testigo


def cerrar_sesiones_de(conexion, usuario_id: str) -> int:
    """Cierra todas las sesiones abiertas de un usuario del panel."""
    return conexion.execute(
        "update sesion_panel set cerrada_en = now() where usuario_id = %s "
        "and cerrada_en is null", (usuario_id,)).rowcount


# ------------------------------------------------------------ leer, con frontera

def resumen(conexion, usuario: Usuario, dia: date) -> dict:
    """Los números de la portada. Todos salen de datos reales, ninguno inventado.

    «Trabajando ahora» se calcula con el último fichaje de cada persona traído
    por la base y pasado por `estado_segun_ultimo`, que es la regla del dominio.
    La base trae el dato; la regla la pone el dominio.
    """
    usuario.exige(Permiso.VER)
    g = usuario.gestoria_id
    empresas, trabajadores = conexion.execute(
        "select (select count(*) from empresa where gestoria_id = %s and activa),"
        "       (select count(*) from trabajador t join empresa e on e.id = t.empresa_id"
        "         where e.gestoria_id = %s and t.activo and e.activa)",
        (g, g)).fetchone()

    filas = conexion.execute(
        """
        select ultimo.tipo
        from trabajador t
        join empresa e on e.id = t.empresa_id
        left join lateral (
            select a.tipo from anotacion a
            where a.empresa_id = t.empresa_id and a.trabajador_id = t.id
              and a.tipo in ('entrada','salida','pausa_inicio','pausa_fin')
            order by a.momento desc, a.numero desc limit 1
        ) ultimo on true
        where e.gestoria_id = %s and t.activo and e.activa
        """, (g,)).fetchall()
    estados = [estado_segun_ultimo(Tipo(f[0]) if f[0] else None) for f in filas]

    fichajes_hoy = conexion.execute(
        "select count(*) from anotacion a join empresa e on e.id = a.empresa_id "
        "where e.gestoria_id = %s and a.tipo in "
        "('entrada','salida','pausa_inicio','pausa_fin') "
        "and (a.momento at time zone a.zona_horaria)::date = %s",
        (g, dia)).fetchone()[0]

    return {
        "empresas": empresas,
        "trabajadores": trabajadores,
        "dentro": sum(1 for e in estados if e is Estado.DENTRO),
        "en_pausa": sum(1 for e in estados if e is Estado.EN_PAUSA),
        "fuera": sum(1 for e in estados if e is Estado.FUERA),
        "fichajes_hoy": fichajes_hoy,
        "retroactivos": conexion.execute(
            "select count(*) from anotacion a join empresa e on e.id = a.empresa_id "
            "where e.gestoria_id = %s and a.anotado_en - a.momento > interval "
            "'5 minutes' and a.tipo in ('entrada','salida','pausa_inicio','pausa_fin')",
            (g,)).fetchone()[0],
    }


def empresas_de(conexion, usuario: Usuario, busqueda: str = "",
                pagina: int = 1, por_pagina: int = 25) -> tuple[list[dict], int]:
    """Las empresas de esta gestoría, paginadas. Nunca las de otra."""
    usuario.exige(Permiso.VER)
    patron = f"%{busqueda.strip()}%" if busqueda.strip() else "%"
    total = conexion.execute(
        "select count(*) from empresa where gestoria_id = %s and nombre ilike %s",
        (usuario.gestoria_id, patron)).fetchone()[0]
    filas = conexion.execute(
        """
        select e.id::text, e.nombre, e.activa,
               (select count(*) from centro c where c.empresa_id = e.id and c.activo),
               (select count(*) from trabajador t where t.empresa_id = e.id and t.activo),
               (select count(*) from anotacion a where a.empresa_id = e.id)
        from empresa e
        where e.gestoria_id = %s and e.nombre ilike %s
        order by e.nombre limit %s offset %s
        """, (usuario.gestoria_id, patron, por_pagina, (pagina - 1) * por_pagina)
    ).fetchall()
    return ([dict(zip(("id", "nombre", "activa", "centros", "trabajadores",
                       "anotaciones"), f)) for f in filas], total)


def empresa_de(conexion, usuario: Usuario, empresa_id: str) -> dict:
    """Una empresa, buscada DENTRO de la gestoría del usuario.

    Si es de otra, esta consulta no la encuentra: no hay un momento en el que
    la tengamos delante y haya que acordarse de comprobar de quién es.
    """
    usuario.exige(Permiso.VER)
    fila = conexion.execute(
        "select id::text, nombre, activa from empresa "
        "where id = %s and gestoria_id = %s",
        (empresa_id, usuario.gestoria_id)).fetchone()
    if fila is None:
        raise NoExiste(empresa_id)
    return dict(zip(("id", "nombre", "activa"), fila))


def centros_de(conexion, usuario: Usuario, empresa_id: str) -> list[dict]:
    empresa_de(conexion, usuario, empresa_id)          # frontera
    filas = conexion.execute(
        "select c.id::text, c.nombre, c.zona_horaria, c.activo, c.token_publico, "
        "(select count(*) from trabajador t where t.empresa_id = c.empresa_id and t.activo) "
        "from centro c where c.empresa_id = %s order by c.nombre", (empresa_id,)
    ).fetchall()
    return [dict(zip(("id", "nombre", "zona", "activo", "token", "trabajadores"), f))
            for f in filas]


def trabajadores_de(conexion, usuario: Usuario, empresa_id: str | None = None,
                    busqueda: str = "", pagina: int = 1,
                    por_pagina: int = 50) -> tuple[list[dict], int]:
    """La gente de la gestoría, o la de una empresa suya. Con su estado actual."""
    usuario.exige(Permiso.VER)
    if empresa_id:
        empresa_de(conexion, usuario, empresa_id)      # frontera
    patron = f"%{busqueda.strip()}%" if busqueda.strip() else "%"
    condicion = ("e.gestoria_id = %s and (%s::uuid is null or t.empresa_id = %s) "
                 "and (t.nombre ilike %s or t.codigo ilike %s)")
    argumentos = (usuario.gestoria_id, empresa_id, empresa_id, patron, patron)
    total = conexion.execute(
        f"select count(*) from trabajador t join empresa e on e.id = t.empresa_id "
        f"where {condicion}", argumentos).fetchone()[0]
    filas = conexion.execute(
        f"""
        select t.id::text, t.nombre, t.codigo, t.activo, e.nombre, e.id::text,
               ultimo.tipo, ultimo.momento, t.pin_derivado is not null
        from trabajador t
        join empresa e on e.id = t.empresa_id
        left join lateral (
            select a.tipo, a.momento from anotacion a
            where a.empresa_id = t.empresa_id and a.trabajador_id = t.id
              and a.tipo in ('entrada','salida','pausa_inicio','pausa_fin')
            order by a.momento desc, a.numero desc limit 1
        ) ultimo on true
        where {condicion}
        order by e.nombre, t.nombre limit %s offset %s
        """, argumentos + (por_pagina, (pagina - 1) * por_pagina)).fetchall()
    gente = []
    for f in filas:
        gente.append({
            "id": f[0], "nombre": f[1], "codigo": f[2], "activo": f[3],
            "empresa": f[4], "empresa_id": f[5],
            "estado": estado_segun_ultimo(Tipo(f[6]) if f[6] else None).value,
            "ultimo": f[7], "tiene_pin": f[8],
        })
    return gente, total


def trabajador_de(conexion, usuario: Usuario, trabajador_id: str) -> dict:
    usuario.exige(Permiso.VER)
    fila = conexion.execute(
        "select t.id::text, t.nombre, t.codigo, t.activo, t.empresa_id::text, e.nombre "
        "from trabajador t join empresa e on e.id = t.empresa_id "
        "where t.id = %s and e.gestoria_id = %s",
        (trabajador_id, usuario.gestoria_id)).fetchone()
    if fila is None:
        raise NoExiste(trabajador_id)
    return dict(zip(("id", "nombre", "codigo", "activo", "empresa_id", "empresa"), fila))


def centro_de(conexion, usuario: Usuario, centro_id: str) -> dict:
    usuario.exige(Permiso.VER)
    fila = conexion.execute(
        "select c.id::text, c.nombre, c.zona_horaria, c.activo, c.token_publico, "
        "c.empresa_id::text from centro c join empresa e on e.id = c.empresa_id "
        "where c.id = %s and e.gestoria_id = %s",
        (centro_id, usuario.gestoria_id)).fetchone()
    if fila is None:
        raise NoExiste(centro_id)
    return dict(zip(("id", "nombre", "zona", "activo", "token", "empresa_id"), fila))


def usuarios_de(conexion, usuario: Usuario) -> list[dict]:
    usuario.exige(Permiso.GESTIONAR_USUARIOS)
    filas = conexion.execute(
        "select id::text, email, nombre, rol, activo from usuario_gestoria "
        "where gestoria_id = %s order by nombre", (usuario.gestoria_id,)).fetchall()
    return [dict(zip(("id", "email", "nombre", "rol", "activo"), f)) for f in filas]


def verificar_y_guardar(conexion, empresa_id: str) -> dict:
    """Recorre el libro de una empresa y deja escrito el resultado.

    Es la única función que verifica. La llaman el botón «Verificar ahora» y el
    comando periódico; el panel nunca verifica al pintar una página, porque
    recorrer la cadena entera de todas las empresas costaba 2,2 segundos con
    80.000 anotaciones y no deja de crecer.
    """
    from .postgres import LibroPostgres
    from .registro import verificar_cadena

    anotaciones = LibroPostgres(empresa_id, conexion).anotaciones()
    veredicto = verificar_cadena(anotaciones, empresa_id)
    conexion.execute(
        "insert into verificacion_libro (empresa_id, momento, valido, anotaciones,"
        " primera_fallida, motivo) values (%s, now(), %s, %s, %s, %s) "
        "on conflict (empresa_id) do update set momento = now(), "
        "valido = excluded.valido, anotaciones = excluded.anotaciones, "
        "primera_fallida = excluded.primera_fallida, motivo = excluded.motivo",
        (empresa_id, veredicto.valido, len(anotaciones),
         veredicto.primera_fallida, veredicto.motivo))
    return {"valido": veredicto.valido, "anotaciones": len(anotaciones),
            "primera_fallida": veredicto.primera_fallida,
            "motivo": veredicto.motivo, "momento": datetime.now(timezone.utc)}


def verificacion_de(conexion, empresa_id: str) -> dict | None:
    """Lo último que se sabe del libro de una empresa. None si nunca se miró."""
    fila = conexion.execute(
        "select momento, valido, anotaciones, primera_fallida, motivo "
        "from verificacion_libro where empresa_id = %s", (empresa_id,)).fetchone()
    return dict(zip(("momento", "valido", "anotaciones", "primera_fallida",
                     "motivo"), fila)) if fila else None


def libros_rotos(conexion, usuario: Usuario) -> list[dict]:
    """Las empresas cuya última comprobación salió mal. Una sola consulta."""
    usuario.exige(Permiso.VER)
    filas = conexion.execute(
        "select e.id::text, e.nombre, v.primera_fallida, v.motivo, v.momento "
        "from verificacion_libro v join empresa e on e.id = v.empresa_id "
        "where e.gestoria_id = %s and not v.valido order by v.momento desc",
        (usuario.gestoria_id,)).fetchall()
    return [dict(zip(("id", "nombre", "anotacion", "motivo", "momento"), f))
            for f in filas]


def sin_comprobar(conexion, usuario: Usuario) -> int:
    """Cuántas empresas con fichajes no se han comprobado nunca."""
    usuario.exige(Permiso.VER)
    return conexion.execute(
        "select count(*) from empresa e where e.gestoria_id = %s and e.activa "
        "and not exists (select 1 from verificacion_libro v where v.empresa_id = e.id) "
        "and exists (select 1 from anotacion a where a.empresa_id = e.id)",
        (usuario.gestoria_id,)).fetchone()[0]


def registro_de(conexion, usuario: Usuario, limite: int = 100) -> list[dict]:
    usuario.exige(Permiso.VER)
    filas = conexion.execute(
        "select r.momento, coalesce(u.nombre, 'sistema'), r.accion, r.entidad, "
        "r.entidad_id, r.resultado from registro_administrativo r "
        "left join usuario_gestoria u on u.id = r.actor_id "
        "where r.gestoria_id = %s order by r.momento desc limit %s",
        (usuario.gestoria_id, limite)).fetchall()
    return [dict(zip(("momento", "actor", "accion", "entidad", "entidad_id",
                      "resultado"), f)) for f in filas]
