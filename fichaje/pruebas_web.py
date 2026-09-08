"""Pruebas del fichaje web. `python3 -m fichaje.pruebas_web`.

Levantan la aplicación de verdad contra PostgreSQL de verdad, y la conectan con
**el usuario restringido de la aplicación**, no con el administrador: así lo que
se prueba es lo que va a correr en producción, incluidos sus permisos.

Recrean el esquema desde las migraciones, así que no se apuntan nunca a datos
reales.
"""

import os
import threading
import time
from datetime import datetime, timedelta, timezone

os.environ.setdefault("FICHAJE_APP_PASSWORD", "prueba-local")
os.environ.setdefault("FICHAJE_SECRETO", "secreto-de-pruebas")

import segno  # noqa: E402

from .admin import (  # noqa: E402
    cartel,
    crear_centro,
    crear_empresa,
    crear_trabajador,
    poner_pin,
    rotar_token,
    url_del_centro,
)
from .despliegue import configurar_rol, dsn_aplicacion  # noqa: E402
from .jornada import jornadas_de  # noqa: E402
from .migrar import aplicar  # noqa: E402
from .postgres import LibroPostgres, conectar  # noqa: E402
from .registro import verificar_cadena  # noqa: E402
from .web import crear_app  # noqa: E402

fallos: list[str] = []
hechas = 0


def comprobar(descripcion: str, obtenido, esperado):
    global hechas
    hechas += 1
    if obtenido != esperado:
        fallos.append(f"{descripcion}\n    esperado: {esperado!r}\n    obtenido: {obtenido!r}")


# ------------------------------------------------------------------ montaje

admin = conectar()
admin.execute("drop table if exists peticion_fichaje, intento_acceso, sesion, "
              "anotacion, trabajador, centro, empresa, _yoyo_migration, _yoyo_log, "
              "_yoyo_version, yoyo_lock cascade")
admin.close()
aplicar()
admin = conectar()
configurar_rol(admin)

EMPRESA = crear_empresa(admin, "Bar Casa Paco")
CENTRO, TOKEN = crear_centro(admin, EMPRESA, "Local de la playa", "Europe/Madrid")
LUCIA = crear_trabajador(admin, EMPRESA, "Lucía García", "1042")
poner_pin(admin, LUCIA, "482913")

# Una segunda empresa, para probar que no se cruzan.
OTRA = crear_empresa(admin, "Taller Ruiz SL")
CENTRO_OTRA, TOKEN_OTRA = crear_centro(admin, OTRA, "Nave", "Europe/Madrid")
JOSE = crear_trabajador(admin, OTRA, "Jose Ruiz", "2001")
poner_pin(admin, JOSE, "771122")

# Y alguien con un nombre hostil, para el escapado.
MALO = crear_trabajador(admin, EMPRESA, "<script>alert(1)</script>", "9999")
poner_pin(admin, MALO, "135790")

app = crear_app(dsn_aplicacion())
app.config["TESTING"] = True


def cliente():
    return app.test_client()


def entrar(c, token=TOKEN, codigo="1042", pin="482913"):
    c.get(f"/f/{token}")                       # para que nazca el testigo CSRF
    with c.session_transaction() as s:
        csrf = s["csrf"]
    return c.post(f"/f/{token}/entrar",
                  data={"codigo": codigo, "pin": pin, "csrf": csrf})


def campo(html: str, nombre: str) -> str:
    """Saca el valor de un input oculto de la página, como haría el navegador."""
    marca = f'name="{nombre}" value="'
    return html.split(marca, 1)[1].split('"', 1)[0]


# ================================================================== el QR

url = cartel(admin, CENTRO)
comprobar("El cartel codifica exactamente la URL del centro",
          url, url_del_centro(TOKEN))
comprobar("Y el QR generado es el de esa URL, no el de otra",
          segno.make(url, error="m").matrix,
          segno.make(url_del_centro(TOKEN), error="m").matrix)
comprobar("El QR no lleva dentro ningún identificador interno",
          CENTRO in url or EMPRESA in url or LUCIA in url, False)
