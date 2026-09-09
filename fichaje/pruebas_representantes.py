"""El portal de representantes. `python3 -m fichaje.pruebas_representantes`.

Lo que de verdad se comprueba aquí son dos cosas, y todo lo demás es adorno:

1. Que un representante **no puede ver** la plantilla que no es suya, ni antes
   de su mandato, ni después de que se lo revoquen, ni de hace cinco años.
2. Que **no puede escribir nada**, ni aunque el código lo intentara, porque el
   usuario de base de datos con el que corre el portal no tiene el permiso.

Recrean el esquema desde las migraciones. No apuntar nunca a datos reales.
"""

import os
import time
from datetime import date, datetime, timedelta, timezone

os.environ.setdefault("FICHAJE_APP_PASSWORD", "prueba-local")
os.environ.setdefault("FICHAJE_PORTAL_PASSWORD", "prueba-local-portal")
os.environ.setdefault("FICHAJE_PORTAL_SECRETO", "secreto-portal-pruebas")
os.environ.setdefault("FICHAJE_PANEL_SECRETO", "secreto-panel-pruebas")
os.environ.setdefault("FICHAJE_SECRETO", "secreto-fichaje-pruebas")

import psycopg  # noqa: E402

from . import gestoria as G  # noqa: E402
from .credenciales import huella_de_token  # noqa: E402
from . import representacion as R  # noqa: E402
from .admin import crear_centro, crear_empresa, crear_trabajador  # noqa: E402
from .despliegue import (  # noqa: E402
    configurar_rol,
    configurar_rol_portal,
    dsn_aplicacion,
    dsn_portal,
)
from .migrar import aplicar  # noqa: E402
from .panel import crear_panel  # noqa: E402
from .portal import crear_portal  # noqa: E402
from .postgres import LibroPostgres, conectar  # noqa: E402
from .registro import Tipo  # noqa: E402

fallos: list[str] = []
hechas = 0


def comprobar(descripcion: str, obtenido, esperado):
    global hechas
    hechas += 1
    if obtenido != esperado:
        fallos.append(f"{descripcion}\n    esperado: {esperado!r}\n    obtenido: {obtenido!r}")


def falla(descripcion: str, excepcion, funcion, *args, **kwargs):
    global hechas
    hechas += 1
    try:
        funcion(*args, **kwargs)
    except excepcion:
        return
    except Exception as otra:  # noqa: BLE001
        fallos.append(f"{descripcion}: esperaba {excepcion.__name__}, llegó {otra!r}")
        return
    fallos.append(f"{descripcion}: no falló, y tenía que fallar")


def vaciar_base(conexion) -> None:
    tablas = [f[0] for f in conexion.execute(
        "select tablename from pg_tables where schemaname = 'public'").fetchall()]
    if tablas:
        from psycopg import sql
        conexion.execute(sql.SQL("drop table {} cascade").format(
            sql.SQL(", ").join(sql.Identifier(t) for t in tablas)))


# ------------------------------------------------------------------ montaje

admin = conectar()
vaciar_base(admin)
admin.close()
aplicar()
admin = conectar()
configurar_rol(admin)
configurar_rol_portal(admin)

HOY = datetime.now(timezone.utc).date()
AYER = HOY - timedelta(days=1)
MADRID = "Europe/Madrid"

# Empresa A: dos centros, tres personas.
GA = G.crear_gestoria(admin, "Asesoría Pérez")
ANA = G.crear_usuario(admin, GA, "ana@perez.es", "Ana Pérez",
                      "una-frase-larga-de-ana", G.Rol.ADMIN)
A = crear_empresa(admin, "Bar Casa Paco", GA)
CENTRO_PLAYA, _ = crear_centro(admin, A, "Local de la playa", MADRID)
CENTRO_PUEBLO, _ = crear_centro(admin, A, "Local del pueblo", MADRID)
LUCIA = crear_trabajador(admin, A, "Lucía García", "1042")
MARIO = crear_trabajador(admin, A, "Mario Ruiz", "1043")
NURIA = crear_trabajador(admin, A, "Nuria Gil", "1044")     # solo en el pueblo

# Empresa B, de otra gestoría. Nada de aquí puede verse desde A.
GB = G.crear_gestoria(admin, "Gestoría Rival")
B = crear_empresa(admin, "Taller Secreto", GB)
CENTRO_B, _ = crear_centro(admin, B, "Nave", MADRID)
JOSE = crear_trabajador(admin, B, "Jose Rival", "9001")


