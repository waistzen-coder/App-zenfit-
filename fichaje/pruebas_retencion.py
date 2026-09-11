"""Los cuatro años. `python3 -m fichaje.pruebas_retencion`.

El artículo 34.9 manda conservar el registro cuatro años. Hasta ahora eso estaba
en la matriz de cobertura como PARCIAL con una nota honesta: «nada borra, pero
eso no es lo mismo que haber demostrado que dentro de cuatro años sigue estando
y se puede leer». Y era verdad, porque no hay libros de hace cuatro años.

Lo que sí se puede hacer es **fabricar uno**. Un libro cuyas anotaciones más
viejas tienen cuatro años y un día, y preguntarle todo lo que se le preguntaría
el día que llegue una inspección:

- ¿Sigue ahí la anotación más vieja?
- ¿Verifica la cadena de punta a punta, cuatro años después?
- ¿Sobrevive a una copia de seguridad y su restauración, con la misma huella?
- ¿Entra en el expediente, y lo acepta el verificador que funciona sin base de
  datos?
- ¿Puede alguien borrarla, aunque quiera?

**Lo que esta prueba NO demuestra**, y conviene decirlo aquí y no en la letra
pequeña: que las copias de seguridad del proveedor funcionen durante cuatro años
naturales. Eso no es software y no se prueba con software. Se prueba
restaurando de verdad, cada cierto tiempo, y apuntando cuándo se hizo.

Lo que sí queda demostrado es que el programa no es el eslabón que falla: ni
borra, ni caduca, ni pierde la cadena por el camino.
"""

import io
import os
import time
import zipfile
from datetime import datetime, timedelta, timezone

os.environ.setdefault("FICHAJE_APP_PASSWORD", "prueba-local")
os.environ.setdefault("FICHAJE_PORTAL_PASSWORD", "prueba-local-portal")
os.environ.setdefault("FICHAJE_PORTAL_SECRETO", "secreto-portal-pruebas")

import psycopg  # noqa: E402

from . import representacion as R  # noqa: E402
from .admin import crear_centro, crear_empresa, crear_trabajador  # noqa: E402
from .copia import comprobar as comprobar_copia  # noqa: E402
from .despliegue import configurar_rol, configurar_rol_portal, dsn_aplicacion  # noqa: E402
from .exportar import paquete_de_empresa  # noqa: E402
from .jornada import jornadas_por_trabajador  # noqa: E402
from .migrar import aplicar  # noqa: E402
from .postgres import LibroPostgres, conectar  # noqa: E402
from .registro import Tipo, verificar_cadena  # noqa: E402
from .verificar_exportacion import verificar  # noqa: E402

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

MADRID = "Europe/Madrid"
AHORA = datetime.now(timezone.utc)
HOY = AHORA.date()
# Cuatro años y un día: justo al otro lado de la frontera, que es donde se
# rompen las cosas. Un libro de tres años y medio no probaría nada.
HACE_CUATRO_ANOS = AHORA - timedelta(days=4 * 365 + 2)

EMPRESA = crear_empresa(admin, "Panadería de siempre")
CENTRO, _ = crear_centro(admin, EMPRESA, "Obrador", MADRID)
GENTE = [crear_trabajador(admin, EMPRESA, f"Persona {i}", f"{100+i}") for i in range(2)]

libro = LibroPostgres(EMPRESA, admin)
arranque = time.perf_counter()
# Un día de trabajo cada semana durante cuatro años y pico. Lo que importa aquí
# es el LAPSO que abarca, no el volumen: si algo caduca, caduca por la fecha.
momento = HACE_CUATRO_ANOS
DIAS = (AHORA - HACE_CUATRO_ANOS).days // 7
for semana in range(DIAS):
    dia = HACE_CUATRO_ANOS + timedelta(days=semana * 7)
    for persona in GENTE:
        for horas, tipo in [(8, Tipo.ENTRADA), (13, Tipo.PAUSA_INICIO),
                            (14, Tipo.PAUSA_FIN), (17, Tipo.SALIDA)]:
            cuando = dia + timedelta(hours=horas)
            # `anotado_en` es cuando se escribió: en un libro real y antiguo
            # coincide con el fichaje, porque se fichó en su momento.
            libro.fichar(persona, centro_id=CENTRO, tipo=tipo, momento=cuando,
                         zona_horaria=MADRID, anotado_en=cuando)
siembra = time.perf_counter() - arranque

todas = libro.anotaciones()
print(f"  Libro de {len(todas)} anotaciones repartidas en "
      f"{(AHORA - HACE_CUATRO_ANOS).days} días, sembrado en {siembra:.1f} s")

# ==================================================== ¿sigue ahí lo más viejo?

mas_vieja = todas[0]
comprobar("La anotación número 1 sigue en el libro", mas_vieja.numero, 1)
antiguedad = (AHORA - mas_vieja.momento).days
comprobar(f"Y tiene más de cuatro años ({antiguedad} días)",
          antiguedad > 4 * 365, True)
comprobar("Es un fichaje de verdad, no un hueco", mas_vieja.tipo, Tipo.ENTRADA)

# ============================================= ¿verifica la cadena entera?

arranque = time.perf_counter()
veredicto = verificar_cadena(todas, EMPRESA)
verificacion = time.perf_counter() - arranque
comprobar("La cadena verifica de punta a punta, cuatro años después",
          bool(veredicto), True)
comprobar("Sin motivo de queja", veredicto.motivo, "")
comprobar(f"Y en menos de dos segundos ({verificacion:.2f} s)",
          verificacion < 2.0, True)