comprobar("El testigo tiene entropía de sobra", len(TOKEN) >= 32, True)

c = cliente()
comprobar("Un centro que no existe da 404", c.get("/f/inventado").status_code, 404)
comprobar("Y no dice nada de ninguna empresa",
          "Bar Casa Paco" in c.get("/f/inventado").get_data(as_text=True), False)

# ============================================================== identificarse

c = cliente()
comprobar("La portada de un centro válido carga",
          c.get(f"/f/{TOKEN}").status_code, 200)
comprobar("Y pide código y PIN",
          "Tu PIN" in c.get(f"/f/{TOKEN}").get_data(as_text=True), True)

c = cliente()
comprobar("Un PIN equivocado no entra",
          entrar(c, pin="000000").status_code, 401)
c = cliente()
comprobar("Un código que no existe tampoco",
          entrar(c, codigo="7777", pin="482913").status_code, 401)
c = cliente()
comprobar("Con código y PIN correctos, redirige", entrar(c).status_code, 302)
comprobar("Y ya saluda por el nombre",
          "Hola, Lucía García" in c.get(f"/f/{TOKEN}").get_data(as_text=True), True)

# El trabajador de una empresa no entra por el QR de otra.
c = cliente()
comprobar("El código de una empresa no vale en el centro de otra",
          entrar(c, token=TOKEN_OTRA, codigo="1042", pin="482913").status_code, 401)

# CSRF
c = cliente()
c.get(f"/f/{TOKEN}")
comprobar("Un POST sin testigo CSRF se rechaza",
          c.post(f"/f/{TOKEN}/entrar",
                 data={"codigo": "1042", "pin": "482913"}).status_code, 400)
c = cliente()
c.get(f"/f/{TOKEN}")
comprobar("Y con un testigo inventado, también",
          c.post(f"/f/{TOKEN}/entrar",
                 data={"codigo": "1042", "pin": "482913",
                       "csrf": "falso"}).status_code, 400)

# Fuerza bruta
c = cliente()
codigos = [entrar(c, codigo="1042", pin="111112").status_code for _ in range(7)]
comprobar("Tras varios fallos seguidos se bloquea", 429 in codigos, True)
comprobar("Y no bloquea al primer intento", codigos[0], 401)
admin.execute("delete from intento_acceso")

# ============================================================== fichar de verdad

c = cliente()
entrar(c)
pagina = c.get(f"/f/{TOKEN}").get_data(as_text=True)
comprobar("Estando fuera, solo se ofrece entrar", pagina.count("<button"), 2)
comprobar("Y el botón es «Entrar»", "Entrar</button>" in pagina, True)

respuesta = c.post(f"/f/{TOKEN}/fichar",
                   data={"accion": "entrada", "csrf": campo(pagina, "csrf"),
                         "clave": campo(pagina, "clave")})
comprobar("Fichar redirige a la confirmación", respuesta.status_code, 302)
confirmacion = c.get(respuesta.headers["Location"]).get_data(as_text=True)
comprobar("Que confirma el fichaje", "Fichaje registrado" in confirmacion, True)
comprobar("Y no promete nada legal",
          any(p in confirmacion for p in ("inalterable", "cumple legalmente",
                                          "Inspección")), False)

anotaciones = LibroPostgres(EMPRESA, admin).anotaciones()
comprobar("Hay una anotación en la base", len(anotaciones), 1)
comprobar("De la persona correcta", anotaciones[0].trabajador_id, LUCIA)
comprobar("En el centro correcto", anotaciones[0].centro_id, CENTRO)
comprobar("Con el huso del centro", anotaciones[0].zona_horaria, "Europe/Madrid")
comprobar("Escrita por el QR", anotaciones[0].origen, "qr")
comprobar("Y la cadena verifica",
          bool(verificar_cadena(anotaciones, EMPRESA)), True)
comprobar("La hora la puso el servidor, no el móvil",
          abs((anotaciones[0].momento - datetime.now(timezone.utc)).total_seconds()) < 60,
          True)
