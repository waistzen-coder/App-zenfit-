"""Pruebas del registro de jornada. `python3 -m fichaje.pruebas`.

Cada una es una escena que puede acabar delante de un inspector o de un juez.
"""

from datetime import date, datetime, timedelta

from .jornada import horas_del_mes, jornadas_de
from .registro import (
    AnotacionInvalida,
    Libro,
    Parte,
    RegistroCorrupto,
    Tipo,
)

fallos: list[str] = []


def comprobar(descripcion: str, obtenido, esperado):
    if obtenido != esperado:
        fallos.append(f"{descripcion}\n    esperado: {esperado!r}\n    obtenido: {obtenido!r}")


def falla(descripcion: str, excepcion, funcion, *args, **kwargs):
    try:
        funcion(*args, **kwargs)
    except excepcion:
        return
    except Exception as otra:  # noqa: BLE001
        fallos.append(f"{descripcion}: esperaba {excepcion.__name__}, llegó {otra!r}")
        return
    fallos.append(f"{descripcion}: no falló, y tenía que fallar")


def h(dia: int, hora: int, minuto: int = 0) -> datetime:
    return datetime(2026, 9, dia, hora, minuto)


def libro_de_un_dia() -> Libro:
    libro = Libro("Bar Casa Paco")
    libro.fichar("Lucía", Tipo.ENTRADA, h(1, 9, 0))
    libro.fichar("Lucía", Tipo.PAUSA_INICIO, h(1, 13, 30))
    libro.fichar("Lucía", Tipo.PAUSA_FIN, h(1, 14, 30))
    libro.fichar("Lucía", Tipo.SALIDA, h(1, 18, 0))
    return libro


# ------------------------------------------------------------- las horas

libro = libro_de_un_dia()
jornada = jornadas_de(libro, "Lucía")[0]
comprobar("De 9 a 18 con una hora de pausa son ocho horas", jornada.horas, 8.0)
comprobar("La jornada es del día en que se entró", jornada.dia, date(2026, 9, 1))
comprobar("Y está cerrada", jornada.abierta, False)
comprobar("Sin correcciones", jornada.corregida, False)

libro = Libro("Panadería")
libro.fichar("Ana", Tipo.ENTRADA, h(1, 22, 0))
libro.fichar("Ana", Tipo.SALIDA, h(2, 6, 0))
j = jornadas_de(libro, "Ana")[0]
comprobar("Un turno de noche cuenta ocho horas", j.horas, 8.0)
comprobar("Y pertenece al día en que se entró", j.dia, date(2026, 9, 1))

libro = Libro("Taller")
libro.fichar("Jose", Tipo.ENTRADA, h(1, 8, 0))
j = jornadas_de(libro, "Jose")[0]
comprobar("Una jornada sin cerrar se marca", j.incidencias, ["jornada sin cerrar"])
comprobar("Y no inventa horas", j.horas, 0.0)

# --------------------------------------------- corregir exige a las dos partes

libro = libro_de_un_dia()
propuesta = libro.proponer_correccion(
    numero=4, momento_propuesto=h(1, 19, 0),
    motivo="Se quedó cerrando y fichó la salida al día siguiente",
    autor="Lucía", parte=Parte.TRABAJADOR, anotado_en=h(2, 9, 0),
)
comprobar("Proponer no cambia las horas todavía",
          jornadas_de(libro, "Lucía")[0].horas, 8.0)
comprobar("La propuesta queda escrita en el libro", propuesta.tipo, Tipo.CORRECCION_PROPUESTA)
comprobar("Con su motivo", "Se quedó cerrando" in propuesta.motivo, True)

falla("Quien propone no puede aceptarse a sí mismo", AnotacionInvalida,
      libro.resolver_correccion, numero=5, acepta=True, autor="Lucía",
      parte=Parte.TRABAJADOR, anotado_en=h(2, 9, 30))

libro.resolver_correccion(numero=5, acepta=True, autor="Paco",
                          parte=Parte.EMPRESA, anotado_en=h(2, 10, 0))
jornada = jornadas_de(libro, "Lucía")[0]
comprobar("Aceptada por la empresa, ya son nueve horas", jornada.horas, 9.0)
comprobar("Y la jornada queda marcada como corregida", jornada.corregida, True)

falla("Una propuesta no se resuelve dos veces", AnotacionInvalida,
      libro.resolver_correccion, numero=5, acepta=False, autor="Paco",
      parte=Parte.EMPRESA, anotado_en=h(2, 11, 0))

