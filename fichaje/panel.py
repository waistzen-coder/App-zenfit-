"""El panel de la gestoría. `python3 -m fichaje.panel`

Una gestoría lleva las empresas de otros. Este panel existe para que pueda
darlas de alta y ver qué está pasando hoy, sin que nosotros toquemos la base de
datos y sin ver jamás los datos de otra gestoría.

Es una aplicación **aparte** de la del fichaje, con su propia cookie y su propia
tabla de sesiones. No es una manía: si compartieran sesión, un trabajador con el
móvil en la mano estaría a un enlace de la administración de su empresa.

Y la regla que no se negocia: **desde aquí no se toca el libro**. No hay ninguna
ruta que modifique ni borre una anotación. Se administran empresas, centros,
personas y credenciales; la historia laboral se corrige, cuando llegue esa fase,
añadiendo hechos nuevos con el acuerdo de las dos partes.
"""

import os
import secrets
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import psycopg
from flask import (
    Flask,
    Response,
    abort,
    g,
    redirect,
    render_template_string,
    request,
    session,
    url_for,
)

from . import gestoria as G
from . import representacion as Rep
from .admin import cartel, crear_centro, crear_trabajador, poner_pin, rotar_token
from .correcciones import (
    correcciones_de,
    esperando_a,
    nombre_del_autor,
    proponer,
    responder,
)
from .exportar import paquete_de_empresa
from .credenciales import (
    ContrasenaInvalida,
    PinInvalido,
    comprobar_contrasena,
    huella_de_token,
)
from .jornada import (
    COMO_SE_LLAMA,
    Estado,
    jornadas_de,
    jornadas_por_trabajador,
    totales_mensuales,
)
from .organizacion import ZonaInvalida, nuevo_id
from .postgres import LibroPostgres, conectar
from .registro import FICHAJES, AnotacionInvalida, Parte, verificar_cadena

FALLOS_ANTES_DE_BLOQUEAR = 5
VENTANA_BLOQUEO = timedelta(minutes=15)

ERRORES = {
    "NO_AUTORIZADO": "No tienes permiso para hacer eso.",
    "NO_EXISTE": "No se ha encontrado.",
    "CODIGO_DUPLICADO": "Ya hay alguien con ese código en esta empresa.",
    "EMAIL_DUPLICADO": "Ese correo ya está dado de alta.",
    "ZONA_INVALIDA": "Esa zona horaria no existe. Se escribe como Europe/Madrid.",
    "PIN_INVALIDO": "El PIN no vale: seis cifras o más, y no todas iguales.",
    "CONTRASENA_INVALIDA": "La contraseña necesita al menos doce caracteres.",
    "VALIDACION": "Faltan datos o no son correctos.",
    "BASE_NO_DISPONIBLE": "No se ha podido conectar con la base de datos.",
    "ERROR": "Ha ocurrido un error.",
    "SIN_MOTIVO": "Hay que escribir por qué se cambia la hora.",
    "HORA_MAL": "Esa hora no se entiende. Se escribe como 18:30.",
    "YA_HAY_PROPUESTA": "Ese fichaje ya tiene una propuesta sin contestar.",
    "YA_RESUELTA": "Esa propuesta ya estaba contestada.",
    "NO_ES_FICHAJE": "Solo se corrigen fichajes.",
    "REPETIDO": "Ese correo ya está dado de alta como representante.",
    "CONTRASENA": "La contraseña necesita al menos doce caracteres.",
}