comprobar("Y no es retroactiva", anotaciones[0].retroactiva, False)

# La web no inventa reglas: ahora ya no se puede entrar otra vez.
pagina = c.get(f"/f/{TOKEN}").get_data(as_text=True)
comprobar("Estando dentro se ofrecen pausa y salida", pagina.count("<button"), 3)
comprobar("Y ya no se ofrece entrar", "Entrar</button>" in pagina, False)
respuesta = c.post(f"/f/{TOKEN}/fichar",
                   data={"accion": "entrada", "csrf": campo(pagina, "csrf"),
                         "clave": "otra-clave-cualquiera"})
comprobar("Forzar una entrada por segunda vez se rechaza",
          "ACCION_NO_PERMITIDA" in respuesta.headers["Location"], True)
comprobar("Y no ha escrito nada", len(LibroPostgres(EMPRESA, admin).anotaciones()), 1)

# El servidor ignora cualquier hora que mande el navegador.
pagina = c.get(f"/f/{TOKEN}").get_data(as_text=True)
c.post(f"/f/{TOKEN}/fichar",
       data={"accion": "salida", "csrf": campo(pagina, "csrf"),
             "clave": campo(pagina, "clave"),
             "momento": "2020-01-01T00:00:00", "hora": "03:00",
             "timestamp": "0", "zona_horaria": "Pacific/Auckland"})
salida = LibroPostgres(EMPRESA, admin).anotaciones()[-1]
comprobar("La hora enviada por el navegador se ignora",
          salida.momento.year, datetime.now(timezone.utc).year)
comprobar("Y la zona horaria también", salida.zona_horaria, "Europe/Madrid")

# ================================================================ idempotencia

c = cliente()
entrar(c)
pagina = c.get(f"/f/{TOKEN}").get_data(as_text=True)
clave, csrf = campo(pagina, "clave"), campo(pagina, "csrf")
antes = len(LibroPostgres(EMPRESA, admin).anotaciones())
respuestas = [c.post(f"/f/{TOKEN}/fichar",
                     data={"accion": "entrada", "csrf": csrf, "clave": clave})
              for _ in range(20)]
despues = LibroPostgres(EMPRESA, admin).anotaciones()
comprobar("Veinte envíos con la misma clave dejan un solo fichaje",
          len(despues) - antes, 1)
comprobar("Y todos redirigen a la misma anotación",
          len({r.headers["Location"].split("n=")[1].split("&")[0] for r in respuestas}), 1)
comprobar("El repetido se avisa como ya registrado",
          "r=1" in respuestas[-1].headers["Location"], True)
comprobar("La cadena sigue válida",
          bool(verificar_cadena(despues, EMPRESA)), True)

# ==================================================================== sesión

c = cliente()
entrar(c)
pagina = c.get(f"/f/{TOKEN}").get_data(as_text=True)
c.post(f"/f/{TOKEN}/salir", data={"csrf": campo(pagina, "csrf")})
comprobar("Tras cerrar sesión vuelve a pedir el PIN",
          "Tu PIN" in c.get(f"/f/{TOKEN}").get_data(as_text=True), True)

c = cliente()
entrar(c)
with c.session_transaction() as s:
    s["sesion"] = "testigo-inventado"
comprobar("Un testigo de sesión inventado no vale",
          "Tu PIN" in c.get(f"/f/{TOKEN}").get_data(as_text=True), True)

# Sesión viva de alguien a quien dan de baja a media mañana.
c = cliente()
entrar(c, codigo="9999", pin="135790")
comprobar("Antes de la baja, dentro",
          "Hola," in c.get(f"/f/{TOKEN}").get_data(as_text=True), True)
admin.execute("update trabajador set activo = false where id = %s", (MALO,))
comprobar("Dado de baja, la sesión deja de servir en el acto",
          "Tu PIN" in c.get(f"/f/{TOKEN}").get_data(as_text=True), True)
admin.execute("update trabajador set activo = true where id = %s", (MALO,))

