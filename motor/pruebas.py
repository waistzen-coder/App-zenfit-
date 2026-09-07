"""Pruebas del motor. Sin dependencias: `python3 -m motor.pruebas`.

Cada prueba es un caso que un abogado tendría que poder mirar y decir «sí, eso
es lo que dice la ley». Cuando el número de este motor acabe en un escrito de
reclamación, esto es lo único que respalda que sea correcto.
"""

from datetime import date

from .calculo import (
    COMPENSACION_FIJA,
    Factura,
    _dias_del_anio,
    _partir_en_semestres,
    calcular_factura,
    calcular_reclamacion,
)
from .tipos import SemestreSinTipo, tipo_de

fallos: list[str] = []


def comprobar(descripcion: str, obtenido, esperado):
    if obtenido != esperado:
        fallos.append(f"{descripcion}\n    esperado: {esperado!r}\n    obtenido: {obtenido!r}")


# ---------------------------------------------------------------- vencimientos

f = Factura("1", "Cliente", 1000.0, date(2026, 1, 5))
comprobar("Sin pacto, el vencimiento son 30 días",
          f.vencimiento_legal(), date(2026, 2, 4))

f = Factura("2", "Cliente", 1000.0, date(2026, 1, 1),
            fecha_vencimiento_pactada=date(2026, 4, 1))
comprobar("Un pacto de 90 días se recorta al tope legal de 60",
          f.vencimiento_legal(), date(2026, 3, 2))

f = Factura("3", "Cliente", 1000.0, date(2026, 1, 1),
            fecha_vencimiento_pactada=date(2026, 2, 15))
comprobar("Un pacto por debajo del tope se respeta",
          f.vencimiento_legal(), date(2026, 2, 15))

f = Factura("4", "Ayuntamiento", 1000.0, date(2026, 1, 1),
            fecha_vencimiento_pactada=date(2026, 6, 1), deudor_publico=True)
comprobar("La Administración paga a 30 días, se pacte lo que se pacte",
          f.vencimiento_legal(), date(2026, 1, 31))

# -------------------------------------------------------------------- intereses

f = Factura("5", "Cliente", 1000.0, date(2026, 1, 5), fecha_cobro=date(2026, 3, 6))
r = calcular_factura(f, hoy=date(2026, 9, 7))
comprobar("30 días de demora sobre un vencimiento del 4 de febrero",
          r.dias_de_demora, 30)
comprobar("1.000 € al 10,5 % durante 30 días", r.intereses, 8.63)
comprobar("Y los 40 € del artículo 8.1", r.compensacion, COMPENSACION_FIJA)
comprobar("El total de la factura", round(r.total, 2), 48.63)
comprobar("Un solo tramo, porque no sale del semestre", len(r.tramos), 1)
comprobar("Con el tipo del semestre", r.tramos[0].porcentaje, 10.5)

f = Factura("6", "Cliente", 5000.0, date(2026, 1, 10), fecha_cobro=date(2026, 2, 9))
r = calcular_factura(f, hoy=date(2026, 9, 7))
comprobar("Pagada el mismo día del vencimiento: no hay demora",
          r.dias_de_demora, 0)
comprobar("Sin demora no hay intereses", r.intereses, 0.0)
comprobar("Sin demora tampoco hay 40 €", r.compensacion, 0.0)

f = Factura("7", "Cliente", 5000.0, date(2026, 1, 10), fecha_cobro=date(2026, 2, 10))
r = calcular_factura(f, hoy=date(2026, 9, 7))
comprobar("Un solo día de retraso ya devenga los 40 € enteros",
          (r.dias_de_demora, r.compensacion), (1, 40.0))

# ------------------------------------------------------- los 40 € son por factura

reclamacion = calcular_reclamacion([
    Factura(str(n), "Cliente", 1000.0, date(2026, 1, 5), fecha_cobro=date(2026, 3, 6))
    for n in range(1, 11)
], hoy=date(2026, 9, 7))
comprobar("Diez facturas tarde son diez compensaciones, no una",
          reclamacion.compensaciones, 400.0)
comprobar("Y diez facturas con demora", reclamacion.facturas_con_demora, 10)
comprobar("El total suma intereses y compensaciones",
          round(reclamacion.total, 2), round(reclamacion.intereses + 400.0, 2))

# ------------------------------------------------------- partir por semestres

comprobar("Un tramo dentro del primer semestre",
          _partir_en_semestres(date(2026, 1, 1), date(2026, 3, 1)),
          [(2026, 1, 59)])
comprobar("Un retraso que cruza a julio se parte en dos",
          _partir_en_semestres(date(2026, 6, 1), date(2026, 8, 1)),
          [(2026, 1, 30), (2026, 2, 31)])
comprobar("Y uno que cruza el año, en tres",
          _partir_en_semestres(date(2026, 6, 1), date(2027, 2, 1)),
          [(2026, 1, 30), (2026, 2, 184), (2027, 1, 31)])

comprobar("2026 no es bisiesto", _dias_del_anio(2026), 365)
comprobar("2028 sí", _dias_del_anio(2028), 366)
comprobar("2100 no lo es, aunque acabe en dos ceros", _dias_del_anio(2100), 365)
comprobar("2000 sí lo era", _dias_del_anio(2000), 366)

# --------------------------------------- lo que no se sabe, no se calcula

f = Factura("8", "Cliente", 1000.0, date(2026, 5, 1), fecha_cobro=date(2026, 9, 1))
try:
    calcular_factura(f, hoy=date(2026, 9, 7))
    fallos.append("Una factura cuyo retraso entra en el 2º semestre de 2026 "
                  "debería haber parado el cálculo: ese tipo no está verificado")
except SemestreSinTipo as e:
    comprobar("Y avisa de qué semestre le falta", (e.anio, e.semestre), (2026, 2))

reclamacion = calcular_reclamacion([
    Factura("9", "Cliente", 1000.0, date(2026, 1, 5), fecha_cobro=date(2026, 3, 6)),
    f,
], hoy=date(2026, 9, 7))
comprobar("Una factura sin tipo no tumba el informe entero",
          len(reclamacion.resultados), 1)
comprobar("Pero queda apartada y dicha", len(reclamacion.apartadas), 1)
comprobar("Con su motivo", "2º semestre de 2026" in reclamacion.apartadas[0][1], True)

try:
    tipo_de(2019, 1)
    fallos.append("Un semestre no verificado no puede devolver un tipo")
except SemestreSinTipo:
    pass

# ------------------------------------------------------------------ prescripción

f = Factura("10", "Cliente", 1000.0, date(2026, 1, 5), fecha_cobro=date(2026, 3, 6))
comprobar("Recién cobrada, no está prescrita",
          calcular_factura(f, hoy=date(2026, 9, 7)).prescrita, False)
comprobar("Seis años después, sí",
          calcular_factura(f, hoy=date(2032, 9, 7)).prescrita, True)

f = Factura("11", "Ayuntamiento", 1000.0, date(2026, 1, 5),
            fecha_cobro=date(2026, 3, 6), deudor_publico=True)
comprobar("Frente a la Administración el plazo es más corto: a los 4 años y medio ya pasó",
          calcular_factura(f, hoy=date(2030, 9, 7)).prescrita, True)


if fallos:
    print(f"\n{len(fallos)} comprobaciones fallan:\n")
    for fallo in fallos:
        print(f"  · {fallo}\n")
    raise SystemExit(1)
print("Todas las comprobaciones pasan.")