def fichar_dia(empresa, centro, trabajador, dia: date, entrada=9, salida=17):
    libro = LibroPostgres(empresa, admin)
    base = datetime(dia.year, dia.month, dia.day, tzinfo=timezone.utc)
    libro.fichar(trabajador, centro_id=centro, tipo=Tipo.ENTRADA,
                 momento=base + timedelta(hours=entrada), zona_horaria=MADRID,
                 anotado_en=base + timedelta(hours=entrada))
    libro.fichar(trabajador, centro_id=centro, tipo=Tipo.SALIDA,
                 momento=base + timedelta(hours=salida), zona_horaria=MADRID,
                 anotado_en=base + timedelta(hours=salida))


# Jornadas de este mes, para que el periodo por defecto tenga contenido.
PRIMERO = HOY.replace(day=1)
for dias in range(0, min(5, (HOY - PRIMERO).days + 1)):
    dia = PRIMERO + timedelta(days=dias)
    fichar_dia(A, CENTRO_PLAYA, LUCIA, dia)
    fichar_dia(A, CENTRO_PLAYA, MARIO, dia, entrada=10, salida=15)
    fichar_dia(A, CENTRO_PUEBLO, NURIA, dia)
fichar_dia(B, CENTRO_B, JOSE, PRIMERO)

# Y una jornada de hace cinco años, para probar la retención.
HACE_CINCO = date(HOY.year - 5, 3, 10)
fichar_dia(A, CENTRO_PLAYA, LUCIA, HACE_CINCO)

# Los representantes.
CARMEN = R.crear(admin, A, "Carmen Vega", "carmen@plantilla.es", "clave-larga-de-carmen",
                 vigente_desde=HOY - timedelta(days=365), creado_por=ANA)
PABLO = R.crear(admin, A, "Pablo Sanz", "pablo@plantilla.es", "clave-larga-de-pablo",
                vigente_desde=HOY - timedelta(days=365), centro_id=CENTRO_PUEBLO,
                creado_por=ANA)
# Uno de la empresa rival, para el aislamiento entre empresas.
RIVAL = R.crear(admin, B, "Rita Rival", "rita@rival.es", "clave-larga-de-rita",
                vigente_desde=HOY - timedelta(days=365))
# Uno que empieza mañana y otro que terminó ayer.
FUTURO = R.crear(admin, A, "Futuro Pérez", "futuro@plantilla.es", "clave-larga-futuro",
                 vigente_desde=HOY + timedelta(days=1))
CADUCADO = R.crear(admin, A, "Antiguo Ruiz", "antiguo@plantilla.es", "clave-larga-antiguo",
                   vigente_desde=HOY - timedelta(days=400), vigente_hasta=AYER)
# Y un nombre hostil, para el escapado.
HOSTIL = R.crear(admin, A, "<script>alert(1)</script>", "hostil@plantilla.es",
                 "clave-larga-hostil", vigente_desde=HOY - timedelta(days=10))

portal = crear_portal(dsn_portal())
portal.config["TESTING"] = True
panel = crear_panel(dsn_aplicacion())
panel.config["TESTING"] = True

# Usuarios del panel: Ana manda en la gestoría A, Luis solo ve y da de alta
# gente, y Bea es de la gestoría rival.
LUIS = G.crear_usuario(admin, GA, "luis@perez.es", "Luis Soto",
                       "una-frase-larga-de-luis", G.Rol.USUARIO)
BEA = G.crear_usuario(admin, GB, "bea@rival.es", "Bea Ruiz",
                      "una-frase-larga-de-bea", G.Rol.ADMIN)


def entrar_panel(email: str, contrasena: str):
    c = panel.test_client()
    c.get("/panel/entrar")
    with c.session_transaction() as s:
        csrf = s["csrf"]
    c.post("/panel/entrar", data={"email": email, "contrasena": contrasena,
                                  "csrf": csrf})
    # Al entrar se vacía la sesión entera —para que un testigo de antes de
    # identificarse no siga valiendo después—, y con ella se va el testigo CSRF.
    # Un navegador lo recupera al cargar la primera página; aquí también, y sin
    # esto los POST de abajo salían sin testigo y contestaban 400. Habrían
    # «pasado» sin probar nada de lo que dicen probar.
    c.get("/panel/")
    return c


def csrf_panel(c) -> str:
    with c.session_transaction() as s:
        return s.get("csrf", "")


def entrar(email: str, contrasena: str):
    c = portal.test_client()
    c.get("/rep/entrar")
    with c.session_transaction() as s:
        csrf = s["csrf"]
    r = c.post("/rep/entrar", data={"email": email, "contrasena": contrasena,
                                    "csrf": csrf})
    return c, r


def csrf_de(c) -> str:
    with c.session_transaction() as s:
        return s.get("csrf", "")


# ============================================================ el alta y su forma

comprobar("El ámbito de empresa no lleva centro",
          admin.execute("select centro_id from representante where id = %s",
                        (CARMEN,)).fetchone()[0], None)