# ======================================================================= XSS

c = cliente()
entrar(c, codigo="9999", pin="135790")
pagina = c.get(f"/f/{TOKEN}").get_data(as_text=True)
comprobar("Un nombre con etiquetas no se ejecuta",
          "<script>alert(1)</script>" in pagina, False)
comprobar("Sale escapado", "&lt;script&gt;" in pagina, True)

# ================================================================ rotar el QR

viejo = TOKEN_OTRA
nuevo = rotar_token(admin, CENTRO_OTRA)
c = cliente()
comprobar("El QR viejo deja de servir en cuanto se rota",
          c.get(f"/f/{viejo}").status_code, 404)
comprobar("Y el nuevo funciona", c.get(f"/f/{nuevo}").status_code, 200)
comprobar("Sin tocar el libro de esa empresa",
          len(LibroPostgres(OTRA, admin).anotaciones()), 0)

# =================================================== reinicio de la aplicación

otra_app = crear_app(dsn_aplicacion())
otra_app.config["TESTING"] = True
c2 = otra_app.test_client()
c2.get(f"/f/{TOKEN}")
with c2.session_transaction() as s:
    csrf2 = s["csrf"]
c2.post(f"/f/{TOKEN}/entrar", data={"codigo": "1042", "pin": "482913", "csrf": csrf2})
pagina = c2.get(f"/f/{TOKEN}").get_data(as_text=True)
comprobar("Tras reiniciar la aplicación, el estado sale de PostgreSQL",
          "Estás trabajando" in pagina, True)

# ================================================================ concurrencia

gente = []
for n in range(100):
    identificador = crear_trabajador(admin, EMPRESA, f"Persona {n}", f"C{n:03d}")
    poner_pin(admin, identificador, "246810")
    gente.append(f"C{n:03d}")

errores: list[str] = []


def ficha_uno(codigo: str) -> None:
    try:
        propio = app.test_client()
        entrar(propio, codigo=codigo, pin="246810")
        pagina = propio.get(f"/f/{TOKEN}").get_data(as_text=True)
        propio.post(f"/f/{TOKEN}/fichar",
                    data={"accion": "entrada", "csrf": campo(pagina, "csrf"),
                          "clave": campo(pagina, "clave")})
    except Exception as fallo:  # noqa: BLE001
        errores.append(repr(fallo))


antes = len(LibroPostgres(EMPRESA, admin).anotaciones())
hilos = [threading.Thread(target=ficha_uno, args=(c,)) for c in gente]
arranque = time.perf_counter()
for hilo in hilos:
    hilo.start()
for hilo in hilos:
    hilo.join()
tardanza = time.perf_counter() - arranque

final = LibroPostgres(EMPRESA, admin).anotaciones()
comprobar("Cien personas fichando a la vez: ningún error", errores, [])
comprobar("Cien fichajes nuevos", len(final) - antes, 100)
comprobar("Sin huecos en la numeración",
          [a.numero for a in final], list(range(1, len(final) + 1)))
comprobar("Ninguna bifurcación",
          len({a.huella_anterior for a in final}), len(final))
comprobar("Y la cadena verifica entera",
          bool(verificar_cadena(final, EMPRESA)), True)

# =================================================== el libro y las horas cuadran
jornada = jornadas_de(final, LUCIA)[0]
comprobar("La jornada de Lucía sale del mismo libro", jornada.trabajador_id, LUCIA)
comprobar("Y está cerrada", jornada.abierta, False)

print()
print(f"  100 fichajes web concurrentes: {tardanza:.2f} s "
      f"({tardanza/100*1000:.0f} ms por persona, PIN incluido)")
print(f"  Anotaciones en el libro: {len(final)}")
print()

admin.close()

if fallos:
    print(f"\n{len(fallos)} de {hechas} comprobaciones fallan:\n")
    for fallo in fallos:
        print(f"  · {fallo}\n")
    raise SystemExit(1)
print(f"Todas las comprobaciones pasan: {hechas} sobre el fichaje web.")
