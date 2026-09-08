"""Pruebas del libro guardado en PostgreSQL. `python3 -m fichaje.pruebas_postgres`.

Necesitan una base de datos de verdad. Se toma de `FICHAJE_DSN`, o de
`postgresql://postgres@127.0.0.1:5433/fichaje` si no está puesta. Estas pruebas
**borran y recrean sus tablas**, así que no se apuntan nunca a datos reales.
"""

import os
import threading
import time
from datetime import timedelta

import psycopg

from . import caracterizacion as carac
from .caracterizacion import CENTRO_CANARIAS, CENTRO_MOTRIL, JOSE, LUCIA, MADRID, h
from .jornada import jornadas_de
from .organizacion import nuevo_id
from .postgres import (
    CAMPOS,
    LibroPostgres,
    _fila_a_anotacion,
    _insertar,
    conectar,
    crear_esquema,
)
from .registro import (
    AnotacionInvalida,
    Parte,
    Tipo,
    construir_anotacion,
    verificar_cadena,
)

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


def sembrar(conexion, empresa_id, centros, trabajadores) -> None:
    """Da de alta lo mínimo para que las claves ajenas dejen escribir."""
    conexion.execute("insert into empresa (id, nombre) values (%s, %s) "
                     "on conflict do nothing", (empresa_id, "Bar Casa Paco"))
    for centro_id, zona in centros:
        conexion.execute(
            "insert into centro (id, empresa_id, nombre, zona_horaria) "
            "values (%s, %s, %s, %s) on conflict do nothing",
            (centro_id, empresa_id, "Centro", zona))
    for trabajador_id in trabajadores:
        conexion.execute(
            "insert into trabajador (id, empresa_id, nombre) values (%s, %s, %s) "
            "on conflict do nothing", (trabajador_id, empresa_id, "Persona"))


conexion = conectar()
conexion.execute("drop table if exists anotacion, trabajador, centro, empresa cascade")
crear_esquema(conexion)
comprobar("El esquema se crea sin quejarse", True, True)

INSTANTE = h(1, 8, 0)


def empresa_nueva(cuantos: int = 3):
    """Una empresa recién dada de alta, con su centro y su gente."""
    empresa_id, centro_id = nuevo_id(), nuevo_id()
    gente = [nuevo_id() for _ in range(cuantos)]
    sembrar(conexion, empresa_id, [(centro_id, MADRID)], gente)
    return empresa_id, centro_id, gente


# ========================================= equivalencia memoria ↔ base de datos

memoria = carac.libro_canonico()
sembrar(conexion, carac.EMPRESA,
        [(CENTRO_MOTRIL, MADRID), (CENTRO_CANARIAS, carac.CANARIAS)],
        [LUCIA, JOSE, carac.PACO])
for a in memoria.anotaciones:
    _insertar(conexion.cursor(), a)

guardado = LibroPostgres(carac.EMPRESA, conexion)
leidas = guardado.anotaciones()
comprobar("Vuelven las mismas anotaciones", len(leidas), len(memoria.anotaciones))
comprobar("Con las mismas huellas, una a una",
          [a.huella for a in leidas], [a.huella for a in memoria.anotaciones])
comprobar("Y cada una recalcula su huella tras el viaje de ida y vuelta",
          [a.calcular_huella() for a in leidas], [a.huella for a in leidas])
comprobar("La huella final es la dorada", leidas[-1].huella, carac.HUELLA_FINAL)
comprobar("El libro guardado verifica", bool(guardado.verificar()), True)
comprobar("Las horas de Lucía salen iguales que en memoria",
          [j.horas for j in jornadas_de(leidas, LUCIA)],
          [j.horas for j in jornadas_de(memoria.anotaciones, LUCIA)])
comprobar("Y los días también, con sus husos",
          [str(j.dia) for j in jornadas_de(leidas, JOSE)], carac.DIAS_JOSE)
comprobar("Los retroactivos siguen marcados",
          [a.numero for a in leidas if a.retroactiva], carac.RETROACTIVAS)

# ================================================================== reinicio

conexion.close()
conexion = conectar()
tras_reinicio = LibroPostgres(carac.EMPRESA, conexion).anotaciones()
comprobar("Tras cerrar y reabrir, el libro sigue entero",
          [a.huella for a in tras_reinicio], [a.huella for a in leidas])
comprobar("Sigue verificando",
          bool(verificar_cadena(tras_reinicio, carac.EMPRESA)), True)
comprobar("Y con las mismas horas",
          [j.horas for j in jornadas_de(tras_reinicio, LUCIA)], carac.HORAS_LUCIA)