arranque = time.perf_counter()
por_persona = jornadas_por_trabajador(todas)
calculo = time.perf_counter() - arranque
comprobar("Salen las jornadas de las dos personas", len(por_persona), 2)
comprobar("Con una jornada por semana trabajada",
          len(por_persona[GENTE[0]]), DIAS)
comprobar(f"Y se calculan en menos de un segundo ({calculo:.2f} s)",
          calculo < 1.0, True)

# ======================================== ¿puede alguien borrar lo viejo?

# Ni la aplicación, que es quien está encendida atendiendo internet.
como_app = psycopg.connect(dsn_aplicacion(), autocommit=True)
falla("La aplicación no puede borrar una anotación de hace cuatro años",
      psycopg.errors.InsufficientPrivilege,
      lambda: como_app.execute("delete from anotacion where numero = 1"))
falla("Ni una purga por antigüedad, que es como se pierde esto de verdad",
      psycopg.errors.InsufficientPrivilege,
      lambda: como_app.execute(
          "delete from anotacion where momento < now() - interval '3 years'"))
como_app.close()

# Ni el dueño del esquema: para eso está el disparador.
falla("Ni siquiera el administrador, por el disparador",
      psycopg.errors.RaiseException,
      lambda: admin.execute("delete from anotacion where empresa_id = %s "
                            "and numero = 1", (EMPRESA,)))
comprobar("Y sigue ahí después de intentarlo",
          admin.execute("select count(*) from anotacion where empresa_id = %s "
                        "and numero = 1", (EMPRESA,)).fetchone()[0], 1)

# =================================== ¿sobrevive a una copia y su restauración?

huellas_antes = [a.huella for a in todas]
comprobar("La copia de seguridad y la restauración cuadran",
          comprobar_copia(), True)

from .postgres import dsn  # noqa: E402

partes = dsn().rsplit("/", 1)
copia = conectar(f"{partes[0]}/{partes[1]}_restaurada")
restaurado = LibroPostgres(EMPRESA, copia).anotaciones()
comprobar("En la copia está el libro entero", len(restaurado), len(todas))
comprobar("Con las mismas huellas, una por una",
          [a.huella for a in restaurado], huellas_antes)
comprobar("La anotación de hace cuatro años, idéntica",
          (restaurado[0].momento, restaurado[0].huella),
          (mas_vieja.momento, mas_vieja.huella))
comprobar("Y la cadena restaurada verifica",
          bool(verificar_cadena(restaurado, EMPRESA)), True)
copia.close()

# ============================== ¿entra en el expediente y lo acepta el verificador?

import tempfile  # noqa: E402

paquete = paquete_de_empresa(admin, EMPRESA, "Panadería de siempre")
with tempfile.NamedTemporaryFile("wb", suffix=".zip", delete=False) as f:
    f.write(paquete)
    ruta_paquete = f.name
# El verificador que funciona sin base de datos: el mismo que usaría un perito
# que solo tiene el ZIP y ningún acceso a nuestros servidores.
resultado = verificar(ruta_paquete)
comprobar("El expediente de un libro de cuatro años verifica",
          resultado.valido, True)
comprobar("Y comprueba todas las anotaciones", resultado.comprobadas, len(todas))
os.unlink(ruta_paquete)

with zipfile.ZipFile(io.BytesIO(paquete)) as z:
    registro = z.read("registro.csv").decode("utf-8-sig")
    lineas = registro.splitlines()
comprobar("Y el CSV trae todos los fichajes", len(lineas) - 1, len(todas))
comprobar("Incluida la fecha más vieja",
          mas_vieja.momento.astimezone().strftime("%Y-%m-%d") in registro
          or str(mas_vieja.momento.date()) in registro, True)

# ========================= conservar no es enseñar: el portal sí recorta

# Esto parece contradecir lo anterior y no lo hace, y la diferencia es el
# punto entero de la retención. La ley manda CONSERVAR cuatro años; no manda
# enseñárselo todo a todo el mundo para siempre. El expediente, que va a la
# Inspección o a un juzgado, lleva el libro entero. El portal de la
# representación enseña lo que le corresponde y ni un día más.
REP = R.crear(admin, EMPRESA, "Repre", "repre@x.es", "una-clave-larguisima",
              vigente_desde=HOY - timedelta(days=4 * 365 + 10))
fila = R.por_email(admin, "repre@x.es")
repre = R.Representante(*fila[:11])
comprobar("Un representante no puede pedir más atrás de cuatro años",
          repre.desde_minimo(HOY) >= HOY - R.RETENCION, True)
comprobar("Aunque su mandato empezara antes",
          repre.vigente_desde < HOY - R.RETENCION, True)
comprobar("Y pedir aquel día no devuelve nada",
          R.anotaciones(admin, repre, mas_vieja.momento.date(),
                        mas_vieja.momento.date()), [])
# Pero lo de hace tres años sí, que está dentro.
hace_tres = (AHORA - timedelta(days=3 * 365)).date()
del_tercer_ano = [a for a in todas if a.momento.date() == hace_tres]
if del_tercer_ano:
    comprobar("Y lo de hace tres años sí se ve",
              len(R.anotaciones(admin, repre, hace_tres, hace_tres)) > 0, True)

admin.close()

print()
print("  Lo que esta prueba NO demuestra: que las copias del proveedor aguanten")
print("  cuatro años naturales. Eso se prueba restaurando de verdad, cada cierto")
print("  tiempo, y apuntando cuándo se hizo.")
print()

if fallos:
    print(f"\n{len(fallos)} de {hechas} comprobaciones fallan:\n")
    for fallo in fallos:
        print(f"  · {fallo}\n")
    raise SystemExit(1)
print(f"Todas las comprobaciones pasan: {hechas} sobre la retención a cuatro años.")
