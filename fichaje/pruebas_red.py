"""El límite de intentos y de dónde viene cada petición.
`python3 -m fichaje.pruebas_red`.

Esta suite existe por un fallo que estuvo dentro durante toda la construcción y
que no encontró ninguna de las otras, porque cada una probaba su aplicación y
esto atraviesa las tres.

`request.remote_addr` es quien abrió la conexión TCP. Detrás de un proxy inverso
—lo que el manual manda poner para tener HTTPS— quien la abre es siempre el
proxy, así que TODO el tráfico llega con la misma dirección. Y el límite contaba
«fallos de esta cuenta o de esta dirección» con un umbral pensado para una
persona.

Medido antes de arreglarlo: **ocho intentos fallidos de un desconocido, contra
una cuenta que ni existía, dejaban fuera a todos los usuarios del panel.**
Cualquiera podía apagar el producto desde su casa sin saber ninguna contraseña.

Lo que se comprueba aquí es que eso no vuelve, y que lo que sí tiene que
bloquear sigue bloqueando.
"""

import os
from datetime import datetime, timedelta, timezone

os.environ.setdefault("FICHAJE_APP_PASSWORD", "prueba-local")
os.environ.setdefault("FICHAJE_PORTAL_PASSWORD", "prueba-local-portal")
os.environ.setdefault("FICHAJE_SECRETO", "secreto-fichaje-pruebas")
os.environ.setdefault("FICHAJE_PANEL_SECRETO", "secreto-panel-pruebas")
os.environ.setdefault("FICHAJE_PORTAL_SECRETO", "secreto-portal-pruebas")

from flask import Flask  # noqa: E402

from . import gestoria as G  # noqa: E402
from . import red  # noqa: E402
from . import representacion as R  # noqa: E402
from .admin import crear_centro, crear_empresa, crear_trabajador, poner_pin  # noqa: E402
from .despliegue import (  # noqa: E402
    configurar_rol,
    configurar_rol_portal,
    dsn_aplicacion,
    dsn_portal,
)
from .migrar import aplicar  # noqa: E402
from .panel import crear_panel  # noqa: E402
from .portal import crear_portal  # noqa: E402
from .postgres import conectar  # noqa: E402
from .web import crear_app  # noqa: E402

fallos: list[str] = []
hechas = 0


def comprobar(descripcion: str, obtenido, esperado):
    global hechas
    hechas += 1
    if obtenido != esperado:
        fallos.append(f"{descripcion}\n    esperado: {esperado!r}\n    obtenido: {obtenido!r}")


def vaciar_base(conexion) -> None:
    tablas = [f[0] for f in conexion.execute(
        "select tablename from pg_tables where schemaname = 'public'").fetchall()]
    if tablas:
        from psycopg import sql
        conexion.execute(sql.SQL("drop table {} cascade").format(
            sql.SQL(", ").join(sql.Identifier(t) for t in tablas)))


admin = conectar()
vaciar_base(admin)
admin.close()
aplicar()
admin = conectar()
configurar_rol(admin)
configurar_rol_portal(admin)

MADRID = "Europe/Madrid"
HOY = datetime.now(timezone.utc).date()

GA = G.crear_gestoria(admin, "Asesoría Pérez")
ANA = G.crear_usuario(admin, GA, "ana@perez.es", "Ana Pérez",
                      "una-frase-larga-de-ana", G.Rol.ADMIN)
LUIS = G.crear_usuario(admin, GA, "luis@perez.es", "Luis Soto",
                       "una-frase-larga-de-luis", G.Rol.ADMIN)
EMPRESA = crear_empresa(admin, "Bar Casa Paco", GA)
CENTRO_A, TOKEN_A = crear_centro(admin, EMPRESA, "Local de la playa", MADRID)
CENTRO_B, TOKEN_B = crear_centro(admin, EMPRESA, "Local del pueblo", MADRID)
LUCIA = crear_trabajador(admin, EMPRESA, "Lucía García", "1042")
MARIO = crear_trabajador(admin, EMPRESA, "Mario Ruiz", "1043")
poner_pin(admin, LUCIA, "482913")
poner_pin(admin, MARIO, "771122")
R.crear(admin, EMPRESA, "Carmen Vega", "carmen@plantilla.es",
        "una-clave-larguisima", vigente_desde=HOY - timedelta(days=30))