def crear_panel(cadena_bd: str | None = None) -> Flask:
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=os.environ.get("FICHAJE_PANEL_SECRETO") or secrets.token_hex(32),
        SESSION_COOKIE_NAME="panel_gestoria",   # distinta de la del trabajador
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.environ.get("FICHAJE_HTTPS", "") == "1",
        BD=cadena_bd,
    )

    def bd():
        if "bd" not in g:
            g.bd = conectar(app.config["BD"])
        return g.bd

    @app.teardown_appcontext
    def cerrar(_):
        conexion = g.pop("bd", None)
        if conexion is not None:
            conexion.close()

    # ----------------------------------------------------------------- CSRF

    def testigo_csrf() -> str:
        if "csrf" not in session:
            session["csrf"] = secrets.token_urlsafe(24)
        return session["csrf"]

    def comprobar_csrf() -> None:
        if not secrets.compare_digest(request.form.get("csrf", ""),
                                      session.get("csrf", "") or "\x00"):
            abort(400)

    app.jinja_env.globals["csrf"] = testigo_csrf
    app.jinja_env.globals["Permiso"] = G.Permiso

    # ------------------------------------------------------------- identidad

    def quien() -> G.Usuario | None:
        testigo = session.get("panel")
        return G.usuario_por_sesion(bd(), huella_de_token(testigo)) if testigo else None

    def exigir_sesion() -> G.Usuario:
        usuario = quien()
        if usuario is None:
            abort(401)
        return usuario

    @app.errorhandler(401)
    def sin_sesion(_):
        return redirect(url_for("entrar"))

    @app.errorhandler(403)
    def prohibido(_):
        return pagina_simple("Sin permiso", ERRORES["NO_AUTORIZADO"]), 403

    @app.errorhandler(404)
    def no_esta(_):
        return pagina_simple("No encontrado", ERRORES["NO_EXISTE"]), 404

    def pagina_simple(titulo: str, texto: str):
        return render_template_string(SIMPLE, titulo=titulo, texto=texto)

    def volver(destino: str, **argumentos):
        return redirect(url_for(destino, **argumentos))

    # ------------------------------------------------------------- acceso

    @app.get("/panel/entrar")
    def entrar():
        if quien():
            return volver("portada")
        return render_template_string(ACCESO, aviso="", email="")

    @app.post("/panel/entrar")
    def acceder():
        comprobar_csrf()
        email = (request.form.get("email") or "").strip().lower()
        contrasena = request.form.get("contrasena") or ""
        origen = (request.remote_addr or "")[:45]
        desde = datetime.now(timezone.utc) - VENTANA_BLOQUEO

        fallos = bd().execute(
            "select count(*) from intento_panel where (email = %s or origen = %s) "
            "and not acertado and momento > %s", (email, origen, desde)).fetchone()[0]
        if fallos >= FALLOS_ANTES_DE_BLOQUEAR:
            return render_template_string(
                ACCESO, email=email,
                aviso="Demasiados intentos. Espera un cuarto de hora."), 429

        fila = G.usuario_por_email(bd(), email)
        # Se deriva igual aunque el correo no exista: contestar antes cuando no
        # existe le diría a quien prueba qué correos están dados de alta.
        correcta = comprobar_contrasena(contrasena, fila[7] if fila else None)
        bd().execute(
            "insert into intento_panel (email, origen, acertado) values (%s,%s,%s)",
            (email[:120], origen, bool(fila and correcta)))

        # Un solo mensaje para todo: correo que no existe, contraseña mala,
        # usuario dado de baja o gestoría desactivada.
        if not fila or not correcta or not fila[6] or not fila[8]:
            return render_template_string(
                ACCESO, email=email,
                aviso="El correo o la contraseña no son correctos."), 401

        session.clear()                      # sesión nueva del todo
        session["panel"] = G.abrir_sesion(bd(), fila[0])
        G.apuntar(bd(), None, "acceso", "usuario", fila[0])
        return volver("portada")

    @app.post("/panel/salir")
    def salir():
        comprobar_csrf()
        testigo = session.get("panel")
        if testigo:
            bd().execute("update sesion_panel set cerrada_en = now() where id = %s",
                         (huella_de_token(testigo),))
        session.clear()
        return volver("entrar")

    # ------------------------------------------------------------- portada

    @app.get("/panel/")
    def portada():
        usuario = exigir_sesion()
        hoy = datetime.now(ZoneInfo("Europe/Madrid")).date()
        datos = G.resumen(bd(), usuario, hoy)
        # Se lee el último resultado guardado, no se verifica aquí: recorrer la
        # cadena de todas las empresas costaba 2,2 segundos con 80.000
        # anotaciones y crece con cada fichaje.
        return render_template_string(
            PORTADA, u=usuario, d=datos, hoy=hoy,
            rotas=G.libros_rotos(bd(), usuario),
            sin_comprobar=G.sin_comprobar(bd(), usuario),
            aviso=ERRORES.get(request.args.get("e", ""), ""))

    # ------------------------------------------------------------ empresas

    @app.get("/panel/empresas")
    def empresas():
        usuario = exigir_sesion()
        busqueda = (request.args.get("q") or "")[:80]
        pagina = max(1, int(request.args.get("p") or 1))
        lista, total = G.empresas_de(bd(), usuario, busqueda, pagina)
        return render_template_string(EMPRESAS, u=usuario, empresas=lista,
                                      total=total, pagina=pagina, q=busqueda,
                                      por_pagina=25,
                                      aviso=ERRORES.get(request.args.get("e", ""), ""))

    @app.post("/panel/empresas")
    def nueva_empresa():
        comprobar_csrf()
        usuario = exigir_sesion()
        if not usuario.puede(G.Permiso.GESTIONAR_EMPRESAS):
            abort(403)
        nombre = (request.form.get("nombre") or "").strip()
        if not nombre:
            return volver("empresas", e="VALIDACION")
        identificador = nuevo_id()
        # Solo los campos que se aceptan. El formulario podría traer gestoria_id
        # o activa: se ignoran, porque el dueño lo pone el servidor.
        bd().execute(
            "insert into empresa (id, nombre, gestoria_id) values (%s,%s,%s)",
            (identificador, nombre, usuario.gestoria_id))
        G.apuntar(bd(), usuario, "crear", "empresa", identificador,
                  detalle={"nombre": nombre})
        return volver("empresa", empresa_id=identificador)

    @app.get("/panel/empresas/<empresa_id>")
    def empresa(empresa_id: str):
        usuario = exigir_sesion()
        try:
            datos = G.empresa_de(bd(), usuario, empresa_id)
        except G.NoExiste:
            abort(404)
        gente, _ = G.trabajadores_de(bd(), usuario, empresa_id, por_pagina=200)
        return render_template_string(
            EMPRESA, u=usuario, e=datos, centros=G.centros_de(bd(), usuario, empresa_id),
            gente=gente, v=G.verificacion_de(bd(), empresa_id),
            aviso=ERRORES.get(request.args.get("e", ""), ""))

    @app.post("/panel/empresas/<empresa_id>/renombrar")
    def renombrar_empresa(empresa_id: str):
        comprobar_csrf()
        usuario = exigir_sesion()
        if not usuario.puede(G.Permiso.GESTIONAR_EMPRESAS):
            abort(403)
        try:
            G.empresa_de(bd(), usuario, empresa_id)
        except G.NoExiste:
            abort(404)
        nombre = (request.form.get("nombre") or "").strip()
        if not nombre:
            return volver("empresa", empresa_id=empresa_id, e="VALIDACION")
        bd().execute("update empresa set nombre = %s where id = %s and gestoria_id = %s",
                     (nombre, empresa_id, usuario.gestoria_id))
        G.apuntar(bd(), usuario, "renombrar", "empresa", empresa_id,
                  detalle={"nombre": nombre})
        return volver("empresa", empresa_id=empresa_id)

    # ------------------------------------------------------ representantes

    @app.get("/panel/empresas/<empresa_id>/representantes")
    def representantes(empresa_id: str):
        usuario = exigir_sesion()
        try:
            datos = G.empresa_de(bd(), usuario, empresa_id)
        except G.NoExiste:
            abort(404)
        return render_template_string(
            REPRESENTANTES, u=usuario, e=datos,
            filas=[f["r"] for f in Rep.de_empresa(bd(), empresa_id)],
            centros=G.centros_de(bd(), usuario, empresa_id),
            accesos=Rep.accesos_de_empresa(bd(), empresa_id, 100),
            hoy=datetime.now(ZoneInfo("Europe/Madrid")).date(),
            aviso=ERRORES.get(request.args.get("e", ""), ""))

    @app.post("/panel/empresas/<empresa_id>/representantes")
    def nuevo_representante(empresa_id: str):
        comprobar_csrf()
        usuario = exigir_sesion()
        if not usuario.puede(G.Permiso.GESTIONAR_REPRESENTANTES):
            abort(403)
        # La empresa se comprueba contra la gestoría ANTES de nada: sin esto,
        # el identificador del formulario mandaría sobre la frontera.
        try:
            G.empresa_de(bd(), usuario, empresa_id)
        except G.NoExiste:
            abort(404)

        centro = request.form.get("centro") or ""
        desde = (request.form.get("desde") or "").strip()
        hasta = (request.form.get("hasta") or "").strip()
        try:
            identificador = Rep.crear(
                bd(), empresa_id,
                request.form.get("nombre") or "",
                request.form.get("email") or "",
                request.form.get("contrasena") or "",
                vigente_desde=date.fromisoformat(desde) if desde
                else datetime.now(timezone.utc).date(),
                vigente_hasta=date.fromisoformat(hasta) if hasta else None,
                centro_id=centro or None,
                creado_por=usuario.id)
        except (Rep.DatoInvalido, ValueError):
            return volver("representantes", empresa_id=empresa_id, e="VALIDACION")
        except ContrasenaInvalida:
            return volver("representantes", empresa_id=empresa_id, e="CONTRASENA")
        except psycopg.errors.UniqueViolation:
            return volver("representantes", empresa_id=empresa_id, e="REPETIDO")
        # Se apunta quién dio el acceso. El día que se pregunte por qué alguien
        # veía la jornada de una plantilla, la respuesta tiene que tener nombre.
        G.apuntar(bd(), usuario, "crear", "representante", identificador,
                  detalle={"empresa": empresa_id, "ambito": centro or "empresa"})
        return volver("representantes", empresa_id=empresa_id)

    @app.post("/panel/empresas/<empresa_id>/representantes/revocar")
    def revocar_representante(empresa_id: str):
        comprobar_csrf()
        usuario = exigir_sesion()
        if not usuario.puede(G.Permiso.GESTIONAR_REPRESENTANTES):
            abort(403)
        try:
            G.empresa_de(bd(), usuario, empresa_id)
        except G.NoExiste:
            abort(404)
        identificador = request.form.get("representante") or ""
        # Y el representante se busca DENTRO de esa empresa. Revocar por
        # identificador a secas dejaría a una gestoría cerrarle la puerta al
        # representante de una plantilla que no es cliente suya.
        suyo = bd().execute(
            "select 1 from representante where id = %s and empresa_id = %s",
            (identificador, empresa_id)).fetchone()
        if not suyo:
            abort(404)
        Rep.revocar(bd(), identificador)
        G.apuntar(bd(), usuario, "revocar", "representante", identificador,
                  detalle={"empresa": empresa_id})
        return volver("representantes", empresa_id=empresa_id)

    # -------------------------------------------------------------- centros

    @app.post("/panel/empresas/<empresa_id>/centros")
    def nuevo_centro(empresa_id: str):
        comprobar_csrf()
        usuario = exigir_sesion()
        if not usuario.puede(G.Permiso.GESTIONAR_EMPRESAS):
            abort(403)
        try:
            G.empresa_de(bd(), usuario, empresa_id)
        except G.NoExiste:
            abort(404)
        nombre = (request.form.get("nombre") or "").strip()
        zona = (request.form.get("zona") or "Europe/Madrid").strip()
        if not nombre:
            return volver("empresa", empresa_id=empresa_id, e="VALIDACION")
        try:
            identificador, _ = crear_centro(bd(), empresa_id, nombre, zona)
        except ZonaInvalida:
            return volver("empresa", empresa_id=empresa_id, e="ZONA_INVALIDA")
        G.apuntar(bd(), usuario, "crear", "centro", identificador,
                  detalle={"nombre": nombre, "zona": zona})
        return volver("empresa", empresa_id=empresa_id)

    @app.post("/panel/centros/<centro_id>/rotar")
    def rotar_qr(centro_id: str):
        comprobar_csrf()
        usuario = exigir_sesion()
        if not usuario.puede(G.Permiso.ROTAR_QR):
            abort(403)
        try:
            centro = G.centro_de(bd(), usuario, centro_id)
        except G.NoExiste:
            abort(404)
        rotar_token(bd(), centro_id)
        G.apuntar(bd(), usuario, "rotar_qr", "centro", centro_id)
        return volver("empresa", empresa_id=centro["empresa_id"])

    @app.get("/panel/centros/<centro_id>/qr.svg")
    def qr(centro_id: str):
        usuario = exigir_sesion()
        try:
            G.centro_de(bd(), usuario, centro_id)
        except G.NoExiste:
            abort(404)
        import io
        import tempfile
        with tempfile.NamedTemporaryFile("w+", suffix=".svg", delete=False) as f:
            ruta = f.name
        cartel(bd(), centro_id, ruta)
        with open(ruta, encoding="utf-8") as f:
            svg = f.read()
        os.unlink(ruta)
        return Response(svg, mimetype="image/svg+xml")

    # ---------------------------------------------------------- trabajadores

    @app.get("/panel/trabajadores")
    def trabajadores():
        usuario = exigir_sesion()
        busqueda = (request.args.get("q") or "")[:80]
        pagina = max(1, int(request.args.get("p") or 1))
        gente, total = G.trabajadores_de(bd(), usuario, busqueda=busqueda,
                                         pagina=pagina)
        return render_template_string(TRABAJADORES, u=usuario, gente=gente,
                                      total=total, pagina=pagina, q=busqueda,
                                      por_pagina=50)

    @app.post("/panel/empresas/<empresa_id>/trabajadores")
    def nuevo_trabajador(empresa_id: str):
        comprobar_csrf()
        usuario = exigir_sesion()
        if not usuario.puede(G.Permiso.GESTIONAR_TRABAJADORES):
            abort(403)
        try:
            G.empresa_de(bd(), usuario, empresa_id)
        except G.NoExiste:
            abort(404)
        nombre = (request.form.get("nombre") or "").strip()
        codigo = (request.form.get("codigo") or "").strip()
        pin = (request.form.get("pin") or "").strip()
        if not nombre or not codigo:
            return volver("empresa", empresa_id=empresa_id, e="VALIDACION")
        try:
            identificador = crear_trabajador(bd(), empresa_id, nombre, codigo)
            if pin:
                poner_pin(bd(), identificador, pin)
        except psycopg.errors.UniqueViolation:
            return volver("empresa", empresa_id=empresa_id, e="CODIGO_DUPLICADO")
        except PinInvalido:
            return volver("empresa", empresa_id=empresa_id, e="PIN_INVALIDO")
        G.apuntar(bd(), usuario, "crear", "trabajador", identificador,
                  detalle={"nombre": nombre, "codigo": codigo})
        return volver("empresa", empresa_id=empresa_id)

    @app.post("/panel/trabajadores/<trabajador_id>/pin")
    def resetear_pin(trabajador_id: str):
        comprobar_csrf()
        usuario = exigir_sesion()
        if not usuario.puede(G.Permiso.GESTIONAR_TRABAJADORES):
            abort(403)
        try:
            trabajador = G.trabajador_de(bd(), usuario, trabajador_id)
        except G.NoExiste:
            abort(404)
        try:
            poner_pin(bd(), trabajador_id, (request.form.get("pin") or "").strip())
        except PinInvalido:
            return volver("empresa", empresa_id=trabajador["empresa_id"],
                          e="PIN_INVALIDO")
        # Si el PIN se cambia es porque algo pasó con el anterior. Las sesiones
        # abiertas con el viejo dejan de valer.
        cerradas = bd().execute(
            "update sesion s set cerrada_en = now() where s.trabajador_id = %s "
            "and s.cerrada_en is null", (trabajador_id,)).rowcount
        G.apuntar(bd(), usuario, "resetear_pin", "trabajador", trabajador_id,
                  detalle={"sesiones_cerradas": cerradas})
        return volver("empresa", empresa_id=trabajador["empresa_id"])

    @app.post("/panel/trabajadores/<trabajador_id>/estado")
    def cambiar_estado_trabajador(trabajador_id: str):
        comprobar_csrf()
        usuario = exigir_sesion()
        if not usuario.puede(G.Permiso.GESTIONAR_TRABAJADORES):
            abort(403)
        try:
            trabajador = G.trabajador_de(bd(), usuario, trabajador_id)
        except G.NoExiste:
            abort(404)
        activo = request.form.get("activo") == "1"
        bd().execute("update trabajador set activo = %s where id = %s",
                     (activo, trabajador_id))
        if not activo:
            bd().execute("update sesion set cerrada_en = now() where trabajador_id = %s "
                         "and cerrada_en is null", (trabajador_id,))
        G.apuntar(bd(), usuario, "alta" if activo else "baja", "trabajador",
                  trabajador_id)
        return volver("empresa", empresa_id=trabajador["empresa_id"])

    # -------------------------------------------------------------- jornada

    @app.get("/panel/empresas/<empresa_id>/jornada")
    def jornada(empresa_id: str):
        usuario = exigir_sesion()
        try:
            datos = G.empresa_de(bd(), usuario, empresa_id)
        except G.NoExiste:
            abort(404)
        try:
            dia = date.fromisoformat(request.args.get("f") or "")
        except ValueError:
            dia = datetime.now(ZoneInfo("Europe/Madrid")).date()
        anotaciones = LibroPostgres(empresa_id, bd()).anotaciones()
        gente, _ = G.trabajadores_de(bd(), usuario, empresa_id, por_pagina=500)
        # El cálculo es del dominio. Aquí no se suman horas a mano.
        #
        # Y se pide de una vez para toda la plantilla. Esto era lo peor de los
        # tres sitios que tenían el mismo bucle: carga el libro ENTERO de la
        # empresa —sin recorte de fechas, porque una jornada puede empezar el
        # día anterior— y antes lo recorría una vez por cada una de hasta 500
        # personas. Con tres años de historia eso no se aguanta.
        por_persona = jornadas_por_trabajador(anotaciones)
        filas = []
        for persona in gente:
            for j in por_persona.get(persona["id"], []):
                if j.dia == dia:
                    filas.append({"persona": persona, "j": j})
        return render_template_string(JORNADA, u=usuario, e=datos, dia=dia,
                                      filas=filas,
                                      ayer=dia - timedelta(days=1),
                                      manana=dia + timedelta(days=1))

    @app.post("/panel/empresas/<empresa_id>/verificar")
    def verificar(empresa_id: str):
        comprobar_csrf()
        usuario = exigir_sesion()
        try:
            G.empresa_de(bd(), usuario, empresa_id)
        except G.NoExiste:
            abort(404)
        resultado = G.verificar_y_guardar(bd(), empresa_id)
        G.apuntar(bd(), usuario, "verificar", "empresa", empresa_id,
                  resultado="ok" if resultado["valido"] else "fallo",
                  detalle={"motivo": resultado["motivo"]})
        return volver("empresa", empresa_id=empresa_id)

    # ------------------------------------------------------ totales mensuales

    @app.get("/panel/empresas/<empresa_id>/totales")
    def totales(empresa_id: str):
        """Horas por persona y por mes.

        El cálculo no se hace aquí: sale de `jornada.totales_mensuales`, el
        mismo que escribe `totales-mensuales.csv` dentro del expediente. Si esta
        pantalla sumara por su cuenta, algún día diría una cifra distinta de la
        que se entrega en una inspección, y las dos serían nuestras.
        """
        usuario = exigir_sesion()
        try:
            datos = G.empresa_de(bd(), usuario, empresa_id)
        except G.NoExiste:
            abort(404)
        anotaciones = LibroPostgres(empresa_id, bd()).anotaciones()
        gente = dict(bd().execute(
            "select id::text, nombre from trabajador where empresa_id = %s",
            (empresa_id,)).fetchall())
        filas = totales_mensuales(anotaciones)
        meses = sorted({f.mes for f in filas}, reverse=True)
        mes = request.args.get("mes") or (meses[0] if meses else "")
        return render_template_string(
            TOTALES, u=usuario, e=datos, meses=meses, mes=mes,
            filas=[f for f in filas if f.mes == mes],
            gente=gente,
            total=round(sum(f.horas for f in filas if f.mes == mes), 2))

    # ---------------------------------------------------------- correcciones

    @app.get("/panel/empresas/<empresa_id>/correcciones")
    def correcciones(empresa_id: str):
        usuario = exigir_sesion()
        try:
            datos = G.empresa_de(bd(), usuario, empresa_id)
        except G.NoExiste:
            abort(404)
        anotaciones = LibroPostgres(empresa_id, bd()).anotaciones()
        gente = dict(bd().execute(
            "select id::text, nombre from trabajador where empresa_id = %s",
            (empresa_id,)).fetchall())
        return render_template_string(
            CORRECCIONES, u=usuario, e=datos,
            esperan=esperando_a(anotaciones, Parte.EMPRESA),
            historial=list(reversed(correcciones_de(anotaciones))),
            fichajes=[a for a in reversed(anotaciones) if a.tipo in FICHAJES][:200],
            gente=gente, nombres={t.value: n for t, n in COMO_SE_LLAMA.items()},
            autor=lambda i: nombre_del_autor(bd(), i),
            clave=secrets.token_urlsafe(18),
            aviso=ERRORES.get(request.args.get("e", ""), ""))

    def _hora_pedida(texto, original, zona):
        try:
            horas, minutos = (int(x) for x in (texto or "").strip().split(":"))
        except (ValueError, AttributeError):
            return None
        if not (0 <= horas < 24 and 0 <= minutos < 60):
            return None
        local = original.momento.astimezone(ZoneInfo(zona))
        return local.replace(hour=horas, minute=minutos, second=0, microsecond=0)

    @app.post("/panel/empresas/<empresa_id>/correcciones")
    def proponer_correccion(empresa_id: str):
        comprobar_csrf()
        usuario = exigir_sesion()
        if not usuario.puede(G.Permiso.CORREGIR):
            abort(403)
        try:
            G.empresa_de(bd(), usuario, empresa_id)
        except G.NoExiste:
            abort(404)
        libro = LibroPostgres(empresa_id, bd())
        try:
            original = libro.anotacion(int(request.form.get("numero") or 0))
        except (ValueError, AnotacionInvalida):
            abort(404)
        if original.tipo not in FICHAJES:
            return volver("correcciones", empresa_id=empresa_id, e="NO_ES_FICHAJE")
        motivo = (request.form.get("motivo") or "").strip()
        if not motivo:
            return volver("correcciones", empresa_id=empresa_id, e="SIN_MOTIVO")
        nuevo = _hora_pedida(request.form.get("hora"), original, original.zona_horaria)
        if nuevo is None:
            return volver("correcciones", empresa_id=empresa_id, e="HORA_MAL")
        try:
            # La parte es la empresa, pero el autor es la persona del panel que
            # lo hizo. Poner aquí el id de la empresa habría borrado el único
            # dato que hace falta el día que alguien pregunte quién lo cambió.
            proponer(libro, request.form.get("clave") or secrets.token_urlsafe(18),
                     original.numero, nuevo, motivo, usuario.id, Parte.EMPRESA,
                     datetime.now(timezone.utc))
        except AnotacionInvalida as fallo:
            return volver("correcciones", empresa_id=empresa_id,
                          e="YA_HAY_PROPUESTA" if "sin contestar" in str(fallo)
                          else "SIN_MOTIVO")
        G.apuntar(bd(), usuario, "proponer_correccion", "anotacion",
                  str(original.numero), detalle={"motivo": motivo})
        return volver("correcciones", empresa_id=empresa_id)

    @app.post("/panel/empresas/<empresa_id>/correcciones/responder")
    def responder_correccion(empresa_id: str):
        comprobar_csrf()
        usuario = exigir_sesion()
        if not usuario.puede(G.Permiso.CORREGIR):
            abort(403)
        try:
            G.empresa_de(bd(), usuario, empresa_id)
        except G.NoExiste:
            abort(404)
        libro = LibroPostgres(empresa_id, bd())
        try:
            numero = int(request.form.get("numero") or 0)
            libro.anotacion(numero)
        except (ValueError, AnotacionInvalida):
            abort(404)
        acepta = request.form.get("respuesta") == "acepto"
        try:
            responder(libro, request.form.get("clave") or secrets.token_urlsafe(18),
                      numero, acepta, usuario.id, Parte.EMPRESA,
                      datetime.now(timezone.utc))
        except AnotacionInvalida as fallo:
            return volver("correcciones", empresa_id=empresa_id,
                          e="YA_RESUELTA" if "ya está resuelta" in str(fallo)
                          else "ERROR")
        G.apuntar(bd(), usuario, "aceptar" if acepta else "discrepar", "anotacion",
                  str(numero))
        return volver("correcciones", empresa_id=empresa_id)

    # ------------------------------------------------------------ expediente

    @app.get("/panel/empresas/<empresa_id>/expediente.zip")
    def expediente(empresa_id: str):
        usuario = exigir_sesion()
        try:
            datos = G.empresa_de(bd(), usuario, empresa_id)
        except G.NoExiste:
            abort(404)
        try:
            desde = date.fromisoformat(request.args["d"]) if request.args.get("d") else None
            hasta = date.fromisoformat(request.args["h"]) if request.args.get("h") else None
        except ValueError:
            desde = hasta = None
        paquete = paquete_de_empresa(bd(), empresa_id, datos["nombre"], desde, hasta)
        G.apuntar(bd(), usuario, "exportar", "empresa", empresa_id,
                  detalle={"bytes": len(paquete)})
        nombre = f"expediente-{datos['nombre'][:40].replace(' ', '-')}.zip"
        return Response(paquete, mimetype="application/zip",
                        headers={"Content-Disposition":
                                 f'attachment; filename="{nombre}"'})

    # -------------------------------------------------------------- usuarios

    @app.get("/panel/usuarios")
    def usuarios():
        usuario = exigir_sesion()
        if not usuario.puede(G.Permiso.GESTIONAR_USUARIOS):
            abort(403)
        return render_template_string(USUARIOS, u=usuario,
                                      lista=G.usuarios_de(bd(), usuario),
                                      aviso=ERRORES.get(request.args.get("e", ""), ""))

    @app.post("/panel/usuarios")
    def nuevo_usuario():
        comprobar_csrf()
        usuario = exigir_sesion()
        if not usuario.puede(G.Permiso.GESTIONAR_USUARIOS):
            abort(403)
        email = (request.form.get("email") or "").strip().lower()
        nombre = (request.form.get("nombre") or "").strip()
        contrasena = request.form.get("contrasena") or ""
        # El rol se acepta solo de la lista conocida. Cualquier otra cosa que
        # llegue en el formulario se ignora.
        rol = G.Rol.ADMIN if request.form.get("rol") == G.Rol.ADMIN.value else G.Rol.USUARIO
        if not email or not nombre:
            return volver("usuarios", e="VALIDACION")
        try:
            identificador = G.crear_usuario(bd(), usuario.gestoria_id, email,
                                            nombre, contrasena, rol)
        except ContrasenaInvalida:
            return volver("usuarios", e="CONTRASENA_INVALIDA")
        except psycopg.errors.UniqueViolation:
            return volver("usuarios", e="EMAIL_DUPLICADO")
        G.apuntar(bd(), usuario, "crear", "usuario", identificador,
                  detalle={"email": email, "rol": rol.value})
        return volver("usuarios")

    @app.post("/panel/usuarios/<usuario_id>/estado")
    def cambiar_estado_usuario(usuario_id: str):
        comprobar_csrf()
        usuario = exigir_sesion()
        if not usuario.puede(G.Permiso.GESTIONAR_USUARIOS):
            abort(403)
        # Dentro de la gestoría, y nunca uno mismo: quedarse fuera del panel
        # sin poder volver a entrar es un incidente evitable.
        objetivo = bd().execute(
            "select id::text from usuario_gestoria where id = %s and gestoria_id = %s",
            (usuario_id, usuario.gestoria_id)).fetchone()
        if objetivo is None or usuario_id == usuario.id:
            abort(404 if objetivo is None else 403)
        activo = request.form.get("activo") == "1"
        bd().execute("update usuario_gestoria set activo = %s where id = %s",
                     (activo, usuario_id))
        if not activo:
            G.cerrar_sesiones_de(bd(), usuario_id)
        G.apuntar(bd(), usuario, "alta" if activo else "baja", "usuario", usuario_id)
        return volver("usuarios")

    @app.get("/panel/registro")
    def registro():
        usuario = exigir_sesion()
        return render_template_string(REGISTRO, u=usuario,
                                      lineas=G.registro_de(bd(), usuario))

    return app


