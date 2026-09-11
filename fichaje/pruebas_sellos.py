"""El sello y el recorte. `python3 -m fichaje.pruebas_sellos`.

Esta suite existe por un agujero muy concreto y muy incómodo: **la cadena de
huellas no detecta que se borren las últimas anotaciones**. Un trozo del
principio de una cadena válida también es una cadena válida, y el expediente de
un libro recortado sale impecable. Quien quiera esconder horas extra no va a
reescribir el año pasado; va a borrar lo de ayer.

Así que lo primero que se comprueba aquí es el agujero, no la solución: se
recorta un libro y se enseña que el verificador de siempre lo da por bueno. Una
prueba que solo enseñara que el arreglo funciona dejaría sin escribir por qué
hacía falta.

Y luego, que con sellos deja de dar por bueno: ni en la base de datos, ni con el
ZIP en la mano y sin acceso a nada nuestro.
"""

import io
import os
import tempfile
import zipfile
from datetime import datetime, timedelta, timezone

os.environ.setdefault("FICHAJE_APP_PASSWORD", "prueba-local")

import psycopg  # noqa: E402

from . import sello as S  # noqa: E402
from .admin import crear_centro, crear_empresa, crear_trabajador  # noqa: E402
from .despliegue import configurar_rol, dsn_aplicacion  # noqa: E402
from .exportar import paquete_de_empresa  # noqa: E402
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


admin = conectar()
vaciar_base(admin)
admin.close()
aplicar()
admin = conectar()
configurar_rol(admin)

MADRID = "Europe/Madrid"
AHORA = datetime.now(timezone.utc)


def empresa_con_fichajes(nombre: str, cuantos: int = 10):
    empresa = crear_empresa(admin, nombre)
    centro, _ = crear_centro(admin, empresa, "Local", MADRID)
    persona = crear_trabajador(admin, empresa, "Alguien", "1")
    libro = LibroPostgres(empresa, admin)
    base = AHORA - timedelta(days=3)
    for i in range(cuantos):
        libro.fichar(persona, centro_id=centro,
                     tipo=Tipo.ENTRADA if i % 2 == 0 else Tipo.SALIDA,
                     momento=base + timedelta(hours=i), zona_horaria=MADRID,
                     anotado_en=base + timedelta(hours=i))
    return empresa, centro, persona, libro


def recortar(empresa_id: str, desde_numero: int) -> None:
    """Borra las últimas anotaciones por detrás, como quien tiene la base."""
    admin.execute("alter table anotacion disable trigger anotacion_solo_anadir")
    admin.execute("delete from anotacion where empresa_id = %s and numero >= %s",
                  (empresa_id, desde_numero))
    admin.execute("alter table anotacion enable trigger anotacion_solo_anadir")


# ============================== primero, el agujero: sin sellos no se detecta

A, _, _, libro_a = empresa_con_fichajes("Sin sellos SL")
antes = libro_a.anotaciones()
comprobar("El libro entero verifica", bool(verificar_cadena(antes, A)), True)
recortar(A, 8)
despues = libro_a.anotaciones()
comprobar("Le faltan tres anotaciones", len(despues), len(antes) - 3)
comprobar("Y AUN ASÍ la cadena verifica: este es el agujero",
          bool(verificar_cadena(despues, A)), True)

paquete_recortado = paquete_de_empresa(admin, A, "Sin sellos SL")
with tempfile.NamedTemporaryFile("wb", suffix=".zip", delete=False) as f:
    f.write(paquete_recortado)
    ruta = f.name
resultado = verificar(ruta)
comprobar("Y el expediente de un libro recortado, sin sellos, sale impecable",
          resultado.valido, True)
comprobar("Aunque el verificador avisa de que no hay nada que lo desmienta",
          any("SIN SELLOS" in d for d in resultado.detalles), True)
os.unlink(ruta)

# ================================ ahora, con sellos: el recorte se ve

B, _, persona_b, libro_b = empresa_con_fichajes("Con sellos SL")
sello1 = S.sellar(admin, B)
comprobar("El primer sello cuelga de ceros", sello1.huella_anterior, S.CEROS)
comprobar("Y dice cuántas anotaciones había", sello1.anotaciones, 10)
comprobar("Y cuál era la última", sello1.hasta_numero, 10)
comprobar("Todo cuadra", bool(S.comprobar(admin, B)), True)