libro = libro_de_un_dia()
libro.proponer_correccion(numero=4, momento_propuesto=h(1, 17, 0),
                          motivo="Se fue antes", autor="Paco",
                          parte=Parte.EMPRESA, anotado_en=h(2, 9, 0))
libro.resolver_correccion(numero=5, acepta=False, autor="Lucía",
                          parte=Parte.TRABAJADOR, anotado_en=h(2, 9, 5))
comprobar("Una corrección rechazada no toca la nómina",
          jornadas_de(libro, "Lucía")[0].horas, 8.0)

libro = libro_de_un_dia()
libro.proponer_correccion(numero=4, momento_propuesto=h(1, 17, 0),
                          motivo="Se fue antes", autor="Paco",
                          parte=Parte.EMPRESA, anotado_en=h(2, 9, 0))
comprobar("Una propuesta sin contestar tampoco",
          jornadas_de(libro, "Lucía")[0].horas, 8.0)

falla("No se corrige sin decir por qué", AnotacionInvalida,
      libro.proponer_correccion, numero=4, momento_propuesto=h(1, 17, 0),
      motivo="   ", autor="Paco", parte=Parte.EMPRESA, anotado_en=h(2, 9, 0))

falla("Ni se corrige una corrección", AnotacionInvalida,
      libro.proponer_correccion, numero=5, momento_propuesto=h(1, 17, 0),
      motivo="lo que sea", autor="Paco", parte=Parte.EMPRESA, anotado_en=h(2, 9, 0))

# ------------------------------------------------------ la cadena de huellas

libro = libro_de_un_dia()
libro.verificar()
comprobar("La primera anotación cuelga del origen",
          libro.anotacion(1).huella_anterior, "0" * 64)
comprobar("Y cada una de la anterior",
          libro.anotacion(2).huella_anterior, libro.anotacion(1).huella)

libro = libro_de_un_dia()
tocada = libro.anotaciones[3]
libro.anotaciones[3] = type(tocada)(**{**tocada.__dict__, "momento": h(1, 20, 0)})
try:
    libro.verificar()
    fallos.append("Cambiar una hora por detrás tenía que romper la cadena")
except RegistroCorrupto as e:
    comprobar("Y la verificación señala la anotación tocada", "4" in str(e), True)

libro = libro_de_un_dia()
del libro.anotaciones[1]
falla("Quitar una anotación del medio rompe el libro", RegistroCorrupto, libro.verificar)

libro = libro_de_un_dia()
libro.anotaciones[1], libro.anotaciones[2] = libro.anotaciones[2], libro.anotaciones[1]
falla("Reordenarlas, también", RegistroCorrupto, libro.verificar)

# ------------------------------------------------------------------ el mes

libro = Libro("Bar Casa Paco")
for dia in range(1, 6):
    libro.fichar("Lucía", Tipo.ENTRADA, h(dia, 9, 0))
    libro.fichar("Lucía", Tipo.SALIDA, h(dia, 17, 0))
comprobar("Cinco días de ocho horas son cuarenta",
          horas_del_mes(libro, "Lucía", 2026, 9), 40.0)
comprobar("Y en un mes en el que no trabajó, cero",
          horas_del_mes(libro, "Lucía", 2026, 8), 0.0)
libro.verificar()

# ============================================================ hallazgos de la auditoría

# --- A-01 · el libro de una empresa no vale en otra ---------------------------

ajeno = libro_de_un_dia()
propio = Libro("Taller Ruiz SL")
propio.anotaciones = list(ajeno.anotaciones)
falla("Trasplantar el libro de otra empresa no cuela", RegistroCorrupto, propio.verificar)

uno = Libro("Bar Casa Paco")
otro = Libro("Taller Ruiz SL")
uno.fichar("Lucía", Tipo.ENTRADA, h(1, 9, 0))
otro.fichar("Lucía", Tipo.ENTRADA, h(1, 9, 0))
comprobar("Un mismo fichaje en dos empresas tiene huellas distintas",
          uno.anotacion(1).huella != otro.anotacion(1).huella, True)

# --- A-02 · la hora no se fabrica a posteriori sin que se vea -----------------

libro = Libro("Bar Casa Paco")
libro.fichar("Lucía", Tipo.ENTRADA, h(1, 9, 0), anotado_en=h(8, 12, 0))
libro.fichar("Lucía", Tipo.SALIDA, h(1, 17, 0), anotado_en=h(8, 12, 0))
comprobar("Un fichaje escrito una semana tarde queda marcado como retroactivo",
          [a.numero for a in libro.retroactivas()], [1, 2])
