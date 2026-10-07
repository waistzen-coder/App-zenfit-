# La fábrica

Convierte la ficha de un negocio (un JSON pequeño) en su web: un único archivo
HTML con diseño según el sector, que se ve bien en el móvil, no usa cookies ni
carga nada de terceros y pesa unos 100 KB.

Solo necesita **Node 18 o superior**. No hay que instalar nada más.

## Uso

```sh
# Propuesta para enseñar (con aviso de propuesta y sin indexar en Google)
node negocio/fabrica/generar.mjs negocio/privado/leads/barberia-paco.json

# Varias a la vez
node negocio/fabrica/generar.mjs negocio/privado/leads/*.json

# Versión final para publicar en el dominio del cliente, con aviso legal
node negocio/fabrica/generar.mjs negocio/privado/leads/barberia-paco.json --final

# Web de la agencia + ejemplos del escaparate
node negocio/fabrica/construir.mjs

# Capturas de móvil de los ejemplos (necesita Playwright con Chromium)
node negocio/fabrica/capturas.mjs

# Cartas en papel con la propuesta y un QR, en negocio/privado/cartas/cartas.pdf
# (cada tanda en su carpeta con --salida, p. ej. negocio/privado/cartas/lote2)
node negocio/fabrica/cartas.mjs negocio/privado/leads/*.json --correo tu@correo.es
```

Las propuestas salen en `negocio/web/demo/<nombre>/` y se publican con la web
de la agencia en `waistzen-coder.github.io/demo/<nombre>/`. Las versiones finales
salen en `negocio/entregas/<nombre>/`. Al terminar, el generador imprime el
enlace y el mensaje para mandárselo **a quien ya ha aceptado verla**.

## Publicar

La carpeta `negocio/web` se sirve tal cual con GitHub Pages desde el repositorio
`waistzen-coder.github.io`, que es público y aparte de este. Para subir una
propuesta nueva, con ese repositorio clonado al lado de este:

```sh
node negocio/fabrica/construir.mjs
node negocio/fabrica/generar.mjs negocio/privado/leads/*.json
find ../waistzen-coder.github.io -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -a negocio/web/. ../waistzen-coder.github.io/
cd ../waistzen-coder.github.io && git add -A && git commit -m "Propuestas" && git push
```

GitHub Pages tarda un minuto en actualizarse. Las propuestas de negocios que
digan que no se borran de `negocio/privado/leads/` y de `negocio/web/demo/`
antes de volver a publicar.

El WhatsApp, el correo y los datos del titular de la agencia van en
[`config.json`](config.json). Si faltan, la web y el aviso de las propuestas
funcionan igual: los botones llevan a los ejemplos y a los precios, y la web
sale sin aviso legal y con `noindex`.

Las fichas de negocios reales van en `negocio/privado/leads/`, que no se sube al
repositorio mientras sea público.

## La ficha

Copia [`ficha-plantilla.json`](ficha-plantilla.json). Solo son obligatorios
`nombre`, `ciudad` y `telefono`; el resto mejora el resultado.