comprobar("El de centro sí lo lleva",
          str(admin.execute("select centro_id from representante where id = %s",
                            (PABLO,)).fetchone()[0]), CENTRO_PUEBLO)

falla("Un centro de otra empresa no se puede asignar", R.DatoInvalido,
      lambda: R.crear(admin, A, "Cuela", "cuela@x.es", "clave-larga-cuela",
                      vigente_desde=HOY, centro_id=CENTRO_B))
falla("Ni un mandato que acaba antes de empezar", R.DatoInvalido,
      lambda: R.crear(admin, A, "Imposible", "imp@x.es", "clave-larga-imp",
                      vigente_desde=HOY, vigente_hasta=HOY - timedelta(days=1)))
falla("Ni un correo que no lo es", R.DatoInvalido,
      lambda: R.crear(admin, A, "Sin correo", "no-es-un-correo", "clave-larga",
                      vigente_desde=HOY))
falla("Dos representantes no pueden compartir correo",
      psycopg.errors.UniqueViolation,
      lambda: R.crear(admin, A, "Otra Carmen", "CARMEN@plantilla.es",
                      "clave-larga-otra", vigente_desde=HOY))

# La base impide un ámbito incoherente aunque alguien escriba SQL a mano.
falla("Un ámbito de centro sin centro no se puede escribir a mano",
      psycopg.errors.CheckViolation,
      lambda: admin.execute(
          "insert into representante (id, empresa_id, nombre, email, "
          "contrasena_derivada, ambito, vigente_desde) "
          "values (gen_random_uuid(), %s, 'x', 'x@x.es', 'x', 'centro', %s)",
          (A, HOY)))

# ------------------------------------------------ y lo que NO se guarda de nadie

columnas = {f[0] for f in admin.execute(
    "select column_name from information_schema.columns "
    "where table_name = 'representante'").fetchall()}
for prohibida in ("sindicato", "afiliacion", "afiliación", "seccion_sindical",
                  "ideologia", "religion", "salud"):
    comprobar(f"La tabla no guarda «{prohibida}»", prohibida in columnas, False)

# ============================================================== acceso y vigencia

c_carmen, r = entrar("carmen@plantilla.es", "clave-larga-de-carmen")
comprobar("Carmen entra", r.status_code, 302)

_, r = entrar("carmen@plantilla.es", "no-es-su-clave")
comprobar("Con la contraseña mala, no", r.status_code, 401)

_, r = entrar("nadie@plantilla.es", "lo-que-sea")
comprobar("Un correo que no existe tampoco", r.status_code, 401)

_, r = entrar("futuro@plantilla.es", "clave-larga-futuro")
comprobar("Un mandato que empieza mañana no abre la puerta", r.status_code, 401)

_, r = entrar("antiguo@plantilla.es", "clave-larga-antiguo")
comprobar("Ni uno que terminó ayer", r.status_code, 401)

# El mensaje es el mismo en los cuatro casos: quien prueba no puede distinguir
# «ese correo no existe» de «ese mandato caducó».
mensajes = set()
for correo, clave in [("carmen@plantilla.es", "mala"), ("nadie@x.es", "mala"),
                      ("futuro@plantilla.es", "clave-larga-futuro"),
                      ("antiguo@plantilla.es", "clave-larga-antiguo")]:
    _, resp = entrar(correo, clave)
    mensajes.add(b"no son correctos" in resp.data)
comprobar("Y el aviso no distingue entre ellos", mensajes, {True})

# ================================================================== lo que ve

r = c_carmen.get("/rep/")
comprobar("La portada de Carmen carga", r.status_code, 200)
comprobar("Y sale su empresa", b"Bar Casa Paco" in r.data, True)
comprobar("Con Lucía", "Lucía García".encode() in r.data, True)
comprobar("Y con Mario", b"Mario Ruiz" in r.data, True)
comprobar("Y con Nuria, que es del otro centro pero de su empresa",
          b"Nuria Gil" in r.data, True)
comprobar("Y nunca con nadie de la empresa rival", b"Jose Rival" in r.data, False)

c_pablo, _ = entrar("pablo@plantilla.es", "clave-larga-de-pablo")
r = c_pablo.get("/rep/")
comprobar("Pablo, que es de un centro, ve a Nuria", b"Nuria Gil" in r.data, True)
comprobar("Y NO ve a Lucía, que ficha en el otro centro",
          "Lucía García".encode() in r.data, False)
comprobar("Ni a Mario", b"Mario Ruiz" in r.data, False)

# ============================================ red team: pedir lo que no es tuyo

