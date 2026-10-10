# Vídeos de apertura · Iron Fuel Nutrition

Vídeos verticales (1080×1920, 30 fps) para Reels, TikTok, Shorts, historias
y estados de WhatsApp, montados con [Remotion](https://www.remotion.dev) a
partir de los vídeos y fotos de la tienda grabados con el móvil:

- `Teaser`: el teaser de 30 s, la primera versión, con música sintetizada.
- `TeaserEpico`: el mismo teaser en versión épica, con orquesta de verdad y
  efectos de forja.
- `Aviso`: 16 s con el logo para anunciar que pronto se dirán la fecha y la
  hora de la inauguración.
- `Reel`: el mismo aviso en 14 s, montado como un reel de referencia y con
  su música.

## La primera versión

| Segundos | Escena | Qué pasa |
| --- | --- | --- |
| 0–4 | Gancho | «ALGO GRANDE» / «SE ESTÁ FORJANDO» sobre negro y se encienden las luces del techo |
| 4–12 | Montaje | Ocho planos de un segundo: «CADA ESTANTE», «CADA LUZ», «CADA DETALLE», «PENSADO PARA TI» |
| 12–16 | Revelación | La tienda entera, «TU NUEVA TIENDA DE SUPLEMENTACIÓN DEPORTIVA» y cuenta atrás 3, 2, 1 |
| 16–24 | Fachada | El golpe: el rótulo a cámara lenta en contrapicado y «ÚLTIMOS RETOQUES» |
| 24–30 | Cierre | El logo, «PRÓXIMA APERTURA», «MUY PRONTO» y «Síguenos y no te pierdas la inauguración» |

La música y los efectos de sonido están sintetizados en
`audio/banda_sonora.py`, así que no hay derechos de terceros: 120 BPM en re
menor, golpes de yunque en cada texto y el silencio justo antes del golpe de la
fachada. A 30 fps un pulso son 15 fotogramas, así que los cortes y los golpes
caen en el mismo fotograma.

## La versión épica

| Segundos | Escena | Qué pasa |
| --- | --- | --- |
| 0–4 | Gancho | Brasas sobre negro; «ALGO GRANDE» en acero con onda expansiva y destello anamórfico; «SE ESTÁ FORJANDO» al rojo con el yunque y una lluvia de chispas; las luces del techo se encienden con resplandor |
| 4–12 | Montaje | «CADA ESTANTE», «CADA LUZ», «CADA DETALLE» y cuatro golpes seguidos: «PROTEÍNA», «CREATINA», «PRE-ENTRENO», «Y MUCHO MÁS» |
| 12–16 | Revelación | La tienda entera con los metales; cuenta atrás 3, 2, 1 con ondas, y medio segundo de casi silencio con brasas |
| 16–24 | Fachada | El golpe: el rótulo llega, se congela a 0,25× con chispas a cámara lenta y sale acelerando; melodía de trompas y «ÚLTIMOS RETOQUES» |
| 24–30 | Cierre | El logo sale de la forja al rojo vivo y se enfría hasta el azul; «PRÓXIMA APERTURA», «MUY PRONTO» y un botón «SÍGUENOS» con campana, «y no te pierdas la inauguración» |

La banda sonora (`audio/banda_sonora_epica.py`) es una orquesta de muestras
reales de [VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE),
de dominio público (CC0): cuerdas en spiccato y trémolo, trompas, trombones,
tuba, timbales, tambores étnicos gigantes, gong, platos y yunque, con graves y
barridos sintetizados encima. Va a 120 BPM en re menor y termina en re mayor
con el logo. Está mezclada a −14 LUFS, el nivel de Instagram, TikTok y
YouTube.

Los efectos nuevos están en `src/vfx.tsx` (chispas, brasas, destello
anamórfico, onda expansiva, el logo forjado y el botón «SÍGUENOS» del final)
y las escenas en `src/epico/`. Los planos del interior van encuadrados hacia
el techo y las estanterías, con el suelo en sombra, porque la tienda aún
estaba en obras cuando se grabaron.
Los textos usan dos opciones nuevas de `<Rotulo>`: `metal` (blanco de acero
con un reflejo que lo recorre) y `fundido` (el texto destacado sale al rojo
blanco y se enfría hasta el naranja de la forja). El naranja se queda para el
calor (la forja, los productos, el «1») y el azul para la marca. `<Plano>`
tiene `bloom` para el resplandor de las luces y `golpe` para reforzar la
entrada en zoom.

## El aviso de la inauguración

«Hemos estado trabajando mucho, pero ya os podemos decir que próximamente os
diremos fecha y hora de nuestra inauguración», con el logo forjado. Es para
dar que hablar sin abrir la puerta a todo el mundo: no invita a nadie, solo
anuncia que la fecha y la hora están al caer.

| Segundos | Qué pasa |
| --- | --- |
| 0–2 | «HEMOS ESTADO» en acero y «TRABAJANDO MUCHO» al rojo con chispas de yunque |
| 2–6 | Un plano por pulso, del montaje de las estanterías a la fachada terminada, con una barra «TRABAJANDO» que llega al 100 % |
| 6–8 | «PERO YA OS PODEMOS DECIR...» sobre el rótulo de noche y medio segundo de casi silencio |
| 8–14 | El logo sale de la forja; «PRÓXIMAMENTE OS DIREMOS», «FECHA Y HORA», «DE NUESTRA INAUGURACIÓN» |
| 14–16 | Cierre: «INAUGURACIÓN», «FECHA Y HORA MUY PRONTO» y un botón «ATENTOS» con campana |

Hay una segunda composición, `Aviso-fecha`, que en vez de prometer la fecha
la da: «NUESTRA INAUGURACIÓN», «SERÁ EL SÁBADO», «17 DE OCTUBRE», y en el
cierre «os diremos la hora muy pronto». La fecha está en las `defaultProps`
de `src/Root.tsx`.

La escena está en `src/aviso/` y la música en `audio/banda_sonora_aviso.py`,
con la misma orquesta que la versión épica (`audio/orquesta.py`).

## El reel

El aviso montado como un reel de otra tienda que nos pasaron de referencia, y
con su música: arranque a oscuras con tubos de neón sobre el rótulo, una
quemadura de luz roja y blanca en el golpe, cortes a golpe de corchea (las
letras del rótulo cambian cada 7,5 fotogramas), ojo de pez en las
estanterías y el logo forjado en el compás fuerte.

| Segundos | Qué pasa |
| --- | --- |
| 0–1,5 | El rótulo a oscuras con neones y «HEMOS ESTADO» |
| 1,5–2,5 | El golpe: quemadura roja, «TRABAJANDO MUCHO» y chispas sobre el techo de LED |
| 2,5–6,5 | Montaje a ritmo: nevera, estanterías, montaje, letras del rótulo, la escalera |
| 6,5–8,5 | «PERO YA OS PODEMOS DECIR...» sobre la fachada |
| 8,5–12,5 | El logo forjado y una frase por golpe (con o sin fecha) |
| 12,5–14 | Cierre a corcheas: «INAUGURACIÓN», la fecha y «ATENTOS» |

`Reel` promete la fecha y `Reel-fecha` la da (sábado 17 de octubre). La
música sale de `originales/referencia-reel.mov`, una grabación de pantalla
del reel; `preparar-medios.sh` la recorta para que el golpe fuerte caiga en
el segundo 1,5. La canción no es nuestra: Instagram puede silenciar el vídeo
si se sube con ella dentro. La alternativa es subir la versión sin música y
añadir el mismo sonido desde la app (en el reel de referencia, «Usar audio»),
empezando por el mismo punto.

## Rehacerlo

Los vídeos y fotos de la tienda no están en el repositorio, porque es
público. Para volver a renderizar hay que copiarlos a `originales/` con estos
nombres:

    originales/interior.mov               recorrido por el interior con el techo de LED
    originales/estanteria-travelling.mov  travelling pegado a la estantería
    originales/estanteria-rincon.mov      góndola con rejilla y la esquina de la nevera
    originales/montaje.mov                montando una estantería
    originales/entrada.mov                de la puerta al fondo, con el techo
    originales/nevera.mov                 la nevera con la tira LED y la góndola (1080×1920)
    originales/fachada.mov                la fachada y el rótulo (60 fps)
    originales/fachada.jpg                foto de la fachada (de aquí sale el logo)
    originales/escalera.jpg               foto del rótulo con la escalera
    originales/referencia-reel.mov        grabación del reel de referencia (para la música del reel)

Y después:

    npm install
    npm run medios         # clips, fotos, logo, grano y bandas sonoras (~25 min)
    npm run render         # la primera versión, en out/iron-fuel-teaser.mp4
    npm run render:epico   # la épica, en out/iron-fuel-teaser-epico.mp4
    npm run render:aviso   # el aviso, en out/iron-fuel-aviso.mp4
    npm run render:aviso-fecha   # el aviso con la fecha, en out/iron-fuel-aviso-fecha.mp4
    npm run render:reel          # el reel, en out/iron-fuel-reel.mp4
    npm run render:reel-fecha    # el reel con la fecha, en out/iron-fuel-reel-fecha.mp4

`npm run medios` también descarga las muestras de orquesta (unos 500 MB) en
`audio/vsco/`, que tampoco se suben al repositorio.

En una sesión de Claude Code en la nube no se puede descargar el navegador de
Remotion ni hay GPU, así que el render necesita dos variables:

    REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell \
    REMOTION_GL=swangle npm run render:epico

Ese Chromium no decodifica H.264; por eso `preparar-medios.sh` pasa los clips a
VP9. Con H.264, Remotion reproduce los clips con `<OffthreadVideo>`, que no
aplica los efectos.

Sin GPU, algunos fotogramas de la versión épica (los del logo con todas las
chispas) tardan más de los 30 s que Remotion espera por defecto, así que
`npm run render:epico` espera hasta 120 s por fotograma (`--timeout=120000`).

## Dónde se cambia cada cosa

- Los textos: los `<Rotulo>` de `src/escenas/*.tsx` (primera versión),
  `src/epico/*.tsx` (la épica) y `src/aviso/*.tsx` (el aviso). El texto
  blanco va como hijo y el azul en `destacado`.
- Qué trozo de cada clip sale: `inicio` (en segundos) de cada `<Plano>`, y
  `velocidad` para la cámara lenta.
- Las transiciones: `entrada` y `salida` de cada `<Plano>` (`corte`, `zoom`,
  `barrido-izq`, `barrido-der`).
- La música: `audio/banda_sonora.py`, `audio/banda_sonora_epica.py` y
  `audio/banda_sonora_aviso.py`; después hay que volver a ejecutarlos. Si se
  mueve un corte en el vídeo, hay que mover su golpe en el script. La
  orquesta, la percusión y la mezcla que comparten las dos últimas están en
  `audio/orquesta.py`.
- Las chispas, brasas y destellos: `src/vfx.tsx`. Todo sale de `random()`
  con semilla, así que cada render es idéntico; para cambiar la forma de un
  estallido basta con cambiar su `semilla`.
- Colores y parpadeo de las luces: `src/marca.ts`.

## Licencia de Remotion

Remotion es gratis para particulares y para empresas de hasta 3 personas. A
partir de ahí la empresa necesita una licencia: <https://www.remotion.pro/license>.
La fuente Exo 2 (`public/fuentes/`) es de Google Fonts, con licencia SIL Open
Font License.
