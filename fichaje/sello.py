"""El sello periódico del libro. `python3 -m fichaje.sello [sellar|comprobar]`.

**Qué problema resuelve.** La cadena de huellas detecta que alguien cambie una
anotación: cambia su huella y todas las siguientes dejan de encajar. Lo que NO
detecta es que alguien borre las últimas. Un libro al que le quitan los diez
últimos fichajes sigue siendo una cadena válida, porque un prefijo de una cadena
válida también lo es. Y ese es precisamente el recorte que interesa a quien
quiere esconder horas extra: las de ayer, no las del año pasado.

**Cómo.** Un sello es una fila que dice «el día tal, este libro tenía N
anotaciones y la última era la número X con la huella H». Si mañana el libro
tiene menos de N, o su número X ya no es H, alguien ha recortado. Los sellos se
encadenan entre ellos, así que tampoco se puede quitar el del medio.

**Lo que esto NO es.** No es un anclaje externo, y no se va a llamar así. Los
sellos los generamos nosotros y viven en nuestra base de datos. Lo que
demuestran es que el libro no se ha recortado después del sello **sin recortar
también los sellos**, que son dos tablas distintas, con dos disparadores
distintos, y ninguna de las dos la puede tocar el usuario con el que corre la
aplicación. Sube el listón; no lo cierra. Un anclaje de verdad exige publicar la
huella donde no mandemos nosotros, y eso sigue sin estar y sigue escrito como
hueco en la matriz de cobertura.

Se sella una vez al día, junto a `admin verificar`.
"""

import hashlib
import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone

from .postgres import conectar

VERSION = 1
CEROS = "0" * 64


@dataclass(frozen=True)
class Sello:
    empresa_id: str
    numero: int
    version: int
    hasta_numero: int
    hasta_huella: str
    anotaciones: int
    sellado_en: datetime
    huella_anterior: str
    huella: str

    def cuerpo_canonico(self) -> bytes:
        """Los mismos criterios que en el libro: array JSON, orden explícito.

        Sin espacios, sin escapar acentos y con la versión delante, para que dos
        versiones del formato jamás produzcan los mismos bytes.
        """
        if self.version != VERSION:
            raise ValueError(
                f"El sello {self.numero} dice usar la versión {self.version} y "
                f"este código solo conoce la {VERSION}.")
        return json.dumps([
            self.version,
            self.empresa_id,
            self.numero,
            self.hasta_numero,
            self.hasta_huella,
            self.anotaciones,
            self.sellado_en.astimezone(timezone.utc).isoformat(
                timespec="microseconds").replace("+00:00", "Z"),
            self.huella_anterior,
        ], ensure_ascii=False, separators=(",", ":")).encode("utf-8")

    def calcular_huella(self) -> str:
        return hashlib.sha256(self.cuerpo_canonico()).hexdigest()


CAMPOS = ("empresa_id::text, numero, version, hasta_numero, hasta_huella, "
          "anotaciones, sellado_en, huella_anterior, huella")


def _fila_a_sello(fila) -> Sello:
    return Sello(*fila)


def sellos_de(conexion, empresa_id: str) -> list[Sello]:
    return [_fila_a_sello(f) for f in conexion.execute(
        f"select {CAMPOS} from sello where empresa_id = %s order by numero",
        (empresa_id,)).fetchall()]


def sellar(conexion, empresa_id: str) -> Sello | None:
    """Sella el estado actual del libro de una empresa.

    Toma el mismo bloqueo por empresa que usa el libro para escribir: sellar
    mientras alguien ficha daría un sello de un libro a medias, que sería un
    falso positivo el día siguiente. No hay nada peor que una alarma de
    integridad que salta sin motivo, porque a la tercera nadie la mira.
    """
    with conexion.transaction():
        cur = conexion.cursor()
        cur.execute("select pg_advisory_xact_lock(hashtext(%s))", (empresa_id,))
        cur.execute("select numero, huella, count(*) over () from anotacion "
                    "where empresa_id = %s order by numero desc limit 1",
                    (empresa_id,))
        fila = cur.fetchone()
        if fila is None:
            return None                       # libro vacío: no hay nada que sellar
        hasta_numero, hasta_huella, _ = fila
        cuantas = cur.execute(
            "select count(*) from anotacion where empresa_id = %s",
            (empresa_id,)).fetchone()[0]

        cur.execute("select numero, huella from sello where empresa_id = %s "
                    "order by numero desc limit 1", (empresa_id,))
        anterior = cur.fetchone()
        numero = (anterior[0] + 1) if anterior else 1
        huella_anterior = anterior[1] if anterior else CEROS

        sello = Sello(empresa_id, numero, VERSION, hasta_numero, hasta_huella,
                      cuantas, datetime.now(timezone.utc), huella_anterior, "")
        sello = Sello(**{**sello.__dict__, "huella": sello.calcular_huella()})
        cur.execute(
            "insert into sello (empresa_id, numero, version, hasta_numero, "
            "hasta_huella, anotaciones, sellado_en, huella_anterior, huella) "
            "values (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (sello.empresa_id, sello.numero, sello.version, sello.hasta_numero,
             sello.hasta_huella, sello.anotaciones, sello.sellado_en,
             sello.huella_anterior, sello.huella))
        return sello