r = c_pablo.get(f"/rep/persona/{LUCIA}")
comprobar("Pablo pidiendo por URL a alguien de otro centro: 404",
          r.status_code, 404)
r = c_carmen.get(f"/rep/persona/{JOSE}")
comprobar("Carmen pidiendo a alguien de otra empresa: 404", r.status_code, 404)
r = c_carmen.get("/rep/persona/00000000-0000-0000-0000-000000000000")
comprobar("Un identificador inventado: 404", r.status_code, 404)
r = c_carmen.get(f"/rep/persona/{LUCIA}")
comprobar("Pero a la suya sí llega", r.status_code, 200)

# Hasta aquí el ámbito se ha medido a través del portal, y eso no bastaba: el
# portal lo comprueba DOS veces por caminos distintos —la lista de personas y el
# filtro de las anotaciones— y con una de las dos rota las pruebas seguían en
# verde. Un día alguien toca la que quedaba y no se entera nadie. Así que se
# mide cada una por separado, en el dominio.
fila_pablo = R.por_email(admin, "pablo@plantilla.es")
pablo = R.Representante(*fila_pablo[:11])
del_pueblo = R.anotaciones(admin, pablo, PRIMERO, HOY)
comprobar("Las anotaciones que ve un representante de centro son de su centro",
          {str(a.centro_id) for a in del_pueblo}, {CENTRO_PUEBLO})
comprobar("Y de nadie que fiche en el otro centro",
          any(str(a.trabajador_id) == LUCIA for a in del_pueblo), False)
comprobar("Aunque pida a esa persona por su identificador",
          R.anotaciones(admin, pablo, PRIMERO, HOY, LUCIA), [])
comprobar("Y su lista de personas tampoco la incluye",
          {p["id"] for p in R.trabajadores(admin, pablo)}, {NURIA})

fila_carmen_amb = R.por_email(admin, "carmen@plantilla.es")
carmen_amb = R.Representante(*fila_carmen_amb[:11])
comprobar("La de empresa sí ve los dos centros",
          {str(a.centro_id) for a in R.anotaciones(admin, carmen_amb, PRIMERO, HOY)},
          {CENTRO_PLAYA, CENTRO_PUEBLO})
comprobar("Pero jamás una anotación de otra empresa",
          {a.empresa_id for a in R.anotaciones(admin, carmen_amb, PRIMERO, HOY)},
          {A})

c_rival, _ = entrar("rita@rival.es", "clave-larga-de-rita")
r = c_rival.get("/rep/")
comprobar("La rival ve su empresa", b"Taller Secreto" in r.data, True)
comprobar("Y ni rastro de la otra plantilla",
          "Lucía García".encode() in r.data, False)

# Una cookie de sesión del portal no vale en el panel, ni al revés: son cookies
# con nombre distinto y tablas de sesión distintas.
comprobar("La cookie del portal se llama distinto que la del panel",
          portal.config["SESSION_COOKIE_NAME"], "portal_representante")

# Un testigo de sesión del panel metido en la sesión del portal no abre nada.
c_falso = portal.test_client()
with c_falso.session_transaction() as s:
    s["rep"] = G.abrir_sesion(admin, ANA)
r = c_falso.get("/rep/", follow_redirects=False)
comprobar("Un testigo del panel no abre el portal", r.status_code, 302)

# ================================================== retención: cuatro años y no más

hace_cinco_anos = f"{HACE_CINCO.year}-{HACE_CINCO.month:02d}"
r = c_carmen.get(f"/rep/?mes={hace_cinco_anos}")
comprobar("Un mes de hace cinco años no enseña jornadas",
          b"No hay jornadas" in r.data, True)

# Se recupera la identidad por la vía normal, sin trucos.
fila = R.por_email(admin, "carmen@plantilla.es")
carmen = R.Representante(*fila[:11])
comprobar("La fecha mínima que puede pedir no va más atrás de cuatro años",
          carmen.desde_minimo(HOY) >= HOY - R.RETENCION, True)
antiguas = R.anotaciones(admin, carmen, HACE_CINCO, HACE_CINCO)
comprobar("Y pedir explícitamente ese día no devuelve nada", antiguas, [])

# El mandato también recorta: quien empezó hace diez días no ve lo de antes.
fila = R.por_email(admin, "hostil@plantilla.es")
hostil = R.Representante(*fila[:11])
comprobar("Quien lleva diez días de mandato no ve lo anterior a su mandato",
          hostil.desde_minimo(HOY), HOY - timedelta(days=10))

# ===================================================== revocación, ya y de verdad

c_hostil, r = entrar("hostil@plantilla.es", "clave-larga-hostil")
comprobar("El de nombre hostil entra", r.status_code, 302)
r = c_hostil.get("/rep/")
comprobar("Y su sesión vale", r.status_code, 200)
comprobar("Su nombre sale escapado, no ejecutado",
          b"<script>alert(1)</script>" in r.data, False)

