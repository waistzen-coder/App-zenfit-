"""El fichaje desde el móvil. `python3 -m fichaje.web`

Un QR pegado en la pared, una página, un botón. El trabajador no instala nada.

Tres decisiones que sostienen todo lo demás:

**La hora la pone el servidor.** El navegador puede enseñar un reloj, pero no
manda ninguna hora y, si la mandara, se ignoraría. El huso con el que se
presenta sale del centro de trabajo guardado en la base, nunca del móvil.

**La web no sabe reglas laborales.** Qué botón toca lo decide el dominio
(`estado_actual`, `acciones_posibles`); aquí solo se dibuja lo que el dominio
diga y se rechaza lo que no esté en esa lista. Si mañana cambia la regla,
cambia en un sitio.

**El QR identifica el centro, no a la persona.** Quien fotografíe el cartel
tendrá una URL válida y nada más: sigue necesitando el código y el PIN de
alguien. El QR no es prueba de presencia física y no se presenta como tal.
"""

import os
import secrets
from datetime import datetime, timedelta, timezone
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

from .correcciones import (
    correcciones_de,
    esperando_a,
    nombre_del_autor,
    proponer,
    responder,
)
from .credenciales import comprobar, huella_de_token, nuevo_token
from .exportar import fila_segura_para_hoja
from .jornada import COMO_SE_LLAMA, acciones_posibles, estado_actual, jornadas_de, ultimo_fichaje
from .postgres import LibroPostgres, conectar
from .registro import FICHAJES, AnotacionInvalida, IntegridadRota, Parte, Tipo

# --------------------------------------------------------------- configuración

DURACION_SESION = timedelta(hours=12)      # un turno largo, y no más
FICHAJES_WEB = FICHAJES          # los tipos que el trabajador puede corregir

FALLOS_POR_CODIGO = 5                      # antes de bloquear a esa persona
FALLOS_POR_ORIGEN = 20                     # antes de bloquear a esa red
VENTANA_BLOQUEO = timedelta(minutes=15)

# Lo que ve el usuario y lo que se apunta por dentro. Nunca una traza de error.
ERRORES = {
    "CENTRO_NO_ENCONTRADO": "Este código QR no corresponde a ningún centro de trabajo.",
    "TRABAJADOR_NO_ENCONTRADO": "El código o el PIN no son correctos.",
    "TRABAJADOR_INACTIVO": "Esta persona ya no está dada de alta en la empresa.",
    "ACCESO_FALLIDO": "El código o el PIN no son correctos.",
    "DEMASIADOS_INTENTOS": "Demasiados intentos fallidos. Prueba de nuevo dentro "
                           "de un rato o pídele a la empresa que te desbloquee.",
    "SESION_CADUCADA": "Se ha cerrado la sesión. Vuelve a identificarte.",
    "ACCION_NO_PERMITIDA": "Esa acción no se puede hacer ahora mismo.",
    "PETICION_REPETIDA": "Ese fichaje ya estaba registrado.",
    "BASE_NO_DISPONIBLE": "No se ha podido conectar. Inténtalo otra vez en unos segundos.",
    "INTEGRIDAD": "Hay un problema con el registro de esta empresa. Se ha avisado "
                  "y no se van a anotar más fichajes hasta revisarlo.",
    "NO_ES_TUYO": "Ese registro no es tuyo.",
    "YA_RESUELTA": "Esa propuesta ya estaba contestada.",
    "SIN_MOTIVO": "Escribe por qué quieres cambiar la hora.",
    "HORA_MAL": "Esa hora no se entiende. Se escribe como 18:30.",
    "YA_HAY_PROPUESTA": "Ese fichaje ya tiene una propuesta de cambio sin "
                        "contestar. Hay que resolver esa antes de pedir otra.",
    "DESCONOCIDO": "Ha ocurrido un error. Inténtalo otra vez.",
}


def _hora_pedida(texto: str | None, original, zona: str) -> datetime | None:
    """La hora que pide el trabajador, en el día del fichaje y en su huso.

    Solo se cambia la hora, no el día: mover un fichaje a otra fecha ya no es
    corregir una errata, es otra cosa, y no entra en esta versión.
    """
    try:
        horas, minutos = (int(x) for x in (texto or "").strip().split(":"))
    except (ValueError, AttributeError):
        return None
    if not (0 <= horas < 24 and 0 <= minutos < 60):
        return None
    local = original.momento.astimezone(ZoneInfo(zona))
    return local.replace(hour=horas, minute=minutos, second=0, microsecond=0)


