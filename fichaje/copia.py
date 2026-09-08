"""Copia y restauración del libro. `python3 -m fichaje.copia comprobar`.

Una copia que no se ha restaurado nunca no es una copia: es un fichero del que
nadie sabe nada. Así que aquí el procedimiento no se documenta, se ejecuta:
vuelca, tira la base entera, restaura y **vuelve a verificar la cadena**. Si al
final el libro no verifica, la copia no vale, por muy bien que se haya generado.

    python3 -m fichaje.copia volcar copia.dump      # solo la copia
    python3 -m fichaje.copia comprobar              # el ciclo entero

En producción esto lo hace el proveedor gestionado, con copias automáticas y
recuperación a un punto en el tiempo. Lo que no hace el proveedor es
comprobar que lo restaurado sigue siendo un libro válido: eso es nuestro, y es
esta función.
"""

import os
import subprocess
import sys
import tempfile
from urllib.parse import urlparse

from .postgres import LibroPostgres, conectar, dsn
from .registro import verificar_cadena

def _herramienta(nombre: str) -> str:
    """Encuentra pg_dump y compañía estén donde estén.

    Antes había una ruta fija de Debian. En cualquier otra máquina —el runner
    de CI, un contenedor distinto— no existe, y la copia fallaba sin decir por
    qué. Se busca primero en PATH, que es donde suelen estar.
    """
    import shutil
    carpeta = os.environ.get("PG_BIN")
    if carpeta and os.path.exists(os.path.join(carpeta, nombre)):
        return os.path.join(carpeta, nombre)
    encontrada = shutil.which(nombre)
    if encontrada:
        return encontrada
    for candidata in ("/usr/lib/postgresql/16/bin", "/usr/lib/postgresql/17/bin"):
        if os.path.exists(os.path.join(candidata, nombre)):
            return os.path.join(candidata, nombre)
    raise SystemExit(f"No se encuentra {nombre}. Instala el cliente de PostgreSQL "
                     f"o indica su carpeta en PG_BIN.")


def _partes(cadena: str) -> dict:
    url = urlparse(cadena)
    return {
        "host": url.hostname or "127.0.0.1",
        "port": str(url.port or 5432),
        "user": url.username or "postgres",
        "base": (url.path or "/postgres").lstrip("/"),
    }


def volcar(destino: str, cadena: str | None = None) -> str:
    p = _partes(cadena or dsn())
    subprocess.run(
        [_herramienta("pg_dump"), "-h", p["host"], "-p", p["port"], "-U", p["user"],
         "-Fc", "-f", destino, p["base"]],
        check=True, capture_output=True)
    return destino


def restaurar(origen: str, base_destino: str, cadena: str | None = None) -> None:
    """Restaura sobre una base recién creada. Nunca sobre una que tenga datos."""
    p = _partes(cadena or dsn())
    comun = ["-h", p["host"], "-p", p["port"], "-U", p["user"]]
    subprocess.run([_herramienta("dropdb"), *comun, "--if-exists", base_destino],
                   check=True, capture_output=True)
    subprocess.run([_herramienta("createdb"), *comun, base_destino],
                   check=True, capture_output=True)
    subprocess.run([_herramienta("pg_restore"), *comun, "-d", base_destino, origen],
                   check=True, capture_output=True)


def _todas_recalculan(anotaciones) -> bool:
    """Si el libro está corrupto no se cae: informa.

    Una anotación con una versión desconocida hace saltar `calcular_huella`, y
    un comprobador de copias que se cae ante un libro roto no sirve de nada:
    justo entonces es cuando hace falta.
    """
    try:
        return all(a.calcular_huella() == a.huella for a in anotaciones)
    except Exception:  # noqa: BLE001
        return False


def comprobar(cadena: str | None = None) -> bool:
    """El ciclo entero, sobre una base de destino aparte. Devuelve si cuadra."""
    cadena = cadena or dsn()
    p = _partes(cadena)
    origen = conectar(cadena)
    empresas = [f[0] for f in origen.execute(
        "select distinct empresa_id::text from anotacion").fetchall()]
    libros = {e: LibroPostgres(e, origen).anotaciones() for e in empresas}
    origen.close()

    if not libros:
        print("No hay ningún libro que copiar.")
        return False

    destino = f"{p['base']}_restaurada"
    with tempfile.NamedTemporaryFile(suffix=".dump", delete=False) as fichero:
        ruta = fichero.name
    volcar(ruta, cadena)
    tamano = os.path.getsize(ruta)
    restaurar(ruta, destino, cadena)
    os.unlink(ruta)

    copia = conectar(cadena.replace(f"/{p['base']}", f"/{destino}"))
    todo_bien = True
    for empresa, original in libros.items():
        restaurado = LibroPostgres(empresa, copia).anotaciones()
        veredicto = verificar_cadena(restaurado, empresa)
        iguales = ([a.huella for a in restaurado] == [a.huella for a in original])
        recalcula = _todas_recalculan(restaurado)
        if not (veredicto.valido and iguales and recalcula):
            todo_bien = False
            print(f"  FALLA  empresa {empresa}: verifica={veredicto.valido} "
                  f"iguales={iguales} recalcula={recalcula} · {veredicto.motivo}")
        else:
            print(f"  OK     empresa {empresa[:8]}… · {len(restaurado)} anotaciones, "
                  f"cadena válida y huellas idénticas")
    copia.close()

    print(f"\n  {len(libros)} libros · copia de {tamano/1024:.0f} KB · "
          f"base restaurada «{destino}»")
    return todo_bien


if __name__ == "__main__":
    orden = sys.argv[1] if len(sys.argv) > 1 else "comprobar"
    if orden == "volcar":
        print(volcar(sys.argv[2] if len(sys.argv) > 2 else "copia.dump"))
    elif orden == "comprobar":
        raise SystemExit(0 if comprobar() else 1)
    else:
        print(__doc__)
        raise SystemExit(1)