# ======================================= escribir por la vía normal del dominio

empresa, centro, gente = empresa_nueva()
libro = LibroPostgres(empresa, conexion)
sitio = dict(centro_id=centro, zona_horaria=MADRID)
libro.fichar(gente[0], tipo=Tipo.ENTRADA, momento=h(1, 9, 0), **sitio)
libro.fichar(gente[0], tipo=Tipo.PAUSA_INICIO, momento=h(1, 13, 30), **sitio)
libro.fichar(gente[0], tipo=Tipo.PAUSA_FIN, momento=h(1, 14, 30), **sitio)
libro.fichar(gente[0], tipo=Tipo.SALIDA, momento=h(1, 18, 0), **sitio)
comprobar("Cuatro fichajes escritos", len(libro.anotaciones()), 4)
comprobar("Ocho horas, igual que en memoria",
          jornadas_de(libro.anotaciones(), gente[0])[0].horas, 8.0)

libro.proponer_correccion(4, h(1, 19, 0), "Cerró la caja", gente[0],
                          Parte.TRABAJADOR, h(2, 9, 0))
libro.resolver_correccion(5, True, gente[1], Parte.EMPRESA, h(2, 10, 0))
comprobar("La corrección aceptada sube la jornada a nueve horas",
          jornadas_de(libro.anotaciones(), gente[0])[0].horas, 9.0)
falla("Y no se puede resolver dos veces", AnotacionInvalida,
      libro.resolver_correccion, 5, False, gente[1], Parte.EMPRESA, h(2, 11, 0))
libro.proponer_correccion(1, h(1, 10, 0), "Llegó más tarde", gente[0],
                          Parte.TRABAJADOR, h(3, 9, 0))
falla("Y quien propone no puede aceptarse a sí mismo, tampoco contra la base",
      AnotacionInvalida, libro.resolver_correccion, 7, True, gente[0],
      Parte.TRABAJADOR, h(3, 10, 0))
comprobar("El libro sigue verificando", bool(libro.verificar()), True)

# ================================================================ concurrencia

empresa_c, centro_c, gente_c = empresa_nueva(100)
errores: list[str] = []


def ficha(trabajador_id: str) -> None:
    try:
        propia = conectar()
        try:
            LibroPostgres(empresa_c, propia).fichar(
                trabajador_id, centro_id=centro_c, tipo=Tipo.ENTRADA,
                momento=INSTANTE, zona_horaria=MADRID, anotado_en=INSTANTE)
        finally:
            propia.close()
    except Exception as fallo:  # noqa: BLE001
        errores.append(repr(fallo))


hilos = [threading.Thread(target=ficha, args=(t,)) for t in gente_c]
arranque = time.perf_counter()
for hilo in hilos:
    hilo.start()
for hilo in hilos:
    hilo.join()
concurrencia = time.perf_counter() - arranque

escritas = LibroPostgres(empresa_c, conexion).anotaciones()
comprobar("Cien fichajes a la vez: ningún error", errores, [])
comprobar("Cien anotaciones escritas", len(escritas), 100)
comprobar("Con cien números consecutivos y sin huecos",
          [a.numero for a in escritas], list(range(1, 101)))
comprobar("Ninguna huella repetida", len({a.huella for a in escritas}), 100)
comprobar("Ninguna bifurcación: cada una cuelga de una anterior distinta",
          len({a.huella_anterior for a in escritas}), 100)
comprobar("Y la cadena verifica de punta a punta",
          bool(verificar_cadena(escritas, empresa_c)), True)

falla("La base de datos rechaza una bifurcación aunque se la pidan a mano",
      psycopg.errors.UniqueViolation,
      lambda: conexion.execute(
          "insert into anotacion (empresa_id, numero, version, centro_id, "
          "trabajador_id, tipo, momento, anotado_en, zona_horaria, autor_id, "
          "parte, huella_anterior, huella) values "
          "(%s,%s,%s,%s,%s,'entrada',%s,%s,%s,%s,'trabajador',%s,%s)",
          (empresa_c, 999, 2, centro_c, gente_c[0], INSTANTE, INSTANTE, MADRID,
           gente_c[0], escritas[0].huella_anterior, "f" * 64)))

falla("Y también un fichaje que dice registrar el futuro",
      psycopg.errors.CheckViolation,
      lambda: conexion.execute(
          "insert into anotacion (empresa_id, numero, version, centro_id, "
          "trabajador_id, tipo, momento, anotado_en, zona_horaria, autor_id, "
          "parte, huella_anterior, huella) values "
          "(%s,%s,%s,%s,%s,'entrada',%s,%s,%s,%s,'trabajador',%s,%s)",
          (empresa_c, 998, 2, centro_c, gente_c[0], INSTANTE + timedelta(days=1),
           INSTANTE, MADRID, gente_c[0], "c" * 64, "d" * 64)))