# Se sella otra vez sin cambios: es idempotente en el sentido que importa, no
# rompe nada, y deja constancia de que ese día seguía igual.
sello2 = S.sellar(admin, B)
comprobar("El segundo sello cuelga del primero", sello2.huella_anterior, sello1.huella)
comprobar("Y la cadena de sellos cuadra", bool(S.comprobar(admin, B)), True)

recortar(B, 8)
veredicto = S.comprobar(admin, B)
comprobar("Después del recorte, los sellos NO cuadran", bool(veredicto), False)
comprobar("Y dicen cuántas faltan", "se han borrado 3" in veredicto.motivo, True)
comprobar("Mientras la cadena sigue diciendo que todo está bien",
          bool(verificar_cadena(libro_b.anotaciones(), B)), True)

# --------------------------------- y se ve también con el ZIP en la mano

paquete = paquete_de_empresa(admin, B, "Con sellos SL")
with tempfile.NamedTemporaryFile("wb", suffix=".zip", delete=False) as f:
    f.write(paquete)
    ruta = f.name
resultado = verificar(ruta)
comprobar("El expediente de un libro recortado CON sellos se rechaza",
          resultado.valido, False)
comprobar("Diciendo por qué", "sellos no cuadran" in resultado.motivo, True)
os.unlink(ruta)

with zipfile.ZipFile(io.BytesIO(paquete)) as z:
    lineas = z.read("sellos.jsonl").decode("utf-8").splitlines()
comprobar("El paquete lleva los dos sellos", len([x for x in lineas if x.strip()]), 2)

# ===================================== un libro sano con sellos sí pasa

C, _, _, libro_c = empresa_con_fichajes("Sana SL")
S.sellar(admin, C)
libro_c.fichar(crear_trabajador(admin, C, "Otra", "2"), centro_id=admin.execute(
    "select id::text from centro where empresa_id = %s", (C,)).fetchone()[0],
    tipo=Tipo.ENTRADA, momento=AHORA, zona_horaria=MADRID, anotado_en=AHORA)
S.sellar(admin, C)
comprobar("Un libro que solo crece cuadra con sus sellos",
          bool(S.comprobar(admin, C)), True)
paquete_sano = paquete_de_empresa(admin, C, "Sana SL")
with tempfile.NamedTemporaryFile("wb", suffix=".zip", delete=False) as f:
    f.write(paquete_sano)
    ruta = f.name
comprobar("Y su expediente pasa", verificar(ruta).valido, True)
comprobar("Con los sellos contados en los detalles",
          any("sellos encadenados" in d for d in verificar(ruta).detalles), True)
os.unlink(ruta)

# ============================ y los sellos tampoco se pueden tocar

falla("Un sello no se puede modificar", psycopg.errors.RaiseException,
      lambda: admin.execute("update sello set anotaciones = 1 where empresa_id = %s",
                            (B,)))
falla("Ni borrar", psycopg.errors.RaiseException,
      lambda: admin.execute("delete from sello where empresa_id = %s", (B,)))

como_app = psycopg.connect(dsn_aplicacion(), autocommit=True)
falla("Y la aplicación no tiene ni permiso para intentarlo",
      psycopg.errors.InsufficientPrivilege,
      lambda: como_app.execute("update sello set anotaciones = 1"))
falla("Ni para borrarlos", psycopg.errors.InsufficientPrivilege,
      lambda: como_app.execute("delete from sello"))
comprobar("Pero sí puede sellar, que es añadir",
          como_app.execute("select count(*) from sello").fetchone()[0] > 0, True)
como_app.close()

# Quitar un sello del medio tampoco cuela: se encadenan entre ellos.
D, _, _, libro_d = empresa_con_fichajes("Cadena SL")
S.sellar(admin, D); S.sellar(admin, D); S.sellar(admin, D)
comprobar("Tres sellos, todos encadenados", S.comprobar(admin, D).sellos, 3)
admin.execute("alter table sello disable trigger sello_solo_anadir")
admin.execute("delete from sello where empresa_id = %s and numero = 2", (D,))
admin.execute("alter table sello enable trigger sello_solo_anadir")
veredicto = S.comprobar(admin, D)
comprobar("Quitando el del medio, la cadena de sellos se rompe",
          bool(veredicto), False)