# ------------------------------------------------------------------ plantillas

BASE = """
<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{ titulo|default('Panel') }}</title>
<style>
 :root{--linea:#e3e5e8;--suave:#6b7280;--fondo:#f7f8fa;--tarjeta:#fff;--texto:#111827}
 @media(prefers-color-scheme:dark){:root{--linea:#2e3238;--suave:#9aa0a8;
   --fondo:#0f1114;--tarjeta:#181b1f;--texto:#eceef1}}
 *{box-sizing:border-box}
 body{margin:0;font:15px/1.55 system-ui,-apple-system,sans-serif;
      background:var(--fondo);color:var(--texto)}
 header{background:var(--tarjeta);border-bottom:1px solid var(--linea);
        padding:0 20px;display:flex;gap:22px;align-items:center;flex-wrap:wrap}
 header .marca{font-weight:700;padding:14px 0;margin-right:8px}
 header a{color:var(--suave);text-decoration:none;padding:14px 0;font-size:14px}
 header a.activo{color:var(--texto);box-shadow:inset 0 -2px 0 #0a7d34}
 header form{margin-left:auto}
 main{max-width:1080px;margin:24px auto;padding:0 20px}
 h1{font-size:22px;margin:0 0 4px}
 h2{font-size:16px;margin:28px 0 10px}
 .sub{color:var(--suave);margin:0 0 20px;font-size:14px}
 .tarjeta{background:var(--tarjeta);border:1px solid var(--linea);
          border-radius:10px;padding:18px;margin-bottom:16px}
 .cifras{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}
 .cifra{background:var(--tarjeta);border:1px solid var(--linea);border-radius:10px;
        padding:16px}
 .cifra b{display:block;font-size:30px;font-weight:650;letter-spacing:-1px}
 .cifra span{color:var(--suave);font-size:13px}
 table{width:100%;border-collapse:collapse;background:var(--tarjeta);
       border:1px solid var(--linea);border-radius:10px;overflow:hidden}
 th{text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.4px;
    color:var(--suave);padding:10px 14px;border-bottom:1px solid var(--linea)}
 td{padding:11px 14px;border-bottom:1px solid var(--linea);font-size:14px}
 tr:last-child td{border-bottom:0}
 a{color:#0a7d34}
 .etq{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;
      background:#eef0f3;color:var(--suave)}
 @media(prefers-color-scheme:dark){.etq{background:#24282e}}
 .etq.dentro{background:#dcf3e3;color:#0a5c27}
 .etq.pausa{background:#fdf0d5;color:#8a5a00}
 .etq.mal{background:#fdecec;color:#9b1c1c}
 .aviso{background:#fdecec;color:#9b1c1c;padding:12px 14px;border-radius:8px;
        margin-bottom:16px;font-size:14px}
 .alarma{background:#9b1c1c;color:#fff;padding:16px;border-radius:10px;
         margin-bottom:20px}
 .alarma a{color:#fff}
 input,select{padding:9px 11px;font-size:14px;border:1px solid var(--linea);
              border-radius:7px;background:var(--tarjeta);color:var(--texto)}
 button{padding:9px 15px;font-size:14px;font-weight:600;border:0;border-radius:7px;
        background:#0a7d34;color:#fff;cursor:pointer}
 button.gris{background:#eef0f3;color:var(--texto)}
 @media(prefers-color-scheme:dark){button.gris{background:#24282e}}
 form.linea{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
 .vacio{color:var(--suave);padding:28px;text-align:center}
 .pag{display:flex;gap:10px;align-items:center;margin-top:12px;color:var(--suave);
      font-size:13px}
</style></head><body>
{% if u is defined %}
<header>
  <span class="marca">{{ u.gestoria }}</span>
  <a href="{{ url_for('portada') }}">Resumen</a>
  <a href="{{ url_for('empresas') }}">Empresas</a>
  <a href="{{ url_for('trabajadores') }}">Trabajadores</a>
  {% if u.puede(Permiso.GESTIONAR_USUARIOS) %}
  <a href="{{ url_for('usuarios') }}">Usuarios</a>{% endif %}
  <a href="{{ url_for('registro') }}">Actividad</a>
  <form method="post" action="{{ url_for('salir') }}">
    <input type="hidden" name="csrf" value="{{ csrf() }}">
    <button class="gris" type="submit">Salir · {{ u.nombre }}</button></form>
</header>{% endif %}
<main>CUERPO</main></body></html>
"""