abiertas_antes = admin.execute(
    "select count(*) from sesion_representante where representante_id = %s "
    "and cerrada_en is null", (HOSTIL,)).fetchone()[0]
comprobar("Tenía una sesión abierta", abiertas_antes, 1)
cerradas = R.revocar(admin, HOSTIL)
comprobar("Revocar dice haber cerrado una", cerradas, 1)
# Y se mira la base, no lo que dice la función: comprobar el valor devuelto deja
# pasar una implementación que devuelva el número correcto sin cerrar nada.
comprobar("Y en la base no le queda ninguna abierta",
          admin.execute("select count(*) from sesion_representante "
                        "where representante_id = %s and cerrada_en is null",
                        (HOSTIL,)).fetchone()[0], 0)
comprobar("Y la fila queda marcada como revocada",
          admin.execute("select revocado_en is not null from representante "
                        "where id = %s", (HOSTIL,)).fetchone()[0], True)
r = c_hostil.get("/rep/", follow_redirects=False)
comprobar("Y la sesión que tenía en la mano deja de servir en el acto",
          r.status_code, 302)
_, r = entrar("hostil@plantilla.es", "clave-larga-hostil")
comprobar("Y ya no puede volver a entrar", r.status_code, 401)

# Lo de arriba no prueba lo que parece. `revocar` hace DOS cosas —marca la fila
# y cierra las sesiones— y `por_sesion` rechaza las sesiones cerradas, así que
# la puerta se cierra por el segundo motivo aunque el primero no funcionara. El
# caso que de verdad preocupa es el que no cierra ninguna sesión: un mandato que
# simplemente vence mientras alguien está dentro. Ahí no hay ningún evento, solo
# pasa un día.
c_caduca, r = entrar("carmen@plantilla.es", "clave-larga-de-carmen")
comprobar("Carmen vuelve a entrar", r.status_code, 302)
admin.execute("update representante set vigente_hasta = %s where id = %s",
              (AYER, CARMEN))
r = c_caduca.get("/rep/", follow_redirects=False)
comprobar("Un mandato que vence corta la sesión ya abierta, sin cerrarla nadie",
          r.status_code, 302)

# Y lo mismo marcando la revocación a mano, sin tocar las sesiones.
admin.execute("update representante set vigente_hasta = null where id = %s", (CARMEN,))
c_marcada, _ = entrar("carmen@plantilla.es", "clave-larga-de-carmen")
comprobar("Y con la sesión viva otra vez", c_marcada.get("/rep/").status_code, 200)
admin.execute("update representante set revocado_en = now() where id = %s", (CARMEN,))
comprobar("Marcar la revocación sin cerrar sesiones también corta",
          c_marcada.get("/rep/", follow_redirects=False).status_code, 302)
admin.execute("update representante set revocado_en = null where id = %s", (CARMEN,))

# Y una empresa desactivada cierra el portal de su plantilla.
admin.execute("update empresa set activa = false where id = %s", (A,))
comprobar("Una empresa desactivada cierra el portal",
          c_carmen.get("/rep/", follow_redirects=False).status_code, 302)
admin.execute("update empresa set activa = true where id = %s", (A,))
comprobar("Y al reactivarla vuelve", c_carmen.get("/rep/").status_code, 200)

# Las dos comprobaciones de arriba las pasan DOS capas: la consulta de la sesión
# y, detrás, `R.anotaciones`, que se niega a devolver nada de un mandato vencido.
# Con la primera rota las pruebas seguían pasando —el portal acababa en la puerta
# igual, solo que por el camino largo—. Así que se mide la primera sola.
testigo_suelto = R.abrir_sesion(admin, CARMEN)
huella = huella_de_token(testigo_suelto)
comprobar("Con el mandato vivo, la sesión resuelve a alguien",
          R.por_sesion(admin, huella) is not None, True)
admin.execute("update representante set vigente_hasta = %s where id = %s",
              (AYER, CARMEN))
comprobar("Vencido el mandato, la consulta de sesión ya no resuelve a nadie",
          R.por_sesion(admin, huella), None)
admin.execute("update representante set vigente_hasta = null, revocado_en = now() "
              "where id = %s", (CARMEN,))
comprobar("Y revocado, tampoco", R.por_sesion(admin, huella), None)
admin.execute("update representante set revocado_en = null where id = %s", (CARMEN,))
comprobar("Restaurado, vuelve a resolver",
          R.por_sesion(admin, huella) is not None, True)
admin.execute("update sesion_representante set cerrada_en = now() where id = %s",
              (huella,))
