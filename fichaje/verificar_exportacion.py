"""Comprobar un expediente exportado, sin base de datos y sin fiarse de nadie.

    python3 -m fichaje.verificar_exportacion expediente.zip

Abre el paquete, comprueba que los archivos son los que dice el manifiesto,
rehace la cadena de huellas entera y dice si cuadra. No necesita conexión, ni
credenciales, ni acceso a la aplicación: se comprueba con lo que hay dentro del
ZIP. Ese es el punto — un expediente que solo pudiéramos verificar nosotros no
valdría de nada.

Lo que este comando **no** puede decir está escrito en el LEEME del propio
paquete y se repite al final de la salida, para que nadie confunda «la cadena
cuadra» con «esto es toda la verdad».
"""

import hashlib
import json
import sys
import zipfile
from dataclasses import dataclass

from .exportar import json_a_anotacion
from .registro import verificar_cadena

ARCHIVOS_ESPERADOS = {"registro.csv", "correcciones.csv", "libro.jsonl",
                      "LEEME.txt", "manifest.json"}


@dataclass
class Resultado:
    valido: bool
    comprobadas: int = 0
    primer_fallo: int | None = None
    motivo: str = ""
    detalles: list[str] = None

    def __bool__(self) -> bool:
        return self.valido


def verificar(ruta: str) -> Resultado:
    detalles: list[str] = []
    try:
        with zipfile.ZipFile(ruta) as zf:
            dentro = set(zf.namelist())
            if "manifest.json" not in dentro:
                return Resultado(False, motivo="el paquete no lleva manifest.json",
                                 detalles=detalles)
            manifest = json.loads(zf.read("manifest.json"))

            sobran = dentro - ARCHIVOS_ESPERADOS
            faltan = ARCHIVOS_ESPERADOS - dentro
            if faltan:
                return Resultado(False, motivo=f"faltan archivos: {sorted(faltan)}",
                                 detalles=detalles)
            if sobran:
                return Resultado(False, motivo=f"el paquete lleva archivos que no "
                                               f"declara: {sorted(sobran)}",
                                 detalles=detalles)

            for nombre, esperado in manifest.get("archivos", {}).items():
                datos = zf.read(nombre)
                real = hashlib.sha256(datos).hexdigest()
                if real != esperado["sha256"]:
                    return Resultado(
                        False, motivo=f"{nombre} no coincide con su huella del "
                                      f"manifiesto: se ha modificado después de "
                                      f"generar el paquete", detalles=detalles)
                if len(datos) != esperado["bytes"]:
                    return Resultado(False, motivo=f"{nombre} no tiene el tamaño "
                                                   f"declarado", detalles=detalles)
            detalles.append(f"{len(manifest.get('archivos', {}))} archivos con la "
                            f"huella que declara el manifiesto")

            lineas = zf.read("libro.jsonl").decode("utf-8").splitlines()
    except (zipfile.BadZipFile, KeyError, json.JSONDecodeError, OSError) as fallo:
        return Resultado(False, motivo=f"no se puede leer el paquete: {fallo}",
                         detalles=detalles)

    try:
        anotaciones = [json_a_anotacion(json.loads(l)) for l in lineas if l.strip()]
    except (json.JSONDecodeError, KeyError, ValueError) as fallo:
        return Resultado(False, motivo=f"libro.jsonl no se entiende: {fallo}",
                         detalles=detalles)

    declaradas = manifest.get("numero_anotaciones")
    if declaradas is not None and declaradas != len(anotaciones):
        return Resultado(False, motivo=f"el manifiesto declara {declaradas} "
                                       f"anotaciones y el libro trae "
                                       f"{len(anotaciones)}", detalles=detalles)

    veredicto = verificar_cadena(anotaciones, manifest.get("empresa_id", ""))
    if not veredicto.valido:
        return Resultado(False, veredicto.comprobadas, veredicto.primera_fallida,
                         veredicto.motivo, detalles)

    if anotaciones:
        if manifest.get("ultima_huella") != anotaciones[-1].huella:
            return Resultado(False, motivo="la última huella no es la que declara "
                                           "el manifiesto", detalles=detalles)
        if manifest.get("primera_huella") != anotaciones[0].huella:
            return Resultado(False, motivo="la primera huella no es la que declara "
                                           "el manifiesto", detalles=detalles)
        detalles.append("la primera y la última huella coinciden con el manifiesto")

    detalles.append(f"{len(anotaciones)} anotaciones encadenadas sin un hueco")
    return Resultado(True, veredicto.comprobadas, detalles=detalles)


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 2
    resultado = verificar(argv[1])
    print()
    if resultado.valido:
        print("  EL EXPEDIENTE CUADRA")
        for detalle in resultado.detalles or []:
            print(f"    · {detalle}")
    else:
        print("  EL EXPEDIENTE NO CUADRA")
        for detalle in resultado.detalles or []:
            print(f"    · {detalle}")
        if resultado.primer_fallo:
            print(f"    · falla en la anotación {resultado.primer_fallo}")
        print(f"    · {resultado.motivo}")
    print()
    print("  Que la cadena cuadre significa que el libro no se ha modificado por")
    print("  dentro y que el paquete no se ha tocado. NO significa que no falten")
    print("  anotaciones al final: eso solo se cierra guardando periódicamente la")
    print("  última huella en un tercero, y todavía no está hecho.")
    print()
    return 0 if resultado.valido else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