ACCESO = """
<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Entrar</title><style>
 body{margin:0;font:15px/1.5 system-ui,sans-serif;background:#f7f8fa;color:#111827;
      display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
 @media(prefers-color-scheme:dark){body{background:#0f1114;color:#eceef1}}
 .caja{background:#fff;border-radius:12px;padding:28px;width:100%;max-width:380px;
       box-shadow:0 1px 3px rgba(0,0,0,.1)}
 @media(prefers-color-scheme:dark){.caja{background:#181b1f}}
 h1{font-size:20px;margin:0 0 22px}
 label{display:block;font-size:13px;color:#6b7280;margin-bottom:5px}
 input{width:100%;padding:11px;font-size:15px;border:1px solid #d5d8dd;
       border-radius:8px;margin-bottom:14px;background:transparent;color:inherit}
 button{width:100%;padding:12px;font-size:15px;font-weight:600;border:0;
        border-radius:8px;background:#0a7d34;color:#fff;cursor:pointer}
 .aviso{background:#fdecec;color:#9b1c1c;padding:11px;border-radius:8px;
        margin-bottom:16px;font-size:14px}
</style></head><body><div class="caja">
<h1>Panel de gestoría</h1>
{% if aviso %}<div class="aviso">{{ aviso }}</div>{% endif %}
<form method="post">
  <input type="hidden" name="csrf" value="{{ csrf() }}">
  <label for="email">Correo</label>
  <input id="email" name="email" type="email" value="{{ email }}" required autofocus>
  <label for="contrasena">Contraseña</label>
  <input id="contrasena" name="contrasena" type="password" required>
  <button type="submit">Entrar</button>
</form></div></body></html>
"""