comprobar("Y una sesión cerrada no resuelve aunque el mandato esté vivo",
          R.por_sesion(admin, huella), None)

# Y la segunda capa, llamada directamente. A través del portal no se ejerce
# nunca —la primera para antes—, así que la única forma de saber si sigue ahí es
# pedírselo al dominio con un mandato muerto en la mano. Sin esto, se podía
# borrar entera y las pruebas no se enteraban.
vencido = R.Representante(
    id=CARMEN, empresa_id=A, empresa="Bar Casa Paco", nombre="Carmen Vega",
    email="carmen@plantilla.es", ambito="empresa", centro_id=None, centro=None,
    vigente_desde=HOY - timedelta(days=400), vigente_hasta=AYER, revocado_en=None)
comprobar("Un mandato vencido no está vigente", vencido.vigente(HOY), False)
falla("Y el dominio se niega a darle anotaciones", R.NoExiste,
      lambda: R.anotaciones(admin, vencido, PRIMERO, HOY))

revocado = R.Representante(
    id=CARMEN, empresa_id=A, empresa="Bar Casa Paco", nombre="Carmen Vega",
    email="carmen@plantilla.es", ambito="empresa", centro_id=None, centro=None,
    vigente_desde=HOY - timedelta(days=400), vigente_hasta=None,
    revocado_en=datetime.now(timezone.utc))
comprobar("Un mandato revocado tampoco está vigente", revocado.vigente(HOY), False)
falla("Ni a un revocado", R.NoExiste,
      lambda: R.anotaciones(admin, revocado, PRIMERO, HOY))

sin_empezar = R.Representante(
    id=CARMEN, empresa_id=A, empresa="Bar Casa Paco", nombre="Carmen Vega",
    email="carmen@plantilla.es", ambito="empresa", centro_id=None, centro=None,
    vigente_desde=HOY + timedelta(days=1), vigente_hasta=None, revocado_en=None)
comprobar("Uno que empieza mañana no está vigente hoy",
          sin_empezar.vigente(HOY), False)
falla("Ni a uno que aún no ha empezado", R.NoExiste,
      lambda: R.anotaciones(admin, sin_empezar, PRIMERO, HOY))

# ============================================================== CSRF y método

r = c_carmen.post("/rep/salir", data={})
comprobar("Salir sin testigo CSRF se rechaza", r.status_code, 400)
r = c_carmen.post("/rep/salir", data={"csrf": "el-de-otro"})
comprobar("Y con uno inventado, también", r.status_code, 400)
r = c_carmen.post("/rep/entrar", data={"email": "carmen@plantilla.es",
                                       "contrasena": "clave-larga-de-carmen"})
comprobar("Entrar sin CSRF tampoco", r.status_code, 400)

# ============================================== escalada: escribir desde el portal

# Esto es lo que separa «hemos programado un portal de solo lectura» de «el
# portal no puede escribir»: se intenta desde su propio usuario de base de datos.
como_portal = psycopg.connect(dsn_portal(), autocommit=True)
falla("El portal no puede añadir una anotación",
      psycopg.errors.InsufficientPrivilege,
      lambda: como_portal.execute(
          "insert into anotacion (empresa_id, numero, version, centro_id, "
          "trabajador_id, tipo, momento, anotado_en, zona_horaria, autor_id, "
          "parte, huella_anterior, huella) values "
          "(%s,9999,2,%s,%s,'entrada',now(),now(),'Europe/Madrid',%s,"
          "'trabajador','x','y')", (A, CENTRO_PLAYA, LUCIA, LUCIA)))
falla("Ni modificar una", psycopg.errors.InsufficientPrivilege,
      lambda: como_portal.execute("update anotacion set momento = now()"))
falla("Ni borrarla", psycopg.errors.InsufficientPrivilege,
      lambda: como_portal.execute("delete from anotacion"))
falla("Ni dar de alta un representante", psycopg.errors.InsufficientPrivilege,
      lambda: como_portal.execute(
          "insert into representante (id, empresa_id, nombre, email, "
          "contrasena_derivada, vigente_desde) values "
          "(gen_random_uuid(), %s, 'x', 'x@y.es', 'x', current_date)", (A,)))
falla("Ni alargarse el mandato a sí mismo", psycopg.errors.InsufficientPrivilege,
      lambda: como_portal.execute(
          "update representante set vigente_hasta = null, revocado_en = null"))
falla("Ni borrar el registro de sus propias consultas",
      psycopg.errors.InsufficientPrivilege,
      lambda: como_portal.execute("delete from acceso_representante"))
falla("Ni tocar el esquema", psycopg.errors.InsufficientPrivilege,
      lambda: como_portal.execute("create table colada (x int)"))
