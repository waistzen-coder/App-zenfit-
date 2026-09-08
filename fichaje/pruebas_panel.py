"""Pruebas del panel de gestoría. `python3 -m fichaje.pruebas_panel`.

Lo que de verdad se comprueba aquí es una sola cosa: que una gestoría no pueda
ver ni tocar nada de otra. Todo lo demás es funcionalidad; esto es el producto.

Recrean el esquema desde las migraciones. No apuntar nunca a datos reales.
"""

import os
import time
from datetime import datetime, timezone

os.environ.setdefault("FICHAJE_APP_PASSWORD", "prueba-local")
os.environ.setdefault("FICHAJE_PANEL_SECRETO", "secreto-panel-pruebas")
os.environ.setdefault("FICHAJE_SECRETO", "secreto-fichaje-pruebas")

from . import gestoria as G  # noqa: E402
from .admin import crear_centro, crear_empresa, crear_trabajador, poner_pin  # noqa: E402
from .despliegue import configurar_rol, dsn_aplicacion  # noqa: E402
from .migrar import aplicar  # noqa: E402
from .panel import crear_panel  # noqa: E402
from .postgres import LibroPostgres, conectar  # noqa: E402
from .web import crear_app  # noqa: E402

fallos: list[str] = []
hechas = 0


def comprobar(descripcion: str, obtenido, esperado):
    global hechas
    hechas += 1
    if obtenido != esperado:
        fallos.append(f"{descripcion}\n    esperado: {esperado!r}\n    obtenido: {obtenido!r}")


def vaciar_base(conexion) -> None:
    """Tira todas las tablas del esquema, sean las que sean.

    Antes había una lista escrita a mano y cada tabla nueva la rompía: la
    migración intentaba crear algo que ya estaba. La base se pregunta a sí
    misma qué tiene.
    """
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

# Gestoría A, con dos empresas y dos usuarios de distinto rol.
GA = G.crear_gestoria(admin, "Asesoría Pérez")
ANA = G.crear_usuario(admin, GA, "ana@perez.es", "Ana Pérez",
                      "una-frase-larga-de-ana", G.Rol.ADMIN)
LUIS = G.crear_usuario(admin, GA, "luis@perez.es", "Luis Soto",
                       "una-frase-larga-de-luis", G.Rol.USUARIO)
A1 = crear_empresa(admin, "Bar Casa Paco", GA)
A2 = crear_empresa(admin, "Panadería Rosa", GA)
CENTRO_A1, TOKEN_A1 = crear_centro(admin, A1, "Local de la playa", "Europe/Madrid")
LUCIA = crear_trabajador(admin, A1, "Lucía García", "1042")
poner_pin(admin, LUCIA, "482913")

# Gestoría B, la que nunca debe verse desde A.
GB = G.crear_gestoria(admin, "Gestoría Rival")
BEA = G.crear_usuario(admin, GB, "bea@rival.es", "Bea Ruiz",
                      "una-frase-larga-de-bea", G.Rol.ADMIN)
B1 = crear_empresa(admin, "Taller Secreto", GB)
CENTRO_B1, TOKEN_B1 = crear_centro(admin, B1, "Nave", "Europe/Madrid")
JOSE = crear_trabajador(admin, B1, "Jose Rival", "9001")
poner_pin(admin, JOSE, "771122")

# Y un nombre hostil, para el escapado.
MALA = crear_empresa(admin, "<script>alert(1)</script>", GA)

panel = crear_panel(dsn_aplicacion())
panel.config["TESTING"] = True
web = crear_app(dsn_aplicacion())
web.config["TESTING"] = True


def entrar_panel(email: str, contrasena: str):
    c = panel.test_client()
    c.get("/panel/entrar")
    with c.session_transaction() as s:
        csrf = s["csrf"]
    r = c.post("/panel/entrar", data={"email": email, "contrasena": contrasena,
                                      "csrf": csrf})
    return c, r


def csrf_de(c) -> str:
    """El testigo CSRF que tendría el navegador.

    Pasa antes por una página: al identificarse se limpia la sesión entera
    —que es lo correcto, para que nadie pueda fijar una de antemano— y el
    testigo se genera de nuevo al pintar el siguiente formulario.
    """
    with c.session_transaction() as s:
        if s.get("csrf"):
            return s["csrf"]
    c.get("/panel/")
    with c.session_transaction() as s:
        return s.get("csrf", "")


# =================================================================== acceso

c, r = entrar_panel("ana@perez.es", "mal-mal-mal-mal")
comprobar("Contraseña equivocada no entra", r.status_code, 401)
comprobar("Y el mensaje no dice si el correo existe",
          "correo o la contraseña" in r.get_data(as_text=True), True)
