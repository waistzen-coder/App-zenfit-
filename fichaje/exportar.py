"""El expediente auditable: sacar el libro de una empresa en un paquete que
cualquiera pueda comprobar por su cuenta.

**No se llama «formato oficial de la Inspección»** y no lo es. A día de hoy no
hay ninguna especificación técnica publicada en el BOE que podamos seguir, así
que esto es un formato nuestro, pensado para que se entienda y se verifique sin
tener que fiarse de nosotros.

El paquete lleva cinco cosas:

    registro.csv        los fichajes, legibles en cualquier hoja de cálculo
    correcciones.csv    quién pidió cambiar qué, por qué, y qué contestó el otro
    libro.jsonl         el libro tal cual se firmó, una anotación por línea
    manifest.json       qué hay dentro y la huella SHA-256 de cada archivo
    LEEME.txt           qué significa todo esto, y qué NO demuestra

Lo importante es `libro.jsonl`: no inventa una representación nueva, escribe la
misma que se firmó. Por eso `verificar_exportacion` puede rehacer la cadena
entera sin tocar la base de datos.
"""

import hashlib
import io
import json
import zipfile
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from .correcciones import correcciones_de
from .jornada import jornadas_de, totales_mensuales
from .registro import FICHAJES, Anotacion, Tipo, correcciones_vigentes, verificar_cadena

VERSION_FORMATO = "1.0"

# Lo que Excel y LibreOffice interpretan como fórmula si empieza una celda.
PELIGROSOS = ("=", "+", "-", "@", "\t", "\r")


def celda_segura_para_hoja(valor: str) -> str:
    """Una celda que no se convierte en fórmula al abrir el archivo.

    Si alguien se llama «=1+1» o escribe un motivo que empieza por «=», Excel lo
    ejecuta al abrirlo. Con funciones como HYPERLINK o WEBSERVICE eso deja de ser
    una curiosidad y pasa a ser una forma de sacar datos del ordenador de quien
    abre el archivo. Se antepone un apóstrofo, que las hojas de cálculo entienden
    como «esto es texto» y no muestran.
    """
    texto = "" if valor is None else str(valor)
    if texto and texto[0] in PELIGROSOS:
        texto = "'" + texto
    if any(c in texto for c in (',', '"', "\n", "\r")):
        texto = '"' + texto.replace('"', '""') + '"'
    return texto


def fila_segura_para_hoja(valores: list[str]) -> list[str]:
    return [celda_segura_para_hoja(v) for v in valores]


def _csv(cabecera: list[str], filas: list[list[str]]) -> str:
    lineas = [",".join(cabecera)]
    lineas += [",".join(fila_segura_para_hoja(f)) for f in filas]
    return "﻿" + "\r\n".join(lineas) + "\r\n"


def _local(momento: datetime, zona: str) -> str:
    return momento.astimezone(ZoneInfo(zona)).isoformat()


def _anotacion_a_json(a: Anotacion) -> dict:
    """La anotación tal cual se firmó, sin añadir ni quitar nada.

    Los nombres son los del dominio y el orden es el del cuerpo canónico, para
    que quien lea el archivo pueda rehacer la huella sin adivinar.
    """
    return {
        "version": a.version,
        "empresa_id": a.empresa_id,
        "centro_id": a.centro_id,
        "trabajador_id": a.trabajador_id,
        "numero": a.numero,
        "tipo": a.tipo.value,
        "momento": a.momento.astimezone(timezone.utc).isoformat(),
        "anotado_en": a.anotado_en.astimezone(timezone.utc).isoformat(),
        "zona_horaria": a.zona_horaria,
        "autor_id": a.autor_id,
        "parte": a.parte.value,
        "origen": a.origen,
        "motivo": a.motivo,
        "corrige": a.corrige,
        "momento_propuesto": (a.momento_propuesto.astimezone(timezone.utc).isoformat()
                              if a.momento_propuesto else None),
        "huella_anterior": a.huella_anterior,
        "huella": a.huella,
    }


