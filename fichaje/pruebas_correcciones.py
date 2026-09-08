"""Pruebas de las correcciones. `python3 -m fichaje.pruebas_correcciones`.

Un fichaje no se modifica nunca. Se propone un cambio, la otra parte responde, y
todo queda escrito: la propuesta, su motivo, quién la hizo, la respuesta y quién
la dio. Estén de acuerdo o no.

Recrean el esquema desde las migraciones. No apuntar nunca a datos reales.
"""

import os
import threading
from datetime import datetime, timedelta, timezone

os.environ.setdefault("FICHAJE_APP_PASSWORD", "prueba-local")
os.environ.setdefault("FICHAJE_SECRETO", "secreto-pruebas")
os.environ.setdefault("FICHAJE_PANEL_SECRETO", "secreto-panel-pruebas")

import psycopg  # noqa: E402
from psycopg import sql  # noqa: E402

from . import gestoria as G  # noqa: E402
from .admin import crear_centro, crear_empresa, crear_trabajador, poner_pin  # noqa: E402
from .correcciones import correcciones_de, esperando_a, proponer, responder  # noqa: E402
from .despliegue import configurar_rol, dsn_aplicacion  # noqa: E402
from .jornada import jornadas_de  # noqa: E402
from .migrar import aplicar  # noqa: E402
from .panel import crear_panel  # noqa: E402
from .postgres import LibroPostgres, conectar  # noqa: E402
from .registro import (  # noqa: E402
    AnotacionInvalida,
    Parte,
    Tipo,
    verificar_cadena,
)
from .web import crear_app  # noqa: E402

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
        conexion.execute(sql.SQL("drop table {} cascade").format(
            sql.SQL(", ").join(sql.Identifier(t) for t in tablas)))


# ------------------------------------------------------------------ montaje

admin = conectar()
vaciar_base(admin)
admin.close()
aplicar()
admin = conectar()
configurar_rol(admin)

GA = G.crear_gestoria(admin, "Asesoría Pérez")
ANA = G.crear_usuario(admin, GA, "ana@perez.es", "Ana Pérez",
                      "una-frase-larga-de-ana", G.Rol.ADMIN)
LUIS = G.crear_usuario(admin, GA, "luis@perez.es", "Luis Soto",
                       "una-frase-larga-de-luis", G.Rol.USUARIO)
EMPRESA = crear_empresa(admin, "Bar Casa Paco", GA)
CENTRO, TOKEN = crear_centro(admin, EMPRESA, "Local", "Europe/Madrid")
LUCIA = crear_trabajador(admin, EMPRESA, "Lucía García", "1042")
poner_pin(admin, LUCIA, "482913")
JOSE = crear_trabajador(admin, EMPRESA, "Jose Ruiz", "1043")
poner_pin(admin, JOSE, "482914")

GB = G.crear_gestoria(admin, "Gestoría Rival")
BEA = G.crear_usuario(admin, GB, "bea@rival.es", "Bea", "una-frase-larga-de-bea",
                      G.Rol.ADMIN)
OTRA = crear_empresa(admin, "Taller ajeno", GB)

BASE = datetime(2026, 9, 1, 7, 0, tzinfo=timezone.utc)
MADRID = "Europe/Madrid"


def libro_nuevo(trabajador=None):
    """Una empresa recién estrenada con una jornada de ocho horas."""
    empresa = crear_empresa(admin, f"Bar {G.nuevo_id()[:8]}", GA)
    centro, token = crear_centro(admin, empresa, "Local", MADRID)
    quien = crear_trabajador(admin, empresa, "Persona", "1")
    poner_pin(admin, quien, "482913")
    jefe = crear_trabajador(admin, empresa, "Jefe", "2")
    libro = LibroPostgres(empresa, admin)
    libro.fichar(quien, centro_id=centro, tipo=Tipo.ENTRADA, momento=BASE,
                 zona_horaria=MADRID)
    libro.fichar(quien, centro_id=centro, tipo=Tipo.SALIDA,
                 momento=BASE + timedelta(hours=8), zona_horaria=MADRID)
    return libro, empresa, centro, token, quien, jefe


def clave():
    return G.nuevo_id()


# =================================== los cuatro caminos de una corrección

# 1 · el trabajador propone, la empresa acepta
libro, emp, cen, tok, quien, jefe = libro_nuevo()
proponer(libro, clave(), 2, BASE + timedelta(hours=9), "Se quedó cerrando",
         quien, Parte.TRABAJADOR, BASE + timedelta(days=1))