c, r = entrar_panel("nadie@ninguna.es", "una-frase-larga-cualquiera")
comprobar("Un correo inexistente da exactamente el mismo mensaje",
          "correo o la contraseña" in r.get_data(as_text=True), True)
comprobar("Y el mismo código", r.status_code, 401)

ana, r = entrar_panel("ana@perez.es", "una-frase-larga-de-ana")
comprobar("Con la contraseña correcta, entra", r.status_code, 302)
comprobar("Y ve su gestoría",
          "Asesoría Pérez" in ana.get("/panel/").get_data(as_text=True), True)

luis, _ = entrar_panel("luis@perez.es", "una-frase-larga-de-luis")
bea, _ = entrar_panel("bea@rival.es", "una-frase-larga-de-bea")

# Fuerza bruta
codigos = [entrar_panel("ana@perez.es", "fallo-fallo-fallo")[1].status_code
           for _ in range(7)]
comprobar("Tras varios fallos, bloqueo", 429 in codigos, True)
admin.execute("delete from intento_panel")

c = panel.test_client()
comprobar("Sin sesión, el panel manda a la puerta",
          c.get("/panel/").status_code, 302)
comprobar("Y la lista de empresas también",
          c.get("/panel/empresas").status_code, 302)

# ==================================== aislamiento entre gestorías · red team

lecturas = [
    ("la empresa", f"/panel/empresas/{B1}"),
    ("su jornada", f"/panel/empresas/{B1}/jornada"),
    ("el QR de su centro", f"/panel/centros/{CENTRO_B1}/qr.svg"),
]
for que, ruta in lecturas:
    comprobar(f"Ana no puede ver {que} de la otra gestoría",
              ana.get(ruta).status_code, 404)

escrituras = [
    ("renombrar su empresa", f"/panel/empresas/{B1}/renombrar", {"nombre": "Mía"}),
    ("crearle un centro", f"/panel/empresas/{B1}/centros", {"nombre": "X"}),
    ("crearle un trabajador", f"/panel/empresas/{B1}/trabajadores",
     {"nombre": "X", "codigo": "X1"}),
    ("rotarle el QR", f"/panel/centros/{CENTRO_B1}/rotar", {}),
    ("resetear el PIN de su gente", f"/panel/trabajadores/{JOSE}/pin", {"pin": "999888"}),
    ("darle de baja a su gente", f"/panel/trabajadores/{JOSE}/estado", {"activo": "0"}),
    ("verificar su libro", f"/panel/empresas/{B1}/verificar", {}),
]
for que, ruta, datos in escrituras:
    r = ana.post(ruta, data={**datos, "csrf": csrf_de(ana)})
    comprobar(f"Ana no puede {que}", r.status_code, 404)

comprobar("El PIN de Jose sigue siendo el suyo",
          admin.execute("select pin_derivado from trabajador where id = %s",
                        (JOSE,)).fetchone()[0].startswith("scrypt$"), True)
comprobar("Y sigue de alta",
          admin.execute("select activo from trabajador where id = %s",
                        (JOSE,)).fetchone()[0], True)

# La búsqueda tampoco filtra.
comprobar("Buscar el nombre de la empresa rival no la encuentra",
          "Taller Secreto" in ana.get("/panel/empresas?q=Taller").get_data(as_text=True),
          False)
comprobar("Ni buscando a su gente",
          "Jose Rival" in ana.get("/panel/trabajadores?q=Jose").get_data(as_text=True),
          False)
comprobar("Bea sí ve la suya",
          "Taller Secreto" in bea.get("/panel/empresas").get_data(as_text=True), True)
comprobar("Y Bea no ve las de Ana",
          "Bar Casa Paco" in bea.get("/panel/empresas").get_data(as_text=True), False)

comprobar("Un 404, no un 403: no se confirma que la empresa exista",
          ana.get(f"/panel/empresas/{B1}").status_code, 404)
comprobar("Y una empresa inventada da lo mismo",
          ana.get("/panel/empresas/11111111-1111-4111-8111-999999999999").status_code,
          404)

# ============================================ escalada horizontal de privilegios

comprobar("Luis (uso diario) no puede dar de alta una empresa",
          luis.post("/panel/empresas",
                    data={"nombre": "Mía", "csrf": csrf_de(luis)}).status_code, 403)
comprobar("Ni crear un centro",
          luis.post(f"/panel/empresas/{A1}/centros",
                    data={"nombre": "X", "csrf": csrf_de(luis)}).status_code, 403)