R.crear(admin, EMPRESA, "Pablo Sanz", "pablo@plantilla.es",
        "otra-clave-larguisima", vigente_desde=HOY - timedelta(days=30))

panel = crear_panel(dsn_aplicacion()); panel.config["TESTING"] = True
portal = crear_portal(dsn_portal()); portal.config["TESTING"] = True
web = crear_app(dsn_aplicacion()); web.config["TESTING"] = True

# El proxy inverso del manual: todo el mundo llega con la misma dirección.
PROXY = "10.0.0.1"
OTRA_RED = "198.51.100.9"


def _entrar(app, ruta, datos, ip):
    c = app.test_client()
    c.get(ruta, environ_base={"REMOTE_ADDR": ip})
    with c.session_transaction() as s:
        csrf = s.get("csrf", "")
    return c.post(ruta, data={**datos, "csrf": csrf},
                  environ_base={"REMOTE_ADDR": ip}).status_code


def panel_entrar(email, contrasena, ip=PROXY):
    return _entrar(panel, "/panel/entrar",
                   {"email": email, "contrasena": contrasena}, ip)


def portal_entrar(email, contrasena, ip=PROXY):
    return _entrar(portal, "/rep/entrar",
                   {"email": email, "contrasena": contrasena}, ip)


def fichar_entrar(token, codigo, pin, ip=PROXY):
    c = web.test_client()
    c.get(f"/f/{token}", environ_base={"REMOTE_ADDR": ip})
    with c.session_transaction() as s:
        csrf = s.get("csrf", "")
    return c.post(f"/f/{token}/entrar",
                  data={"codigo": codigo, "pin": pin, "csrf": csrf},
                  environ_base={"REMOTE_ADDR": ip}).status_code


def limpiar():
    for tabla in ("intento_panel", "intento_representante", "intento_acceso"):
        admin.execute(f"delete from {tabla}")


# ============== el fallo, tal y como era: nadie puede apagar el producto

limpiar()
# Un desconocido prueba ocho contraseñas contra una cuenta que ni existe.
for i in range(8):
    panel_entrar("no-existe@ningun-sitio.es", f"mala-{i}")
comprobar("Ocho fallos contra una cuenta inventada NO bloquean a Ana",
          panel_entrar("ana@perez.es", "una-frase-larga-de-ana"), 302)

limpiar()
for i in range(8):
    portal_entrar("no-existe@ningun-sitio.es", f"mala-{i}")
comprobar("Ni a Carmen en el portal",
          portal_entrar("carmen@plantilla.es", "una-clave-larguisima"), 302)

limpiar()
for i in range(8):
    fichar_entrar(TOKEN_A, "9999", f"{100000 + i}")
comprobar("Ni a Lucía en el fichaje", fichar_entrar(TOKEN_A, "1042", "482913"), 302)

# Y tampoco los fallos de OTRA persona real de la misma casa.
limpiar()
for i in range(8):
    panel_entrar("luis@perez.es", f"mala-{i}")
comprobar("Los fallos de Luis no dejan fuera a Ana",
          panel_entrar("ana@perez.es", "una-frase-larga-de-ana"), 302)
comprobar("Pero Luis sí está bloqueado, que es lo que tiene que pasar",
          panel_entrar("luis@perez.es", "una-frase-larga-de-luis"), 429)

# ================== lo que SÍ tiene que bloquear, sigue bloqueando

limpiar()
codigos = [panel_entrar("ana@perez.es", f"mala-{i}") for i in range(8)]
comprobar("Contra una cuenta concreta se bloquea", 429 in codigos, True)
comprobar("Y pronto: al quinto fallo", codigos.index(429), red.FALLOS_POR_CUENTA)
comprobar("Durante el bloqueo ni la contraseña buena entra",
          panel_entrar("ana@perez.es", "una-frase-larga-de-ana"), 429)

limpiar()
codigos = [portal_entrar("carmen@plantilla.es", f"mala-{i}") for i in range(8)]
comprobar("En el portal igual", 429 in codigos, True)
comprobar("Y no arrastra a Pablo",
          portal_entrar("pablo@plantilla.es", "otra-clave-larguisima"), 302)

limpiar()
codigos = [fichar_entrar(TOKEN_A, "1042", f"{100000 + i}") for i in range(8)]
comprobar("Y en el fichaje, contra un código concreto", 429 in codigos, True)
comprobar("Sin arrastrar a Mario", fichar_entrar(TOKEN_A, "1043", "771122"), 302)

