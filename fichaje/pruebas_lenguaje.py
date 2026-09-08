"""Que no se nos escape una afirmación legal que no podemos sostener.
`python3 -m fichaje.pruebas_lenguaje`

Esto no es una prueba de software, es una prueba de honestidad, y hace falta
porque el error se comete solo. Escribir «el decreto exige» es cómodo, suena
firme y vende; y es falso mientras la norma no esté publicada. Un cliente que
lo lea puede tomar decisiones creyendo en una obligación que no existe, y un
abogado que lo lea nos retira la credibilidad de todo lo demás.

Ya pasó: había cinco apariciones repartidas por el código y la documentación, y
una de ellas era un mensaje de error que veía el usuario.

Lo que se permite decir y lo que no está en `proyecto/08-estado-normativo.md`.
"""

import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parent.parent

# Frases que no se pueden afirmar hoy, y por qué.
PROHIBIDAS = {
    r"el decreto exige": "el proyecto de real decreto no está aprobado",
    r"el decreto obliga": "ídem",
    r"obligatorio desde (marzo|abril)": "no hay fecha: son 20 días desde el BOE",
    r"entra en vigor (el|en) \d": "no hay fecha de entrada en vigor",
    r"formato oficial de la inspecci": "no existe especificación técnica publicada",
    r"legalmente inalterable": "la cadena detecta, no impide",
    r"cumple (la ley|el decreto|la normativa)": "eso lo dice un juez, no nosotros",
    r"validado por la inspecci": "nadie lo ha validado",
    r"garantiza el cumplimiento": "no se garantiza nada",
}

# Dónde SÍ pueden aparecer: el documento que las prohíbe, esta prueba, y las
# pruebas que comprueban que la web no las dice.
PERMITIDOS = {
    "proyecto/08-estado-normativo.md",
    "fichaje/pruebas_lenguaje.py",
    "fichaje/pruebas_web.py",
    "README.md",                       # su sección «lo que NO afirma»
}

REVISABLES = (
    list((RAIZ / "fichaje").glob("*.py"))
    + list((RAIZ / "migraciones").glob("*.sql"))
    + list((RAIZ / "proyecto").glob("*.md"))
    + [RAIZ / "README.md"]
)

fallos: list[str] = []
hechas = 0

for fichero in sorted(REVISABLES):
    relativo = str(fichero.relative_to(RAIZ))
    if relativo in PERMITIDOS:
        continue
    texto = fichero.read_text(encoding="utf-8")
    for numero, linea in enumerate(texto.splitlines(), start=1):
        # Una línea que empieza por «>» es una cita marcada, y una que dice «no
        # dice que» o «prohibido escribir» está justamente negándolo.
        limpia = linea.strip().lower()
        if limpia.startswith(">") or "no dice" in limpia or "prohibido" in limpia:
            continue
        for patron, motivo in PROHIBIDAS.items():
            hechas += 1
            if re.search(patron, limpia):
                fallos.append(
                    f"{relativo}:{numero}\n    dice: {linea.strip()[:90]}\n"
                    f"    y no se puede: {motivo}")

if fallos:
    print(f"\n{len(fallos)} afirmaciones que no podemos sostener:\n")
    for fallo in fallos:
        print(f"  · {fallo}\n")
    print("Lo que se puede decir está en proyecto/08-estado-normativo.md")
    raise SystemExit(1)
print(f"Todas las comprobaciones pasan: {hechas} sobre el lenguaje normativo "
      f"en {len(REVISABLES)} archivos.")