comprobar("Proponer no cambia la hora todavía",
          jornadas_de(libro.anotaciones(), quien)[0].horas, 8.0)
responder(libro, clave(), 3, True, jefe, Parte.EMPRESA, BASE + timedelta(days=1))
comprobar("Aceptada por la empresa, son nueve horas",
          jornadas_de(libro.anotaciones(), quien)[0].horas, 9.0)
comprobar("Y la jornada queda marcada como corregida",
          jornadas_de(libro.anotaciones(), quien)[0].corregida, True)
comprobar("El fichaje original sigue en el libro con su hora",
          libro.anotacion(2).momento, BASE + timedelta(hours=8))

# 2 · la empresa propone, el trabajador acepta
libro, emp, cen, tok, quien, jefe = libro_nuevo()
proponer(libro, clave(), 2, BASE + timedelta(hours=7), "Se fue antes", jefe,
         Parte.EMPRESA, BASE + timedelta(days=1))
responder(libro, clave(), 3, True, quien, Parte.TRABAJADOR, BASE + timedelta(days=1))
comprobar("Aceptada por el trabajador, son siete horas",
          jornadas_de(libro.anotaciones(), quien)[0].horas, 7.0)

# 3 · el trabajador propone, la empresa NO acepta
libro, emp, cen, tok, quien, jefe = libro_nuevo()
proponer(libro, clave(), 2, BASE + timedelta(hours=10), "Cerré yo", quien,
         Parte.TRABAJADOR, BASE + timedelta(days=1))
responder(libro, clave(), 3, False, jefe, Parte.EMPRESA, BASE + timedelta(days=1))
comprobar("Sin acuerdo, la hora sigue siendo la original",
          jornadas_de(libro.anotaciones(), quien)[0].horas, 8.0)
comprobar("Se escribe como discrepancia, no como rechazo",
          libro.anotacion(4).tipo, Tipo.CORRECCION_DISCREPANCIA)
c = correcciones_de(libro.anotaciones())[0]
comprobar("Y no se pierde nada: sigue la propuesta", c.propuesta.motivo, "Cerré yo")
comprobar("Quién la hizo", c.propuesta.parte, Parte.TRABAJADOR)
comprobar("Quién no estuvo de acuerdo", c.respuesta.parte, Parte.EMPRESA)
comprobar("Y su estado", c.estado, "discrepancia")
comprobar("La hora que se proponía también queda",
          c.propuesta.momento_propuesto, BASE + timedelta(hours=10))

# 4 · la empresa propone, el trabajador NO acepta
libro, emp, cen, tok, quien, jefe = libro_nuevo()
proponer(libro, clave(), 2, BASE + timedelta(hours=6), "Creo que se fue antes",
         jefe, Parte.EMPRESA, BASE + timedelta(days=1))
responder(libro, clave(), 3, False, quien, Parte.TRABAJADOR, BASE + timedelta(days=1))
comprobar("La empresa no le baja una hora por su cuenta",
          jornadas_de(libro.anotaciones(), quien)[0].horas, 8.0)
comprobar("Y queda escrito que el trabajador no estaba de acuerdo",
          correcciones_de(libro.anotaciones())[0].hay_desacuerdo, True)

# ============================================ lo que no se puede hacer

libro, emp, cen, tok, quien, jefe = libro_nuevo()
proponer(libro, clave(), 2, BASE + timedelta(hours=9), "Motivo", quien,
         Parte.TRABAJADOR, BASE + timedelta(days=1))
falla("Quien propone no puede aceptarse a sí mismo", AnotacionInvalida,
      responder, libro, clave(), 3, True, quien, Parte.TRABAJADOR,
      BASE + timedelta(days=1))
falla("Ni discrepar de sí mismo", AnotacionInvalida,
      responder, libro, clave(), 3, False, quien, Parte.TRABAJADOR,
      BASE + timedelta(days=1))
falla("Un fichaje no puede tener dos propuestas abiertas", AnotacionInvalida,
      proponer, libro, clave(), 2, BASE + timedelta(hours=10), "Otra", quien,
      Parte.TRABAJADOR, BASE + timedelta(days=1))
responder(libro, clave(), 3, True, jefe, Parte.EMPRESA, BASE + timedelta(days=1))
falla("Resolver dos veces la misma propuesta", AnotacionInvalida,
      responder, libro, clave(), 3, False, jefe, Parte.EMPRESA,
      BASE + timedelta(days=1))