# --------- el límite por dirección sigue existiendo, con su umbral

limpiar()
# Se reparte por muchas cuentas para que no salte el límite de cuenta.
for i in range(red.FALLOS_POR_ORIGEN):
    panel_entrar(f"cuenta-{i}@inventada.es", "mala")
comprobar("Sesenta fallos repartidos desde una dirección sí la bloquean",
          panel_entrar("ana@perez.es", "una-frase-larga-de-ana"), 429)
comprobar("Pero no a quien viene de otra red",
          panel_entrar("ana@perez.es", "una-frase-larga-de-ana", ip=OTRA_RED), 302)

# --------- y en el fichaje, acotado al centro

limpiar()
for i in range(red.FALLOS_POR_ORIGEN):
    fichar_entrar(TOKEN_A, f"90{i:02d}", "999999")
comprobar("El centro donde se ha probado queda bloqueado",
          fichar_entrar(TOKEN_A, "1042", "482913"), 429)
comprobar("Y el otro centro, no: son puertas distintas",
          fichar_entrar(TOKEN_B, "1043", "771122"), 302)

# ===================== la cabecera del proxy no se cree sin permiso

limpiar()
comprobar("Por defecto no se confía en ningún proxy",
          red.PROXIES_DE_CONFIANZA, 0)


def con_cabecera(email, cabecera):
    """Un intento con X-Forwarded-For puesta a mano."""
    c = panel.test_client()
    c.get("/panel/entrar", environ_base={"REMOTE_ADDR": PROXY})
    with c.session_transaction() as s:
        csrf = s.get("csrf", "")
    c.post("/panel/entrar",
           data={"email": email, "contrasena": "mala", "csrf": csrf},
           environ_base={"REMOTE_ADDR": PROXY},
           headers={"X-Forwarded-For": cabecera})


# Quien rota la cabecera lo hace para escapar del límite POR DIRECCIÓN, no del
# de su cuenta: reparte los intentos entre muchas cuentas y se pone una
# dirección distinta cada vez. Si nos creyéramos la cabecera, cada intento
# parecería venir de un sitio nuevo y ese límite no saltaría nunca.
#
# Una versión anterior de esta prueba usaba una sola cuenta, así que el que
# saltaba era el límite de cuenta y salía verde con la cabecera creída o no.
# No probaba nada.
for i in range(red.FALLOS_POR_ORIGEN):
    con_cabecera(f"cuenta-x{i}@inventada.es", f"203.0.113.{i % 250}")
comprobar("Cambiarse la dirección en la cabecera no sirve para escapar del "
          "límite por origen",
          panel_entrar("ana@perez.es", "una-frase-larga-de-ana"), 429)

# Y que cuando SÍ se configura, se lee de verdad. Se prueba sobre una
# aplicación de juguete para no tener que levantar otra vez las tres.
suelta = Flask(__name__)
antes = red.PROXIES_DE_CONFIANZA
red.PROXIES_DE_CONFIANZA = 1
red.detras_de_proxy(suelta)
red.PROXIES_DE_CONFIANZA = antes


@suelta.get("/")
def quien():
    return red.origen()


cliente = suelta.test_client()
comprobar("Con FICHAJE_PROXIES=1 y sin cabecera, la dirección es la de siempre",
          cliente.get("/", environ_base={"REMOTE_ADDR": PROXY}).data.decode(), PROXY)
comprobar("Y con cabecera, la del cliente de verdad",
          cliente.get("/", environ_base={"REMOTE_ADDR": PROXY},
                      headers={"X-Forwarded-For": "203.0.113.7"}).data.decode(),
          "203.0.113.7")
comprobar("Solo se cree un salto, no la cadena entera que escriba quien sea",
          cliente.get("/", environ_base={"REMOTE_ADDR": PROXY},
                      headers={"X-Forwarded-For": "1.1.1.1, 203.0.113.7"}
                      ).data.decode(), "203.0.113.7")

# ====================== cabeceras de seguridad en las tres aplicaciones

