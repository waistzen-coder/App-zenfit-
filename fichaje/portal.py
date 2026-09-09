"""El portal de los representantes de la plantilla. `python3 -m fichaje.portal`.

El tercer contexto de acceso, y el único que **solo lee**. No hay en todo este
archivo una ruta que escriba en el libro, y no es cuestión de disciplina: el
usuario de base de datos con el que corre no tiene permiso de `INSERT` sobre
`anotacion`. Si mañana alguien añadiera aquí un formulario para corregir una
hora, no funcionaría, y ese es el punto.

Tres cosas que no hace, a propósito:

**No propone correcciones.** Quien puede pedir que se cambie una hora es la
persona a la que se le apuntó y la empresa. Si el representante viera un error,
lo que corresponde es hablarlo, no que un tercero reescriba la jornada de otro.

**No enseña datos personales que no hagan falta.** Ni el PIN, ni el correo, ni
el teléfono de nadie: el nombre y sus horas.

**No guarda la afiliación sindical de nadie.** No hay campo, no hay formulario
y no se pregunta. Para dar acceso al registro no hace falta saberlo.

Se sirve aparte del fichaje y del panel: puerto propio, cookie propia y sesión
propia. Que sean tres procesos distintos significa que un fallo en uno no da
acceso a los otros dos.
"""

import csv
import io
import os
import secrets
from datetime import date, datetime, timedelta, timezone

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

from . import representacion as R
from .credenciales import huella_de_token
from .exportar import fila_segura_para_hoja
from .jornada import jornadas_de
from .postgres import conectar

FALLOS_ANTES_DE_BLOQUEAR = 8
MINUTOS_BLOQUEO = 15