# ================================================================== atomicidad

antes = len(LibroPostgres(empresa_c, conexion).anotaciones())
try:
    with conexion.transaction():
        cur = conexion.cursor()
        cur.execute("select pg_advisory_xact_lock(hashtext(%s))", (empresa_c,))
        cur.execute(f"select {CAMPOS} from anotacion where empresa_id = %s "
                    f"order by numero desc limit 1", (empresa_c,))
        ultima = _fila_a_anotacion(cur.fetchone())
        _insertar(cur, construir_anotacion(
            ultima, empresa_c, centro_id=centro_c, trabajador_id=gente_c[0],
            tipo=Tipo.SALIDA, momento=INSTANTE, anotado_en=INSTANTE,
            zona_horaria=MADRID, autor_id=gente_c[0], parte=Parte.TRABAJADOR,
            origen="movil"))
        raise RuntimeError("caída simulada justo antes del commit")
except RuntimeError:
    pass
despues = LibroPostgres(empresa_c, conexion).anotaciones()
comprobar("Una caída antes del commit no deja media anotación", len(despues), antes)
comprobar("Y la cadena sigue válida",
          bool(verificar_cadena(despues, empresa_c)), True)

# ============================================================ solo se puede añadir

falla("Un UPDATE sobre una anotación se rechaza", psycopg.errors.RaiseException,
      lambda: conexion.execute(
          "update anotacion set momento = now() where empresa_id = %s and numero = 1",
          (empresa_c,)))
falla("Un DELETE, también", psycopg.errors.RaiseException,
      lambda: conexion.execute(
          "delete from anotacion where empresa_id = %s and numero = 1", (empresa_c,)))

conexion.execute("drop role if exists app_fichaje")
conexion.execute("create role app_fichaje login password 'prueba'")
conexion.execute("grant select, insert on anotacion, empresa, centro, trabajador "
                 "to app_fichaje")
conexion.execute("revoke update, delete on anotacion from app_fichaje")
como_app = psycopg.connect(
    os.environ.get("FICHAJE_DSN_APP",
                   "postgresql://app_fichaje:prueba@127.0.0.1:5433/fichaje"),
    autocommit=True)
falla("El rol de la aplicación ni siquiera tiene permiso para modificar el libro",
      psycopg.errors.InsufficientPrivilege,
      lambda: como_app.execute("update anotacion set motivo = 'x'"))
comprobar("Pero sí puede leer",
          como_app.execute("select count(*) from anotacion").fetchone()[0] > 0, True)
como_app.close()

# ================================================= red team: manipular la base

def libro_de_ataque():
    """Una empresa recién estrenada con seis anotaciones, para poder romperla.

    Trae un segundo centro sin usar: un ataque que escriba el valor que ya
    estaba no cambia nada, y daría un falso «no detectado».
    """
    emp, cen, gente = empresa_nueva(3)
    otro_centro = nuevo_id()
    sembrar(conexion, emp, [(otro_centro, MADRID)], [])
    libro = LibroPostgres(emp, conexion)
    for n in range(6):
        libro.fichar(gente[n % 3], centro_id=cen, tipo=Tipo.ENTRADA,
                     momento=INSTANTE, zona_horaria=MADRID, anotado_en=INSTANTE)
    return emp, otro_centro, gente


def detectado(sql: str, parametros) -> bool:
    """Toca el libro por detrás, como haría quien tiene la base entera, y dice
    si el verificador se da cuenta."""
    empresa_a, centro_a, gente_a = libro_de_ataque()
    conexion.execute("alter table anotacion disable trigger anotacion_solo_anadir")
    conexion.execute(sql, tuple(p(empresa_a, centro_a, gente_a) if callable(p) else p
                                for p in parametros))
    conexion.execute("alter table anotacion enable trigger anotacion_solo_anadir")
    return not verificar_cadena(
        LibroPostgres(empresa_a, conexion).anotaciones(), empresa_a).valido


emp = lambda e, c, g: e                  # noqa: E731
otro_centro = lambda e, c, g: c          # noqa: E731
otro_trabajador = lambda e, c, g: g[0]   # la anotación 3 es de g[2]  # noqa: E731

