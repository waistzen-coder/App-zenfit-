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
    abort,
    g,
    redirect,
    render_template_string,
    request,
    session,
    url_for,
)

from .credenciales import comprobar, huella_de_token, nuevo_token
from .jornada import COMO_SE_LLAMA, acciones_posibles, estado_actual, ultimo_fichaje
from .postgres import LibroPostgres, conectar
from .registro import IntegridadRota, Tipo

# --------------------------------------------------------------- configuración

DURACION_SESION = timedelta(hours=12)      # un turno largo, y no más
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
    "DESCONOCIDO": "Ha ocurrido un error. Inténtalo otra vez.",
}


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
