# Montaje en una tarde

Lo que hay que hacer una sola vez para que Mostrador exista. Todo gratis salvo
el dominio.

## 1. El dominio (10 minutos, unos 10 €)

1. Compra `mostradorweb.es` en un registrador español (DonDominio,
   Dinahosting, IONOS…). Los `.es` piden tu NIF o NIE al registrarlos.
2. No contrates hosting ni correo con él: no hacen falta.

Si estuviera cogido, alternativas que estaban libres el 6 de octubre de 2026:
`abiertoweb.es` y `webde72h.es` (habría que cambiar el nombre en
`fabrica/config.json`).

## 2. WhatsApp Business (15 minutos)

1. Instala **WhatsApp Business** con el número del negocio. Puede ser el tuyo;
   una línea aparte cuesta unos 6 €/mes y separa trabajo y vida.
2. Perfil:
   - Nombre: `Mostrador · Webs para negocios`
   - Foto: `negocio/marca/logo-whatsapp.png`
   - Categoría: Servicios profesionales
   - Descripción: `Hacemos la web de tu negocio y la ves antes de pagar nada. Publicada en 72 horas desde 290 €.`
   - Web: `https://mostradorweb.es`
3. **Respuesta rápida** `/propuesta` con el mensaje de envío del enlace
   ([guiones](../ventas/guiones.md#3-el-mensaje-con-el-enlace)).
4. Pásame el número para ponerlo en la web y en el aviso de las demos.

## 3. Publicar la web (20 minutos)

La web y las demos se sirven desde **Cloudflare Pages**: gratis, rápido y
permite uso comercial (Vercel en su plan gratuito no lo permite).

1. Crea una cuenta en `dash.cloudflare.com`.
2. *Workers & Pages* → *Create* → *Pages* → *Connect to Git* → autoriza GitHub y
   elige este repositorio.
3. Configuración:
   - Rama de producción: la rama del negocio
     (`claude/inversion-emprendimiento-1000-w7tdns`, o `main` cuando se fusione)
   - Framework: *None*
   - Comando de compilación: vacío
   - Carpeta de salida: `negocio/web`
4. *Save and Deploy*. En un minuto tendrás una dirección `algo.pages.dev`.
5. *Custom domains* → `mostradorweb.es`. Cloudflare te dará dos servidores de
   nombres: ponlos en tu registrador (sección DNS o servidores de nombres). Tarda
   entre minutos y unas horas.

Desde ese momento, cada vez que yo suba cambios al repositorio la web se
actualiza sola, también las demos nuevas.

**Importante:** mientras el repositorio sea público, las demos de negocios
reales no se suben (están en el `.gitignore`). Para que yo pueda publicarlas
solo, pon el repositorio en privado (GitHub → *Settings* → *General* → *Change
visibility*) y avísame: quito esa línea y listo.

## 4. Correo (5 minutos)

En Cloudflare, dentro de `mostradorweb.es` → *Email* → *Email Routing* → crea
`hola@mostradorweb.es` y que reenvíe a tu Gmail. Para contestar como
`hola@mostradorweb.es` desde Gmail hace falta un servidor de envío; de momento
basta con contestar desde tu correo.

## 5. Ficha de Google de Mostrador (10 minutos, y esperar la verificación)

1. `business.google.com` → añade tu empresa: **Mostrador**.
2. Categoría: *Diseñador de sitios web*.
3. Negocio sin local abierto al público, con zona de servicio: Motril,
   Salobreña, Almuñécar y el resto de la costa.
4. Teléfono de WhatsApp y web `mostradorweb.es`.
5. Verifica (suele ser por vídeo). Las reseñas de los primeros clientes irán
   aquí.

## 6. Tarjetas de visita (opcional, unos 25 €)

Para dejar en las visitas. Delante: el logo y «Primero ves tu web. Luego
decides.». Detrás: WhatsApp, `mostradorweb.es` y «Webs para negocios de aquí».