proponer(libro, clave(), 2, BASE + timedelta(hours=11), "Y ahora otra", quien,
         Parte.TRABAJADOR, BASE + timedelta(days=2))
comprobar("Resuelta la primera, sí se puede proponer otra",
          len(correcciones_de(libro.anotaciones())), 2)
comprobar("Y manda la última acordada cuando se acepta",
          [c.estado for c in correcciones_de(libro.anotaciones())],
          ["aceptada", "pendiente"])

libro, emp, cen, tok, quien, jefe = libro_nuevo()
falla("Una propuesta sin motivo", AnotacionInvalida,
      proponer, libro, clave(), 2, BASE + timedelta(hours=9), "   ", quien,
      Parte.TRABAJADOR, BASE + timedelta(days=1))
proponer(libro, clave(), 2, BASE + timedelta(hours=9), "Motivo", quien,
         Parte.TRABAJADOR, BASE + timedelta(days=1))
falla("Proponer sobre una corrección, no sobre un fichaje", AnotacionInvalida,
      proponer, libro, clave(), 3, BASE + timedelta(hours=10), "Motivo", jefe,
      Parte.EMPRESA, BASE + timedelta(days=1))
comprobar("Y el libro sigue verificando",
          bool(verificar_cadena(libro.anotaciones(), emp)), True)

# ================================================== cien a la vez

libro, emp, cen, tok, quien, jefe = libro_nuevo()
proponer(libro, clave(), 2, BASE + timedelta(hours=9), "Se quedó cerrando",
         quien, Parte.TRABAJADOR, BASE + timedelta(days=1))
errores: list[str] = []


def resolver_a_la_vez(n: int) -> None:
    try:
        propia = conectar()
        try:
            responder(LibroPostgres(emp, propia), G.nuevo_id(), 3, True, jefe,
                      Parte.EMPRESA, BASE + timedelta(days=1, minutes=n))
        finally:
            propia.close()
    except Exception as fallo:  # noqa: BLE001
        errores.append(type(fallo).__name__)


hilos = [threading.Thread(target=resolver_a_la_vez, args=(i,)) for i in range(100)]
for hilo in hilos:
    hilo.start()
for hilo in hilos:
    hilo.join()

resoluciones = [a for a in LibroPostgres(emp, admin).anotaciones() if a.corrige == 3]
comprobar("Cien intentos simultáneos: UNA sola resolución", len(resoluciones), 1)
comprobar("Y noventa y nueve rechazados", errores.count("AnotacionInvalida"), 99)
comprobar("La cadena verifica",
          bool(verificar_cadena(LibroPostgres(emp, admin).anotaciones(), emp)), True)

# Y cien propuestas simultáneas sobre el mismo fichaje: una sola.
libro, emp2, cen2, tok2, quien2, jefe2 = libro_nuevo()
errores2: list[str] = []


def proponer_a_la_vez(n: int) -> None:
    try:
        propia = conectar()
        try:
            proponer(LibroPostgres(emp2, propia), G.nuevo_id(), 2,
                     BASE + timedelta(hours=9), f"Motivo {n}", quien2,
                     Parte.TRABAJADOR, BASE + timedelta(days=1, minutes=n))
        finally:
            propia.close()
    except Exception as fallo:  # noqa: BLE001
        errores2.append(type(fallo).__name__)


hilos = [threading.Thread(target=proponer_a_la_vez, args=(i,)) for i in range(100)]
for hilo in hilos:
    hilo.start()
for hilo in hilos:
    hilo.join()
comprobar("Cien propuestas simultáneas sobre el mismo fichaje: UNA",
          len([a for a in LibroPostgres(emp2, admin).anotaciones()
               if a.tipo is Tipo.CORRECCION_PROPUESTA]), 1)

# La base lo impide aunque se salte el dominio.
libro, emp3, cen3, tok3, quien3, jefe3 = libro_nuevo()
proponer(libro, clave(), 2, BASE + timedelta(hours=9), "Motivo", quien3,
         Parte.TRABAJADOR, BASE + timedelta(days=1))