PORTADA = BASE.replace("CUERPO", """
{% if rotas %}<div class="alarma"><b>Integridad del libro</b><br>
{{ rotas|length }} empresa{{ 's' if rotas|length != 1 }} con el registro alterado.
Ninguna se repara sola y no se debe seguir escribiendo en ellas hasta revisarlo.
<ul>{% for r in rotas %}<li><a href="{{ url_for('empresa', empresa_id=r.id) }}"
  >{{ r.nombre }}</a> — anotación {{ r.anotacion }}: {{ r.motivo }}
  (comprobado el {{ r.momento.strftime('%d/%m %H:%M') }})</li>{% endfor %}</ul>
</div>{% endif %}
{% if sin_comprobar %}<div class="tarjeta"><b>{{ sin_comprobar }}</b> empresa{{
 's' if sin_comprobar != 1 }} con fichajes que no se ha comprobado nunca.
 Se comprueba desde la ficha de cada empresa, o de golpe con
 <code>python3 -m fichaje.admin verificar</code>.</div>{% endif %}
{% if aviso %}<div class="aviso">{{ aviso }}</div>{% endif %}
<h1>Resumen</h1>
<p class="sub">{{ hoy.strftime('%d/%m/%Y') }}</p>
<div class="cifras">
  <div class="cifra"><b>{{ d.empresas }}</b><span>Empresas</span></div>
  <div class="cifra"><b>{{ d.trabajadores }}</b><span>Personas de alta</span></div>
  <div class="cifra"><b>{{ d.dentro }}</b><span>Trabajando ahora</span></div>
  <div class="cifra"><b>{{ d.en_pausa }}</b><span>En pausa</span></div>
  <div class="cifra"><b>{{ d.fichajes_hoy }}</b><span>Fichajes hoy</span></div>
  <div class="cifra"><b>{{ d.retroactivos }}</b><span>Fichajes retroactivos</span></div>
</div>
""")

