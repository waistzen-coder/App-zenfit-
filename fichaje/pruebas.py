"""Pruebas del registro de jornada. `python3 -m fichaje.pruebas`.

Cada una es una escena que puede acabar delante de un inspector o de un juez.
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from . import caracterizacion as carac
from .caracterizacion import (
    CANARIAS,
    CENTRO_MOTRIL,
    EMPRESA,
    JOSE,
    LUCIA,
    MADRID,
    PACO,
    h,
)
from .jornada import horas_del_mes, jornadas_de, jornadas_por_trabajador
from .organizacion import Centro, Empresa, Trabajador, ZonaInvalida, nuevo_id
from .registro import (
    VERSION_ACTUAL,
    AnotacionInvalida,
    Libro,
    Parte,
    RegistroCorrupto,
    Tipo,
    verificar_cadena,
)

fallos: list[str] = []
hechas = 0          # comprobaciones realmente ejecutadas


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


MOTRIL = dict(centro_id=CENTRO_MOTRIL, zona_horaria=MADRID)


def libro_de_un_dia() -> Libro:
    libro = Libro(EMPRESA)
    libro.fichar(LUCIA, tipo=Tipo.ENTRADA, momento=h(1, 9, 0), **MOTRIL)
    libro.fichar(LUCIA, tipo=Tipo.PAUSA_INICIO, momento=h(1, 13, 30), **MOTRIL)
    libro.fichar(LUCIA, tipo=Tipo.PAUSA_FIN, momento=h(1, 14, 30), **MOTRIL)
    libro.fichar(LUCIA, tipo=Tipo.SALIDA, momento=h(1, 18, 0), **MOTRIL)
    return libro


# ------------------------------------------------------------- identidades

empresa = Empresa("Bar Casa Paco")
centro = Centro(empresa.id, "Local de la playa")
comprobar("Una empresa nace con identificador propio", len(empresa.id), 36)
comprobar("Dos identificadores nunca coinciden", nuevo_id() != nuevo_id(), True)
comprobar("El centro trae zona por defecto", centro.zona_horaria, MADRID)
falla("Un desfase fijo no es una zona horaria", ZonaInvalida,
      Centro, empresa.id, "X", "UTC+1")
falla("Ni una zona inventada", ZonaInvalida, Centro, empresa.id, "X", "Europe/Motril")
comprobar("Canarias sí existe", Centro(empresa.id, "X", CANARIAS).zona_horaria, CANARIAS)
comprobar("Un trabajador nace activo", Trabajador(empresa.id, "Lucía").activo, True)

# ------------------------------------------------------------------ las horas

libro = libro_de_un_dia()
jornada = jornadas_de(libro.anotaciones, LUCIA)[0]
comprobar("De 9 a 18 con una hora de pausa son ocho horas", jornada.horas, 8.0)
comprobar("La jornada es del día en que se entró", str(jornada.dia), "2026-09-01")
comprobar("Y está cerrada", jornada.abierta, False)
comprobar("Sin correcciones", jornada.corregida, False)

libro = Libro(EMPRESA)
libro.fichar(LUCIA, tipo=Tipo.ENTRADA, momento=h(1, 22, 0), **MOTRIL)
libro.fichar(LUCIA, tipo=Tipo.SALIDA, momento=h(2, 6, 0), **MOTRIL)
j = jornadas_de(libro.anotaciones, LUCIA)[0]
comprobar("Un turno de noche cuenta ocho horas", j.horas, 8.0)
comprobar("Y pertenece al día en que se entró, en hora local del centro",
          str(j.dia), "2026-09-01")

libro = Libro(EMPRESA)
libro.fichar(JOSE, tipo=Tipo.ENTRADA, momento=h(1, 8, 0), **MOTRIL)
j = jornadas_de(libro.anotaciones, JOSE)[0]
comprobar("Una jornada sin cerrar se marca", j.incidencias, ["jornada sin cerrar"])
comprobar("Y no inventa horas", j.horas, 0.0)

# ----------------------------------------------- corregir exige a las dos partes

libro = libro_de_un_dia()
propuesta = libro.proponer_correccion(4, h(1, 19, 0),
                                      "Se quedó cerrando y fichó la salida tarde",
                                      LUCIA, Parte.TRABAJADOR, h(2, 9, 0))
comprobar("Proponer no cambia las horas todavía",
          jornadas_de(libro.anotaciones, LUCIA)[0].horas, 8.0)
comprobar("La propuesta queda escrita", propuesta.tipo, Tipo.CORRECCION_PROPUESTA)
comprobar("Con su motivo", "Se quedó cerrando" in propuesta.motivo, True)

falla("Quien propone no puede aceptarse a sí mismo", AnotacionInvalida,
      libro.resolver_correccion, numero=5, acepta=True, autor_id=LUCIA,
      parte=Parte.TRABAJADOR, anotado_en=h(2, 9, 30))

libro.resolver_correccion(5, True, PACO, Parte.EMPRESA, h(2, 10, 0))
jornada = jornadas_de(libro.anotaciones, LUCIA)[0]
comprobar("Aceptada por la empresa, ya son nueve horas", jornada.horas, 9.0)
comprobar("Y la jornada queda marcada como corregida", jornada.corregida, True)

falla("Una propuesta no se resuelve dos veces", AnotacionInvalida,
      libro.resolver_correccion, numero=5, acepta=False, autor_id=PACO,
      parte=Parte.EMPRESA, anotado_en=h(2, 11, 0))

libro = libro_de_un_dia()
libro.proponer_correccion(4, h(1, 17, 0), "Se fue antes", PACO,
                          Parte.EMPRESA, h(2, 9, 0))
libro.resolver_correccion(5, False, LUCIA, Parte.TRABAJADOR, h(2, 9, 5))
comprobar("Una corrección rechazada no toca la nómina",
          jornadas_de(libro.anotaciones, LUCIA)[0].horas, 8.0)

libro = libro_de_un_dia()
libro.proponer_correccion(4, h(1, 17, 0), "Se fue antes", PACO,
                          Parte.EMPRESA, h(2, 9, 0))
comprobar("Una propuesta sin contestar tampoco",
          jornadas_de(libro.anotaciones, LUCIA)[0].horas, 8.0)

falla("No se corrige sin decir por qué", AnotacionInvalida,
      libro.proponer_correccion, numero=4, momento_propuesto=h(1, 17, 0),
      motivo="   ", autor_id=PACO, parte=Parte.EMPRESA, anotado_en=h(2, 9, 0))
falla("Ni se corrige una corrección", AnotacionInvalida,
      libro.proponer_correccion, numero=5, momento_propuesto=h(1, 17, 0),
      motivo="lo que sea", autor_id=PACO, parte=Parte.EMPRESA, anotado_en=h(2, 9, 0))

libro = libro_de_un_dia()
libro.proponer_correccion(4, h(1, 19, 0), "Cerró la caja", LUCIA,
                          Parte.TRABAJADOR, h(2, 9, 0))
libro.resolver_correccion(5, True, PACO, Parte.EMPRESA, h(2, 10, 0))
libro.proponer_correccion(4, h(1, 20, 0), "Revisado con el turno de noche", PACO,
                          Parte.EMPRESA, h(3, 9, 0))
libro.resolver_correccion(7, True, LUCIA, Parte.TRABAJADOR, h(3, 10, 0))
comprobar("Manda la última corrección acordada", libro.momento_vigente(4), h(1, 20, 0))
comprobar("Que son diez horas, no nueve",
          jornadas_de(libro.anotaciones, LUCIA)[0].horas, 10.0)
comprobar("Y el historial entero sigue en el libro", len(libro.anotaciones), 8)
libro.verificar()

# ------------------------------------------------------- la cadena de huellas

libro = libro_de_un_dia()
comprobar("El libro verifica", bool(libro.verificar()), True)
comprobar("Y dice cuántas ha comprobado", libro.verificar().comprobadas, 4)
comprobar("La primera anotación cuelga del origen",
          libro.anotacion(1).huella_anterior, "0" * 64)
comprobar("Y cada una de la anterior",
          libro.anotacion(2).huella_anterior, libro.anotacion(1).huella)

libro = libro_de_un_dia()
tocada = libro.anotaciones[3]
libro.anotaciones[3] = type(tocada)(**{**tocada.__dict__, "momento": h(1, 20, 0)})
veredicto = verificar_cadena(libro.anotaciones, EMPRESA)
comprobar("Cambiar una hora por detrás rompe la cadena", veredicto.valido, False)
comprobar("Y señala la anotación tocada", veredicto.primera_fallida, 4)
comprobar("Diciendo qué le pasa", "modificado" in veredicto.motivo, True)
falla("Y el libro lo lanza como error", RegistroCorrupto, libro.verificar)

libro = libro_de_un_dia()
del libro.anotaciones[1]
falla("Quitar una anotación del medio rompe el libro", RegistroCorrupto, libro.verificar)

libro = libro_de_un_dia()
libro.anotaciones[1], libro.anotaciones[2] = libro.anotaciones[2], libro.anotaciones[1]
falla("Reordenarlas, también", RegistroCorrupto, libro.verificar)

ajeno = libro_de_un_dia()
comprobar("Trasplantar el libro de otra empresa no cuela",
          verificar_cadena(ajeno.anotaciones, nuevo_id()).valido, False)

uno, otro = Libro(EMPRESA), Libro(nuevo_id())
uno.fichar(LUCIA, tipo=Tipo.ENTRADA, momento=h(1, 9, 0), **MOTRIL)
otro.fichar(LUCIA, tipo=Tipo.ENTRADA, momento=h(1, 9, 0), **MOTRIL)
comprobar("Un mismo fichaje en dos empresas tiene huellas distintas",
          uno.anotacion(1).huella != otro.anotacion(1).huella, True)

# ------------------------------------------------ serialización canónica y versión

a = libro_de_un_dia().anotacion(1)
comprobar("Toda anotación nace con la versión actual", a.version, VERSION_ACTUAL)
comprobar("La versión va la primera en lo que se firma",
          a.cuerpo_canonico().startswith(b"[2,"), True)
comprobar("El cuerpo canónico no lleva espacios", b", " in a.cuerpo_canonico(), False)
comprobar("Y conserva los acentos sin escapar",
          b"\\u" in a.cuerpo_canonico(), False)
comprobar("Los instantes se firman en UTC",
          b'"2026-09-01T07:00:00+00:00"' in a.cuerpo_canonico(), True)
comprobar("La huella es estable entre llamadas", a.calcular_huella(), a.huella)
comprobar("Y el cuerpo canónico también",
          a.cuerpo_canonico(), a.cuerpo_canonico())

libro = Libro(EMPRESA)
libro.fichar(LUCIA, tipo=Tipo.ENTRADA, momento=h(1, 9, 0), **MOTRIL)
mismo_instante = datetime(2026, 9, 1, 7, 0, tzinfo=ZoneInfo("UTC"))
otro_libro = Libro(EMPRESA)
otro_libro.fichar(LUCIA, tipo=Tipo.ENTRADA, momento=mismo_instante, **MOTRIL)
comprobar("Las 9:00 de Madrid y las 7:00 UTC son el mismo instante y la misma huella",
          libro.anotacion(1).huella, otro_libro.anotacion(1).huella)

falla("Una fecha sin zona horaria no entra en el libro", AnotacionInvalida,
      libro.fichar, LUCIA, tipo=Tipo.ENTRADA, momento=datetime(2026, 9, 2, 9, 0),
      **MOTRIL)

# ------------------------------- la hora no se fabrica a posteriori sin que se vea

libro = Libro(EMPRESA)
libro.fichar(LUCIA, tipo=Tipo.ENTRADA, momento=h(1, 9, 0),
             anotado_en=h(8, 12, 0), **MOTRIL)
libro.fichar(LUCIA, tipo=Tipo.SALIDA, momento=h(1, 17, 0),
             anotado_en=h(8, 12, 0), **MOTRIL)
comprobar("Un fichaje escrito una semana tarde queda marcado como retroactivo",
          [a.numero for a in libro.retroactivas()], [1, 2])
comprobar("Y la jornada lo arrastra hasta la nómina",
          jornadas_de(libro.anotaciones, LUCIA)[0].retroactiva, True)
libro.verificar()
comprobar("Un fichaje normal no se marca como retroactivo",
          libro_de_un_dia().retroactivas(), [])

falla("No se ficha en el futuro", AnotacionInvalida,
      Libro(EMPRESA).fichar, LUCIA, tipo=Tipo.ENTRADA, momento=h(30, 9, 0),
      anotado_en=h(1, 12, 0), **MOTRIL)

libro = Libro(EMPRESA)
libro.fichar(LUCIA, tipo=Tipo.ENTRADA, momento=h(2, 9, 0), **MOTRIL)
libro.fichar(LUCIA, tipo=Tipo.SALIDA, momento=h(1, 17, 0), **MOTRIL)
comprobar("El libro no retrocede: una escritura con hora anterior se ajusta a "
          "la de la anotación previa",
          libro.anotacion(2).anotado_en, libro.anotacion(1).anotado_en)
comprobar("Pero la hora del fichaje no se toca",
          libro.anotacion(2).momento, h(1, 17, 0))
comprobar("Y el libro sigue verificando", bool(libro.verificar()), True)

libro = Libro(EMPRESA)
libro.fichar(LUCIA, tipo=Tipo.ENTRADA, momento=h(1, 9, 0), anotado_en=None, **MOTRIL)
comprobar("Sin hora de escritura, la pone el libro con el reloj del servidor",
          libro.anotacion(1).anotado_en.year, datetime.now(ZoneInfo("UTC")).year)

# --------------------------------- el cálculo no se calla ante un fichaje descolgado

libro = Libro(EMPRESA)
libro.fichar(LUCIA, tipo=Tipo.ENTRADA, momento=h(1, 9, 0), **MOTRIL)
libro.fichar(LUCIA, tipo=Tipo.PAUSA_FIN, momento=h(1, 11, 0), **MOTRIL)
libro.fichar(LUCIA, tipo=Tipo.SALIDA, momento=h(1, 17, 0), **MOTRIL)
j = jornadas_de(libro.anotaciones, LUCIA)[0]
comprobar("Volver de una pausa que no empezó se registra",
          j.incidencias, ["volvió de una pausa que no había empezado"])
comprobar("Y no se descuenta tiempo inventado", j.horas, 8.0)

libro = Libro(EMPRESA)
libro.fichar(LUCIA, tipo=Tipo.ENTRADA, momento=h(1, 9, 0), **MOTRIL)
libro.fichar(LUCIA, tipo=Tipo.PAUSA_INICIO, momento=h(1, 11, 0), **MOTRIL)
libro.fichar(LUCIA, tipo=Tipo.PAUSA_INICIO, momento=h(1, 12, 0), **MOTRIL)
libro.fichar(LUCIA, tipo=Tipo.PAUSA_FIN, momento=h(1, 13, 0), **MOTRIL)
libro.fichar(LUCIA, tipo=Tipo.SALIDA, momento=h(1, 17, 0), **MOTRIL)
comprobar("Dos pausas abiertas seguidas también",
          jornadas_de(libro.anotaciones, LUCIA)[0].incidencias,
          ["empezó una pausa sin cerrar la anterior"])

# ------------------------------------------------------------------------ el mes

libro = Libro(EMPRESA)
for dia in range(1, 6):
    libro.fichar(LUCIA, tipo=Tipo.ENTRADA, momento=h(dia, 9, 0), **MOTRIL)
    libro.fichar(LUCIA, tipo=Tipo.SALIDA, momento=h(dia, 17, 0), **MOTRIL)
comprobar("Cinco días de ocho horas son cuarenta",
          horas_del_mes(libro.anotaciones, LUCIA, 2026, 9), 40.0)
comprobar("Y en un mes en el que no trabajó, cero",
          horas_del_mes(libro.anotaciones, LUCIA, 2026, 8), 0.0)
libro.verificar()

# ---------------------------------------------- el cálculo aguanta un libro real

import time

libro = Libro(EMPRESA)
inicio = datetime(2026, 1, 1, 9, 0, tzinfo=ZoneInfo(MADRID))
trabajadores = [nuevo_id() for _ in range(10)]
for dia in range(500):
    base = inicio + timedelta(days=dia)
    for tipo, desfase in ((Tipo.ENTRADA, 0), (Tipo.PAUSA_INICIO, 4),
                          (Tipo.PAUSA_FIN, 5), (Tipo.SALIDA, 9)):
        for t in trabajadores:
            libro.fichar(t, tipo=tipo, momento=base + timedelta(hours=desfase), **MOTRIL)
arranque = time.perf_counter()
jornadas = jornadas_de(libro.anotaciones, trabajadores[0])
tardanza = time.perf_counter() - arranque
comprobar("20.000 anotaciones: salen las 500 jornadas de una persona",
          len(jornadas), 500)
comprobar(f"Y en menos de un segundo (ha tardado {tardanza:.2f} s)",
          tardanza < 1.0, True)

# ------------------------------- y pedirlas de todos a la vez da lo mismo

# `jornadas_por_trabajador` existe por rendimiento, no por gusto, y un cambio
# hecho por rendimiento que además cambia los resultados es un desastre con
# buena prensa. Así que se comprueba lo único que importa: que dé exactamente lo
# mismo, campo por campo, para las diez personas del libro de veinte mil.
arranque = time.perf_counter()
una_a_una = {t: jornadas_de(libro.anotaciones, t) for t in trabajadores}
en_bucle = time.perf_counter() - arranque

arranque = time.perf_counter()
de_golpe = jornadas_por_trabajador(libro.anotaciones)
de_una_pasada = time.perf_counter() - arranque

comprobar("Salen las mismas personas", set(de_golpe), set(una_a_una))
iguales = all(
    [(j.dia, j.entrada, j.salida, j.pausas, j.horas, j.corregida,
      j.retroactiva, j.incidencias) for j in de_golpe[t]] ==
    [(j.dia, j.entrada, j.salida, j.pausas, j.horas, j.corregida,
      j.retroactiva, j.incidencias) for j in una_a_una[t]]
    for t in trabajadores)
comprobar("Y las jornadas son idénticas campo por campo", iguales, True)

# Y que de verdad sea más rápido, no solo distinto. Se compara con el método
# viejo en la misma máquina y en el mismo momento, que es la única comparación
# que no depende de lo rápido que sea el ordenador donde corra esto.
comprobar(f"Una sola pasada es más rápida que diez ({de_una_pasada:.2f} s "
          f"frente a {en_bucle:.2f} s)", de_una_pasada < en_bucle, True)

# Lo que de verdad se arregló: las correcciones se resolvían una vez POR
# PERSONA. Contarlas es determinista; cronometrar, no.
from . import jornada as _jornada  # noqa: E402

_veces = 0
_original = _jornada.correcciones_vigentes


def _contando(anotaciones):
    global _veces
    _veces += 1
    return _original(anotaciones)


_jornada.correcciones_vigentes = _contando
_veces = 0
jornadas_por_trabajador(libro.anotaciones)
de_golpe_veces = _veces
_veces = 0
for t in trabajadores:
    jornadas_de(libro.anotaciones, t)
en_bucle_veces = _veces
_jornada.correcciones_vigentes = _original

comprobar("De una pasada, las correcciones se resuelven UNA vez",
          de_golpe_veces, 1)
comprobar("En bucle se resolvían una vez por persona", en_bucle_veces,
          len(trabajadores))

# ======================================= caracterización: la vara de medir

canonico = carac.libro_canonico()
comprobar("El libro canónico verifica", bool(canonico.verificar()), True)
comprobar("Tiene las anotaciones esperadas", len(canonico.anotaciones), carac.ANOTACIONES)
comprobar("Todas en la versión fijada",
          {a.version for a in canonico.anotaciones}, {carac.VERSION})
comprobar("Y su huella final es exactamente la fijada",
          canonico.anotaciones[-1].huella, carac.HUELLA_FINAL)
comprobar("Las horas de Lucía", [j.horas for j in jornadas_de(canonico.anotaciones, LUCIA)],
          carac.HORAS_LUCIA)
comprobar("Sus días, en hora local",
          [str(j.dia) for j in jornadas_de(canonico.anotaciones, LUCIA)],
          carac.DIAS_LUCIA)
comprobar("Las horas de Jose", [j.horas for j in jornadas_de(canonico.anotaciones, JOSE)],
          carac.HORAS_JOSE)
comprobar("Sus días, incluido el turno de Canarias",
          [str(j.dia) for j in jornadas_de(canonico.anotaciones, JOSE)],
          carac.DIAS_JOSE)
comprobar("Los fichajes retroactivos son los que son",
          [a.numero for a in canonico.retroactivas()], carac.RETROACTIVAS)
comprobar("Y las incidencias de Jose",
          [j.incidencias for j in jornadas_de(canonico.anotaciones, JOSE)],
          carac.INCIDENCIAS_JOSE)
# El canónico lleva correcciones aceptadas y fichajes retroactivos, que es donde
# un reparto por persona mal hecho se notaría.
_todas = jornadas_por_trabajador(canonico.anotaciones)
comprobar("En el libro canónico, las horas de Lucía también salen de una pasada",
          [j.horas for j in _todas[LUCIA]], carac.HORAS_LUCIA)
comprobar("Y las de Jose", [j.horas for j in _todas[JOSE]], carac.HORAS_JOSE)
comprobar("Con sus mismas incidencias",
          [j.incidencias for j in _todas[JOSE]], carac.INCIDENCIAS_JOSE)

comprobar("Construirlo dos veces da exactamente el mismo libro",
          [a.huella for a in carac.libro_canonico().anotaciones],
          [a.huella for a in canonico.anotaciones])


# ------------------------- lo escrito con la palabra vieja se sigue leyendo

from dataclasses import replace as _replace  # noqa: E402

libro = libro_de_un_dia()
libro.proponer_correccion(4, h(1, 17, 0), "Se fue antes", PACO,
                          Parte.EMPRESA, h(2, 9, 0))
libro.resolver_correccion(5, False, LUCIA, Parte.TRABAJADOR, h(2, 9, 5))
comprobar("Un desacuerdo se escribe como discrepancia, no como rechazo",
          libro.anotacion(6).tipo, Tipo.CORRECCION_DISCREPANCIA)
comprobar("Y no toca la hora del fichaje",
          jornadas_de(libro.anotaciones, LUCIA)[0].horas, 8.0)
comprobar("La propuesta, su motivo y quién la hizo siguen en el libro",
          (libro.anotacion(5).motivo, libro.anotacion(5).parte),
          ("Se fue antes", Parte.EMPRESA))
comprobar("Y quién no estuvo de acuerdo, también",
          libro.anotacion(6).parte, Parte.TRABAJADOR)

# Una anotación con la palabra antigua, como las que pudiera haber escrito la
# versión anterior: se recalcula su huella con su propia palabra y verifica.
antigua = libro.anotacion(6)
vieja = _replace(antigua, tipo=Tipo.CORRECCION_RECHAZADA, huella="")
vieja = _replace(vieja, huella=vieja.calcular_huella())
libro.anotaciones[5] = vieja
comprobar("Una anotación escrita con «rechazada» sigue verificando",
          bool(libro.verificar()), True)
comprobar("Y sigue cerrando la propuesta",
          libro._resolucion_de(5) is not None, True)


if fallos:
    print(f"\n{len(fallos)} de {hechas} comprobaciones fallan:\n")
    for fallo in fallos:
        print(f"  · {fallo}\n")
    raise SystemExit(1)
print(f"Todas las comprobaciones pasan: {hechas} sobre el registro de jornada.")
