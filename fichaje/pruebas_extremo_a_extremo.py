"""Los tres contextos, sobre el mismo hecho. `python3 -m fichaje.pruebas_extremo_a_extremo`.

Cada suite prueba su parte: el fichaje web, el panel, las correcciones, el
portal. Ninguna prueba lo que pasa cuando un hecho las atraviesa todas, y ahí es
donde se esconden los desacuerdos: la gestoría corrige una hora, el trabajador
la acepta, y entonces **tres pantallas distintas tienen que decir lo mismo**.

Si el portal enseñara la hora original y la nómina la corregida, las dos serían
defendibles por separado y juntas serían un problema. Esa es la clase de fallo
que solo se ve mirando de punta a punta.

El recorrido:

1. Lucía ficha desde el móvil. Entra a las 8:00 y sale a las 17:00.
2. Se le olvidó fichar la salida a su hora: salió a las 15:00, no a las 17:00.
   La gestoría propone corregirlo, en nombre de la empresa.
3. Lucía lo acepta desde su móvil.
4. Y entonces se le pregunta lo mismo a todo el mundo: al panel, al portal de la
   representación, al CSV que se descarga y al expediente que iría a una
   inspección. Los cuatro tienen que decir siete horas, no nueve.
5. Y el libro tiene que seguir guardando las dos versiones, porque una
   corrección no borra lo que pasó: lo explica.
"""

import io
import os
import zipfile
from datetime import datetime, timedelta, timezone

os.environ.setdefault("FICHAJE_APP_PASSWORD", "prueba-local")
os.environ.setdefault("FICHAJE_PORTAL_PASSWORD", "prueba-local-portal")
os.environ.setdefault("FICHAJE_PORTAL_SECRETO", "secreto-portal-pruebas")
os.environ.setdefault("FICHAJE_PANEL_SECRETO", "secreto-panel-pruebas")
os.environ.setdefault("FICHAJE_SECRETO", "secreto-fichaje-pruebas")

from . import gestoria as G  # noqa: E402
from . import representacion as R  # noqa: E402
from .admin import crear_centro, crear_empresa, crear_trabajador, poner_pin  # noqa: E402
from .correcciones import proponer, responder  # noqa: E402
from .despliegue import (  # noqa: E402
    configurar_rol,
    configurar_rol_portal,
    dsn_aplicacion,
    dsn_portal,
)
from .exportar import paquete_de_empresa  # noqa: E402
from .jornada import jornadas_de  # noqa: E402
from .migrar import aplicar  # noqa: E402
from .panel import crear_panel  # noqa: E402
from .portal import crear_portal  # noqa: E402
from .postgres import LibroPostgres, conectar  # noqa: E402
from .registro import Parte, Tipo, verificar_cadena  # noqa: E402
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


# ------------------------------------------------------------------ montaje

admin = conectar()
vaciar_base(admin)
admin.close()
aplicar()
admin = conectar()
configurar_rol(admin)
configurar_rol_portal(admin)

MADRID = "Europe/Madrid"
AHORA = datetime.now(timezone.utc)
HOY = AHORA.date()
AYER = HOY - timedelta(days=1)

GESTORIA = G.crear_gestoria(admin, "Asesoría Pérez")
ANA = G.crear_usuario(admin, GESTORIA, "ana@perez.es", "Ana Pérez",
                      "una-frase-larga-de-ana", G.Rol.ADMIN)
EMPRESA = crear_empresa(admin, "Bar Casa Paco", GESTORIA)
CENTRO, TOKEN = crear_centro(admin, EMPRESA, "Local de la playa", MADRID)
LUCIA = crear_trabajador(admin, EMPRESA, "Lucía García", "1042")
poner_pin(admin, LUCIA, "482913")

REPRE = R.crear(admin, EMPRESA, "Carmen Vega", "carmen@plantilla.es",
                "una-clave-larguisima", vigente_desde=HOY - timedelta(days=365),
                creado_por=ANA)

web = crear_app(dsn_aplicacion()); web.config["TESTING"] = True
panel = crear_panel(dsn_aplicacion()); panel.config["TESTING"] = True
portal = crear_portal(dsn_portal()); portal.config["TESTING"] = True

# ============================================ 1 · Lucía ficha desde el móvil

# Ayer, para que la jornada esté cerrada y el día completo.
BASE = datetime(AYER.year, AYER.month, AYER.day, tzinfo=timezone.utc)
ENTRADA, SALIDA_MAL, SALIDA_BIEN = (BASE + timedelta(hours=8),
                                    BASE + timedelta(hours=17),
                                    BASE + timedelta(hours=15))