EMPRESAS = BASE.replace("CUERPO", """
{% if aviso %}<div class="aviso">{{ aviso }}</div>{% endif %}
<h1>Empresas</h1><p class="sub">{{ total }} en total</p>
<div class="tarjeta"><form class="linea" method="get">
  <input name="q" value="{{ q }}" placeholder="Buscar empresa">
  <button class="gris" type="submit">Buscar</button>
</form></div>
{% if u.puede(Permiso.GESTIONAR_EMPRESAS) %}
<div class="tarjeta"><form class="linea" method="post"
  action="{{ url_for('nueva_empresa') }}">
  <input type="hidden" name="csrf" value="{{ csrf() }}">
  <input name="nombre" placeholder="Nombre de la empresa cliente" required>
  <button type="submit">Dar de alta</button></form></div>{% endif %}
{% if empresas %}
<table><tr><th>Empresa</th><th>Centros</th><th>Personas</th><th>Fichajes</th>
<th>Estado</th></tr>
{% for e in empresas %}<tr>
 <td><a href="{{ url_for('empresa', empresa_id=e.id) }}">{{ e.nombre }}</a></td>
 <td>{{ e.centros }}</td><td>{{ e.trabajadores }}</td><td>{{ e.anotaciones }}</td>
 <td>{% if e.activa %}<span class="etq dentro">activa</span>
     {% else %}<span class="etq">inactiva</span>{% endif %}</td>
</tr>{% endfor %}</table>
<div class="pag">
 {% if pagina > 1 %}<a href="?q={{ q }}&p={{ pagina-1 }}">anterior</a>{% endif %}
 <span>página {{ pagina }} de {{ (total // por_pagina) + 1 }}</span>
 {% if total > pagina * por_pagina %}<a href="?q={{ q }}&p={{ pagina+1 }}">siguiente</a>{% endif %}
</div>
{% else %}<div class="tarjeta vacio">Todavía no hay ninguna empresa.
{% if u.puede(Permiso.GESTIONAR_EMPRESAS) %}Da de alta la primera arriba.{% endif %}
</div>{% endif %}
""")

EMPRESA = BASE.replace("CUERPO", """
{% if aviso %}<div class="aviso">{{ aviso }}</div>{% endif %}
<h1>{{ e.nombre }}</h1>
<p class="sub"><a href="{{ url_for('jornada', empresa_id=e.id) }}">Ver la jornada de hoy</a>
 · <a href="{{ url_for('correcciones', empresa_id=e.id) }}">Correcciones</a>
 · <a href="{{ url_for('expediente', empresa_id=e.id) }}">Exportar registro</a>
 · <a href="{{ url_for('totales', empresa_id=e.id) }}">Horas del mes</a>
 · <a href="{{ url_for('representantes', empresa_id=e.id) }}">Representación</a></p>

{% if v and not v.valido %}
<div class="alarma"><b>El libro de esta empresa no cuadra</b><br>
Anotación {{ v.primera_fallida }}: {{ v.motivo }}.<br>
No se repara desde aquí, y no debería seguir escribiéndose hasta revisarlo.</div>
{% endif %}

<h2>Integridad</h2>
<div class="tarjeta">
 <p style="margin:0 0 10px">
  {% if not v %}<span class="etq">sin comprobar</span>
  {% elif v.valido %}<span class="etq dentro">correcta</span>
  {% else %}<span class="etq mal">requiere revisión</span>{% endif %}
  {% if v %}· {{ v.anotaciones }} anotaciones
  · comprobado el {{ v.momento.strftime('%d/%m/%Y a las %H:%M') }}{% endif %}</p>
 <form method="post" action="{{ url_for('verificar', empresa_id=e.id) }}">
  <input type="hidden" name="csrf" value="{{ csrf() }}">
  <button class="gris" type="submit">Verificar ahora</button></form>
</div>

<h2>Centros de trabajo</h2>
{% if centros %}<table><tr><th>Centro</th><th>Zona horaria</th><th>QR</th><th></th></tr>
{% for c in centros %}<tr>
 <td>{{ c.nombre }}</td><td>{{ c.zona }}</td>
 <td><a href="{{ url_for('qr', centro_id=c.id) }}">descargar cartel</a></td>
 <td>{% if u.puede(Permiso.ROTAR_QR) %}
  <form method="post" action="{{ url_for('rotar_qr', centro_id=c.id) }}">
   <input type="hidden" name="csrf" value="{{ csrf() }}">
   <button class="gris" type="submit">Rotar QR</button></form>{% endif %}</td>
</tr>{% endfor %}</table>
{% else %}<div class="tarjeta vacio">Sin centros todavía.</div>{% endif %}
{% if u.puede(Permiso.GESTIONAR_EMPRESAS) %}
<div class="tarjeta"><form class="linea" method="post"
  action="{{ url_for('nuevo_centro', empresa_id=e.id) }}">
  <input type="hidden" name="csrf" value="{{ csrf() }}">
  <input name="nombre" placeholder="Nombre del centro" required>
  <input name="zona" value="Europe/Madrid">
  <button type="submit">Añadir centro</button></form></div>{% endif %}

<h2>Personas</h2>
{% if gente %}<table><tr><th>Nombre</th><th>Código</th><th>Ahora</th>
<th>Último fichaje</th><th></th></tr>
{% for p in gente %}<tr>
 <td>{{ p.nombre }}{% if not p.activo %} <span class="etq">de baja</span>{% endif %}</td>
 <td>{{ p.codigo }}</td>
 <td>{% if p.estado == 'dentro' %}<span class="etq dentro">trabajando</span>
     {% elif p.estado == 'en_pausa' %}<span class="etq pausa">en pausa</span>
     {% else %}<span class="etq">fuera</span>{% endif %}</td>
 <td>{{ p.ultimo.strftime('%d/%m %H:%M') if p.ultimo else '—' }}</td>
 <td>{% if u.puede(Permiso.GESTIONAR_TRABAJADORES) %}
  <form class="linea" method="post"
    action="{{ url_for('resetear_pin', trabajador_id=p.id) }}">
   <input type="hidden" name="csrf" value="{{ csrf() }}">
   <input name="pin" size="8" placeholder="PIN nuevo" inputmode="numeric">
   <button class="gris" type="submit">Cambiar PIN</button></form>
  <form method="post" action="{{ url_for('cambiar_estado_trabajador', trabajador_id=p.id) }}">
   <input type="hidden" name="csrf" value="{{ csrf() }}">
   <input type="hidden" name="activo" value="{{ '0' if p.activo else '1' }}">
   <button class="gris" type="submit">{{ 'Dar de baja' if p.activo else 'Dar de alta' }}</button>
  </form>{% endif %}</td>
</tr>{% endfor %}</table>
{% else %}<div class="tarjeta vacio">Sin personas todavía.</div>{% endif %}
{% if u.puede(Permiso.GESTIONAR_TRABAJADORES) %}
<div class="tarjeta"><form class="linea" method="post"
  action="{{ url_for('nuevo_trabajador', empresa_id=e.id) }}">
  <input type="hidden" name="csrf" value="{{ csrf() }}">
  <input name="nombre" placeholder="Nombre y apellidos" required>
  <input name="codigo" placeholder="Código" size="10" required>
  <input name="pin" placeholder="PIN inicial" size="10" inputmode="numeric">
  <button type="submit">Dar de alta</button></form></div>{% endif %}
""")

