"""De dónde viene una petición, y cuántos intentos se toleran.

Esto existe por un fallo que estuvo dentro durante toda la construcción y que
no es teórico: **ocho intentos fallidos de un desconocido bloqueaban a todos los
usuarios del sistema**.

El motivo. `request.remote_addr` es la dirección de quien abrió la conexión TCP.
Cuando la aplicación corre detrás de un proxy inverso —que es exactamente lo que
el manual manda hacer para tener HTTPS—, quien abre la conexión es siempre el
proxy, así que todo el tráfico del mundo llega con la MISMA dirección. Y el
límite de intentos contaba «fallos de esta cuenta o de esta dirección», con un
umbral pensado para una persona. Resultado: cualquiera podía dejar fuera al
panel entero desde su casa, sin saber ninguna contraseña.

Dos cosas lo arreglan, y hacen falta las dos.

**Saber quién es el cliente de verdad.** Se lee `X-Forwarded-For`, pero solo
tantos saltos como diga `FICHAJE_PROXIES`, y nunca por defecto. Fiarse de esa
cabecera sin más es peor que no leerla: la escribe quien quiera, así que
cualquiera podría saltarse el límite poniéndose una dirección distinta en cada
intento, o cargarle sus fallos a otro.

**Contar por separado.** Los fallos de una cuenta y los de una dirección son dos
cosas distintas y no pueden compartir umbral. Cinco fallos contra una cuenta son
un ataque a esa cuenta. Cinco fallos desde una dirección son una oficina donde
tres personas se han equivocado de PIN. El día que alguien se olvide de
configurar los proxies —que pasará—, el daño tiene que ser que una red vaya
lenta, no que el producto se apague.
"""

import os
from datetime import timedelta

from flask import request

# Cuántos proxies inversos hay delante. 0 significa «ninguno, la conexión llega
# directa», y es el valor por defecto a propósito: leer X-Forwarded-For sin que
# nadie lo haya pedido es confiar en una cabecera que escribe el atacante.
PROXIES_DE_CONFIANZA = int(os.environ.get("FICHAJE_PROXIES", "0"))

VENTANA_BLOQUEO = timedelta(minutes=15)

# Contra una cuenta concreta: pocos, porque es un ataque dirigido.
FALLOS_POR_CUENTA = 5
# Desde una dirección: muchos más, porque detrás puede haber una oficina entera
# —o, si alguien se olvidó de configurar los proxies, el mundo—. Sigue frenando
# a quien prueba mil cuentas desde un sitio, que es para lo que está.
FALLOS_POR_ORIGEN = 60


def detras_de_proxy(app) -> None:
    """Enseña a la aplicación a leer la dirección real del cliente.

    Se llama al crear cada aplicación. Si `FICHAJE_PROXIES` no está puesta no
    hace nada, y `remote_addr` sigue siendo quien abrió la conexión.
    """
    if PROXIES_DE_CONFIANZA > 0:
        from werkzeug.middleware.proxy_fix import ProxyFix

        app.wsgi_app = ProxyFix(
            app.wsgi_app,
            x_for=PROXIES_DE_CONFIANZA,
            x_proto=PROXIES_DE_CONFIANZA,
            x_host=0, x_prefix=0,      # el host y la ruta no se toman de nadie
        )


def origen() -> str:
    """La dirección del cliente, ya recortada para caber en la columna."""
    return (request.remote_addr or "")[:45]
