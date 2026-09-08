"""Aplicar las migraciones. `python3 -m fichaje.migrar`.

La forma de la base de datos se cambia añadiendo un fichero SQL numerado en
`migraciones/`, nunca editando uno ya aplicado: quien lo tuviera puesto no lo
volvería a ejecutar y su base quedaría distinta de la de los demás. El día que
haya clientes, esa diferencia es un incidente.

Se usa yoyo-migrations, que aplica ficheros SQL a secas y lleva la cuenta de
cuáles ya están puestos. Se descartó Alembic porque arrastra SQLAlchemy entero y
su virtud —generar migraciones a partir de modelos ORM— no nos sirve: aquí no
hay ORM ni lo va a haber.

Las migraciones se aplican con un usuario que puede cambiar el esquema. La
aplicación, en marcha, usa otro que no puede: eso está en `despliegue.py`.
"""

import sys
from pathlib import Path

from yoyo import get_backend, read_migrations

from .postgres import dsn

CARPETA = Path(__file__).resolve().parent.parent / "migraciones"


def uri_yoyo(cadena: str | None = None) -> str:
    """yoyo elige el driver por el esquema de la URI; le pedimos psycopg 3,
    que es el que ya usa el resto del proyecto."""
    cadena = cadena or dsn()
    if cadena.startswith("postgresql://"):
        return cadena.replace("postgresql://", "postgresql+psycopg://", 1)
    return cadena


def aplicar(cadena: str | None = None) -> list[str]:
    """Pone al día la base y devuelve las migraciones que ha aplicado."""
    backend = get_backend(uri_yoyo(cadena))
    migraciones = read_migrations(str(CARPETA))
    with backend.lock():
        pendientes = backend.to_apply(migraciones)
        nombres = [m.id for m in pendientes]
        backend.apply_migrations(pendientes)
    return nombres


def pendientes(cadena: str | None = None) -> list[str]:
    backend = get_backend(uri_yoyo(cadena))
    return [m.id for m in backend.to_apply(read_migrations(str(CARPETA)))]


def aplicadas(cadena: str | None = None) -> list[str]:
    backend = get_backend(uri_yoyo(cadena))
    todas = read_migrations(str(CARPETA))
    return [m.id for m in todas if backend.is_applied(m)]


if __name__ == "__main__":
    cadena = sys.argv[1] if len(sys.argv) > 1 else None
    hechas = aplicar(cadena)
    if hechas:
        print("Aplicadas:")
        for nombre in hechas:
            print(f"  {nombre}")
    else:
        print("La base ya estaba al día.")