comprobar("Ni rotar un QR",
          luis.post(f"/panel/centros/{CENTRO_A1}/rotar",
                    data={"csrf": csrf_de(luis)}).status_code, 403)
comprobar("Ni entrar en usuarios", luis.get("/panel/usuarios").status_code, 403)
comprobar("Ni crear usuarios",
          luis.post("/panel/usuarios",
                    data={"email": "x@y.es", "nombre": "X",
                          "contrasena": "una-frase-larga-x",
                          "rol": "gestoria_admin",
                          "csrf": csrf_de(luis)}).status_code, 403)
comprobar("Pero sí puede dar de alta a una persona, que es su trabajo",
          luis.post(f"/panel/empresas/{A1}/trabajadores",
                    data={"nombre": "Marta Gil", "codigo": "1055", "pin": "246813",
                          "csrf": csrf_de(luis)}).status_code, 302)
comprobar("Y resetear un PIN",
          luis.post(f"/panel/trabajadores/{LUCIA}/pin",
                    data={"pin": "482913", "csrf": csrf_de(luis)}).status_code, 302)
comprobar("Ocultar el botón no era la protección: el servidor decide",
          admin.execute("select count(*) from empresa where nombre = 'Mía'"
                        ).fetchone()[0], 0)

# ================================================================ CSRF

sensibles = [
    ("/panel/empresas", {"nombre": "Colada"}),
    (f"/panel/empresas/{A1}/trabajadores", {"nombre": "X", "codigo": "X9"}),
    (f"/panel/trabajadores/{LUCIA}/pin", {"pin": "999888"}),
    (f"/panel/trabajadores/{LUCIA}/estado", {"activo": "0"}),
    (f"/panel/centros/{CENTRO_A1}/rotar", {}),
    ("/panel/usuarios", {"email": "z@z.es", "nombre": "Z", "contrasena": "x" * 12}),
    ("/panel/salir", {}),
]
for ruta, datos in sensibles:
    comprobar(f"Sin testigo CSRF: {ruta}", ana.post(ruta, data=datos).status_code, 400)
for ruta, datos in sensibles[:3]:
    comprobar(f"Con un testigo inventado: {ruta}",
              ana.post(ruta, data={**datos, "csrf": "falso"}).status_code, 400)
comprobar("Y ninguna se coló",
          admin.execute("select count(*) from empresa where nombre = 'Colada'"
                        ).fetchone()[0], 0)

# ==================================================== asignación masiva de campos

ana.post("/panel/empresas", data={"nombre": "Empresa nueva", "csrf": csrf_de(ana),
                                  "gestoria_id": GB, "activa": "false", "id": B1})
duena = admin.execute(
    "select gestoria_id::text, activa from empresa where nombre = 'Empresa nueva'"
).fetchone()
comprobar("Mandar gestoria_id en el formulario no cambia el dueño", duena[0], GA)
comprobar("Ni mandar «activa»", duena[1], True)

ana.post("/panel/usuarios", data={
    "email": "nuevo@perez.es", "nombre": "Nuevo", "contrasena": "una-frase-larga-nueva",
    "rol": "superadministrador", "activo": "false", "csrf": csrf_de(ana)})
comprobar("Un rol inventado cae al rol de menos permisos",
          admin.execute("select rol from usuario_gestoria where email = 'nuevo@perez.es'"
                        ).fetchone()[0], "gestoria_user")

# ======================================================================== XSS

pagina = ana.get("/panel/empresas").get_data(as_text=True)
comprobar("Un nombre de empresa con etiquetas no se ejecuta",
          "<script>alert(1)</script>" in pagina, False)
comprobar("Sale escapado", "&lt;script&gt;" in pagina, True)

# ============================================= el trabajador no entra en el panel

trabajador = web.test_client()
trabajador.get(f"/f/{TOKEN_A1}")
with trabajador.session_transaction() as s:
    csrf_t = s["csrf"]
trabajador.post(f"/f/{TOKEN_A1}/entrar",
                data={"codigo": "1042", "pin": "482913", "csrf": csrf_t})
comprobar("El trabajador ha entrado en su fichaje",
          "Hola," in trabajador.get(f"/f/{TOKEN_A1}").get_data(as_text=True), True)

colado = panel.test_client()
with trabajador.session_transaction() as suya:
    testigo = suya.get("sesion")
with colado.session_transaction() as s:
    s["sesion"] = testigo
    s["panel"] = testigo          # intentando que valga en el panel
for ruta in ("/panel/", "/panel/empresas", "/panel/trabajadores", "/panel/usuarios"):
    comprobar(f"Con la sesión de un trabajador no se entra en {ruta}",
              colado.get(ruta).status_code, 302)

