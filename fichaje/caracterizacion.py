"""El libro canónico: la vara de medir de todo lo demás.

Aquí se construye siempre el mismo libro, con los mismos hechos y las mismas
horas, y se fijan sus valores observables, incluida la huella exacta de la
última anotación. La implementación con base de datos tiene que reproducirlos
clavados. Si no los reproduce, la persistencia ha cambiado el dominio, que es
justo lo que no puede pasar.

Los identificadores están escritos a mano y no generados: con UUID aleatorios la
huella cambiaría en cada ejecución y esto no mediría nada.

La huella final es deliberadamente frágil: depende de cada campo, de su orden y
de cómo se serializa. Si alguien toca la estructura de una anotación, esta
prueba se rompe y obliga a subir la versión a conciencia en vez de por
accidente.
"""

from datetime import datetime
from zoneinfo import ZoneInfo

from .registro import Libro, Parte, Tipo

# Identidades fijas. No son UUID generados: son constantes del banco de pruebas.
EMPRESA = "11111111-1111-4111-8111-111111111111"
CENTRO_MOTRIL = "22222222-2222-4222-8222-222222222222"
CENTRO_CANARIAS = "33333333-3333-4333-8333-333333333333"
LUCIA = "44444444-4444-4444-8444-444444444444"
JOSE = "55555555-5555-4555-8555-555555555555"
PACO = "66666666-6666-4666-8666-666666666666"

MADRID = "Europe/Madrid"
CANARIAS = "Atlantic/Canary"


def h(dia: int, hora: int, minuto: int = 0, zona: str = MADRID) -> datetime:
    """Un instante escrito como lo diría la persona que lo vive: en su hora local."""
    return datetime(2026, 9, dia, hora, minuto, tzinfo=ZoneInfo(zona))


def libro_canonico() -> Libro:
    """Un trozo de vida de un bar pequeño, con todo lo que puede torcerse.

    Dos trabajadoras en Motril y un turno en Canarias, una corrección aceptada,
    otra rechazada, un fichaje escrito con una semana de retraso, un turno de
    noche que cruza la medianoche y una jornada que nadie cerró.
    """
    libro = Libro(EMPRESA)
    motril = dict(centro_id=CENTRO_MOTRIL, zona_horaria=MADRID)

    # Día 1 · jornada normal con pausa, de las dos.
    libro.fichar(LUCIA, tipo=Tipo.ENTRADA, momento=h(1, 9, 0), **motril)
    libro.fichar(JOSE, tipo=Tipo.ENTRADA, momento=h(1, 9, 15), **motril)
    libro.fichar(LUCIA, tipo=Tipo.PAUSA_INICIO, momento=h(1, 13, 30), **motril)
    libro.fichar(LUCIA, tipo=Tipo.PAUSA_FIN, momento=h(1, 14, 30), **motril)
    libro.fichar(JOSE, tipo=Tipo.SALIDA, momento=h(1, 17, 15), **motril)
    libro.fichar(LUCIA, tipo=Tipo.SALIDA, momento=h(1, 18, 0), **motril)

    # Día 2 · Lucía se quedó cerrando; lo pide ella, lo acepta la empresa.
    libro.proponer_correccion(6, h(1, 19, 0), "Se quedó cerrando la caja",
                              LUCIA, Parte.TRABAJADOR, h(2, 9, 0))
    libro.resolver_correccion(7, True, PACO, Parte.EMPRESA, h(2, 10, 0))

    # Día 2 · la empresa quiere bajarle una hora a Jose; él lo rechaza.
    libro.proponer_correccion(5, h(1, 16, 0), "Creo que se fue antes",
                              PACO, Parte.EMPRESA, h(2, 11, 0))
    libro.resolver_correccion(9, False, JOSE, Parte.TRABAJADOR, h(2, 12, 0))

    # Día 3 · Jose entra y nadie cierra su jornada.
    libro.fichar(JOSE, tipo=Tipo.ENTRADA, momento=h(3, 9, 0), **motril)

    # Noche del 5 al 6 · Lucía cierra el local. La jornada es del día 5, que es
    # lo que diría su encargado, aunque en UTC la entrada caiga en otro día.
    libro.fichar(LUCIA, tipo=Tipo.ENTRADA, momento=h(5, 22, 0), **motril)
    libro.fichar(LUCIA, tipo=Tipo.SALIDA, momento=h(6, 2, 0), **motril)

    # Día 8 · Jose cubre un turno en el local de Canarias, que va una hora por
    # detrás. Las nueve de allí no son las nueve de Motril.
    libro.fichar(JOSE, centro_id=CENTRO_CANARIAS, zona_horaria=CANARIAS,
                 tipo=Tipo.ENTRADA, momento=h(8, 9, 0, CANARIAS))
    libro.fichar(JOSE, centro_id=CENTRO_CANARIAS, zona_horaria=CANARIAS,
                 tipo=Tipo.SALIDA, momento=h(8, 17, 0, CANARIAS))

    # Día 10 · se anota el día 4 de Lucía, que se olvidó de fichar. Legítimo,
    # pero queda marcado como retroactivo.
    libro.fichar(LUCIA, tipo=Tipo.ENTRADA, momento=h(4, 9, 0),
                 anotado_en=h(10, 12, 0), autor_id=PACO, parte=Parte.EMPRESA,
                 origen="panel", **motril)
    libro.fichar(LUCIA, tipo=Tipo.SALIDA, momento=h(4, 17, 0),
                 anotado_en=h(10, 12, 1), autor_id=PACO, parte=Parte.EMPRESA,
                 origen="panel", **motril)

    return libro


# Los valores observables que la base de datos tendrá que reproducir clavados.
# Salen de una ejecución real, no de escribirlos a ojo: la primera vez que se
# escribieron a mano estaban mal.
ANOTACIONES = 17
VERSION = 2
HUELLA_FINAL = "187bc7f252a7926a738ffa0dbcbe09b099f1e639f3c1eb384397d6fa7c16ba7c"

# Día 1 corregido a las 19:00, día 4 retroactivo, y la noche del 5 al 6.
HORAS_LUCIA = [9.0, 8.0, 4.0]
DIAS_LUCIA = ["2026-09-01", "2026-09-04", "2026-09-05"]

# Día 1 con la corrección rechazada, día 3 abierto y cerrado por la entrada
# siguiente, y el turno de Canarias.
HORAS_JOSE = [8.0, 0.0, 8.0]
DIAS_JOSE = ["2026-09-01", "2026-09-03", "2026-09-08"]
INCIDENCIAS_JOSE = [[], ["entró otra vez sin haber salido"], []]

RETROACTIVAS = [16, 17]