def _mes(cadena: str | None, hoy: date) -> tuple[date, date]:
    """El periodo que se mira. Por defecto, el mes en curso."""
    try:
        ano, mes = (int(x) for x in (cadena or "").split("-"))
        primero = date(ano, mes, 1)
    except (ValueError, TypeError):
        primero = hoy.replace(day=1)
    ultimo = (primero.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    return primero, ultimo


def crear_portal(cadena_bd: str | None = None) -> Flask:
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=os.environ.get("FICHAJE_PORTAL_SECRETO") or secrets.token_hex(32),
        # La tercera cookie con el tercer nombre. Compartirlo con el panel o con
        # el fichaje haría que un testigo de uno viajara al otro.
        SESSION_COOKIE_NAME="portal_representante",
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

    @app.after_request
    def cabeceras(respuesta):
        # No hay scripts en el portal, así que se puede prohibir todo. Una
        # política así solo se puede poner cuando la página no la necesita, y
        # esta no la necesita porque se decidió no hacerla con JavaScript.
        respuesta.headers["Content-Security-Policy"] = (
            "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; "
            "base-uri 'none'; frame-ancestors 'none'")
        respuesta.headers["X-Content-Type-Options"] = "nosniff"
        respuesta.headers["Referrer-Policy"] = "same-origin"
        return respuesta

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

    # ------------------------------------------------------------- identidad

    def quien() -> R.Representante | None:
        testigo = session.get("rep")
        return R.por_sesion(bd(), huella_de_token(testigo)) if testigo else None

    def exigir() -> R.Representante:
        # `por_sesion` ya comprueba la vigencia dentro de la consulta, así que
        # un mandato revocado hace un minuto deja de abrir la puerta sin que
        # haya que acordarse de mirarlo en cada ruta.
        representante = quien()
        if representante is None:
            abort(401)
        return representante

    def apuntar(representante, accion, detalle=""):
        R.apuntar(bd(), representante, accion, detalle,
                  (request.remote_addr or "")[:45])

    @app.errorhandler(401)
    def sin_sesion(_):
        return redirect(url_for("entrar"))

    @app.errorhandler(R.NoExiste)
    def mandato_terminado(_):
        """La segunda línea, la que no debería hacer falta nunca.

        `por_sesion` ya no deja pasar a un mandato vencido, así que si el
        dominio vuelve a decir que no está vigente es que la primera comprobación
        ha fallado. Falla cerrado, que es lo importante; pero sin esto fallaba
        con un 500 y una traza en pantalla, y un error interno delante de alguien
        que solo quería mirar sus horas es una forma pésima de estar en lo
        cierto. Se cierra la sesión y a la puerta.
        """
        session.clear()
        return redirect(url_for("entrar")), 302

    @app.errorhandler(404)
    def no_esta(_):
        return render_template_string(
            SIMPLE, titulo="No encontrado",
            texto="Eso no existe, o no es de la plantilla que representas."), 404

    # --------------------------------------------------------------- acceso

    @app.get("/rep/entrar")
    def entrar():
        if quien():
            return redirect(url_for("portada"))
        return render_template_string(ACCESO, aviso="", email="")

    @app.post("/rep/entrar")
    def acceder():
        comprobar_csrf()
        email = (request.form.get("email") or "").strip().lower()
        contrasena = request.form.get("contrasena") or ""
        origen = (request.remote_addr or "")[:45]

        fallos = bd().execute(
            "select count(*) from intento_representante "
            "where (email = %s or origen = %s) and not acertado "
            "and momento > now() - interval '%s minutes'",
            (email, origen, MINUTOS_BLOQUEO)).fetchone()[0]
        if fallos >= FALLOS_ANTES_DE_BLOQUEAR:
            return render_template_string(
                ACCESO, email=email,
                aviso="Demasiados intentos. Espera un cuarto de hora."), 429

        fila = R.acceso_correcto(bd(), email, contrasena)
        bd().execute(
            "insert into intento_representante (email, origen, acertado) "
            "values (%s,%s,%s)", (email[:120], origen, bool(fila)))

        # Un solo mensaje para todo: correo que no existe, contraseña mala y
        # mandato caducado o revocado. Distinguirlos diría de más a quien prueba.
        representante = R.Representante(*fila[:11]) if fila else None
        if representante is None or not representante.vigente():
            return render_template_string(
                ACCESO, email=email,
                aviso="El correo o la contraseña no son correctos, o el "
                      "mandato ya no está vigente."), 401

        session.clear()                      # sesión nueva del todo
        session["rep"] = R.abrir_sesion(bd(), representante.id)
        apuntar(representante, "acceso")
        return redirect(url_for("portada"))

    @app.post("/rep/salir")
    def salir():
        comprobar_csrf()
        testigo = session.get("rep")
        if testigo:
            R.cerrar_sesion(bd(), testigo)
        session.clear()
        return redirect(url_for("entrar"))

    # -------------------------------------------------------------- portada

    def periodo_de(representante):
        hoy = datetime.now(timezone.utc).date()
        desde, hasta = _mes(request.args.get("mes"), hoy)
        return max(desde, representante.desde_minimo(hoy)), hasta, hoy

    @app.get("/rep/")
    def portada():
        representante = exigir()
        desde, hasta, hoy = periodo_de(representante)
        anotaciones = R.anotaciones(bd(), representante, desde, hasta)
        gente = R.trabajadores(bd(), representante)
        filas = []
        for persona in gente:
            jornadas = jornadas_de(anotaciones, persona["id"])
            filas.append({
                **persona,
                "dias": len(jornadas),
                "horas": round(sum(j.horas for j in jornadas), 2),
                "abiertas": sum(1 for j in jornadas if j.abierta),
            })
        filas = [f for f in filas if f["dias"]]
        apuntar(representante, "listado", f"{desde}..{hasta}")
        return render_template_string(
            PORTADA, r=representante, filas=filas, desde=desde, hasta=hasta,
            mes=request.args.get("mes") or hoy.strftime("%Y-%m"),
            total=round(sum(f["horas"] for f in filas), 2))

    @app.get("/rep/persona/<identificador>")
    def persona(identificador):
        representante = exigir()
        desde, hasta, _ = periodo_de(representante)
        # El identificador llega de la URL, así que se filtra DENTRO de la
        # consulta del ámbito. Si no está, no hay resultados y sale un 404: no
        # se distingue «no existe» de «no es de tu plantilla».
        anotaciones = R.anotaciones(bd(), representante, desde, hasta, identificador)
        if not anotaciones:
            abort(404)
        quienes = {p["id"]: p for p in R.trabajadores(bd(), representante)}
        if identificador not in quienes:
            abort(404)
        jornadas = jornadas_de(anotaciones, identificador)
        apuntar(representante, "persona", f"{identificador} {desde}..{hasta}")
        return render_template_string(
            PERSONA, r=representante, p=quienes[identificador], jornadas=jornadas,
            desde=desde, hasta=hasta, mes=request.args.get("mes") or "",
            horas=round(sum(j.horas for j in jornadas), 2))

    @app.get("/rep/descargar.csv")
    def descargar():
        representante = exigir()
        desde, hasta, _ = periodo_de(representante)
        anotaciones = R.anotaciones(bd(), representante, desde, hasta)
        quienes = {p["id"]: p for p in R.trabajadores(bd(), representante)}

        salida = io.StringIO()
        escritor = csv.writer(salida, delimiter=";", lineterminator="\r\n")
        escritor.writerow(["persona", "dia", "entrada", "salida",
                           "pausa_horas", "horas"])
        for identificador, persona_ in sorted(
                quienes.items(), key=lambda kv: kv[1]["nombre"]):
            for j in jornadas_de(anotaciones, identificador):
                escritor.writerow(fila_segura_para_hoja([
                    persona_["nombre"], j.dia.isoformat(),
                    j.entrada.isoformat(),
                    j.salida.isoformat() if j.salida else "",
                    f"{j.pausas.total_seconds() / 3600:.2f}", f"{j.horas:.2f}"]))
        apuntar(representante, "descarga", f"{desde}..{hasta}")
        return Response(
            salida.getvalue().encode("utf-8-sig"), mimetype="text/csv",
            headers={"Content-Disposition":
                     f'attachment; filename="jornadas-{desde}-{hasta}.csv"'})

    @app.get("/rep/accesos")
    def accesos():
        representante = exigir()
        return render_template_string(
            ACCESOS, r=representante,
            filas=R.accesos(bd(), representante.id))

    return app


# ============================================================== las pantallas
#
# Sin una sola etiqueta <script>. No es minimalismo: es lo que permite que la
# política de contenido de arriba prohíba todo script, y esa cabecera vale más
# que cualquier revisión de cómo se escapan las plantillas.

ESTILO = """
 :root{--linea:#e3e5e8;--suave:#6b7280;--fondo:#f7f8fa;--tarjeta:#fff;--texto:#111827}
 @media(prefers-color-scheme:dark){:root{--linea:#2e3238;--suave:#9aa0a8;
   --fondo:#0f1114;--tarjeta:#181b1f;--texto:#eceef1}}
 *{box-sizing:border-box}
 body{margin:0;font:15px/1.55 system-ui,-apple-system,sans-serif;
      background:var(--fondo);color:var(--texto)}
 header{background:var(--tarjeta);border-bottom:1px solid var(--linea);
        padding:0 20px;display:flex;gap:22px;align-items:center;flex-wrap:wrap}
 header .marca{font-weight:700;padding:14px 0}
 header a{color:var(--suave);text-decoration:none;padding:14px 0;font-size:14px}
 header form{margin-left:auto}
 main{max-width:980px;margin:24px auto;padding:0 20px}
 h1{font-size:22px;margin:0 0 4px}
 .sub{color:var(--suave);margin:0 0 18px;font-size:14px}
 .tarjeta{background:var(--tarjeta);border:1px solid var(--linea);
          border-radius:10px;padding:18px;margin-bottom:16px}
 table{width:100%;border-collapse:collapse;background:var(--tarjeta);
       border:1px solid var(--linea);border-radius:10px;overflow:hidden}
 th{text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.4px;
    color:var(--suave);padding:10px 14px;border-bottom:1px solid var(--linea)}
 td{padding:11px 14px;border-bottom:1px solid var(--linea);font-size:14px}
 tr:last-child td{border-bottom:0}
 a{color:#0a7d34}
 .num{text-align:right;font-variant-numeric:tabular-nums}
 .etq{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;
      background:#eef0f3;color:var(--suave)}
 @media(prefers-color-scheme:dark){.etq{background:#24282e}}
 .etq.abierta{background:#fdf0d5;color:#8a5a00}
 .etq.corr{background:#e7eefb;color:#1c3f8a}
 .aviso{background:#fdecec;color:#9b1c1c;padding:12px 14px;border-radius:8px;
        margin-bottom:16px;font-size:14px}
 .nota{color:var(--suave);font-size:13px;line-height:1.6}
 input{padding:9px 11px;font-size:14px;border:1px solid var(--linea);
       border-radius:7px;background:var(--tarjeta);color:var(--texto)}
 button{padding:9px 15px;font-size:14px;font-weight:600;border:0;border-radius:7px;
        background:#0a7d34;color:#fff;cursor:pointer}
 button.gris{background:#eef0f3;color:var(--texto)}
 @media(prefers-color-scheme:dark){button.gris{background:#24282e}}
 form.linea{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
"""

CABECERA = """
<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{ titulo }}</title><style>""" + ESTILO + """</style></head><body>
<header><span class="marca">Registro de jornada</span>
  <a href="{{ url_for('portada') }}">Plantilla</a>
  <a href="{{ url_for('accesos') }}">Mis consultas</a>
  <form method="post" action="{{ url_for('salir') }}">
    <input type="hidden" name="csrf" value="{{ csrf() }}">
    <button class="gris">Salir</button></form>
</header><main>
"""

PIE = "</main></body></html>"

ACCESO = """
<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Acceso · representación de la plantilla</title><style>""" + ESTILO + """
 main{max-width:400px;margin:8vh auto}</style></head><body><main>
<h1>Registro de jornada</h1>
<p class="sub">Acceso para la representación de la plantilla.</p>
{% if aviso %}<p class="aviso">{{ aviso }}</p>{% endif %}
<form method="post" class="tarjeta">
  <input type="hidden" name="csrf" value="{{ csrf() }}">
  <p><label>Correo<br><input name="email" type="email" value="{{ email }}"
     style="width:100%" required autofocus></label></p>
  <p><label>Contraseña<br><input name="contrasena" type="password"
     style="width:100%" required></label></p>
  <button>Entrar</button>
</form>
<p class="nota">Solo consulta. Desde aquí no se puede modificar ningún fichaje,
ni el tuyo ni el de nadie. Cada consulta queda registrada, y la empresa ve el
mismo registro que tú.</p>
</main></body></html>
"""

PORTADA = CABECERA + """
<h1>{{ r.empresa }}</h1>
<p class="sub">
  {% if r.ambito == 'centro' %}Centro: {{ r.centro }}{% else %}Toda la plantilla{% endif %}
  · del {{ desde }} al {{ hasta }}
</p>
<form class="linea tarjeta" method="get">
  <label>Mes <input type="month" name="mes" value="{{ mes }}"></label>
  <button>Ver</button>
  <a href="{{ url_for('descargar', mes=mes) }}">Descargar CSV</a>
</form>
{% if filas %}
<table>
 <tr><th>Persona</th><th class="num">Días</th><th class="num">Horas</th><th></th></tr>
 {% for f in filas %}
 <tr>
   <td><a href="{{ url_for('persona', identificador=f.id, mes=mes) }}">{{ f.nombre }}</a></td>
       {% if not f.activo %}<span class="etq">ya no está de alta</span>{% endif %}
   <td class="num">{{ f.dias }}</td>
   <td class="num">{{ '%.2f'|format(f.horas) }}</td>
   <td>{% if f.abiertas %}<span class="etq abierta">{{ f.abiertas }} sin cerrar</span>{% endif %}</td>
 </tr>
 {% endfor %}
 <tr><td><b>Total</b></td><td></td><td class="num"><b>{{ '%.2f'|format(total) }}</b></td><td></td></tr>
</table>
{% else %}
<p class="tarjeta">No hay jornadas registradas en ese periodo dentro de tu ámbito.</p>
{% endif %}
<p class="nota">Lo que ves son las horas tal y como están en el registro, con las
correcciones acordadas ya aplicadas. Si algo no cuadra, quien puede pedir que se
corrija es la persona afectada o la empresa: desde aquí no se cambia nada.</p>
""" + PIE

PERSONA = CABECERA + """
<h1>{{ p.nombre }}</h1>
<p class="sub">{{ r.empresa }} · del {{ desde }} al {{ hasta }} ·
   {{ '%.2f'|format(horas) }} horas</p>
<p><a href="{{ url_for('portada', mes=mes) }}">← Volver a la plantilla</a></p>
<table>
 <tr><th>Día</th><th>Entrada</th><th>Salida</th><th class="num">Pausa</th>
     <th class="num">Horas</th><th></th></tr>
 {% for j in jornadas %}
 <tr>
  <td>{{ j.dia }}</td>
  <td>{{ j.entrada.strftime('%H:%M') }}</td>
  <td>{% if j.salida %}{{ j.salida.strftime('%H:%M') }}{% else %}—{% endif %}</td>
  <td class="num">{{ '%.2f'|format(j.pausas.total_seconds() / 3600) }}</td>
  <td class="num">{{ '%.2f'|format(j.horas) }}</td>
  <td>{% if j.abierta %}<span class="etq abierta">sin cerrar</span>{% endif %}
      {% if j.corregida %}<span class="etq corr">corregida</span>{% endif %}</td>
 </tr>
 {% endfor %}
</table>
""" + PIE

ACCESOS = CABECERA + """
<h1>Mis consultas</h1>
<p class="sub">Lo que has consultado y cuándo. La empresa ve exactamente esto
mismo: el registro es el de las dos partes, no una vigilancia de una sobre la
otra.</p>
<table>
 <tr><th>Cuándo</th><th>Qué</th><th>Periodo o persona</th></tr>
 {% for f in filas %}
 <tr><td>{{ f.momento.strftime('%d/%m/%Y %H:%M') }}</td>
     <td>{{ f.accion }}</td><td>{{ f.detalle }}</td></tr>
 {% endfor %}
</table>
""" + PIE

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
    from .despliegue import dsn_portal
    crear_portal(dsn_portal()).run(
        host="0.0.0.0", port=int(os.environ.get("PUERTO_PORTAL", "5002")))