# ============================================ revocar sesión de personal

nuevo = G.crear_usuario(admin, GA, "temp@perez.es", "Temporal",
                        "una-frase-larga-temporal", G.Rol.USUARIO)
temp, _ = entrar_panel("temp@perez.es", "una-frase-larga-temporal")
comprobar("El usuario nuevo entra", temp.get("/panel/").status_code, 200)
ana.post(f"/panel/usuarios/{nuevo}/estado", data={"activo": "0", "csrf": csrf_de(ana)})
comprobar("Desactivado, su sesión abierta deja de valer en el acto",
          temp.get("/panel/").status_code, 302)
comprobar("Y no puede volver a entrar",
          entrar_panel("temp@perez.es", "una-frase-larga-temporal")[1].status_code, 401)
comprobar("Nadie puede desactivarse a sí mismo",
          ana.post(f"/panel/usuarios/{ANA}/estado",
                   data={"activo": "0", "csrf": csrf_de(ana)}).status_code, 403)
comprobar("Ni desactivar a alguien de otra gestoría",
          ana.post(f"/panel/usuarios/{BEA}/estado",
                   data={"activo": "0", "csrf": csrf_de(ana)}).status_code, 404)

# ================================ resetear el PIN cierra las sesiones del móvil

comprobar("El trabajador sigue dentro antes del reseteo",
          "Hola," in trabajador.get(f"/f/{TOKEN_A1}").get_data(as_text=True), True)
ana.post(f"/panel/trabajadores/{LUCIA}/pin",
         data={"pin": "555444", "csrf": csrf_de(ana)})
comprobar("Cambiado el PIN, su sesión del móvil se cierra",
          "Tu PIN" in trabajador.get(f"/f/{TOKEN_A1}").get_data(as_text=True), True)

# ==================================================== E2E completo de la gestoría

ana2, _ = entrar_panel("ana@perez.es", "una-frase-larga-de-ana")
r = ana2.post("/panel/empresas", data={"nombre": "Cafetería Nueva",
                                       "csrf": csrf_de(ana2)})
NUEVA = r.headers["Location"].rstrip("/").split("/")[-1]
ana2.post(f"/panel/empresas/{NUEVA}/centros",
          data={"nombre": "Barra", "zona": "Atlantic/Canary", "csrf": csrf_de(ana2)})
ana2.post(f"/panel/empresas/{NUEVA}/trabajadores",
          data={"nombre": "Pedro Sanz", "codigo": "3001", "pin": "135791",
                "csrf": csrf_de(ana2)})
centro_nuevo = admin.execute(
    "select id::text, token_publico from centro where empresa_id = %s", (NUEVA,)
).fetchone()
comprobar("La gestoría ha creado empresa, centro y persona sin tocar la base",
          bool(centro_nuevo), True)

movil = web.test_client()
movil.get(f"/f/{centro_nuevo[1]}")
with movil.session_transaction() as s:
    csrf_m = s["csrf"]
movil.post(f"/f/{centro_nuevo[1]}/entrar",
           data={"codigo": "3001", "pin": "135791", "csrf": csrf_m})
pagina = movil.get(f"/f/{centro_nuevo[1]}").get_data(as_text=True)
clave = pagina.split('name="clave" value="', 1)[1].split('"', 1)[0]
csrf_m = pagina.split('name="csrf" value="', 1)[1].split('"', 1)[0]
movil.post(f"/f/{centro_nuevo[1]}/fichar",
           data={"accion": "entrada", "csrf": csrf_m, "clave": clave})

vista = ana2.get(f"/panel/empresas/{NUEVA}").get_data(as_text=True)
comprobar("La gestoría ve a la persona trabajando", "trabajando" in vista, True)
comprobar("Una empresa que nadie ha comprobado se dice sin comprobar, "
          "no se finge que está bien", "sin comprobar" in vista, True)
ana2.post(f"/panel/empresas/{NUEVA}/verificar", data={"csrf": csrf_de(ana2)})
vista = ana2.get(f"/panel/empresas/{NUEVA}").get_data(as_text=True)
comprobar("Tras comprobarla, la integridad sale correcta", "correcta" in vista, True)
comprobar("Con la fecha de cuándo se comprobó", "comprobado el" in vista, True)
comprobar("La jornada del día sale del dominio",
          "Pedro Sanz" in ana2.get(f"/panel/empresas/{NUEVA}/jornada").get_data(as_text=True),
          True)
comprobar("El resumen cuenta a alguien trabajando",
          "Trabajando ahora" in ana2.get("/panel/").get_data(as_text=True), True)

