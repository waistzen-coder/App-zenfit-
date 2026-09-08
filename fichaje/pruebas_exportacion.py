"""Pruebas del expediente auditable. `python3 -m fichaje.pruebas_exportacion`.

Un paquete que solo pudiéramos verificar nosotros no valdría de nada. Así que lo
que se prueba aquí es que cualquiera pueda comprobarlo con el ZIP en la mano, y
que cualquier retoque salte.
"""

import io
import json
import os
import zipfile
from datetime import datetime, timedelta, timezone

os.environ.setdefault("FICHAJE_APP_PASSWORD", "prueba-local")
os.environ.setdefault("FICHAJE_SECRETO", "secreto-pruebas")
os.environ.setdefault("FICHAJE_PANEL_SECRETO", "secreto-panel-pruebas")

import tempfile  # noqa: E402

from psycopg import sql  # noqa: E402

from . import gestoria as G  # noqa: E402
from .admin import crear_centro, crear_empresa, crear_trabajador, poner_pin  # noqa: E402
from .correcciones import proponer, responder  # noqa: E402
from .despliegue import configurar_rol, dsn_aplicacion  # noqa: E402
from .exportar import celda_segura_para_hoja, paquete_de_empresa  # noqa: E402
from .migrar import aplicar  # noqa: E402
from .panel import crear_panel  # noqa: E402
from .postgres import LibroPostgres, conectar  # noqa: E402
from .registro import Parte, Tipo  # noqa: E402
from .verificar_exportacion import verificar  # noqa: E402
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
tablas = [f[0] for f in admin.execute(
    "select tablename from pg_tables where schemaname = 'public'").fetchall()]
if tablas:
    admin.execute(sql.SQL("drop table {} cascade").format(
        sql.SQL(", ").join(sql.Identifier(t) for t in tablas)))
admin.close()
aplicar()
admin = conectar()
configurar_rol(admin)

GA = G.crear_gestoria(admin, "Asesoría Pérez")
ANA = G.crear_usuario(admin, GA, "ana@perez.es", "Ana Pérez",
                      "una-frase-larga-de-ana", G.Rol.ADMIN)
EMPRESA = crear_empresa(admin, "Bar Casa Paco", GA)
CENTRO, TOKEN = crear_centro(admin, EMPRESA, "Local de la playa", "Europe/Madrid")
LUCIA = crear_trabajador(admin, EMPRESA, "Lucía García", "1042")
poner_pin(admin, LUCIA, "482913")
JEFE = crear_trabajador(admin, EMPRESA, "Paco", "1")
# Alguien con un nombre que una hoja de cálculo interpretaría como fórmula.
PELIGROSA = crear_trabajador(admin, EMPRESA, "=HYPERLINK(\"http://x\",\"pincha\")", "9")
poner_pin(admin, PELIGROSA, "482914")

BASE = datetime(2026, 9, 1, 7, 0, tzinfo=timezone.utc)
MADRID = "Europe/Madrid"
libro = LibroPostgres(EMPRESA, admin)
for dia in range(5):
    for quien in (LUCIA, PELIGROSA):
        libro.fichar(quien, centro_id=CENTRO, tipo=Tipo.ENTRADA,
                     momento=BASE + timedelta(days=dia), zona_horaria=MADRID)
        libro.fichar(quien, centro_id=CENTRO, tipo=Tipo.SALIDA,
                     momento=BASE + timedelta(days=dia, hours=8), zona_horaria=MADRID)
# Una corrección aceptada y otra con desacuerdo, para que salgan en el paquete.
proponer(libro, G.nuevo_id(), 2, BASE + timedelta(hours=9), "Se quedó cerrando",
         LUCIA, Parte.TRABAJADOR, BASE + timedelta(days=7))
responder(libro, G.nuevo_id(), 21, True, ANA, Parte.EMPRESA, BASE + timedelta(days=7))
proponer(libro, G.nuevo_id(), 6, BASE + timedelta(days=1, hours=6), "Se fue antes",
         ANA, Parte.EMPRESA, BASE + timedelta(days=7))
responder(libro, G.nuevo_id(), 23, False, LUCIA, Parte.TRABAJADOR,
          BASE + timedelta(days=7))

paquete = paquete_de_empresa(admin, EMPRESA, "Bar Casa Paco")