libro = LibroPostgres(EMPRESA, admin)
libro.fichar(LUCIA, centro_id=CENTRO, tipo=Tipo.ENTRADA, momento=ENTRADA,
             zona_horaria=MADRID, anotado_en=ENTRADA, origen="movil")
salida = libro.fichar(LUCIA, centro_id=CENTRO, tipo=Tipo.SALIDA,
                      momento=SALIDA_MAL, zona_horaria=MADRID,
                      anotado_en=SALIDA_MAL, origen="movil")

jornadas = jornadas_de(libro.anotaciones(), LUCIA)
comprobar("Hay una jornada", len(jornadas), 1)
comprobar("Y de momento son nueve horas", jornadas[0].horas, 9.0)

# ================================= 2 · la gestoría propone corregir la salida

# El autor es LA PERSONA de la gestoría, aunque la parte sea la empresa. El día
# que alguien pregunte quién cambió aquella hora, la respuesta tiene nombre.
propuesta, _ = proponer(libro, "clave-propuesta-1", salida.numero,
                        SALIDA_BIEN, "se le olvidó fichar la salida",
                        ANA, Parte.EMPRESA, AHORA)
comprobar("La propuesta queda escrita", propuesta.tipo, Tipo.CORRECCION_PROPUESTA)
comprobar("Con el autor de la gestoría, no con el de la empresa",
          propuesta.autor_id, ANA)
comprobar("Pero la parte es la empresa", propuesta.parte, Parte.EMPRESA)

# Y mientras no se resuelva, la hora NO ha cambiado. Proponer no es corregir.
comprobar("Proponer no cambia la hora todavía",
          jornadas_de(libro.anotaciones(), LUCIA)[0].horas, 9.0)

# ========================================== 3 · Lucía la acepta desde el móvil

resolucion, _ = responder(libro, "clave-respuesta-1", propuesta.numero,
                          acepta=True, autor_id=LUCIA, parte=Parte.TRABAJADOR,
                          ahora=AHORA)
comprobar("Queda aceptada", resolucion.tipo, Tipo.CORRECCION_ACEPTADA)
comprobar("Y la acepta ella, que es de quien es la jornada",
          resolucion.autor_id, LUCIA)

todas = libro.anotaciones()
comprobar("La cadena sigue verificando después de corregir",
          bool(verificar_cadena(todas, EMPRESA)), True)

# ============================ 4 · y ahora lo mismo, preguntado a todo el mundo

ESPERADO = 7.0

# --- el dominio
jornada = jornadas_de(todas, LUCIA)[0]
comprobar("El dominio dice siete horas", jornada.horas, ESPERADO)
comprobar("Y marca la jornada como corregida", jornada.corregida, True)

# --- el panel de la gestoría
c_panel = panel.test_client()
c_panel.get("/panel/entrar")
with c_panel.session_transaction() as s:
    csrf = s["csrf"]
c_panel.post("/panel/entrar", data={"email": "ana@perez.es",
                                    "contrasena": "una-frase-larga-de-ana",
                                    "csrf": csrf})
r = c_panel.get(f"/panel/empresas/{EMPRESA}/jornada?f={AYER}")
comprobar("El panel carga la jornada de ayer", r.status_code, 200)
# Se busca la celda entera, no el número suelto: «7.0» también está dentro de
# «17.05», y una prueba que pasa por casualidad no sirve de nada.
comprobar("Y enseña siete horas", b"<b>7.0</b>" in r.data, True)
comprobar("Las nueve ya no aparecen", b"<b>9.0</b>" in r.data, False)

# --- el móvil de Lucía
c_web = web.test_client()
c_web.get(f"/f/{TOKEN}")
with c_web.session_transaction() as s:
    csrf = s["csrf"]
c_web.post(f"/f/{TOKEN}/entrar",
           data={"codigo": "1042", "pin": "482913", "csrf": csrf})
r = c_web.get(f"/f/{TOKEN}/mis-registros")
comprobar("Lucía ve sus registros", r.status_code, 200)
comprobar("Y también siete horas", b"<b>7.0 h</b>" in r.data, True)
comprobar("No las nueve", b"<b>9.0 h</b>" in r.data, False)

# --- el portal de la representación
c_portal = portal.test_client()
c_portal.get("/rep/entrar")
with c_portal.session_transaction() as s:
    csrf = s["csrf"]
c_portal.post("/rep/entrar", data={"email": "carmen@plantilla.es",
                                   "contrasena": "una-clave-larguisima",
                                   "csrf": csrf})