limpiar()
for nombre, app, ruta in [("el fichaje", web, f"/f/{TOKEN_A}"),
                          ("el panel", panel, "/panel/entrar"),
                          ("el portal", portal, "/rep/entrar")]:
    r = app.test_client().get(ruta)
    politica = r.headers.get("Content-Security-Policy", "")
    comprobar(f"{nombre}: hay política de contenido",
              "default-src 'none'" in politica, True)
    comprobar(f"{nombre}: ningún script, ni propio",
              "script-src" not in politica, True)
    comprobar(f"{nombre}: no se puede meter en un marco ajeno",
              "frame-ancestors 'none'" in politica, True)
    comprobar(f"{nombre}: los formularios solo van a su propio sitio",
              "form-action 'self'" in politica, True)
    comprobar(f"{nombre}: no se adivina el tipo de contenido",
              r.headers.get("X-Content-Type-Options"), "nosniff")
    comprobar(f"{nombre}: la dirección no se filtra al salir",
              r.headers.get("Referrer-Policy"), "same-origin")

# ======================= y las tres cookies se llaman distinto

nombres = {app.config["SESSION_COOKIE_NAME"] for app in (web, panel, portal)}
comprobar("Las tres aplicaciones usan tres nombres de cookie distintos",
          len(nombres), 3)
comprobar("Y ninguna se queda con el nombre por defecto de Flask",
          "session" in nombres, False)

# ============================ y se deja la base utilizable para el paso siguiente

# Esta suite prueba puertas, no fichajes, así que hasta aquí no había creado ni
# una anotación. El paso siguiente de la integración continua es la copia de
# seguridad, que verifica todos los libros de la base y falla si no hay
# ninguno —y hace bien: «no había nada que comprobar» no es un éxito—.
#
# Es el mismo error que ya tuvo la suite de sellos, al revés: aquella dejaba
# libros rotos y esta no dejaba ninguno. Una suite tiene que devolver la base en
# un estado con el que se pueda seguir trabajando.
limpiar()
import re  # noqa: E402


def campo(html: str, nombre: str) -> str:
    """El valor de un input oculto, leído de la página como haría el navegador.

    No vale sacarlo de la sesión: al entrar se vacía entera —para que un testigo
    de antes de identificarse no siga valiendo después— y el CSRF se regenera
    cuando la plantilla lo pinta.
    """
    encontrado = re.search(
        rf'name="{nombre}"[^>]*value="([^"]*)"', html) or re.search(
        rf'value="([^"]*)"[^>]*name="{nombre}"', html)
    return encontrado.group(1) if encontrado else ""


c_lucia = web.test_client()
portada = c_lucia.get(f"/f/{TOKEN_A}",
                      environ_base={"REMOTE_ADDR": PROXY}).get_data(as_text=True)
c_lucia.post(f"/f/{TOKEN_A}/entrar",
             data={"codigo": "1042", "pin": "482913",
                   "csrf": campo(portada, "csrf")},
             environ_base={"REMOTE_ADDR": PROXY})
dentro = c_lucia.get(f"/f/{TOKEN_A}",
                     environ_base={"REMOTE_ADDR": PROXY}).get_data(as_text=True)
r = c_lucia.post(f"/f/{TOKEN_A}/fichar",
                 data={"accion": "entrada", "csrf": campo(dentro, "csrf"),
                       "clave": campo(dentro, "clave")},
                 environ_base={"REMOTE_ADDR": PROXY})
comprobar("Lucía puede fichar de verdad al final de todo esto",
          r.status_code in (302, 303), True)

from .postgres import LibroPostgres  # noqa: E402
from .registro import verificar_cadena  # noqa: E402

libro = LibroPostgres(EMPRESA, admin).anotaciones()
comprobar("Y queda un libro en la base", len(libro) >= 1, True)
comprobar("Que verifica", bool(verificar_cadena(libro, EMPRESA)), True)

# ==================== la clave con la que se firman las cookies

# Si la variable no está puesta, cada proceso genera la suya. En desarrollo no
# se nota: hay uno solo. En producción se arranca con varios trabajadores y la
# cookie que firma uno no la reconocen los otros, así que la gente se sale sola
# en la mayoría de las peticiones, sin ningún error en el registro y sin nada
# que mirar. Es de los fallos más caros de diagnosticar que existen.
from .credenciales import ClaveDeSesionAusente, clave_de_sesion  # noqa: E402

guardadas = {v: os.environ.get(v) for v in ("FICHAJE_SECRETO", "FICHAJE_HTTPS")}
os.environ.pop("FICHAJE_SECRETO", None)

os.environ["FICHAJE_HTTPS"] = "1"
try:
    clave_de_sesion("FICHAJE_SECRETO")
    comprobar("En producción NO se arranca sin la clave", "arrancó", "se negó")