def escribir(datos: bytes) -> str:
    with tempfile.NamedTemporaryFile("wb", suffix=".zip", delete=False) as f:
        f.write(datos)
        return f.name


def rehacer(cambios: dict, quitar: set = frozenset()) -> bytes:
    """Copia del paquete con algún archivo cambiado, añadido o quitado."""
    memoria = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(paquete)) as viejo, \
            zipfile.ZipFile(memoria, "w", zipfile.ZIP_DEFLATED) as nuevo:
        for nombre in viejo.namelist():
            if nombre in quitar:
                continue
            datos = cambios.get(nombre, viejo.read(nombre))
            nuevo.writestr(nombre, datos)
        for nombre, datos in cambios.items():
            if nombre not in viejo.namelist():
                nuevo.writestr(nombre, datos)
    return memoria.getvalue()


def dentro(nombre: str) -> bytes:
    with zipfile.ZipFile(io.BytesIO(paquete)) as zf:
        return zf.read(nombre)


# ================================================= el paquete tal cual sale

ruta = escribir(paquete)
resultado = verificar(ruta)
comprobar("El paquete recién generado cuadra", resultado.valido, True)
comprobar("Y dice cuántas anotaciones ha comprobado",
          resultado.comprobadas, len(libro.anotaciones()))

with zipfile.ZipFile(io.BytesIO(paquete)) as zf:
    dentro_nombres = set(zf.namelist())
comprobar("Lleva los cinco archivos", dentro_nombres,
          {"registro.csv", "correcciones.csv", "libro.jsonl", "manifest.json",
           "LEEME.txt"})

manifest = json.loads(dentro("manifest.json"))
comprobar("El manifiesto declara la versión del formato",
          manifest["version_formato_exportacion"], "1.0")
comprobar("El número de anotaciones", manifest["numero_anotaciones"],
          len(libro.anotaciones()))
comprobar("La última huella", manifest["ultima_huella"],
          libro.anotaciones()[-1].huella)
comprobar("La versión de la huella", manifest["version_huella"], 2)
comprobar("Y el resultado de verificar", manifest["resultado_verificacion"]["valido"],
          True)
comprobar("Con la huella SHA-256 de cada archivo",
          sorted(manifest["archivos"]),
          ["LEEME.txt", "correcciones.csv", "libro.jsonl", "registro.csv"])

texto_registro = dentro("registro.csv").decode("utf-8")
comprobar("El registro trae la hora original y la vigente",
          "momento_original" in texto_registro and "momento_vigente" in texto_registro,
          True)
texto_correcciones = dentro("correcciones.csv").decode("utf-8")
comprobar("Las correcciones traen el motivo", "Se quedó cerrando" in texto_correcciones,
          True)
comprobar("Y el desacuerdo, con su palabra", "discrepancia" in texto_correcciones, True)
comprobar("Con quién lo pidió y quién respondió",
          "Ana Pérez (gestoría)" in texto_correcciones, True)
leeme = dentro("LEEME.txt").decode("utf-8")
comprobar("El LEEME dice lo que NO demuestra", "NO demuestra" in leeme, True)
comprobar("Y no se llama formato oficial",
          "formato oficial" in leeme.lower() and "NO es un" in leeme, True)

comprobar("El paquete no lleva PIN ni contraseñas",
          any(p in paquete for p in (b"scrypt$", b"pin_derivado", b"482913")), False)

# Dos exportaciones del mismo libro dan el mismo ZIP, salvo la fecha.
otro = paquete_de_empresa(admin, EMPRESA, "Bar Casa Paco")
m1, m2 = json.loads(dentro("manifest.json")), None
with zipfile.ZipFile(io.BytesIO(otro)) as zf:
    m2 = json.loads(zf.read("manifest.json"))
comprobar("Dos exportaciones del mismo libro traen los mismos archivos",
          {k: v["sha256"] for k, v in m1["archivos"].items()},
          {k: v["sha256"] for k, v in m2["archivos"].items()})

# ============================================ hojas de cálculo y fórmulas

comprobar("Un nombre que empieza por = sale escapado en el CSV",
          "'=HYPERLINK" in texto_registro, True)
comprobar("Y no se cuela sin escapar",
          ',=HYPERLINK' in texto_registro, False)
for peligroso in ("=1+1", "+1", "-1", "@x"):
    comprobar(f"«{peligroso}» se neutraliza",
              celda_segura_para_hoja(peligroso).startswith("'"), True)