mes = AYER.strftime("%Y-%m")
r = c_portal.get(f"/rep/?mes={mes}")
comprobar("El portal carga", r.status_code, 200)
comprobar("Y la representación ve siete horas",
          b"7.00" in r.data, True)
comprobar("No las nueve originales", b"9.00" in r.data, False)

r = c_portal.get(f"/rep/persona/{LUCIA}?mes={mes}")
comprobar("La ficha de Lucía en el portal carga", r.status_code, 200)
comprobar("Con la hora de salida corregida, las 15:00", b"15:00" in r.data, True)
comprobar("Y sin la original", b"17:00" in r.data, False)
comprobar("Marcada como corregida, para que no parezca que siempre fue así",
          "corregida".encode() in r.data, True)

# --- el CSV que se descarga del portal
r = c_portal.get(f"/rep/descargar.csv?mes={mes}")
csv_texto = r.data.decode("utf-8-sig")
comprobar("El CSV del portal también dice siete", ";7.00" in csv_texto, True)

# --- el expediente que iría a una inspección
paquete = paquete_de_empresa(admin, EMPRESA, "Bar Casa Paco")
with zipfile.ZipFile(io.BytesIO(paquete)) as z:
    registro = z.read("registro.csv").decode("utf-8-sig")
    correcciones = z.read("correcciones.csv").decode("utf-8-sig")
    libro_jsonl = z.read("libro.jsonl").decode("utf-8")

# --- y la totalización mensual, en las dos pantallas donde sale
#
# El panel y el expediente la calculan con el mismo código a propósito. Esta
# comprobación existe para que siga siendo así: el día que alguien duplique la
# suma «para no depender del dominio», aquí saltará.
mes_de_ayer = f"{AYER.year:04d}-{AYER.month:02d}"
r = c_panel.get(f"/panel/empresas/{EMPRESA}/totales?mes={mes_de_ayer}")
comprobar("El panel enseña las horas del mes", r.status_code, 200)
comprobar("Y son las siete corregidas", b"<b>7.00</b>" in r.data, True)
comprobar("No las nueve de antes de corregir", b"<b>9.00</b>" in r.data, False)

with zipfile.ZipFile(io.BytesIO(paquete)) as z:
    totales_csv = z.read("totales-mensuales.csv").decode("utf-8-sig")
filas_csv = [l.split(",") for l in totales_csv.splitlines()[1:] if l.strip()]
comprobar("El expediente trae una fila para Lucía en ese mes",
          [f for f in filas_csv if f[0] == "Lucía García" and f[1] == mes_de_ayer]
          != [], True)
fila_lucia = [f for f in filas_csv
              if f[0] == "Lucía García" and f[1] == mes_de_ayer][0]
comprobar("Con las mismas siete horas que enseña el panel",
          float(fila_lucia[3]), ESPERADO)
comprobar("Un día con jornada", int(fila_lucia[2]), 1)
comprobar("Y marcada como corregida, para que no parezca una suma limpia",
          int(fila_lucia[6]), 1)

# ================= 5 · pero el libro guarda las dos versiones, no una sola

# Esto es lo que separa una corrección de un borrado. La hora original sigue
# escrita, firmada y verificable; lo que cambia es cuál vale hoy. Un expediente
# que solo enseñara la hora buena sería más limpio y valdría menos: no dejaría
# ver que hubo un cambio, quién lo pidió y quién lo aceptó.
comprobar("El expediente conserva la hora original",
          "17:00" in registro, True)
comprobar("Y la corrección aparece aparte, con su motivo",
          "se le olvidó fichar la salida" in correcciones, True)
comprobar("Con quién la pidió", "Ana Pérez" in correcciones, True)
comprobar("Y quién la aceptó", "Lucía García" in correcciones, True)
comprobar("El libro firmado trae las cuatro anotaciones",
          len([x for x in libro_jsonl.splitlines() if x.strip()]), 4)

comprobar("Y en la base siguen las cuatro: dos fichajes, propuesta y resolución",
          [a.tipo for a in todas],
          [Tipo.ENTRADA, Tipo.SALIDA, Tipo.CORRECCION_PROPUESTA,
           Tipo.CORRECCION_ACEPTADA])
comprobar("La salida original conserva su hora",
          todas[1].momento, SALIDA_MAL)
comprobar("Nadie ha tocado su huella",
          todas[1].huella, salida.huella)

admin.close()

if fallos:
    print(f"\n{len(fallos)} de {hechas} comprobaciones fallan:\n")
    for fallo in fallos:
        print(f"  · {fallo}\n")
    raise SystemExit(1)
print(f"Todas las comprobaciones pasan: {hechas} de extremo a extremo, "
      f"cruzando los tres contextos.")