except ClaveDeSesionAusente as fallo:
    comprobar("En producción no se arranca sin la clave", True, True)
    comprobar("Y el mensaje dice cómo generarla",
              "secrets.token_hex" in str(fallo), True)
    comprobar("Y avisa de que cambiarla cierra las sesiones",
              "se cierran todas las sesiones" in str(fallo), True)

os.environ["FICHAJE_HTTPS"] = "0"
generada = clave_de_sesion("FICHAJE_SECRETO")
comprobar("Fuera de producción sí arranca", len(generada), 64)
os.environ["FICHAJE_SECRETO"] = "la-de-verdad"
comprobar("Y con la variable puesta se usa esa, no otra",
          clave_de_sesion("FICHAJE_SECRETO"), "la-de-verdad")
for variable, valor in guardadas.items():
    if valor is None:
        os.environ.pop(variable, None)
    else:
        os.environ[variable] = valor

# ==================== limpiar lo efímero, y NO limpiar lo que es prueba

# Con otro nombre: aquí ya hay un `limpiar` que vacía las tablas de intentos
# entre bloques de pruebas, y la colisión rompía todo lo que viniera después.
from .admin import EFIMERAS, SESIONES  # noqa: E402
from .admin import limpiar as limpiar_lo_efimero  # noqa: E402

# Se fabrica rastro viejo: intentos y sesiones de hace dos meses.
admin.execute("insert into intento_panel (email, origen, momento, acertado) "
              "values ('viejo@x.es', '1.2.3.4', now() - interval '60 days', false)")
admin.execute("insert into intento_panel (email, origen, momento, acertado) "
              "values ('nuevo@x.es', '1.2.3.4', now(), false)")
admin.execute("insert into sesion_panel (id, usuario_id, expira_en) "
              "values ('vieja', %s, now() - interval '60 days')", (ANA,))
admin.execute("insert into sesion_panel (id, usuario_id, expira_en) "
              "values ('viva', %s, now() + interval '8 hours')", (ANA,))

# Y prueba que NO se puede tocar: una consulta de un representante.
fila = R.por_email(admin, "carmen@plantilla.es")
carmen = R.Representante(*fila[:11])
R.apuntar(admin, carmen, "listado", "de hace mucho")
admin.execute("update acceso_representante set momento = now() - interval '400 days'")
accesos_antes = len(R.accesos_de_empresa(admin, EMPRESA))
anotaciones_antes = admin.execute("select count(*) from anotacion").fetchone()[0]

borradas = limpiar_lo_efimero(admin, dias=30)

comprobar("Se borra el intento viejo", borradas["intento_panel"], 1)
comprobar("Y queda el reciente",
          admin.execute("select count(*) from intento_panel").fetchone()[0], 1)
comprobar("Se borra la sesión caducada hace meses", borradas["sesion_panel"], 1)
comprobar("Y la que sigue viva no se toca",
          admin.execute("select count(*) from sesion_panel where id = 'viva'"
                        ).fetchone()[0], 1)

# Lo importante de todo esto:
comprobar("El registro de quién consultó NO se borra, ni con 400 días",
          len(R.accesos_de_empresa(admin, EMPRESA)), accesos_antes)
comprobar("Ni una sola anotación del libro",
          admin.execute("select count(*) from anotacion").fetchone()[0],
          anotaciones_antes)
comprobar("La lista de lo borrable no incluye el libro",
          "anotacion" in [x[0] for x in EFIMERAS] + SESIONES, False)
comprobar("Ni los sellos", "sello" in [x[0] for x in EFIMERAS] + SESIONES, False)
comprobar("Ni la constancia de los accesos",
          "acceso_representante" in [x[0] for x in EFIMERAS] + SESIONES, False)
comprobar("Ni el registro administrativo del panel",
          "registro_administrativo" in [x[0] for x in EFIMERAS] + SESIONES, False)

# Y no se deja limpiar con un margen tan corto que borre la prueba de un ataque
# del fin de semana antes de que nadie la mire el lunes.
try:
    limpiar_lo_efimero(admin, dias=1)
    comprobar("Un día de margen se rechaza", "aceptó", "rechazó")
except ValueError:
    comprobar("Un día de margen se rechaza", True, True)

# ============ cambiar una credencial cierra las sesiones que ya había