def json_a_anotacion(dato: dict) -> Anotacion:
    """El camino de vuelta, para poder verificar sin base de datos."""
    from .registro import Parte

    def fecha(clave):
        return datetime.fromisoformat(dato[clave]) if dato.get(clave) else None

    return Anotacion(
        version=dato["version"], empresa_id=dato["empresa_id"],
        centro_id=dato["centro_id"], trabajador_id=dato["trabajador_id"],
        numero=dato["numero"], tipo=Tipo(dato["tipo"]), momento=fecha("momento"),
        anotado_en=fecha("anotado_en"), zona_horaria=dato["zona_horaria"],
        autor_id=dato["autor_id"], parte=Parte(dato["parte"]),
        origen=dato["origen"], motivo=dato["motivo"], corrige=dato["corrige"],
        momento_propuesto=fecha("momento_propuesto"),
        huella_anterior=dato["huella_anterior"], huella=dato["huella"])


LEEME = """EXPEDIENTE AUDITABLE DEL REGISTRO DE JORNADA
============================================

Qué es esto
-----------
El registro de jornada de una empresa, sacado de la aplicación en un formato que
se puede comprobar sin fiarse de nosotros.

NO es un «formato oficial de la Inspección de Trabajo»: a fecha de hoy no existe
ninguna especificación técnica publicada en el BOE. Es un formato propio,
pensado para que se entienda y se verifique.

Qué hay dentro
--------------
registro.csv       Los fichajes: quién, dónde, cuándo, y si la hora se corrigió.
                   Se abre con cualquier hoja de cálculo.

correcciones.csv   Cada cambio de hora que se pidió: quién lo pidió, por qué,
                   qué hora proponía, y qué contestó la otra parte.

totales-mensuales.csv
                   Horas por persona y por mes, ya con las correcciones
                   acordadas aplicadas. Es una suma de lo que hay en
                   registro.csv, no un dato aparte: si no cuadra con él, manda
                   registro.csv.

libro.jsonl        El libro tal como se firmó, una anotación por línea y en su
                   orden exacto. Es el archivo que permite comprobar que nada se
                   ha tocado.

sellos.jsonl       Los sellos periódicos. Cada uno dice cuántas anotaciones
                   tenía el libro un día dado y cuál era la última. Sirven para
                   detectar que se hayan BORRADO las últimas, cosa que la cadena
                   por sí sola no detecta: un trozo del principio de una cadena
                   válida también es una cadena válida.

manifest.json      Qué contiene el paquete y la huella SHA-256 de cada archivo.

Cómo se comprueba
-----------------
Cada anotación del libro lleva la huella de la anterior, así que forman una
cadena. Cambiar una hora, un nombre o un motivo rompe la huella de esa anotación
y todas las siguientes dejan de encajar.

Con la aplicación:

    python3 -m fichaje.verificar_exportacion este-archivo.zip

No hace falta base de datos ni conexión: se comprueba con lo que hay en el ZIP.

Original, corregido y discrepancia
----------------------------------
Un fichaje nunca se modifica. Si una hora estaba mal, se añade una PROPUESTA de
cambio, con su motivo y quién la hace. La otra parte responde:

  ACEPTADA        las dos partes están de acuerdo, y la hora que vale pasa a ser
                  la propuesta. La original sigue en el libro.

  DISCREPANCIA    no hay acuerdo. La hora que vale sigue siendo la original, y
                  queda escrito quién propuso qué y quién no estuvo de acuerdo.
                  No se borra nada y no se oculta el desacuerdo.

Qué NO demuestra este paquete
-----------------------------
Que la cadena cuadre demuestra que el libro no se ha modificado por dentro
después de escribirse, y que este paquete no se ha tocado después de generarse.

NO demuestra que no falten anotaciones al final. Si alguien con acceso total a
la base de datos hubiera borrado las últimas antes de generar el paquete, lo que
queda sería una cadena impecable, solo que más corta: dentro del libro no hay
nada que diga cuántas anotaciones debería haber.

NO demuestra que alguien con control simultáneo de la aplicación y de la base de
datos no haya rehecho una historia entera y vuelto a encadenarla.

Las dos cosas se cierran guardando periódicamente en un tercero la última huella
y el número de anotaciones. Eso todavía no está hecho, y por eso se dice aquí en
vez de dejar que alguien lo dé por supuesto.
"""