comprobar("Y la jornada lo arrastra hasta la nómina",
          jornadas_de(libro, "Lucía")[0].retroactiva, True)
libro.verificar()

comprobar("Un fichaje normal no se marca como retroactivo",
          libro_de_un_dia().retroactivas(), [])

libro = Libro("Bar Casa Paco")
falla("No se ficha en el futuro", AnotacionInvalida,
      libro.fichar, "Lucía", Tipo.ENTRADA, h(30, 9, 0), anotado_en=h(1, 12, 0))

libro = Libro("Bar Casa Paco")
libro.fichar("Lucía", Tipo.ENTRADA, h(2, 9, 0))
falla("El libro no retrocede: no se puede escribir antes que la anotación previa",
      AnotacionInvalida, libro.fichar, "Lucía", Tipo.SALIDA, h(1, 17, 0))

# --- A-03 · el cálculo no se calla ante un fichaje descolgado -----------------

libro = Libro("Bar Casa Paco")
libro.fichar("Lucía", Tipo.ENTRADA, h(1, 9, 0))
libro.fichar("Lucía", Tipo.PAUSA_FIN, h(1, 11, 0))
libro.fichar("Lucía", Tipo.SALIDA, h(1, 17, 0))
j = jornadas_de(libro, "Lucía")[0]
comprobar("Volver de una pausa que no empezó se registra como incidencia",
          j.incidencias, ["volvió de una pausa que no había empezado"])
comprobar("Y no se descuenta tiempo inventado", j.horas, 8.0)

libro = Libro("Bar Casa Paco")
libro.fichar("Lucía", Tipo.ENTRADA, h(1, 9, 0))
libro.fichar("Lucía", Tipo.PAUSA_INICIO, h(1, 11, 0))
libro.fichar("Lucía", Tipo.PAUSA_INICIO, h(1, 12, 0))
libro.fichar("Lucía", Tipo.PAUSA_FIN, h(1, 13, 0))
libro.fichar("Lucía", Tipo.SALIDA, h(1, 17, 0))
j = jornadas_de(libro, "Lucía")[0]
comprobar("Dos pausas abiertas seguidas también se registran",
          j.incidencias, ["empezó una pausa sin cerrar la anterior"])

# --- A-04 · dos correcciones aceptadas sobre el mismo fichaje -----------------

libro = libro_de_un_dia()
libro.proponer_correccion(4, h(1, 19, 0), "Se quedó cerrando", "Lucía",
                          Parte.TRABAJADOR, h(2, 9, 0))
libro.resolver_correccion(5, True, "Paco", Parte.EMPRESA, h(2, 10, 0))
libro.proponer_correccion(4, h(1, 20, 0), "Revisado con el turno de noche", "Paco",
                          Parte.EMPRESA, h(3, 9, 0))
libro.resolver_correccion(7, True, "Lucía", Parte.TRABAJADOR, h(3, 10, 0))
comprobar("Manda la última corrección acordada", libro.momento_vigente(4), h(1, 20, 0))
comprobar("Que son diez horas, no nueve", jornadas_de(libro, "Lucía")[0].horas, 10.0)
comprobar("Y las cuatro anotaciones del historial siguen en el libro",
          len(libro.anotaciones), 8)
libro.verificar()

# --- A-05 · el cálculo aguanta un libro de tamaño real ------------------------

import time
from datetime import timedelta as _td

libro = Libro("Cadena de bares")
inicio = datetime(2026, 1, 1, 9, 0)
for dia in range(500):
    base = inicio + _td(days=dia)
    # En orden cronológico real: la plantilla entera ficha entrada, luego la
    # pausa, luego la vuelta, luego la salida. Nadie escribe hacia atrás.
    for tipo, desfase in ((Tipo.ENTRADA, 0), (Tipo.PAUSA_INICIO, 4),
                          (Tipo.PAUSA_FIN, 5), (Tipo.SALIDA, 9)):
        for n in range(10):
            libro.fichar(f"T{n}", tipo, base + _td(hours=desfase))
arranque = time.perf_counter()
jornadas = jornadas_de(libro, "T0")
tardanza = time.perf_counter() - arranque
comprobar("20.000 anotaciones: salen las 500 jornadas de una persona",
          len(jornadas), 500)
comprobar(f"Y en menos de un segundo (ha tardado {tardanza:.2f} s)",
          tardanza < 1.0, True)


if fallos:
    print(f"\n{len(fallos)} comprobaciones fallan:\n")
    for fallo in fallos:
        print(f"  · {fallo}\n")
    raise SystemExit(1)
print("Todas las comprobaciones pasan.")