ataques = [
    ("cambiar el trabajador",
     "update anotacion set trabajador_id = %s where empresa_id = %s and numero = 3",
     (otro_trabajador, emp)),
    ("cambiar la hora",
     "update anotacion set momento = momento - interval '1 hour' "
     "where empresa_id = %s and numero = 3", (emp,)),
    ("cambiar el tipo",
     "update anotacion set tipo = 'salida' where empresa_id = %s and numero = 3",
     (emp,)),
    ("cambiar el centro",
     "update anotacion set centro_id = %s where empresa_id = %s and numero = 3",
     (otro_centro, emp)),
    ("cambiar la zona horaria",
     "update anotacion set zona_horaria = 'Atlantic/Canary' "
     "where empresa_id = %s and numero = 3", (emp,)),
    ("cambiar la versión",
     "update anotacion set version = 3 where empresa_id = %s and numero = 3", (emp,)),
    ("cambiar la huella anterior",
     "update anotacion set huella_anterior = %s where empresa_id = %s and numero = 3",
     ("a" * 64, emp)),
    ("cambiar la huella propia",
     "update anotacion set huella = %s where empresa_id = %s and numero = 3",
     ("b" * 64, emp)),
    ("borrar una anotación del medio",
     "delete from anotacion where empresa_id = %s and numero = 3", (emp,)),
]
for nombre, sql, parametros in ataques:
    comprobar(f"El verificador detecta {nombre}", detectado(sql, parametros), True)

# Lo que NO se detecta, escrito aquí para que nadie lo descubra el día malo.
#
# Cortar el libro por el final. Si alguien con acceso total borra las últimas
# anotaciones, lo que queda es una cadena impecable, solo que más corta: cada
# eslabón sigue enganchando con el anterior y no hay nada dentro del libro que
# diga cuántos eslabones debería haber. Es el punto ciego de cualquier cadena de
# huellas, y solo se cierra desde fuera —guardando periódicamente la última
# huella y el número de anotaciones en otro sitio—. Está anotado como
# endurecimiento futuro, no se implementa hoy.
for cuantas_quedan in (4, 1):
    empresa_r, _, _ = libro_de_ataque()
    conexion.execute("alter table anotacion disable trigger anotacion_solo_anadir")
    conexion.execute("delete from anotacion where empresa_id = %s and numero > %s",
                     (empresa_r, cuantas_quedan))
    conexion.execute("alter table anotacion enable trigger anotacion_solo_anadir")
    quedan = LibroPostgres(empresa_r, conexion).anotaciones()
    comprobar(f"Cortar el libro dejando {cuantas_quedan} NO se detecta desde dentro",
              verificar_cadena(quedan, empresa_r).valido, True)
    comprobar(f"Aunque sí se ve que solo quedan {cuantas_quedan}",
              len(quedan), cuantas_quedan)

# =================================================================== rendimiento

empresa_p, centro_p, gente_p = empresa_nueva(20)
libro_p = LibroPostgres(empresa_p, conexion)
base = h(1, 8, 0)
arranque = time.perf_counter()
for dia in range(25):
    for tipo, desfase in ((Tipo.ENTRADA, 0), (Tipo.SALIDA, 8)):
        for t in gente_p:
            libro_p.fichar(t, centro_id=centro_p, tipo=tipo,
                           momento=base + timedelta(days=dia, hours=desfase),
                           zona_horaria=MADRID)
escritura = time.perf_counter() - arranque

arranque = time.perf_counter()
todas = libro_p.anotaciones()
lectura = time.perf_counter() - arranque

arranque = time.perf_counter()
valido = bool(verificar_cadena(todas, empresa_p))
verificacion = time.perf_counter() - arranque

arranque = time.perf_counter()
nomina = jornadas_de(todas, gente_p[0])
calculo = time.perf_counter() - arranque

comprobar("Mil anotaciones escritas", len(todas), 1000)
comprobar("La cadena verifica", valido, True)
comprobar("Y salen las jornadas de una persona", len(nomina), 25)

print()
print("  Rendimiento sobre 1.000 anotaciones")
print(f"    escritura     {escritura:6.2f} s   ({escritura:.3f} s / 1000 = "
      f"{escritura:.1f} ms por fichaje)")
print(f"    lectura       {lectura:6.3f} s")
print(f"    verificación  {verificacion:6.3f} s")
print(f"    nómina        {calculo:6.3f} s")
print(f"    100 fichajes concurrentes: {concurrencia:.2f} s")
print()

conexion.close()

if fallos:
    print(f"\n{len(fallos)} de {hechas} comprobaciones fallan:\n")
    for fallo in fallos:
        print(f"  · {fallo}\n")
    raise SystemExit(1)
print(f"Todas las comprobaciones pasan: {hechas} contra PostgreSQL.")
