"""El libro canónico: la vara de medir para cuando llegue la base de datos.

Aquí se construye siempre el mismo libro, con los mismos hechos y las mismas
horas, y se fijan sus valores observables —incluida la huella exacta de la
última anotación—. Cuando el libro se guarde en una base de datos, esa
implementación tendrá que reproducir estos valores clavados, uno a uno. Si no
los reproduce, la persistencia ha cambiado el dominio, que es justo lo que no
puede pasar.

La huella final es deliberadamente frágil: depende de cada campo, de su nombre y
de cómo se serializa. Si alguien toca la estructura de una anotación, esta
prueba se rompe y obliga a decidirlo a conciencia en vez de por accidente. Un
libro viejo dejaría de verificar contra un formato nuevo, así que ese cambio es
una migración, no un retoque.
"""

from datetime import datetime

from .registro import Libro, Parte, Tipo


def h(dia: int, hora: int, minuto: int = 0) -> datetime:
    return datetime(2026, 9, dia, hora, minuto)


def libro_canonico() -> Libro:
    """Un mes de vida de un bar pequeño, con todo lo que puede torcerse.

    Dos trabajadoras, una corrección aceptada, una rechazada, un fichaje
    escrito con una semana de retraso y una jornada que nadie cerró.
    """
    libro = Libro("Bar Casa Paco")

    # Día 1 · jornada normal con pausa, de las dos.
    libro.fichar("Lucía", Tipo.ENTRADA, h(1, 9, 0))
    libro.fichar("Jose", Tipo.ENTRADA, h(1, 9, 15))
    libro.fichar("Lucía", Tipo.PAUSA_INICIO, h(1, 13, 30))
    libro.fichar("Lucía", Tipo.PAUSA_FIN, h(1, 14, 30))
    libro.fichar("Jose", Tipo.SALIDA, h(1, 17, 15))
    libro.fichar("Lucía", Tipo.SALIDA, h(1, 18, 0))

    # Día 2 · Lucía se quedó cerrando; lo pide ella, lo acepta la empresa.
    libro.proponer_correccion(6, h(1, 19, 0), "Se quedó cerrando la caja",
                              "Lucía", Parte.TRABAJADOR, h(2, 9, 0))
    libro.resolver_correccion(7, True, "Paco", Parte.EMPRESA, h(2, 10, 0))

    # Día 2 · la empresa quiere bajarle una hora a Jose; él lo rechaza.
    libro.proponer_correccion(5, h(1, 16, 0), "Creo que se fue antes",
                              "Paco", Parte.EMPRESA, h(2, 11, 0))
    libro.resolver_correccion(9, False, "Jose", Parte.TRABAJADOR, h(2, 12, 0))

    # Día 3 · Jose trabaja y nadie cierra su jornada.
    libro.fichar("Jose", Tipo.ENTRADA, h(3, 9, 0))

    # Día 10 · se anota el día 4 de Lucía, que se olvidó de fichar. Legítimo,
    # pero queda marcado como retroactivo.
    libro.fichar("Lucía", Tipo.ENTRADA, h(4, 9, 0), anotado_en=h(10, 12, 0),
                 autor="Paco", parte=Parte.EMPRESA, origen="panel")
    libro.fichar("Lucía", Tipo.SALIDA, h(4, 17, 0), anotado_en=h(10, 12, 1),
                 autor="Paco", parte=Parte.EMPRESA, origen="panel")

    return libro


# Los valores observables que la base de datos tendrá que reproducir clavados.
ANOTACIONES = 13
HUELLA_FINAL = "c55052604ccd04f0ef5aad0d3e52c71d495ddac6e1ad2e1ec439e86e53aacd14"
HORAS_LUCIA = [9.0, 8.0]        # día 1 corregido a las 19:00; día 4 retroactivo
HORAS_JOSE = [8.0, 0.0]         # día 1 con la corrección rechazada; día 3 sin cerrar
RETROACTIVAS = [12, 13]
INCIDENCIAS_JOSE = [[], ["jornada sin cerrar"]]