# ================================================== red team del paquete

libro_lineas = dentro("libro.jsonl").decode("utf-8").splitlines()

ataques = {
    "cambiar una hora en el libro": rehacer({
        "libro.jsonl": "\n".join(
            [libro_lineas[0].replace("T07:00:00", "T06:00:00")] + libro_lineas[1:]
        ).encode() + b"\n"}),
    "cambiar un motivo": rehacer({
        "libro.jsonl": "\n".join(
            l.replace("Se quedó cerrando", "Otro motivo") for l in libro_lineas
        ).encode() + b"\n"}),
    "borrar una línea del medio": rehacer({
        "libro.jsonl": "\n".join(libro_lineas[:5] + libro_lineas[6:]).encode() + b"\n"}),
    "reordenar dos líneas": rehacer({
        "libro.jsonl": "\n".join(
            libro_lineas[:3] + [libro_lineas[4], libro_lineas[3]] + libro_lineas[5:]
        ).encode() + b"\n"}),
    "cambiar una huella": rehacer({
        "libro.jsonl": "\n".join(
            libro_lineas[:1]
            + [json.dumps({**json.loads(libro_lineas[1]), "huella": "0" * 64},
                          ensure_ascii=False, sort_keys=True)]
            + libro_lineas[2:]).encode() + b"\n"}),
    "cambiar el CSV": rehacer({
        "registro.csv": dentro("registro.csv").replace(b"Luc", b"Zzz")}),
    "cambiar el manifiesto": rehacer({
        "manifest.json": json.dumps(
            {**manifest, "numero_anotaciones": 999}, ensure_ascii=False).encode()}),
    "añadir un archivo": rehacer({"extra.txt": b"colado"}),
    "quitar un archivo": rehacer({}, quitar={"correcciones.csv"}),
    "truncar el final del libro": rehacer({
        "libro.jsonl": "\n".join(libro_lineas[:-3]).encode() + b"\n"}),
}
for nombre, datos in ataques.items():
    resultado = verificar(escribir(datos))
    comprobar(f"El verificador detecta: {nombre}", resultado.valido, False)

# ================================================ el trabajador y su copia

web = crear_app(dsn_aplicacion())
web.config["TESTING"] = True
c = web.test_client()
c.get(f"/f/{TOKEN}")
with c.session_transaction() as s:
    k = s["csrf"]
c.post(f"/f/{TOKEN}/entrar", data={"codigo": "1042", "pin": "482913", "csrf": k})
respuesta = c.get(f"/f/{TOKEN}/mis-registros.csv")
csv = respuesta.get_data(as_text=True)
comprobar("El trabajador se descarga sus registros", respuesta.status_code, 200)
comprobar("Como CSV", "text/csv" in respuesta.headers["Content-Type"], True)
comprobar("Con sus jornadas", csv.count("\r\n") >= 5, True)
comprobar("Y sin nada de sus compañeros", "HYPERLINK" in csv, False)

sin_sesion = web.test_client()
comprobar("Sin sesión no hay descarga",
          sin_sesion.get(f"/f/{TOKEN}/mis-registros.csv").status_code, 302)

# ============================================ el expediente desde el panel

panel = crear_panel(dsn_aplicacion())
panel.config["TESTING"] = True
p = panel.test_client()
p.get("/panel/entrar")
with p.session_transaction() as s:
    k = s["csrf"]
p.post("/panel/entrar", data={"email": "ana@perez.es",
                              "contrasena": "una-frase-larga-de-ana", "csrf": k})
descarga = p.get(f"/panel/empresas/{EMPRESA}/expediente.zip")
comprobar("La gestoría descarga el expediente", descarga.status_code, 200)
comprobar("Es un ZIP", descarga.headers["Content-Type"], "application/zip")
comprobar("Y el que descarga también cuadra",
          verificar(escribir(descarga.get_data())).valido, True)
comprobar("La descarga queda en el registro administrativo",
          admin.execute("select count(*) from registro_administrativo where "
                        "accion = 'exportar'").fetchone()[0] >= 1, True)

admin.close()

if fallos:
    print(f"\n{len(fallos)} de {hechas} comprobaciones fallan:\n")
    for fallo in fallos:
        print(f"  · {fallo}\n")
    raise SystemExit(1)
print(f"Todas las comprobaciones pasan: {hechas} sobre la exportación.")