falla("Ni leer los PIN de la tabla de sesiones del trabajador",
      psycopg.errors.InsufficientPrivilege,
      lambda: como_portal.execute("select * from sesion"))
falla("Ni la tabla de usuarios de la gestoría",
      psycopg.errors.InsufficientPrivilege,
      lambda: como_portal.execute("select * from usuario_gestoria"))
comprobar("Pero sí puede leer el libro",
          como_portal.execute("select count(*) from anotacion").fetchone()[0] > 0,
          True)
como_portal.close()

# =============================================== el registro de accesos existe

r = c_carmen.get("/rep/accesos")
comprobar("Carmen ve sus propias consultas", r.status_code, 200)
suyos = R.accesos(admin, carmen.id)
comprobar("Y hay más de una apuntada", len(suyos) > 1, True)
comprobar("La primera fue el acceso",
          any(a["accion"] == "acceso" for a in suyos), True)
comprobar("Y hay listados apuntados",
          any(a["accion"] == "listado" for a in suyos), True)

antes = len(R.accesos_de_empresa(admin, A))
c_carmen.get("/rep/descargar.csv")
despues = R.accesos_de_empresa(admin, A)
comprobar("Una descarga también deja constancia", len(despues) > antes, True)
comprobar("Y la empresa ve quién la hizo",
          any(a["quien"] == "Carmen Vega" and a["accion"] == "descarga"
              for a in despues), True)

# ==================================================== la descarga y sus celdas

r = c_carmen.get("/rep/descargar.csv")
comprobar("El CSV se descarga", r.status_code, 200)
comprobar("Con nombre de archivo",
          "attachment" in r.headers.get("Content-Disposition", ""), True)
texto = r.data.decode("utf-8-sig")
comprobar("Lleva cabecera", texto.splitlines()[0].startswith("persona;dia"), True)
comprobar("Y datos de su plantilla", "Lucía García" in texto, True)
comprobar("Y de nadie más", "Jose Rival" in texto, False)

# Una persona que se llamara «=HYPERLINK(...)» convertiría el CSV en una forma
# de sacar datos del ordenador de quien lo abra.
PELIGROSA = crear_trabajador(admin, A, "=HYPERLINK(\"http://x\",\"pincha\")", "1099")
fichar_dia(A, CENTRO_PLAYA, PELIGROSA, PRIMERO)
r = c_carmen.get("/rep/descargar.csv")
texto = r.data.decode("utf-8-sig")
comprobar("Una celda que empieza por = sale escapada",
          "'=HYPERLINK" in texto, True)

# =================================================== cabeceras de seguridad

r = c_carmen.get("/rep/")
comprobar("Hay política de contenido",
          "default-src 'none'" in r.headers.get("Content-Security-Policy", ""), True)
comprobar("Y prohíbe que la metan en un marco",
          "frame-ancestors 'none'" in r.headers.get("Content-Security-Policy", ""),
          True)
comprobar("Y no se adivina el tipo de contenido",
          r.headers.get("X-Content-Type-Options"), "nosniff")

# ==================================================== fuerza bruta contra la clave

admin.execute("delete from intento_representante")
codigos = []
for intento in range(12):
    _, resp = entrar("carmen@plantilla.es", f"mala-{intento}")
    codigos.append(resp.status_code)
comprobar("A partir de unos cuantos fallos se bloquea", 429 in codigos, True)
comprobar("Y se bloquea pronto, no al décimo",
          codigos.index(429) <= 9, True)
# Y no se abre por acertar durante el bloqueo.
_, resp = entrar("carmen@plantilla.es", "clave-larga-de-carmen")
comprobar("Durante el bloqueo ni la contraseña buena entra", resp.status_code, 429)
admin.execute("delete from intento_representante")

# ============================================================= sin sesión, nada

anonimo = portal.test_client()
for ruta in ["/rep/", "/rep/accesos", "/rep/descargar.csv", f"/rep/persona/{LUCIA}"]:
    r = anonimo.get(ruta, follow_redirects=False)
    comprobar(f"Sin sesión, {ruta} manda a la puerta", r.status_code, 302)

# =========================================== el alta desde el panel, y su frontera

c_ana = entrar_panel("ana@perez.es", "una-frase-larga-de-ana")
c_luis = entrar_panel("luis@perez.es", "una-frase-larga-de-luis")
c_bea = entrar_panel("bea@rival.es", "una-frase-larga-de-bea")

r = c_ana.get(f"/panel/empresas/{A}/representantes")
comprobar("Ana ve la página de representación", r.status_code, 200)
comprobar("Y a Carmen en ella", b"Carmen Vega" in r.data, True)
comprobar("Y quién ha consultado", b"consultado" in r.data, True)