comprobar("Y se dice cuál falta", "falta el sello 2" in veredicto.motivo, True)

# =================== y un sello reescrito por detrás tampoco cuela

# Lo de arriba comprueba que el libro cuadre con los sellos. Falta lo simétrico:
# que los sellos cuadren consigo mismos. Quien recorte el libro y tenga la base
# entera va a intentar lo obvio, que es bajar el número del sello para que
# encaje con lo que queda.
E, _, _, libro_e = empresa_con_fichajes("Retocada SL")
sello_e = S.sellar(admin, E)
comprobar("Empieza cuadrando", bool(S.comprobar(admin, E)), True)

recortar(E, 8)
admin.execute("alter table sello disable trigger sello_solo_anadir")
admin.execute("update sello set anotaciones = 7, hasta_numero = 7, hasta_huella = %s "
              "where empresa_id = %s and numero = 1",
              (libro_e.anotaciones()[-1].huella, E))
admin.execute("alter table sello enable trigger sello_solo_anadir")

veredicto = S.comprobar(admin, E)
comprobar("Cuadrar el sello a mano con el libro recortado no cuela",
          bool(veredicto), False)
comprobar("Porque la huella del sello ya no sale de su contenido",
          "se ha modificado" in veredicto.motivo, True)

# Y lo mismo con el ZIP en la mano, sin acceso a nada nuestro.
paquete_e = paquete_de_empresa(admin, E, "Retocada SL")
with tempfile.NamedTemporaryFile("wb", suffix=".zip", delete=False) as f:
    f.write(paquete_e)
    ruta = f.name
comprobar("Y el expediente con el sello retocado se rechaza igual",
          verificar(ruta).valido, False)
os.unlink(ruta)

# ============ una anotación reescrita en su sitio: la caza el sello también

# La cadena ya la caza; esto es el segundo cerrojo, y se prueba solo para que
# no se pueda quitar sin que salte nada.
F, _, _, libro_f = empresa_con_fichajes("Reescrita SL")
S.sellar(admin, F)
admin.execute("alter table anotacion disable trigger anotacion_solo_anadir")
admin.execute("update anotacion set huella = %s where empresa_id = %s and numero = 10",
              ("f" * 64, F))
admin.execute("alter table anotacion enable trigger anotacion_solo_anadir")
veredicto = S.comprobar(admin, F)
comprobar("Cambiar la huella de la anotación sellada se ve en el sello",
          bool(veredicto), False)
comprobar("Y se dice que se ha reescrito la historia",
          "reescrito la historia" in veredicto.motivo, True)

# ============ un sello rehecho entero, con su huella bien calculada

# Los casos de arriba los caza la huella del propio sello. Falta el atacante que
# no es tonto: el que rehace el sello ENTERO, con su huella recalculada, para
# que cuadre consigo mismo. Lo único que lo delata entonces es que ya no cuelga
# del anterior, y esa comprobación se podía borrar sin que saltara nada.
G, _, _, libro_g = empresa_con_fichajes("Rehecha SL")
S.sellar(admin, G)
sello_g2 = S.sellar(admin, G)
comprobar("Dos sellos encadenados", S.comprobar(admin, G).sellos, 2)

# Se rehace el segundo colgándolo de otra cosa, y con la huella bien calculada
# sobre ese contenido nuevo.
#
# Primero se intentó colgarlo de ceros, como si fuera el primer sello, y la
# BASE lo rechazó sola: `sello_sin_bifurcacion` impide que dos sellos cuelguen
# del mismo anterior, igual que en el libro. Así que ni con el disparador
# apagado se puede hacer la versión obvia de este ataque, y hay que inventarse
# un anterior que no exista.
INVENTADA = "a" * 64
falsificado = S.Sello(**{**sello_g2.__dict__, "huella_anterior": INVENTADA,
                         "huella": ""})
falsificado = S.Sello(**{**falsificado.__dict__,
                         "huella": falsificado.calcular_huella()})
comprobar("El sello falsificado cuadra consigo mismo",
          falsificado.huella, falsificado.calcular_huella())
admin.execute("alter table sello disable trigger sello_solo_anadir")
admin.execute("update sello set huella_anterior = %s, huella = %s "
              "where empresa_id = %s and numero = 2",
              (falsificado.huella_anterior, falsificado.huella, G))