| Campo | Para qué |
| --- | --- |
| `nombre`, `ciudad`, `telefono` | Obligatorios. El teléfono, español de 9 cifras en cualquier formato |
| `sector` | Elige textos, colores e iconos. Ver la lista de abajo. Por defecto, `generico` |
| `whatsapp` | Móvil para WhatsApp. Si no se pone, se usa el teléfono si es móvil. `false` para quitarlo |
| `direccion`, `cp`, `provincia` | Dirección del local y botón de cómo llegar |
| `zona` | Dónde trabaja, para los oficios que van a domicilio: `["Valladolid y alrededores"]` o `["Motril", "Salobreña"]` |
| `horario` | `{"lunes-viernes": "9:00-14:00, 17:00-20:00", "sábado": "10-14", "domingo": "cerrado"}`. Admite `l-v`, `sábado y domingo`, `todos`, `24h` y tramos que pasan de medianoche (`20:00-03:00`) |
| `desde` | Año de apertura |
| `valoracion` | `{"nota": 4.7, "resenas": 112}`, copiado de su ficha de Google |
| `resenas` | Reseñas reales de su ficha: `[{"autor": "Ana P.", "texto": "…", "estrellas": 5}]`. Nunca inventadas |
| `enlaceGoogle` | Enlace a su ficha de Google Maps, para «ver todas las reseñas» |
| `reservas` | Enlace a su sistema de citas (Booksy, Treatwell…), si tiene |
| `urgencias` | `true` si atiende urgencias 24 horas |
| `fotos` | Rutas de sus fotos, junto al `index.html`: `["fotos/1.jpg"]` |
| `email`, `redes` | Correo y perfiles sociales |
| `dominio` | Solo para la versión final: `https://barberiapaco.es` |
| `legal` | Solo para la versión final: `{"nombre": "…", "nif": "…", "domicilio": "…", "email": "…"}` |
| `contacto` | Nombre del dueño, para el saludo del mensaje |
| `slug` | Nombre de la carpeta, si no se quiere el que sale del nombre |

Cualquier texto del sector se puede sobrescribir en la ficha: `titular` (con
`|` antes de la parte en color), `subtitular`, `servicios`, `pasos`, `faqs`,
`sellos`, `cierre`, `paleta`, `cta` (`llamar`, `whatsapp` o `reservar`).

## Sectores

| `sector` | Estilo | Botón principal |
| --- | --- | --- |
| `fontaneria`, `electricidad`, `cerrajeria`, `climatizacion` | Rótulo de furgoneta | Llamar |
| `reformas` | Rótulo de furgoneta | WhatsApp |
| `taller`, `chapa` (chapa y pintura) | Rótulo de furgoneta | Llamar |
| `fontaneria-gas` (fontanería, calefacción y gas), `carpinteria-metalica` | Rótulo de furgoneta | Llamar |
| `barberia`, `peluqueria`, `estetica` | Cartel de fachada | Cita por WhatsApp |
| `restaurante` | Cartel de fachada | Reservar mesa |
| `fisioterapia`, `dental` | Tarjeta de clínica | Cita por WhatsApp |
| `entrenador` | Rótulo | WhatsApp |
| `generico` | Tarjeta | WhatsApp |

Los textos de cada sector están en [`lib/sectores.mjs`](lib/sectores.mjs) y no
prometen nada que el negocio no haya confirmado: se revisan con el dueño antes de
publicar.

## Cómo está hecha

| Archivo | Qué hace |
| --- | --- |
| `generar.mjs` | La orden: lee fichas y escribe webs |
| `construir.mjs` | Monta `negocio/web` entera: agencia, aviso legal (si hay datos), ejemplos y `.nojekyll` |
| `lib/negocio.mjs` | Valida la ficha y la mezcla con su sector |
| `lib/sectores.mjs` | Textos, colores e iconos de cada sector |
| `lib/plantilla.mjs` | El HTML y el CSS de la web de un negocio y su aviso legal |
| `lib/agencia.mjs` | La web de Mostrador |
| `lib/horario.mjs` | Entiende los horarios escritos a mano |
| `lib/fuentes.mjs`, `fuentes/` | Tipografías libres incrustadas en cada página |
| `lib/iconos.mjs` | Iconos de Lucide (ISC) y el glifo de WhatsApp (CC0) |
| `cartas.mjs` | Las cartas en papel: una por negocio con dirección completa, con su web y un QR |
| `lib/vendor/qrcode.mjs` | Generador de códigos QR de Kazuhiko Arase (MIT), copiado tal cual |
| `ejemplos/` | Las fichas de los negocios inventados del escaparate |

El «abierto ahora» se calcula en el navegador de quien visita la web, siempre
con la hora de España peninsular.