def crear_app(cadena_bd: str | None = None) -> Flask:
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=os.environ.get("FICHAJE_SECRETO") or secrets.token_hex(32),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.environ.get("FICHAJE_HTTPS", "") == "1",
        BD=cadena_bd,
    )

    # ------------------------------------------------------------- conexión

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
        enviado = request.form.get("csrf", "")
        guardado = session.get("csrf", "")
        if not guardado or not secrets.compare_digest(enviado, guardado):
            abort(400)

    app.jinja_env.globals["csrf"] = testigo_csrf

    # ------------------------------------------------------------- ayudantes

    def centro_por_token(token: str):
        fila = bd().execute(
            "select c.id::text, c.empresa_id::text, c.nombre, c.zona_horaria "
            "from centro c where c.token_publico = %s", (token,)).fetchone()
        if fila is None:
            # Mismo error para un token inventado que para uno rotado: no se
            # confirma a nadie que un centro existiera.
            abort(404)
        return dict(zip(("id", "empresa_id", "nombre", "zona"), fila))

    def bloqueado(centro_id: str, codigo: str, origen: str) -> bool:
        desde = datetime.now(timezone.utc) - VENTANA_BLOQUEO
        por_codigo = bd().execute(
            "select count(*) from intento_acceso where centro_id = %s and "
            "codigo = %s and not acertado and momento > %s",
            (centro_id, codigo, desde)).fetchone()[0]
        por_origen = bd().execute(
            "select count(*) from intento_acceso where origen = %s and "
            "not acertado and momento > %s", (origen, desde)).fetchone()[0]
        return por_codigo >= FALLOS_POR_CODIGO or por_origen >= FALLOS_POR_ORIGEN

    def apuntar_intento(centro_id: str, codigo: str, origen: str, acertado: bool):
        bd().execute(
            "insert into intento_acceso (centro_id, codigo, origen, acertado) "
            "values (%s, %s, %s, %s)", (centro_id, codigo[:40], origen, acertado))

    def sesion_valida(centro: dict):
        """La sesión vive en la base; la cookie solo lleva su testigo.

        Se comprueba en cada operación, no solo al entrar: si a alguien le dan
        de baja a media mañana, su sesión deja de servir en el siguiente toque.
        """
        testigo = session.get("sesion")
        if not testigo:
            return None
        fila = bd().execute(
            "select s.trabajador_id::text, t.nombre, t.activo, t.empresa_id::text "
            "from sesion s join trabajador t on t.id = s.trabajador_id "
            "where s.id = %s and s.centro_id = %s and s.cerrada_en is null "
            "and s.expira_en > now()",
            (huella_de_token(testigo), centro["id"])).fetchone()
        if fila is None:
            return None
        trabajador_id, nombre, activo, empresa_id = fila
        if not activo or empresa_id != centro["empresa_id"]:
            return None
        return {"id": trabajador_id, "nombre": nombre}

    def pantalla(centro: dict, trabajador: dict, aviso: str = "", codigo: str = ""):
        ahora = datetime.now(timezone.utc).astimezone(ZoneInfo(centro["zona"]))
        if trabajador is None:
            return render_template_string(
                ACCESO, centro=centro, ahora=ahora, aviso=aviso, codigo=codigo)
        anotaciones = LibroPostgres(centro["empresa_id"], bd()).anotaciones()
        acciones = acciones_posibles(anotaciones, trabajador["id"])
        ultimo = ultimo_fichaje(anotaciones, trabajador["id"])
        return render_template_string(
            FICHAR, centro=centro, trabajador=trabajador, ahora=ahora,
            estado=estado_actual(anotaciones, trabajador["id"]).value,
            acciones=[(a.value, COMO_SE_LLAMA[a]) for a in acciones],
            ultimo=(ultimo[0].astimezone(ZoneInfo(centro["zona"])),
                    COMO_SE_LLAMA[ultimo[1]]) if ultimo else None,
            clave=secrets.token_urlsafe(18), aviso=aviso)

    # ------------------------------------------------------------------ rutas

    @app.get("/f/<token>")
    def portada(token: str):
        centro = centro_por_token(token)
        return pantalla(centro, sesion_valida(centro),
                        aviso=ERRORES.get(request.args.get("e", ""), ""))

    @app.post("/f/<token>/entrar")
    def entrar(token: str):
        comprobar_csrf()
        centro = centro_por_token(token)
        codigo = (request.form.get("codigo") or "").strip()
        pin = request.form.get("pin") or ""
        origen = (request.remote_addr or "")[:45]

        if bloqueado(centro["id"], codigo, origen):
            apuntar_intento(centro["id"], codigo, origen, False)
            return pantalla(centro, None, ERRORES["DEMASIADOS_INTENTOS"], codigo), 429

        fila = bd().execute(
            "select id::text, nombre, activo, pin_derivado from trabajador "
            "where empresa_id = %s and codigo = %s",
            (centro["empresa_id"], codigo)).fetchone()
        # Se comprueba el PIN aunque el código no exista, para que el tiempo de
        # respuesta no diga si ese código está dado de alta.
        acertado = comprobar(pin, fila[3] if fila else None)
        apuntar_intento(centro["id"], codigo, origen, bool(acertado and fila))

        if not fila or not acertado:
            return pantalla(centro, None, ERRORES["ACCESO_FALLIDO"], codigo), 401
        if not fila[2]:
            return pantalla(centro, None, ERRORES["TRABAJADOR_INACTIVO"], codigo), 403

        # Sesión nueva del todo: se tira lo anterior para que nadie pueda fijar
        # una sesión de antemano y heredarla al identificarse otro.
        session.clear()
        testigo = nuevo_token()
        bd().execute(
            "insert into sesion (id, trabajador_id, centro_id, expira_en) "
            "values (%s, %s, %s, %s)",
            (huella_de_token(testigo), fila[0], centro["id"],
             datetime.now(timezone.utc) + DURACION_SESION))
        session["sesion"] = testigo
        return redirect(url_for("portada", token=token))

    @app.post("/f/<token>/fichar")
    def fichar(token: str):
        comprobar_csrf()
        centro = centro_por_token(token)
        trabajador = sesion_valida(centro)
        if trabajador is None:
            return redirect(url_for("portada", token=token, e="SESION_CADUCADA"))

        libro = LibroPostgres(centro["empresa_id"], bd())
        clave = (request.form.get("clave") or "").strip()
        if not clave:
            return redirect(url_for("portada", token=token, e="DESCONOCIDO"))

        # Lo primero, antes de mirar nada más: ¿esta misma petición ya se
        # atendió? Si el móvil perdió cobertura y Safari reenvió el formulario,
        # el trabajador ya está dentro y la acción que pide dejó de estar
        # permitida por culpa de su propio fichaje anterior. Validarla ahí le
        # diría «esa acción no se puede hacer», cuando lo cierto es que su
        # fichaje sí se guardó. Se le devuelve su confirmación.
        ya = libro.resultado_de(clave)
        if ya is not None:
            if ya.trabajador_id != trabajador["id"]:
                abort(403)
            return redirect(url_for("hecho", token=token, n=ya.numero, r="1"))

        permitidas = acciones_posibles(libro.anotaciones(), trabajador["id"])
        try:
            accion = Tipo(request.form.get("accion", ""))
        except ValueError:
            return redirect(url_for("portada", token=token, e="ACCION_NO_PERMITIDA"))
        if accion not in permitidas:
            return redirect(url_for("portada", token=token, e="ACCION_NO_PERMITIDA"))

        # La hora del fichaje es la del servidor cuando llega la petición. La
        # hora de ESCRITURA la pone el libro, ya dentro de su bloqueo.
        ahora = datetime.now(timezone.utc)
        try:
            anotacion, ya_estaba = libro.fichar_una_sola_vez(
                clave, centro_id=centro["id"], trabajador_id=trabajador["id"],
                tipo=accion, momento=ahora, anotado_en=None,
                zona_horaria=centro["zona"], autor_id=trabajador["id"],
                parte=__import__("fichaje.registro", fromlist=["Parte"]).Parte.TRABAJADOR,
                origen="qr")
        except IntegridadRota:
            app.logger.critical("INTEGRIDAD centro=%s empresa=%s",
                                centro["id"], centro["empresa_id"])
            return redirect(url_for("portada", token=token, e="INTEGRIDAD"))
        except psycopg.OperationalError:
            return redirect(url_for("portada", token=token, e="BASE_NO_DISPONIBLE"))

        # Enviar a otra página para que refrescar no vuelva a fichar.
        return redirect(url_for("hecho", token=token, n=anotacion.numero,
                                r="1" if ya_estaba else "0"))

    @app.get("/f/<token>/hecho")
    def hecho(token: str):
        centro = centro_por_token(token)
        trabajador = sesion_valida(centro)
        if trabajador is None:
            return redirect(url_for("portada", token=token, e="SESION_CADUCADA"))
        libro = LibroPostgres(centro["empresa_id"], bd())
        anotacion = libro.anotacion(int(request.args.get("n", "0")))
        if anotacion.trabajador_id != trabajador["id"]:
            abort(403)
        local = anotacion.momento.astimezone(ZoneInfo(centro["zona"]))
        return render_template_string(
            HECHO, centro=centro, trabajador=trabajador, local=local,
            accion=COMO_SE_LLAMA[anotacion.tipo],
            repetido=request.args.get("r") == "1")

    # ------------------------------------------------------- mis registros

    def libro_y_mio(centro: dict, trabajador: dict):
        """Las anotaciones de la empresa y las jornadas de quien pregunta.

        Todo parte de la identidad de la sesión. Ningún formulario dice de quién
        son los registros que se enseñan.
        """
        anotaciones = LibroPostgres(centro["empresa_id"], bd()).anotaciones()
        return anotaciones, jornadas_de(anotaciones, trabajador["id"])

    @app.get("/f/<token>/mis-registros")
    def mis_registros(token: str):
        centro = centro_por_token(token)
        trabajador = sesion_valida(centro)
        if trabajador is None:
            return redirect(url_for("portada", token=token, e="SESION_CADUCADA"))
        anotaciones, jornadas = libro_y_mio(centro, trabajador)
        huso = ZoneInfo(centro["zona"])
        mias = correcciones_de(anotaciones, trabajador["id"])
        return render_template_string(
            REGISTROS, centro=centro, trabajador=trabajador,
            nombres={t.value: n for t, n in COMO_SE_LLAMA.items()},
            jornadas=list(reversed(jornadas)), huso=huso,
            correcciones=list(reversed(mias)),
            esperan=esperando_a(anotaciones, Parte.TRABAJADOR, trabajador["id"]),
            autor=lambda i: nombre_del_autor(bd(), i),
            fichajes={a.numero: a for a in anotaciones
                      if a.trabajador_id == trabajador["id"] and a.tipo in FICHAJES_WEB},
            clave=secrets.token_urlsafe(18),
            aviso=ERRORES.get(request.args.get("e", ""), ""))

    @app.post("/f/<token>/proponer")
    def proponer_cambio(token: str):
        comprobar_csrf()
        centro = centro_por_token(token)
        trabajador = sesion_valida(centro)
        if trabajador is None:
            return redirect(url_for("portada", token=token, e="SESION_CADUCADA"))
        libro = LibroPostgres(centro["empresa_id"], bd())
        try:
            numero = int(request.form.get("numero") or 0)
            original = libro.anotacion(numero)
        except (ValueError, AnotacionInvalida):
            return redirect(url_for("mis_registros", token=token, e="NO_ES_TUYO"))
        # La comprobación que de verdad importa: el fichaje tiene que ser suyo.
        # Da igual qué número mande el formulario.
        if original.trabajador_id != trabajador["id"]:
            return redirect(url_for("mis_registros", token=token, e="NO_ES_TUYO"))

        motivo = (request.form.get("motivo") or "").strip()
        if not motivo:
            return redirect(url_for("mis_registros", token=token, e="SIN_MOTIVO"))
        nuevo = _hora_pedida(request.form.get("hora"), original, centro["zona"])
        if nuevo is None:
            return redirect(url_for("mis_registros", token=token, e="HORA_MAL"))
        try:
            proponer(libro, request.form.get("clave") or secrets.token_urlsafe(18),
                     numero, nuevo, motivo, trabajador["id"], Parte.TRABAJADOR,
                     datetime.now(timezone.utc))
        except AnotacionInvalida as fallo:
            codigo = "YA_HAY_PROPUESTA" if "sin contestar" in str(fallo) else "SIN_MOTIVO"
            return redirect(url_for("mis_registros", token=token, e=codigo))
        return redirect(url_for("mis_registros", token=token))

    @app.post("/f/<token>/responder")
    def responder_propuesta(token: str):
        comprobar_csrf()
        centro = centro_por_token(token)
        trabajador = sesion_valida(centro)
        if trabajador is None:
            return redirect(url_for("portada", token=token, e="SESION_CADUCADA"))
        libro = LibroPostgres(centro["empresa_id"], bd())
        try:
            numero = int(request.form.get("numero") or 0)
            propuesta = libro.anotacion(numero)
        except (ValueError, AnotacionInvalida):
            return redirect(url_for("mis_registros", token=token, e="NO_ES_TUYO"))
        if propuesta.trabajador_id != trabajador["id"]:
            return redirect(url_for("mis_registros", token=token, e="NO_ES_TUYO"))
        try:
            responder(libro, request.form.get("clave") or secrets.token_urlsafe(18),
                      numero, request.form.get("respuesta") == "acepto",
                      trabajador["id"], Parte.TRABAJADOR, datetime.now(timezone.utc))
        except AnotacionInvalida as fallo:
            codigo = "YA_RESUELTA" if "ya está resuelta" in str(fallo) else "NO_ES_TUYO"
            return redirect(url_for("mis_registros", token=token, e=codigo))
        return redirect(url_for("mis_registros", token=token))

    @app.get("/f/<token>/mis-registros.csv")
    def mis_registros_csv(token: str):
        """La copia de sus propios registros, y solo de los suyos."""
        centro = centro_por_token(token)
        trabajador = sesion_valida(centro)
        if trabajador is None:
            return redirect(url_for("portada", token=token, e="SESION_CADUCADA"))
        _, jornadas = libro_y_mio(centro, trabajador)
        huso = ZoneInfo(centro["zona"])
        lineas = ["dia,entrada,salida,pausas_minutos,horas,incidencias"]
        for j in jornadas:
            lineas.append(",".join(fila_segura_para_hoja([
                str(j.dia),
                j.entrada.astimezone(huso).strftime("%H:%M:%S"),
                j.salida.astimezone(huso).strftime("%H:%M:%S") if j.salida else "",
                str(int(j.pausas.total_seconds() // 60)),
                f"{j.horas:.2f}",
                "; ".join(j.incidencias),
            ])))
        return Response(
            "\ufeff" + "\r\n".join(lineas),
            mimetype="text/csv; charset=utf-8",
            headers={"Content-Disposition":
                     'attachment; filename="mis-registros.csv"'})

    @app.post("/f/<token>/salir")
    def salir(token: str):
        comprobar_csrf()
        testigo = session.get("sesion")
        if testigo:
            bd().execute("update sesion set cerrada_en = now() where id = %s",
                         (huella_de_token(testigo),))
        session.clear()
        return redirect(url_for("portada", token=token))

    @app.errorhandler(404)
    def no_esta(_):
        return render_template_string(SIMPLE, titulo="No encontrado",
                                      texto=ERRORES["CENTRO_NO_ENCONTRADO"]), 404

    @app.errorhandler(500)
    def roto(_):
        # Nunca una traza en pantalla.
        return render_template_string(SIMPLE, titulo="Error",
                                      texto=ERRORES["DESCONOCIDO"]), 500

    return app


# ------------------------------------------------------------------ plantillas

BASE = """
<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fichar · {{ centro.nombre }}</title>
<style>
 :root{color-scheme:light dark}
 *{box-sizing:border-box}
 body{margin:0;font:17px/1.5 system-ui,-apple-system,sans-serif;background:#f6f6f7;
      color:#111;display:flex;justify-content:center;padding:24px 16px}
 @media(prefers-color-scheme:dark){body{background:#111;color:#f2f2f2}}
 main{width:100%;max-width:420px}
 .tarjeta{background:#fff;border-radius:16px;padding:24px;
          box-shadow:0 1px 3px rgba(0,0,0,.12)}
 @media(prefers-color-scheme:dark){.tarjeta{background:#1c1c1e}}
 h1{font-size:20px;margin:0 0 4px}
 .centro{color:#666;font-size:15px;margin:0 0 20px}
 @media(prefers-color-scheme:dark){.centro{color:#9a9a9e}}
 .reloj{font-size:40px;font-weight:600;letter-spacing:-1px;margin:8px 0 2px}
 .fecha{color:#666;font-size:14px;margin:0 0 20px}
 .estado{display:inline-block;padding:6px 12px;border-radius:999px;
         background:#eceef1;font-size:14px;margin-bottom:20px}
 @media(prefers-color-scheme:dark){.estado{background:#2c2c2e}}
 button{width:100%;padding:18px;font-size:19px;font-weight:600;border:0;
        border-radius:12px;background:#0a7d34;color:#fff;margin-bottom:10px;
        cursor:pointer;-webkit-tap-highlight-color:transparent}
 button.otra{background:#eceef1;color:#111}
 @media(prefers-color-scheme:dark){button.otra{background:#2c2c2e;color:#f2f2f2}}
 input{width:100%;padding:14px;font-size:18px;border:1px solid #ccc;
       border-radius:10px;margin-bottom:12px;background:#fff;color:#111}
 @media(prefers-color-scheme:dark){input{background:#2c2c2e;border-color:#3a3a3c;color:#f2f2f2}}
 label{display:block;font-size:14px;color:#666;margin-bottom:6px}
 .aviso{background:#fdecec;color:#9b1c1c;padding:12px;border-radius:10px;
        font-size:15px;margin-bottom:16px}
 .pie{color:#8a8a8e;font-size:13px;margin-top:18px;text-align:center}
 .pie button{background:none;color:#8a8a8e;font-size:13px;padding:6px;font-weight:400}
 .ok{font-size:44px;text-align:center;margin:0 0 8px}
 dl{margin:0}dt{color:#666;font-size:13px;margin-top:12px}
 dd{margin:2px 0 0;font-size:18px;font-weight:600}
</style></head><body><main><div class="tarjeta">{% block cuerpo %}{% endblock %}
</div></main></body></html>
"""

ACCESO = BASE.replace("{% block cuerpo %}{% endblock %}", """
<h1>Fichar</h1>
<p class="centro">{{ centro.nombre }}</p>
<div class="reloj">{{ ahora.strftime('%H:%M') }}</div>
<p class="fecha">{{ ahora.strftime('%d/%m/%Y') }}</p>
{% if aviso %}<div class="aviso">{{ aviso }}</div>{% endif %}
<form method="post" action="{{ url_for('entrar', token=request.view_args.token) }}">
  <input type="hidden" name="csrf" value="{{ csrf() }}">
  <label for="codigo">Tu código</label>
  <input id="codigo" name="codigo" inputmode="numeric" autocomplete="username"
         value="{{ codigo }}" required autofocus>
  <label for="pin">Tu PIN</label>
  <input id="pin" name="pin" type="password" inputmode="numeric"
         autocomplete="current-password" required>
  <button type="submit">Entrar</button>
</form>
""")

FICHAR = BASE.replace("{% block cuerpo %}{% endblock %}", """
<h1>Hola, {{ trabajador.nombre }}</h1>
<p class="centro">{{ centro.nombre }}</p>
<div class="reloj">{{ ahora.strftime('%H:%M') }}</div>
<p class="fecha">{{ ahora.strftime('%d/%m/%Y') }}</p>
<span class="estado">{% if estado == 'dentro' %}Estás trabajando
{% elif estado == 'en_pausa' %}Estás en pausa{% else %}Estás fuera{% endif %}</span>
{% if aviso %}<div class="aviso">{{ aviso }}</div>{% endif %}
{% for valor, nombre in acciones %}
<form method="post" action="{{ url_for('fichar', token=request.view_args.token) }}">
  <input type="hidden" name="csrf" value="{{ csrf() }}">
  <input type="hidden" name="accion" value="{{ valor }}">
  <input type="hidden" name="clave" value="{{ clave }}-{{ loop.index }}">
  <button type="submit" {% if not loop.first %}class="otra"{% endif %}>{{ nombre }}</button>
</form>
{% endfor %}
{% if ultimo %}<p class="pie">Último fichaje: {{ ultimo[1] }} a las
  {{ ultimo[0].strftime('%H:%M') }} del {{ ultimo[0].strftime('%d/%m') }}</p>{% endif %}
<p class="pie"><a href="{{ url_for('mis_registros', token=request.view_args.token) }}"
  >Ver mis registros</a></p>
<form method="post" action="{{ url_for('salir', token=request.view_args.token) }}"
      class="pie"><input type="hidden" name="csrf" value="{{ csrf() }}">
  <button type="submit">Cerrar sesión</button></form>
""")

HECHO = BASE.replace("{% block cuerpo %}{% endblock %}", """
<p class="ok">✓</p>
<h1 style="text-align:center">{% if repetido %}Ya estaba registrado
{% else %}Fichaje registrado{% endif %}</h1>
<dl>
  <dt>Acción</dt><dd>{{ accion }}</dd>
  <dt>Fecha</dt><dd>{{ local.strftime('%d/%m/%Y') }}</dd>
  <dt>Hora</dt><dd>{{ local.strftime('%H:%M:%S') }}</dd>
  <dt>Centro</dt><dd>{{ centro.nombre }}</dd>
</dl>
<p class="pie"><a href="{{ url_for('portada', token=request.view_args.token) }}"
  >Volver</a></p>
""")

REGISTROS = BASE.replace("{% block cuerpo %}{% endblock %}", """
<h1>Mis registros</h1>
<p class="centro">{{ trabajador.nombre }} · {{ centro.nombre }}</p>
{% if aviso %}<div class="aviso">{{ aviso }}</div>{% endif %}

{% if esperan %}
<h2 style="font-size:16px;margin:20px 0 10px">Te piden cambiar una hora</h2>
{% for c in esperan %}
<div class="propuesta">
  <p style="margin:0 0 8px"><b>{{ c.original.local().strftime('%d/%m/%Y') }}</b> ·
   {{ nombres[c.original.tipo.value] }}</p>
  <dl style="margin:0 0 12px">
    <dt>Hora que está registrada</dt>
    <dd>{{ c.original.local().strftime('%H:%M') }}</dd>
    <dt>Hora que proponen</dt>
    <dd>{{ c.propuesta.local(c.propuesta.momento_propuesto).strftime('%H:%M') }}</dd>
    <dt>Motivo</dt><dd style="font-weight:400">{{ c.propuesta.motivo }}</dd>
    <dt>Lo pide</dt><dd style="font-weight:400">{{ autor(c.propuesta.autor_id) }},
      el {{ c.propuesta.local(c.propuesta.anotado_en).strftime('%d/%m/%Y') }}</dd>
  </dl>
  <form method="post" action="{{ url_for('responder_propuesta', token=request.view_args.token) }}">
    <input type="hidden" name="csrf" value="{{ csrf() }}">
    <input type="hidden" name="numero" value="{{ c.propuesta.numero }}">
    <input type="hidden" name="clave" value="{{ clave }}-r{{ c.propuesta.numero }}">
    <input type="hidden" name="respuesta" value="acepto">
    <button type="submit">Estoy de acuerdo</button></form>
  <form method="post" action="{{ url_for('responder_propuesta', token=request.view_args.token) }}">
    <input type="hidden" name="csrf" value="{{ csrf() }}">
    <input type="hidden" name="numero" value="{{ c.propuesta.numero }}">
    <input type="hidden" name="clave" value="{{ clave }}-d{{ c.propuesta.numero }}">
    <input type="hidden" name="respuesta" value="discrepo">
    <button class="otra" type="submit">No estoy de acuerdo</button></form>
  <p class="pie" style="margin:6px 0 0">Si no estás de acuerdo, la hora no cambia
   y queda escrito que no lo estabas.</p>
</div>
{% endfor %}
{% endif %}

<h2 style="font-size:16px;margin:24px 0 10px">Mis jornadas</h2>
{% if jornadas %}
{% for j in jornadas %}
<div class="dia">
 <p style="margin:0"><b>{{ j.dia.strftime('%d/%m/%Y') }}</b> ·
  {{ j.entrada.astimezone(huso).strftime('%H:%M') }} –
  {{ j.salida.astimezone(huso).strftime('%H:%M') if j.salida else 'sin cerrar' }}
  · <b>{{ j.horas }} h</b>
  {% if j.corregida %}<span class="marca">hora corregida</span>{% endif %}
  {% if j.retroactiva %}<span class="marca">añadido después</span>{% endif %}</p>
 {% for i in j.incidencias %}<p class="pie" style="margin:2px 0 0;text-align:left"
   >{{ i }}</p>{% endfor %}
</div>
{% endfor %}
{% else %}<p class="pie">Todavía no has fichado ningún día.</p>{% endif %}

<h2 style="font-size:16px;margin:24px 0 10px">Pedir que se cambie una hora</h2>
{% if fichajes %}
<form method="post" action="{{ url_for('proponer_cambio', token=request.view_args.token) }}">
  <input type="hidden" name="csrf" value="{{ csrf() }}">
  <input type="hidden" name="clave" value="{{ clave }}-p">
  <label for="numero">Fichaje</label>
  <select id="numero" name="numero" style="width:100%;padding:14px;font-size:16px;
    border:1px solid #ccc;border-radius:10px;margin-bottom:12px">
   {% for n, a in fichajes.items() | sort(reverse=true) %}
   <option value="{{ n }}">{{ a.local().strftime('%d/%m/%Y') }} ·
     {{ nombres[a.tipo.value] }} · {{ a.local().strftime('%H:%M') }}</option>
   {% endfor %}
  </select>
  <label for="hora">Hora que debería poner</label>
  <input id="hora" name="hora" placeholder="18:30" inputmode="numeric" required>
  <label for="motivo">Por qué</label>
  <input id="motivo" name="motivo" placeholder="Se me olvidó fichar la salida" required>
  <button class="otra" type="submit">Pedir el cambio</button>
</form>
{% else %}<p class="pie">Cuando tengas fichajes podrás pedir que se corrija una hora.</p>
{% endif %}

{% if correcciones %}
<h2 style="font-size:16px;margin:24px 0 10px">Cambios pedidos</h2>
{% for c in correcciones %}
<div class="dia">
 <p style="margin:0">{{ c.original.local().strftime('%d/%m') }} ·
  {{ c.original.local().strftime('%H:%M') }} →
  {{ c.propuesta.local(c.propuesta.momento_propuesto).strftime('%H:%M') }}
  <span class="marca {{ 'ok' if c.aceptada else '' }}">{{
   'aceptado' if c.aceptada else ('sin contestar' if c.pendiente else 'sin acuerdo') }}</span></p>
 <p class="pie" style="margin:2px 0 0;text-align:left">{{ c.propuesta.motivo }}
  — {{ autor(c.propuesta.autor_id) }}</p>
</div>
{% endfor %}
{% endif %}

<p class="pie" style="margin-top:22px">
 <a href="{{ url_for('mis_registros_csv', token=request.view_args.token) }}"
   >Descargar mis registros</a> ·
 <a href="{{ url_for('portada', token=request.view_args.token) }}">Volver a fichar</a></p>
""").replace("</style>", """
 .propuesta{border:1px solid #d9a441;background:#fffaf0;border-radius:12px;
   padding:16px;margin-bottom:14px}
 @media(prefers-color-scheme:dark){.propuesta{background:#2a2418;border-color:#6b5320}}
 .dia{border-top:1px solid #e6e6e8;padding:10px 0}
 @media(prefers-color-scheme:dark){.dia{border-color:#2c2c2e}}
 .marca{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;
   background:#eceef1;color:#555;margin-left:6px}
 @media(prefers-color-scheme:dark){.marca{background:#2c2c2e;color:#aaa}}
 .marca.ok{background:#dcf3e3;color:#0a5c27}
</style>""")

SIMPLE = """
<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{ titulo }}</title>
<style>body{margin:0;font:17px/1.5 system-ui,sans-serif;display:flex;
 align-items:center;justify-content:center;min-height:100vh;padding:24px;
 background:#f6f6f7;color:#111;text-align:center}
 @media(prefers-color-scheme:dark){body{background:#111;color:#f2f2f2}}</style>
</head><body><div><h1>{{ titulo }}</h1><p>{{ texto }}</p></div></body></html>
"""


if __name__ == "__main__":
    crear_app().run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")))