# La gestoría rival no puede ni mirar.
r = c_bea.get(f"/panel/empresas/{A}/representantes")
comprobar("La gestoría rival no ve esa página: 404", r.status_code, 404)

alta = {"nombre": "Nueva Rep", "email": "nueva@plantilla.es",
        "contrasena": "una-contrasena-larguisima", "desde": str(HOY)}

# Y menos aún dar de alta a alguien en una empresa que no es suya. Esto es lo
# más grave que se podría colar por aquí: sería regalarse acceso a la jornada de
# la plantilla de un cliente de otra gestoría.
r = c_bea.post(f"/panel/empresas/{A}/representantes",
               data={**alta, "csrf": csrf_panel(c_bea)})
comprobar("Ni dar de alta en una empresa ajena", r.status_code, 404)
comprobar("Y no se ha creado nada",
          admin.execute("select count(*) from representante where email = %s",
                        ("nueva@plantilla.es",)).fetchone()[0], 0)

# Luis puede ver, pero dar acceso a una plantilla entera no es de su rol.
r = c_luis.post(f"/panel/empresas/{A}/representantes",
                data={**alta, "csrf": csrf_panel(c_luis)})
comprobar("Un usuario sin el permiso no puede dar acceso", r.status_code, 403)
comprobar("Y tampoco se ha creado nada",
          admin.execute("select count(*) from representante where email = %s",
                        ("nueva@plantilla.es",)).fetchone()[0], 0)

# Ana sí.
r = c_ana.post(f"/panel/empresas/{A}/representantes",
               data={**alta, "csrf": csrf_panel(c_ana)})
comprobar("Ana sí puede", r.status_code, 302)
NUEVA = admin.execute("select id::text from representante where email = %s",
                      ("nueva@plantilla.es",)).fetchone()
comprobar("Y queda creada", NUEVA is not None, True)
comprobar("Con constancia de quién le dio el acceso",
          admin.execute("select creado_por::text from representante where id = %s",
                        (NUEVA[0],)).fetchone()[0], ANA)

# Una contraseña corta no pasa.
r = c_ana.post(f"/panel/empresas/{A}/representantes",
               data={**alta, "email": "corta@plantilla.es", "contrasena": "1234",
                     "csrf": csrf_panel(c_ana)})
comprobar("Una contraseña corta se rechaza",
          admin.execute("select count(*) from representante where email = %s",
                        ("corta@plantilla.es",)).fetchone()[0], 0)

# Sin CSRF, nada.
r = c_ana.post(f"/panel/empresas/{A}/representantes",
               data={**alta, "email": "sincsrf@plantilla.es"})
comprobar("Y sin testigo CSRF, tampoco", r.status_code, 400)

# --------------------------------------------------- revocar, con la misma frontera

r = c_bea.post(f"/panel/empresas/{B}/representantes/revocar",
               data={"representante": CARMEN, "csrf": csrf_panel(c_bea)})
comprobar("La rival no puede revocar a un representante de otra empresa "
          "ni pasándolo por su propia empresa", r.status_code, 404)
comprobar("Y Carmen sigue sin revocar",
          admin.execute("select revocado_en from representante where id = %s",
                        (CARMEN,)).fetchone()[0], None)

r = c_luis.post(f"/panel/empresas/{A}/representantes/revocar",
                data={"representante": CARMEN, "csrf": csrf_panel(c_luis)})
comprobar("Luis tampoco puede revocar", r.status_code, 403)

r = c_ana.post(f"/panel/empresas/{A}/representantes/revocar",
               data={"representante": NUEVA[0], "csrf": csrf_panel(c_ana)})
comprobar("Ana sí revoca", r.status_code, 302)
comprobar("Y queda revocada",
          admin.execute("select revocado_en is not null from representante "
                        "where id = %s", (NUEVA[0],)).fetchone()[0], True)

# ================================================================= rendimiento

arranque = time.perf_counter()
r = c_carmen.get("/rep/")
portada = time.perf_counter() - arranque
arranque = time.perf_counter()
c_carmen.get("/rep/descargar.csv")
descarga = time.perf_counter() - arranque

print()
print("  Rendimiento del portal")
print(f"    portada    {portada * 1000:6.0f} ms")
print(f"    descarga   {descarga * 1000:6.0f} ms")
print()

comprobar("La portada tarda menos de un segundo", portada < 1.0, True)

admin.close()

if fallos:
    print(f"\n{len(fallos)} de {hechas} comprobaciones fallan:\n")
    for fallo in fallos:
        print(f"  · {fallo}\n")
    raise SystemExit(1)
print(f"Todas las comprobaciones pasan: {hechas} sobre el portal de representantes.")