# =============================================== integridad rota: se ve y no se repara

admin.execute("alter table anotacion disable trigger anotacion_solo_anadir")
admin.execute("update anotacion set momento = momento - interval '1 hour' "
              "where empresa_id = %s", (NUEVA,))
admin.execute("alter table anotacion enable trigger anotacion_solo_anadir")

comprobar("Antes de volver a comprobar, el resumen sigue con el dato viejo",
          "Integridad del libro" in ana2.get("/panel/").get_data(as_text=True), False)
ana2.post(f"/panel/empresas/{NUEVA}/verificar", data={"csrf": csrf_de(ana2)})
portada = ana2.get("/panel/").get_data(as_text=True)
comprobar("Comprobada, el resumen avisa de que un libro no cuadra",
          "Integridad del libro" in portada, True)
comprobar("Y dice qué empresa", "Cafetería Nueva" in portada, True)
comprobar("No dice que todo esté correcto", "no cuadra" in
          ana2.get(f"/panel/empresas/{NUEVA}").get_data(as_text=True), True)
comprobar("Y no hay ningún botón de reparar",
          "reparar" in ana2.get(f"/panel/empresas/{NUEVA}").get_data(as_text=True).lower(),
          False)

# ================================================== ninguna ruta toca el libro

antes = admin.execute("select count(*), coalesce(max(numero),0) from anotacion "
                      "where empresa_id = %s", (A1,)).fetchone()
for ruta, datos in [(f"/panel/empresas/{A1}/renombrar", {"nombre": "Otro"}),
                    (f"/panel/trabajadores/{LUCIA}/estado", {"activo": "0"}),
                    (f"/panel/trabajadores/{LUCIA}/pin", {"pin": "112233"}),
                    (f"/panel/centros/{CENTRO_A1}/rotar", {})]:
    ana2.post(ruta, data={**datos, "csrf": csrf_de(ana2)})
comprobar("Nada de lo que hace el panel altera el libro de fichajes",
          admin.execute("select count(*), coalesce(max(numero),0) from anotacion "
                        "where empresa_id = %s", (A1,)).fetchone(), antes)

# ================================================== registro administrativo

lineas = ana2.get("/panel/registro").get_data(as_text=True)
comprobar("El registro recoge lo que se ha hecho", "crear" in lineas, True)
comprobar("Y es de la propia gestoría",
          admin.execute("select count(*) from registro_administrativo where "
                        "gestoria_id = %s", (GB,)).fetchone()[0], 0)
comprobar("Bea no ve la actividad de Ana",
          "Cafetería Nueva" in bea.get("/panel/registro").get_data(as_text=True), False)

# ===================================================================== SQL

for hostil in ("' or '1'='1", "'; drop table empresa; --", "%", "_", "\\"):
    r = ana2.get("/panel/empresas", query_string={"q": hostil})
    comprobar(f"Una búsqueda hostil no rompe nada: {hostil[:14]}", r.status_code, 200)
comprobar("Y la tabla sigue ahí",
          admin.execute("select count(*) from empresa").fetchone()[0] > 0, True)

# ================================================================ rendimiento

for n in range(100):
    empresa_n = crear_empresa(admin, f"Empresa {n:03d}", GA)
    centro_n, _ = crear_centro(admin, empresa_n, "Centro", "Europe/Madrid")
    for m in range(5):
        crear_trabajador(admin, empresa_n, f"Persona {n}-{m}", f"P{n:03d}{m}")

medidas = {}
for nombre, ruta in (("resumen", "/panel/"), ("empresas", "/panel/empresas"),
                     ("trabajadores", "/panel/trabajadores"),
                     ("buscar", "/panel/trabajadores?q=Persona+050")):
    arranque = time.perf_counter()
    respuesta = ana2.get(ruta)
    medidas[nombre] = time.perf_counter() - arranque
    comprobar(f"{nombre} responde", respuesta.status_code, 200)

total_empresas = admin.execute("select count(*) from empresa where gestoria_id = %s",
                               (GA,)).fetchone()[0]
print()
print(f"  Con {total_empresas} empresas y "
      f"{admin.execute('select count(*) from trabajador').fetchone()[0]} personas:")
for nombre, segundos in medidas.items():
    print(f"    {nombre:14} {segundos*1000:7.0f} ms")
print()

admin.close()

if fallos:
    print(f"\n{len(fallos)} de {hechas} comprobaciones fallan:\n")
    for fallo in fallos:
        print(f"  · {fallo}\n")
    raise SystemExit(1)
print(f"Todas las comprobaciones pasan: {hechas} sobre el panel de gestoría.")