# El escenario: alguien ve el PIN de Lucía por encima del hombro y se lo apunta.
# Lucía lo cuenta, la gestoría le pone uno nuevo. Si la sesión que el otro ya
# tiene abierta en su móvil siguiera valiendo, seguiría fichando en nombre de
# Lucía doce horas más, y Lucía se quedaría tranquila creyendo que ya está.
#
# Es el mismo fallo que se arregló al revocar a un representante, en otros dos
# sitios. Y pasó desapercibido porque para el panel el código que cierra
# sesiones ya existía: simplemente no se llamaba desde el cambio de contraseña.
from .admin import poner_pin  # noqa: E402

el_otro = web.test_client()
portada = el_otro.get(f"/f/{TOKEN_A}",
                      environ_base={"REMOTE_ADDR": PROXY}).get_data(as_text=True)
el_otro.post(f"/f/{TOKEN_A}/entrar",
             data={"codigo": "1042", "pin": "482913", "csrf": campo(portada, "csrf")},
             environ_base={"REMOTE_ADDR": PROXY})
comprobar("Quien tiene el PIN entra y ve los registros de Lucía",
          el_otro.get(f"/f/{TOKEN_A}/mis-registros").status_code, 200)

# Se mira la base, no el número que devuelve la función: comprobar el valor
# devuelto deja pasar una implementación que devuelva el número correcto sin
# cerrar nada. Y no se compara con 1 porque las pruebas de arriba dejaron más
# sesiones abiertas de Lucía; lo que importa es que no quede NINGUNA.
abiertas_antes = admin.execute(
    "select count(*) from sesion where trabajador_id = %s and cerrada_en is null",
    (LUCIA,)).fetchone()[0]
comprobar("Lucía tenía alguna sesión abierta", abiertas_antes >= 1, True)
cerradas = poner_pin(admin, LUCIA, "990011")
comprobar("Resetear el PIN dice haberlas cerrado", cerradas, abiertas_antes)
comprobar("Y en la base no le queda ninguna abierta",
          admin.execute("select count(*) from sesion where trabajador_id = %s "
                        "and cerrada_en is null", (LUCIA,)).fetchone()[0], 0)
r = el_otro.get(f"/f/{TOKEN_A}/mis-registros", follow_redirects=False)
comprobar("Y esa sesión deja de servir en el acto", r.status_code, 302)
comprobar("Con el PIN viejo ya no se entra",
          fichar_entrar(TOKEN_A, "1042", "482913"), 401)
limpiar()
comprobar("Y con el nuevo sí", fichar_entrar(TOKEN_A, "1042", "990011"), 302)

# Lo mismo en el panel.
c_ana = panel.test_client()
c_ana.get("/panel/entrar", environ_base={"REMOTE_ADDR": PROXY})
with c_ana.session_transaction() as s:
    csrf = s["csrf"]
c_ana.post("/panel/entrar",
           data={"email": "ana@perez.es", "contrasena": "una-frase-larga-de-ana",
                 "csrf": csrf}, environ_base={"REMOTE_ADDR": PROXY})
comprobar("Ana está dentro del panel", c_ana.get("/panel/").status_code, 200)

abiertas_antes = admin.execute(
    "select count(*) from sesion_panel where usuario_id = %s and cerrada_en is null",
    (ANA,)).fetchone()[0]
comprobar("Ana tenía alguna sesión abierta", abiertas_antes >= 1, True)
cerradas = G.cambiar_contrasena(admin, ANA, "una-contrasena-nueva-larga")
comprobar("Cambiar la contraseña dice haberlas cerrado", cerradas, abiertas_antes)
comprobar("Y no le queda ninguna abierta",
          admin.execute("select count(*) from sesion_panel where usuario_id = %s "
                        "and cerrada_en is null", (ANA,)).fetchone()[0], 0)
comprobar("Y deja de valer en el acto",
          c_ana.get("/panel/", follow_redirects=False).status_code, 302)
limpiar()
comprobar("Con la contraseña vieja ya no se entra",
          panel_entrar("ana@perez.es", "una-frase-larga-de-ana"), 401)
limpiar()
comprobar("Y con la nueva sí",
          panel_entrar("ana@perez.es", "una-contrasena-nueva-larga"), 302)

admin.close()

if fallos:
    print(f"\n{len(fallos)} de {hechas} comprobaciones fallan:\n")
    for fallo in fallos:
        print(f"  · {fallo}\n")
    raise SystemExit(1)
print(f"Todas las comprobaciones pasan: {hechas} sobre el límite de intentos "
      f"y el origen de las peticiones.")