@dataclass(frozen=True)
class Veredicto:
    valido: bool
    sellos: int = 0
    motivo: str = ""

    def __bool__(self) -> bool:
        return self.valido


def verificar_sellos(sellos: list[Sello], anotaciones: list, empresa_id: str) -> Veredicto:
    """¿Sigue el libro conteniendo lo que cada sello dice que contenía?

    Es una función suelta, sin base de datos, porque la usa también el
    verificador del expediente: alguien que solo tiene el ZIP tiene que poder
    comprobar esto sin pedirnos nada.
    """
    if not sellos:
        return Veredicto(True, 0, "")

    por_numero = {a.numero: a for a in anotaciones}
    anterior = CEROS
    for orden, s in enumerate(sellos, start=1):
        if s.empresa_id != empresa_id:
            return Veredicto(False, orden,
                             f"el sello {s.numero} es de otra empresa")
        if s.numero != orden:
            return Veredicto(False, orden,
                             f"falta el sello {orden}: después del {orden - 1} "
                             f"viene el {s.numero}")
        if s.huella_anterior != anterior:
            return Veredicto(False, orden,
                             f"el sello {s.numero} no cuelga del anterior")
        if s.huella != s.calcular_huella():
            return Veredicto(False, orden,
                             f"el sello {s.numero} no coincide con su huella: "
                             f"se ha modificado")
        anterior = s.huella

        # Y lo que de verdad importa: que el libro siga conteniendo aquello.
        if len(anotaciones) < s.anotaciones:
            return Veredicto(
                False, orden,
                f"el {s.sellado_en.date()} el libro tenía {s.anotaciones} "
                f"anotaciones y ahora tiene {len(anotaciones)}: se han borrado "
                f"{s.anotaciones - len(anotaciones)}")
        sellada = por_numero.get(s.hasta_numero)
        if sellada is None:
            return Veredicto(
                False, orden,
                f"la anotación {s.hasta_numero}, que estaba sellada el "
                f"{s.sellado_en.date()}, ya no está en el libro")
        if sellada.huella != s.hasta_huella:
            return Veredicto(
                False, orden,
                f"la anotación {s.hasta_numero} tenía otra huella el "
                f"{s.sellado_en.date()}: se ha reescrito la historia")
    return Veredicto(True, len(sellos), "")


def a_json(s: Sello) -> dict:
    return {
        "version": s.version,
        "numero": s.numero,
        "hasta_numero": s.hasta_numero,
        "hasta_huella": s.hasta_huella,
        "anotaciones": s.anotaciones,
        "sellado_en": s.sellado_en.astimezone(timezone.utc).isoformat(
            timespec="microseconds").replace("+00:00", "Z"),
        "huella_anterior": s.huella_anterior,
        "huella": s.huella,
    }


def de_json(dato: dict, empresa_id: str) -> Sello:
    """El camino de vuelta, para el verificador que solo tiene el ZIP."""
    return Sello(
        empresa_id=empresa_id,
        numero=int(dato["numero"]),
        version=int(dato["version"]),
        hasta_numero=int(dato["hasta_numero"]),
        hasta_huella=dato["hasta_huella"],
        anotaciones=int(dato["anotaciones"]),
        sellado_en=datetime.fromisoformat(dato["sellado_en"].replace("Z", "+00:00")),
        huella_anterior=dato["huella_anterior"],
        huella=dato["huella"],
    )


def comprobar(conexion, empresa_id: str) -> Veredicto:
    from .postgres import LibroPostgres
    return verificar_sellos(sellos_de(conexion, empresa_id),
                            LibroPostgres(empresa_id, conexion).anotaciones(),
                            empresa_id)


def _empresas(conexion) -> list[str]:
    return [f[0] for f in conexion.execute(
        "select distinct empresa_id::text from anotacion").fetchall()]


if __name__ == "__main__":
    orden = sys.argv[1] if len(sys.argv) > 1 else "comprobar"
    with conectar() as conexion:
        empresas = _empresas(conexion)
        if orden == "sellar":
            for empresa in empresas:
                sello = sellar(conexion, empresa)
                if sello:
                    print(f"  {empresa[:8]}… sello {sello.numero}: "
                          f"{sello.anotaciones} anotaciones hasta la "
                          f"{sello.hasta_numero}")
            print(f"\n{len(empresas)} libros sellados.")
        elif orden == "comprobar":
            malos = 0
            for empresa in empresas:
                veredicto = comprobar(conexion, empresa)
                if not veredicto:
                    malos += 1
                    print(f"  FALLA  {empresa[:8]}…: {veredicto.motivo}")
                else:
                    print(f"  OK     {empresa[:8]}… · {veredicto.sellos} sellos")
            print(f"\n{len(empresas)} libros · {malos} con problemas.")
            raise SystemExit(1 if malos else 0)
        else:
            print(__doc__)
            raise SystemExit(1)