TRABAJADORES = BASE.replace("CUERPO", """
<h1>Trabajadores</h1><p class="sub">{{ total }} en total</p>
<div class="tarjeta"><form class="linea" method="get">
  <input name="q" value="{{ q }}" placeholder="Buscar por nombre o código">
  <button class="gris" type="submit">Buscar</button></form></div>
{% if gente %}<table><tr><th>Nombre</th><th>Código</th><th>Empresa</th>
<th>Ahora</th><th>Último fichaje</th></tr>
{% for p in gente %}<tr>
 <td>{{ p.nombre }}{% if not p.activo %} <span class="etq">de baja</span>{% endif %}</td>
 <td>{{ p.codigo }}</td>
 <td><a href="{{ url_for('empresa', empresa_id=p.empresa_id) }}">{{ p.empresa }}</a></td>
 <td>{% if p.estado == 'dentro' %}<span class="etq dentro">trabajando</span>
     {% elif p.estado == 'en_pausa' %}<span class="etq pausa">en pausa</span>
     {% else %}<span class="etq">fuera</span>{% endif %}</td>
 <td>{{ p.ultimo.strftime('%d/%m %H:%M') if p.ultimo else '—' }}</td>
</tr>{% endfor %}</table>
<div class="pag">
 {% if pagina > 1 %}<a href="?q={{ q }}&p={{ pagina-1 }}">anterior</a>{% endif %}
 <span>página {{ pagina }}</span>
 {% if total > pagina * por_pagina %}<a href="?q={{ q }}&p={{ pagina+1 }}">siguiente</a>{% endif %}
</div>
{% else %}<div class="tarjeta vacio">No hay nadie que coincida.</div>{% endif %}
""")

JORNADA = BASE.replace("CUERPO", """
<h1>{{ e.nombre }}</h1>
<p class="sub"><a href="{{ url_for('empresa', empresa_id=e.id) }}">Volver a la empresa</a></p>
<div class="tarjeta"><form class="linea" method="get">
  <a href="?f={{ ayer }}">←</a>
  <input type="date" name="f" value="{{ dia }}">
  <button class="gris" type="submit">Ver</button>
  <a href="?f={{ manana }}">→</a></form></div>
{% if filas %}<table><tr><th>Persona</th><th>Entrada</th><th>Salida</th>
<th>Pausas</th><th>Horas</th><th>Incidencias</th></tr>
{% for f in filas %}<tr>
 <td>{{ f.persona.nombre }}</td>
 <td>{{ f.j.entrada.strftime('%H:%M') }}</td>
 <td>{{ f.j.salida.strftime('%H:%M') if f.j.salida else '—' }}</td>
 <td>{{ '%d min'|format(f.j.pausas.total_seconds() // 60) }}</td>
 <td><b>{{ f.j.horas }}</b></td>
 <td>{% for i in f.j.incidencias %}<span class="etq mal">{{ i }}</span> {% endfor %}
     {% if f.j.retroactiva %}<span class="etq pausa">retroactivo</span>{% endif %}
     {% if f.j.corregida %}<span class="etq">corregida</span>{% endif %}</td>
</tr>{% endfor %}</table>
{% else %}<div class="tarjeta vacio">Nadie fichó este día.</div>{% endif %}
""")

USUARIOS = BASE.replace("CUERPO", """
{% if aviso %}<div class="aviso">{{ aviso }}</div>{% endif %}
<h1>Usuarios</h1><p class="sub">Quién puede entrar en este panel</p>
<table><tr><th>Nombre</th><th>Correo</th><th>Permisos</th><th>Estado</th><th></th></tr>
{% for x in lista %}<tr>
 <td>{{ x.nombre }}</td><td>{{ x.email }}</td>
 <td>{{ 'Administración' if x.rol == 'gestoria_admin' else 'Uso diario' }}</td>
 <td>{% if x.activo %}<span class="etq dentro">activo</span>
     {% else %}<span class="etq">inactivo</span>{% endif %}</td>
 <td>{% if x.id != u.id %}
  <form method="post" action="{{ url_for('cambiar_estado_usuario', usuario_id=x.id) }}">
   <input type="hidden" name="csrf" value="{{ csrf() }}">
   <input type="hidden" name="activo" value="{{ '0' if x.activo else '1' }}">
   <button class="gris" type="submit">{{ 'Desactivar' if x.activo else 'Activar' }}</button>
  </form>{% endif %}</td>
</tr>{% endfor %}</table>
<div class="tarjeta"><form class="linea" method="post">
  <input type="hidden" name="csrf" value="{{ csrf() }}">
  <input name="nombre" placeholder="Nombre" required>
  <input name="email" type="email" placeholder="Correo" required>
  <input name="contrasena" type="password" placeholder="Contraseña (12+)" required>
  <select name="rol"><option value="gestoria_user">Uso diario</option>
   <option value="gestoria_admin">Administración</option></select>
  <button type="submit">Crear usuario</button></form>
<p class="sub" style="margin:12px 0 0">La contraseña se la das tú a la persona y
la cambia después. Todavía no hay invitaciones por correo.</p></div>
""")

REGISTRO = BASE.replace("CUERPO", """
<h1>Actividad</h1>
<p class="sub">Lo que ha hecho el personal de la gestoría. No es el libro de
fichajes: son dos registros distintos.</p>
<table><tr><th>Cuándo</th><th>Quién</th><th>Qué</th><th>Sobre</th><th>Resultado</th></tr>
{% for l in lineas %}<tr>
 <td>{{ l.momento.strftime('%d/%m %H:%M') }}</td><td>{{ l.actor }}</td>
 <td>{{ l.accion }}</td><td>{{ l.entidad }}</td>
 <td>{% if l.resultado == 'ok' %}ok{% else %}<span class="etq mal">{{ l.resultado }}</span>{% endif %}</td>
</tr>{% endfor %}</table>
{% if not lineas %}<div class="tarjeta vacio">Todavía no hay actividad.</div>{% endif %}
""")

CORRECCIONES = BASE.replace("CUERPO", """
{% if aviso %}<div class="aviso">{{ aviso }}</div>{% endif %}
<h1>Correcciones · {{ e.nombre }}</h1>
<p class="sub"><a href="{{ url_for('empresa', empresa_id=e.id) }}">Volver a la empresa</a>
 · Un fichaje no se modifica nunca: se propone un cambio y la otra parte
 responde. Todo queda escrito, haya acuerdo o no.</p>

{% if esperan %}
<h2>Esperan tu respuesta</h2>
{% for c in esperan %}
<div class="tarjeta">
 <p style="margin:0 0 8px"><b>{{ gente.get(c.original.trabajador_id, '—') }}</b> ·
  {{ c.original.local().strftime('%d/%m/%Y') }} ·
  {{ nombres[c.original.tipo.value] }}</p>
 <p style="margin:0 0 8px">
  {{ c.original.local().strftime('%H:%M') }} →
  <b>{{ c.propuesta.local(c.propuesta.momento_propuesto).strftime('%H:%M') }}</b>
  · «{{ c.propuesta.motivo }}»</p>
 <p class="sub" style="margin:0 0 12px">Lo pide {{ autor(c.propuesta.autor_id) }},
  el {{ c.propuesta.local(c.propuesta.anotado_en).strftime('%d/%m/%Y') }}</p>
 {% if u.puede(Permiso.CORREGIR) %}
 <form class="linea" method="post"
   action="{{ url_for('responder_correccion', empresa_id=e.id) }}">
  <input type="hidden" name="csrf" value="{{ csrf() }}">
  <input type="hidden" name="numero" value="{{ c.propuesta.numero }}">
  <input type="hidden" name="clave" value="{{ clave }}-a{{ c.propuesta.numero }}">
  <input type="hidden" name="respuesta" value="acepto">
  <button type="submit">Aceptar el cambio</button></form>
 <form class="linea" method="post" style="margin-top:8px"
   action="{{ url_for('responder_correccion', empresa_id=e.id) }}">
  <input type="hidden" name="csrf" value="{{ csrf() }}">
  <input type="hidden" name="numero" value="{{ c.propuesta.numero }}">
  <input type="hidden" name="clave" value="{{ clave }}-d{{ c.propuesta.numero }}">
  <input type="hidden" name="respuesta" value="discrepo">
  <button class="gris" type="submit">No aceptar y dejar constancia</button></form>
 {% endif %}
</div>
{% endfor %}
{% endif %}

{% if u.puede(Permiso.CORREGIR) %}
<h2>Proponer un cambio</h2>
<div class="tarjeta"><form class="linea" method="post"
  action="{{ url_for('proponer_correccion', empresa_id=e.id) }}">
 <input type="hidden" name="csrf" value="{{ csrf() }}">
 <input type="hidden" name="clave" value="{{ clave }}-p">
 <select name="numero">
  {% for a in fichajes %}<option value="{{ a.numero }}">
   {{ gente.get(a.trabajador_id, '—') }} ·
   {{ a.local().strftime('%d/%m %H:%M') }} · {{ nombres[a.tipo.value] }}</option>
  {% endfor %}</select>
 <input name="hora" placeholder="18:30" size="7" required>
 <input name="motivo" placeholder="Por qué se cambia" required>
 <button type="submit">Proponer</button></form></div>
{% endif %}

<h2>Historial</h2>
{% if historial %}
<table><tr><th>Trabajador</th><th>Día</th><th>Original</th><th>Propuesta</th>
<th>Motivo</th><th>Lo pide</th><th>Resultado</th></tr>
{% for c in historial %}<tr>
 <td>{{ gente.get(c.original.trabajador_id, '—') }}</td>
 <td>{{ c.original.local().strftime('%d/%m/%Y') }}</td>
 <td>{{ c.original.local().strftime('%H:%M') }}</td>
 <td>{{ c.propuesta.local(c.propuesta.momento_propuesto).strftime('%H:%M') }}</td>
 <td>{{ c.propuesta.motivo }}</td>
 <td>{{ autor(c.propuesta.autor_id) }}</td>
 <td>{% if c.aceptada %}<span class="etq dentro">aceptada</span>
     {% elif c.pendiente %}<span class="etq pausa">sin contestar</span>
     {% else %}<span class="etq mal">sin acuerdo</span>{% endif %}</td>
</tr>{% endfor %}</table>
{% else %}<div class="tarjeta vacio">Todavía no se ha pedido ningún cambio.</div>
{% endif %}
""")

