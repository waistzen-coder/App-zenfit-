"""El informe: se le da un CSV de facturas y dice cuánto le deben a alguien.

    python3 -m motor.informe facturas.csv

El CSV lleva una fila por factura, con cabecera:

    numero,deudor,importe,fecha_emision,fecha_cobro,fecha_vencimiento_pactada,publico

Las fechas en AAAA-MM-DD. `fecha_cobro` vacía significa que sigue sin cobrarse.
`fecha_vencimiento_pactada` vacía significa que no se pactó plazo. `publico` es
1 para las administraciones y 0 o vacío para las empresas.

Esta es la pantalla que decide el negocio entero: es lo primero que ve alguien
que no nos conoce de nada, calculado con sus propias facturas.
"""

import csv
import sys
from datetime import date, datetime

from .calculo import Factura, Reclamacion, calcular_reclamacion


def _fecha(texto: str) -> date | None:
    texto = (texto or "").strip()
    if not texto:
        return None
    return datetime.strptime(texto, "%Y-%m-%d").date()


def _importe(texto: str) -> float:
    """Acepta 1.234,56 y 1234.56, que es como salen de contabilidades distintas."""
    texto = (texto or "").strip().replace("€", "").replace(" ", "")
    if "," in texto and "." in texto:
        texto = texto.replace(".", "").replace(",", ".")
    elif "," in texto:
        texto = texto.replace(",", ".")
    return float(texto)


def leer_csv(ruta: str) -> list[Factura]:
    facturas = []
    with open(ruta, encoding="utf-8-sig", newline="") as fichero:
        for n, fila in enumerate(csv.DictReader(fichero), start=2):
            try:
                emision = _fecha(fila["fecha_emision"])
                if emision is None:
                    raise ValueError("falta la fecha de emisión")
                facturas.append(Factura(
                    numero=(fila.get("numero") or str(n)).strip(),
                    deudor=(fila.get("deudor") or "").strip(),
                    importe=_importe(fila["importe"]),
                    fecha_emision=emision,
                    fecha_cobro=_fecha(fila.get("fecha_cobro", "")),
                    fecha_vencimiento_pactada=_fecha(fila.get("fecha_vencimiento_pactada", "")),
                    deudor_publico=(fila.get("publico") or "").strip() in {"1", "si", "sí", "true"},
                ))
            except (KeyError, ValueError) as error:
                raise SystemExit(f"Línea {n} del CSV: {error}")
    return facturas


def _euros(cantidad: float) -> str:
    entero = f"{cantidad:,.2f}"
    return entero.replace(",", "·").replace(".", ",").replace("·", ".") + " €"


def imprimir(reclamacion: Reclamacion) -> None:
    con_demora = [r for r in reclamacion.resultados if r.dias_de_demora > 0]

    if not con_demora and not reclamacion.apartadas:
        print("\nNinguna factura se pagó fuera de plazo. No hay nada que reclamar.\n")
        return

    print()
    print(f"  {'Factura':<12} {'Deudor':<24} {'Importe':>12} {'Días':>6} "
          f"{'Intereses':>11} {'Art. 8.1':>9} {'Total':>11}")
    print("  " + "─" * 88)

    for r in sorted(con_demora, key=lambda r: r.total, reverse=True):
        aviso = "  ⚠ prescrita" if r.prescrita else ""
        print(f"  {r.factura.numero:<12} {r.factura.deudor[:24]:<24} "
              f"{_euros(r.factura.importe):>12} {r.dias_de_demora:>6} "
              f"{_euros(r.intereses):>11} {_euros(r.compensacion):>9} "
              f"{_euros(r.total):>11}{aviso}")

    print("  " + "─" * 88)
    print(f"\n  Facturas pagadas fuera de plazo:  {len(con_demora)} de "
          f"{len(reclamacion.resultados) + len(reclamacion.apartadas)}")
    print(f"  Intereses de demora:              {_euros(reclamacion.intereses)}")
    print(f"  Compensación del art. 8.1:        {_euros(reclamacion.compensaciones)}"
          f"   ({len(con_demora)} × 40 €)")
    print(f"\n  TE DEBEN:                         {_euros(reclamacion.total)}\n")

    prescritas = reclamacion.prescritas
    if prescritas:
        perdido = sum(r.total for r in prescritas)
        print(f"  ⚠ {len(prescritas)} facturas ya han prescrito: {_euros(perdido)} "
              f"que ya no se pueden reclamar.\n")

    if reclamacion.apartadas:
        print(f"  {len(reclamacion.apartadas)} facturas no se han podido calcular. "
              f"El motor no estima:")
        motivos = {motivo for _, motivo in reclamacion.apartadas}
        for motivo in sorted(motivos):
            print(f"    · {motivo}")
        print()


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 1
    imprimir(calcular_reclamacion(leer_csv(argv[1])))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