admin.execute("alter table sello enable trigger sello_solo_anadir")

veredicto = S.comprobar(admin, G)
comprobar("Pero no cuelga del anterior, y eso lo delata", bool(veredicto), False)
comprobar("Y se dice exactamente eso",
          "no cuelga del anterior" in veredicto.motivo, True)

# ========== y cambiar la última anotación por otras dos tampoco cuela

# Aquí el libro tiene MÁS anotaciones que cuando se selló, así que contar no
# sirve. Lo que delata es que la anotación concreta que se selló ya no está.
H, centro_h, persona_h, libro_h = empresa_con_fichajes("Sustituida SL")
sello_h = S.sellar(admin, H)
comprobar("Se sella con diez", sello_h.anotaciones, 10)
for i in range(2):
    libro_h.fichar(persona_h, centro_id=centro_h, tipo=Tipo.ENTRADA,
                   momento=AHORA + timedelta(minutes=i), zona_horaria=MADRID,
                   anotado_en=AHORA + timedelta(minutes=i))
admin.execute("alter table anotacion disable trigger anotacion_solo_anadir")
admin.execute("delete from anotacion where empresa_id = %s and numero = 10", (H,))
admin.execute("alter table anotacion enable trigger anotacion_solo_anadir")

comprobar("Ahora hay más anotaciones que cuando se selló",
          len(libro_h.anotaciones()) > sello_h.anotaciones, True)
veredicto = S.comprobar(admin, H)
comprobar("Contar no basta, pero el sello lo caza igual", bool(veredicto), False)
comprobar("Porque la anotación que selló ya no está",
          "ya no está en el libro" in veredicto.motivo, True)

# ================================== y se recoge lo que se ha roto

# Esta suite corrompe libros a propósito: los recorta, les reescribe huellas y
# les falsifica sellos. Si los dejara ahí, el siguiente paso de la integración
# continua —la copia de seguridad, que verifica todos los libros de la base— los
# encontraría rotos y fallaría. Y fallaría con razón: los libros ESTÁN rotos.
#
# Una prueba que deja minas puestas para la siguiente no es una prueba, es una
# trampa. Se recoge. Y se recoge nombrando las empresas que se rompieron, no
# vaciando la base entera, para que las sanas sigan ahí y el paso siguiente
# tenga algo que copiar.
# Dos listas, porque son dos daños distintos: unas tienen el LIBRO recortado o
# reescrito, y otras lo tienen sano y lo que se les rompió a propósito fueron
# los SELLOS. De las primeras hay que borrarlo todo; de las segundas basta con
# los sellos, y así sus libros siguen sirviendo para el paso de la copia.
ROTAS = [A, B, E, F, H]
SELLOS_ROTOS = [D, G]
admin.execute("alter table anotacion disable trigger anotacion_solo_anadir")
admin.execute("alter table sello disable trigger sello_solo_anadir")
for empresa in ROTAS + SELLOS_ROTOS:
    admin.execute("delete from sello where empresa_id = %s", (empresa,))
for empresa in ROTAS:
    admin.execute("delete from anotacion where empresa_id = %s", (empresa,))
admin.execute("alter table sello enable trigger sello_solo_anadir")
admin.execute("alter table anotacion enable trigger anotacion_solo_anadir")

quedan = [f[0] for f in admin.execute(
    "select distinct empresa_id::text from anotacion").fetchall()]
comprobar("No queda ningún libro roto en la base", 
          [e for e in quedan if e in ROTAS], [])
comprobar("Y los sanos siguen ahí", sorted(quedan), sorted([C, D, G]))
for empresa in quedan:
    comprobar(f"El libro de {empresa[:8]}… verifica",
              bool(verificar_cadena(LibroPostgres(empresa, admin).anotaciones(),
                                    empresa)), True)
    comprobar("Y sus sellos cuadran", bool(S.comprobar(admin, empresa)), True)

admin.close()

if fallos:
    print(f"\n{len(fallos)} de {hechas} comprobaciones fallan:\n")
    for fallo in fallos:
        print(f"  · {fallo}\n")
    raise SystemExit(1)
print(f"Todas las comprobaciones pasan: {hechas} sobre los sellos y el recorte.")