def construir_paquete(anotaciones: list[Anotacion], empresa_id: str,
                      empresa: str, nombres: dict[str, str],
                      centros: dict[str, str], autores: dict[str, str],
                      desde: date | None = None, hasta: date | None = None,
                      commit: str | None = None, sellos: list | None = None) -> bytes:
    """El ZIP entero, en memoria, listo para descargar.

    Recibe los nombres ya resueltos en vez de una conexión: así se puede
    construir y probar el paquete sin base de datos.
    """
    vigentes = correcciones_vigentes(anotaciones)
    respuestas = {c.propuesta.numero: c for c in correcciones_de(anotaciones)}

    filas = []
    for a in anotaciones:
        if a.tipo not in FICHAJES:
            continue
        if desde and a.momento.astimezone(ZoneInfo(a.zona_horaria)).date() < desde:
            continue
        if hasta and a.momento.astimezone(ZoneInfo(a.zona_horaria)).date() > hasta:
            continue
        vigente = vigentes.get(a.numero, a.momento)
        filas.append([
            str(a.numero), nombres.get(a.trabajador_id, a.trabajador_id),
            centros.get(a.centro_id, a.centro_id), a.tipo.value,
            _local(a.momento, a.zona_horaria), _local(vigente, a.zona_horaria),
            a.zona_horaria,
            "sí" if vigente != a.momento else "no",
            "sí" if a.retroactiva else "no",
            _local(a.anotado_en, a.zona_horaria), a.origen,
        ])
    registro = _csv(
        ["numero", "trabajador", "centro", "tipo", "momento_original",
         "momento_vigente", "zona_horaria", "corregido", "retroactivo",
         "escrito_en", "origen"], filas)

    filas = []
    for numero, c in sorted(respuestas.items()):
        filas.append([
            str(c.original.numero), nombres.get(c.original.trabajador_id, ""),
            _local(c.original.momento, c.original.zona_horaria),
            str(c.propuesta.numero),
            _local(c.propuesta.momento_propuesto, c.propuesta.zona_horaria),
            c.propuesta.motivo, c.propuesta.parte.value,
            autores.get(c.propuesta.autor_id, c.propuesta.autor_id),
            _local(c.propuesta.anotado_en, c.propuesta.zona_horaria),
            c.estado,
            c.respuesta.parte.value if c.respuesta else "",
            autores.get(c.respuesta.autor_id, "") if c.respuesta else "",
            _local(c.respuesta.anotado_en, c.respuesta.zona_horaria)
            if c.respuesta else "",
        ])
    correcciones = _csv(
        ["fichaje", "trabajador", "hora_original", "propuesta",
         "hora_propuesta", "motivo", "propuesta_por", "autor_propuesta",
         "fecha_propuesta", "resultado", "respondida_por", "autor_respuesta",
         "fecha_respuesta"], filas)

    # La totalización mensual. El cálculo está en `jornada.py` porque lo usan
    # también el panel y las pruebas: dos implementaciones de la misma suma es
    # tener dos cifras que algún día discreparán.
    filas = [[nombres.get(x.trabajador_id, x.trabajador_id), x.mes, str(x.dias),
              f"{x.horas:.2f}", f"{x.pausa:.2f}", str(x.sin_cerrar),
              str(x.con_correccion)]
             for x in totales_mensuales(anotaciones, desde, hasta)]
    filas.sort(key=lambda f: (f[0], f[1]))
    totales = _csv(
        ["trabajador", "mes", "dias_con_jornada", "horas_trabajadas",
         "horas_de_pausa", "jornadas_sin_cerrar", "jornadas_con_correccion"],
        filas)

    libro = "".join(
        json.dumps(_anotacion_a_json(a), ensure_ascii=False, sort_keys=True) + "\n"
        for a in anotaciones)

    # Los sellos. Sin ellos, un libro al que le hayan quitado las últimas
    # anotaciones se exporta como un paquete impecable: la cadena de un prefijo
    # de una cadena válida también es válida. Con ellos, cualquiera que tenga el
    # ZIP puede ver que el día tal había más anotaciones de las que hay.
    from .sello import a_json as _sello_a_json

    sellos = sellos or []
    sellos_jsonl = "".join(
        json.dumps(_sello_a_json(s), ensure_ascii=False, sort_keys=True) + "\n"
        for s in sellos)

    veredicto = verificar_cadena(anotaciones, empresa_id)
    manifest = {
        "version_formato_exportacion": VERSION_FORMATO,
        "empresa_id": empresa_id,
        "empresa": empresa,
        "fecha_generacion_utc": datetime.now(timezone.utc).isoformat(),
        "periodo_solicitado": {"desde": str(desde) if desde else None,
                               "hasta": str(hasta) if hasta else None},
        "numero_anotaciones": len(anotaciones),
        "numero_sellos": len(sellos),
        "primera_anotacion": anotaciones[0].numero if anotaciones else None,
        "ultima_anotacion": anotaciones[-1].numero if anotaciones else None,
        "primera_huella": anotaciones[0].huella if anotaciones else None,
        "ultima_huella": anotaciones[-1].huella if anotaciones else None,
        "version_huella": anotaciones[0].version if anotaciones else None,
        "resultado_verificacion": {
            "valido": veredicto.valido,
            "comprobadas": veredicto.comprobadas,
            "primera_fallida": veredicto.primera_fallida,
            "motivo": veredicto.motivo,
        },
        # Informativo. No hace falta para comprobar el libro: la cadena se
        # verifica sola con lo que hay en el paquete.
        "commit": commit,
        "archivos": {},
    }
    contenido = {
        "registro.csv": registro.encode("utf-8"),
        "correcciones.csv": correcciones.encode("utf-8"),
        "totales-mensuales.csv": totales.encode("utf-8"),
        "libro.jsonl": libro.encode("utf-8"),
        "sellos.jsonl": sellos_jsonl.encode("utf-8"),
        "LEEME.txt": LEEME.encode("utf-8"),
    }
    for nombre, datos in contenido.items():
        manifest["archivos"][nombre] = {
            "sha256": hashlib.sha256(datos).hexdigest(), "bytes": len(datos)}

    memoria = io.BytesIO()
    # Sin fecha en las entradas: dos exportaciones del mismo libro dan el mismo
    # ZIP byte a byte, y eso se puede comprobar.
    with zipfile.ZipFile(memoria, "w", zipfile.ZIP_DEFLATED) as zf:
        for nombre, datos in contenido.items():
            info = zipfile.ZipInfo(nombre, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            zf.writestr(info, datos)
        info = zipfile.ZipInfo("manifest.json", date_time=(1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        zf.writestr(info, json.dumps(manifest, ensure_ascii=False, indent=2,
                                     sort_keys=True).encode("utf-8"))
    return memoria.getvalue()


def paquete_de_empresa(conexion, empresa_id: str, empresa: str,
                       desde: date | None = None, hasta: date | None = None) -> bytes:
    """El paquete de una empresa, resolviendo los nombres desde la base."""
    from .postgres import LibroPostgres

    from .sello import sellos_de

    anotaciones = LibroPostgres(empresa_id, conexion).anotaciones()
    sellos = sellos_de(conexion, empresa_id)
    nombres = dict(conexion.execute(
        "select id::text, nombre from trabajador where empresa_id = %s",
        (empresa_id,)).fetchall())
    centros = dict(conexion.execute(
        "select id::text, nombre from centro where empresa_id = %s",
        (empresa_id,)).fetchall())
    autores = dict(nombres)
    autores.update(dict(conexion.execute(
        "select u.id::text, u.nombre || ' (gestoría)' from usuario_gestoria u "
        "join gestoria g on g.id = u.gestoria_id join empresa e on "
        "e.gestoria_id = g.id where e.id = %s", (empresa_id,)).fetchall()))
    return construir_paquete(anotaciones, empresa_id, empresa, nombres, centros,
                             autores, desde, hasta, sellos=sellos)