TOTALES = BASE.replace("CUERPO", """
<h1>{{ e.nombre }}</h1>
<p class="sub">Horas por persona y mes ·
   <a href="{{ url_for('empresa', empresa_id=e.id) }}">volver a la empresa</a></p>

{% if meses %}
<form class="linea tarjeta" method="get">
  <label>Mes <select name="mes">
    {% for m in meses %}<option value="{{ m }}"{% if m == mes %} selected{% endif %}>{{ m }}</option>{% endfor %}
  </select></label>
  <button>Ver</button>
  <a href="{{ url_for('expediente', empresa_id=e.id) }}">Descargar el expediente</a>
</form>
<table>
 <tr><th>Persona</th><th>Días</th><th>Horas</th><th>Pausas</th><th></th></tr>
 {% for f in filas %}
 <tr>
  <td>{{ gente.get(f.trabajador_id, f.trabajador_id) }}</td>
  <td>{{ f.dias }}</td>
  <td><b>{{ '%.2f'|format(f.horas) }}</b></td>
  <td>{{ '%.2f'|format(f.pausa) }}</td>
  <td>{% if f.sin_cerrar %}<span class="etq mal">{{ f.sin_cerrar }} sin cerrar</span>{% endif %}
      {% if f.con_correccion %}<span class="etq">{{ f.con_correccion }} corregida{{ 's' if f.con_correccion > 1 }}</span>{% endif %}</td>
 </tr>
 {% endfor %}
 <tr><td><b>Total</b></td><td></td><td><b>{{ '%.2f'|format(total) }}</b></td><td></td><td></td></tr>
</table>
<p class="sub">Estas son las horas con las correcciones acordadas ya aplicadas, y
son exactamente las que salen en <code>totales-mensuales.csv</code> dentro del
expediente: las calcula el mismo código.</p>
{% else %}
<p class="tarjeta">Todavía no hay jornadas registradas.</p>
{% endif %}
""")


REPRESENTANTES = BASE.replace("CUERPO", """
<h1>{{ e.nombre }}</h1>
<p class="sub">Representación de la plantilla ·
   <a href="{{ url_for('empresa', empresa_id=e.id) }}">volver a la empresa</a></p>
{% if aviso %}<p class="aviso">{{ aviso }}</p>{% endif %}

<div class="tarjeta">
<p class="sub" style="margin:0">Quien representa a la plantilla puede consultar
el registro de jornada de su ámbito, y solo consultarlo: desde su acceso no se
puede modificar ni proponer nada. Cada consulta queda apuntada abajo, y la ve
tanto la empresa como quien la hizo.</p>
</div>

<h2>Con acceso</h2>
{% if filas %}
<table>
 <tr><th>Nombre</th><th>Correo</th><th>Ámbito</th><th>Mandato</th><th></th></tr>
 {% for r in filas %}
 <tr>
  <td>{{ r.nombre }}</td>
  <td>{{ r.email }}</td>
  <td>{% if r.ambito == 'centro' %}{{ r.centro }}{% else %}Toda la plantilla{% endif %}</td>
  <td>{{ r.vigente_desde }} — {% if r.vigente_hasta %}{{ r.vigente_hasta }}{% else %}sin fecha{% endif %}
      {% if r.revocado_en %}<span class="etq mal">revocado</span>
      {% elif not r.vigente(hoy) %}<span class="etq">fuera de vigencia</span>
      {% else %}<span class="etq dentro">con acceso</span>{% endif %}</td>
  <td>{% if not r.revocado_en and u.puede(Permiso.GESTIONAR_REPRESENTANTES) %}
      <form method="post" action="{{ url_for('revocar_representante', empresa_id=e.id) }}">
        <input type="hidden" name="csrf" value="{{ csrf() }}">
        <input type="hidden" name="representante" value="{{ r.id }}">
        <button class="gris">Revocar</button></form>{% endif %}</td>
 </tr>
 {% endfor %}
</table>
{% else %}
<p class="tarjeta">Todavía no hay nadie dado de alta.</p>
{% endif %}

{% if u.puede(Permiso.GESTIONAR_REPRESENTANTES) %}
<h2>Dar acceso</h2>
<form method="post" class="tarjeta">
  <input type="hidden" name="csrf" value="{{ csrf() }}">
  <p class="linea">
    <label>Nombre <input name="nombre" required></label>
    <label>Correo <input name="email" type="email" required></label>
  </p>
  <p class="linea">
    <label>Contraseña <input name="contrasena" type="password" required></label>
    <label>Ámbito <select name="centro">
      <option value="">Toda la plantilla</option>
      {% for c in centros %}<option value="{{ c.id }}">{{ c.nombre }}</option>{% endfor %}
    </select></label>
  </p>
  <p class="linea">
    <label>Desde <input name="desde" type="date" value="{{ hoy }}"></label>
    <label>Hasta <input name="hasta" type="date"></label>
    <button>Dar acceso</button>
  </p>
  <p class="sub" style="margin:8px 0 0">El mandato caduca solo en la fecha de
  fin. Si no se pone ninguna, el acceso dura hasta que se revoque a mano.</p>
</form>
{% endif %}

<h2>Quién ha consultado</h2>
{% if accesos %}
<table>
 <tr><th>Cuándo</th><th>Quién</th><th>Qué</th><th>Periodo o persona</th></tr>
 {% for a in accesos %}
 <tr><td>{{ a.momento.strftime('%d/%m/%Y %H:%M') }}</td><td>{{ a.quien }}</td>
     <td>{{ a.accion }}</td><td>{{ a.detalle }}</td></tr>
 {% endfor %}
</table>
{% else %}
<p class="tarjeta">Nadie ha consultado todavía.</p>
{% endif %}
""")


SIMPLE = """
<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{ titulo }}</title><style>body{margin:0;font:15px/1.5 system-ui,sans-serif;
 display:flex;align-items:center;justify-content:center;min-height:100vh;
 background:#f7f8fa;color:#111827;text-align:center;padding:20px}
 @media(prefers-color-scheme:dark){body{background:#0f1114;color:#eceef1}}</style>
</head><body><div><h1>{{ titulo }}</h1><p>{{ texto }}</p></div></body></html>
"""


if __name__ == "__main__":
    crear_panel().run(host="0.0.0.0", port=int(os.environ.get("PUERTO_PANEL", "5001")))