responder(libro, clave(), 3, True, jefe3, Parte.EMPRESA, BASE + timedelta(days=1))
falla("La base rechaza una segunda resolución aunque se pida a mano",
      psycopg.errors.UniqueViolation,
      lambda: admin.execute(
          "insert into anotacion (empresa_id, numero, version, centro_id, "
          "trabajador_id, tipo, momento, anotado_en, zona_horaria, autor_id, "
          "parte, corrige, huella_anterior, huella) values "
          "(%s,999,2,%s,%s,'correccion_aceptada',%s,%s,%s,%s,'empresa',3,%s,%s)",
          (emp3, cen3, quien3, BASE, BASE, MADRID, jefe3, "a" * 64, "b" * 64)))

# ======================================================= idempotencia

libro, emp, cen, tok, quien, jefe = libro_nuevo()
una = clave()
resultados = [proponer(libro, una, 2, BASE + timedelta(hours=9), "Motivo", quien,
                       Parte.TRABAJADOR, BASE + timedelta(days=1))
              for _ in range(100)]
comprobar("Cien peticiones con la misma clave: una sola propuesta",
          len([a for a in libro.anotaciones()
               if a.tipo is Tipo.CORRECCION_PROPUESTA]), 1)
comprobar("Y todas devuelven la misma anotación",
          len({r[0].numero for r in resultados}), 1)
comprobar("La primera dice que es nueva y las demás que ya estaba",
          (resultados[0][1], resultados[1][1]), (False, True))

otra_clave = clave()
respuestas = [responder(libro, otra_clave, 3, True, jefe, Parte.EMPRESA,
                        BASE + timedelta(days=1)) for _ in range(50)]
comprobar("Lo mismo al responder", len([a for a in libro.anotaciones()
                                        if a.corrige == 3]), 1)
comprobar("Y avisa de que ya estaba", respuestas[-1][1], True)

# ============================================= por la web y por el panel

web = crear_app(dsn_aplicacion())
web.config["TESTING"] = True
panel = crear_panel(dsn_aplicacion())
panel.config["TESTING"] = True

libro = LibroPostgres(EMPRESA, admin)
libro.fichar(LUCIA, centro_id=CENTRO, tipo=Tipo.ENTRADA, momento=BASE,
             zona_horaria=MADRID)
libro.fichar(LUCIA, centro_id=CENTRO, tipo=Tipo.SALIDA,
             momento=BASE + timedelta(hours=8), zona_horaria=MADRID)
libro.fichar(JOSE, centro_id=CENTRO, tipo=Tipo.ENTRADA,
             momento=BASE + timedelta(hours=1), zona_horaria=MADRID)


def trabajador_dentro(codigo="1042", pin="482913"):
    c = web.test_client()
    c.get(f"/f/{TOKEN}")
    with c.session_transaction() as s:
        k = s["csrf"]
    c.post(f"/f/{TOKEN}/entrar", data={"codigo": codigo, "pin": pin, "csrf": k})
    return c


def campo(html: str, nombre: str) -> str:
    return html.split(f'name="{nombre}" value="', 1)[1].split('"', 1)[0]


def gestor_dentro(email, contrasena):
    c = panel.test_client()
    c.get("/panel/entrar")
    with c.session_transaction() as s:
        k = s["csrf"]
    c.post("/panel/entrar", data={"email": email, "contrasena": contrasena, "csrf": k})
    c.get("/panel/")
    return c


def csrf_panel(c):
    with c.session_transaction() as s:
        return s.get("csrf", "")


lucia = trabajador_dentro()
pagina = lucia.get(f"/f/{TOKEN}/mis-registros").get_data(as_text=True)
comprobar("El trabajador ve sus jornadas", "Mis registros" in pagina, True)
comprobar("Y solo las suyas", "Jose Ruiz" in pagina, False)

lucia.post(f"/f/{TOKEN}/proponer",
           data={"numero": 2, "hora": "18:00", "motivo": "Me quedé cerrando",
                 "csrf": campo(pagina, "csrf"), "clave": clave()})
propuestas = [a for a in LibroPostgres(EMPRESA, admin).anotaciones()
              if a.tipo is Tipo.CORRECCION_PROPUESTA]
comprobar("Puede pedir que se cambie una hora suya", len(propuestas), 1)
comprobar("Y el autor es él, no un identificador de empresa",
          propuestas[0].autor_id, LUCIA)
comprobar("La parte es el trabajador", propuestas[0].parte, Parte.TRABAJADOR)

# Un trabajador no puede tocar el fichaje de otro.
pagina = lucia.get(f"/f/{TOKEN}/mis-registros").get_data(as_text=True)
lucia.post(f"/f/{TOKEN}/proponer",
           data={"numero": 3, "hora": "10:00", "motivo": "El de mi compañero",
                 "csrf": campo(pagina, "csrf"), "clave": clave()})
comprobar("No puede proponer sobre el fichaje de un compañero",
          len([a for a in LibroPostgres(EMPRESA, admin).anotaciones()
               if a.tipo is Tipo.CORRECCION_PROPUESTA]), 1)

# El panel: solo administración puede corregir.
luis = gestor_dentro("luis@perez.es", "una-frase-larga-de-luis")
comprobar("Un usuario de uso diario no puede proponer correcciones",
          luis.post(f"/panel/empresas/{EMPRESA}/correcciones",
                    data={"numero": 1, "hora": "09:30", "motivo": "X",
                          "csrf": csrf_panel(luis)}).status_code, 403)
comprobar("Ni responderlas",
          luis.post(f"/panel/empresas/{EMPRESA}/correcciones/responder",
                    data={"numero": 4, "respuesta": "acepto",
                          "csrf": csrf_panel(luis)}).status_code, 403)

ana = gestor_dentro("ana@perez.es", "una-frase-larga-de-ana")
comprobar("La administradora ve la propuesta del trabajador",
          "Me quedé cerrando" in
          ana.get(f"/panel/empresas/{EMPRESA}/correcciones").get_data(as_text=True),
          True)
ana.post(f"/panel/empresas/{EMPRESA}/correcciones/responder",
         data={"numero": 4, "respuesta": "acepto", "csrf": csrf_panel(ana),
               "clave": clave()})
respuesta = [a for a in LibroPostgres(EMPRESA, admin).anotaciones() if a.corrige == 4]
comprobar("Y puede aceptarla", len(respuesta), 1)
comprobar("La parte es la empresa", respuesta[0].parte, Parte.EMPRESA)
comprobar("Pero el autor es la persona real del panel, no la empresa",
          respuesta[0].autor_id, ANA)
comprobar("Se puede decir quién lo hizo",
          respuesta[0].autor_id not in (EMPRESA, CENTRO), True)

# La gestoría rival no puede tocar nada de esta empresa.
bea = gestor_dentro("bea@rival.es", "una-frase-larga-de-bea")
comprobar("Otra gestoría no ve las correcciones",
          bea.get(f"/panel/empresas/{EMPRESA}/correcciones").status_code, 404)
comprobar("Ni puede proponer",
          bea.post(f"/panel/empresas/{EMPRESA}/correcciones",
                   data={"numero": 1, "hora": "09:30", "motivo": "X",
                         "csrf": csrf_panel(bea)}).status_code, 404)
comprobar("Ni descargar el expediente",
          bea.get(f"/panel/empresas/{EMPRESA}/expediente.zip").status_code, 404)

# CSRF y doble envío.
comprobar("Sin CSRF no se propone",
          ana.post(f"/panel/empresas/{EMPRESA}/correcciones",
                   data={"numero": 1, "hora": "09:30", "motivo": "X"}).status_code, 400)
antes = len(LibroPostgres(EMPRESA, admin).anotaciones())
misma = clave()
for _ in range(10):
    ana.post(f"/panel/empresas/{EMPRESA}/correcciones",
             data={"numero": 1, "hora": "09:30", "motivo": "Llegó antes",
                   "csrf": csrf_panel(ana), "clave": misma})
comprobar("Diez envíos con la misma clave dejan una sola propuesta",
          len(LibroPostgres(EMPRESA, admin).anotaciones()) - antes, 1)

# Sesión caducada y trabajador de baja.
admin.execute("update trabajador set activo = false where id = %s", (LUCIA,))
pagina_baja = lucia.get(f"/f/{TOKEN}/mis-registros")
comprobar("De baja, deja de ver sus registros", pagina_baja.status_code, 302)
admin.execute("update trabajador set activo = true where id = %s", (LUCIA,))

comprobar("El libro sigue verificando después de todo",
          bool(verificar_cadena(LibroPostgres(EMPRESA, admin).anotaciones(), EMPRESA)),
          True)

admin.close()

if fallos:
    print(f"\n{len(fallos)} de {hechas} comprobaciones fallan:\n")
    for fallo in fallos:
        print(f"  · {fallo}\n")
    raise SystemExit(1)
print(f"Todas las comprobaciones pasan: {hechas} sobre las correcciones.")
