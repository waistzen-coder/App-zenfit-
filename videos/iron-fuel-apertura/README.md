# Teaser de apertura · Iron Fuel Nutrition

Vídeo vertical de 30 s (1080×1920, 30 fps) para Reels, TikTok y Shorts,
montado con [Remotion](https://www.remotion.dev) a partir de los vídeos y
fotos de la tienda grabados con el móvil. Hay dos versiones con el mismo
guion:

- `Teaser`: la primera, con música sintetizada.
- `TeaserEpico`: la versión épica, con orquesta de verdad y efectos de
  forja (abajo).

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
| 24–30 | Cierre | El logo sale de la forja al rojo vivo y se enfría hasta el azul; «PRÓXIMA APERTURA», «MUY PRONTO» y «Síguenos y no te pierdas la inauguración» |

La banda sonora (`audio/banda_sonora_epica.py`) es una orquesta de muestras
reales de [VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE),
de dominio público (CC0): cuerdas en spiccato y trémolo, trompas, trombones,
tuba, timbales, tambores étnicos gigantes, gong, platos y yunque, con graves y
barridos sintetizados encima. Va a 120 BPM en re menor y termina en re mayor
con el logo. Está mezclada a −14 LUFS, el nivel de Instagram, TikTok y
YouTube.

Los efectos nuevos están en `src/vfx.tsx` (chispas, brasas, destello
anamórfico, onda expansiva y el logo forjado) y las escenas en `src/epico/`.
Los textos usan dos opciones nuevas de `<Rotulo>`: `metal` (blanco de acero
con un reflejo que lo recorre) y `fundido` (el texto destacado sale al rojo
blanco y se enfría hasta el naranja de la forja). El naranja se queda para el
calor (la forja, los productos, el «1») y el azul para la marca. `<Plano>`
tiene `bloom` para el resplandor de las luces y `golpe` para reforzar la
entrada en zoom.

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

Y después:

    npm install
    npm run medios         # clips, fotos, logo, grano y bandas sonoras (~25 min)
    npm run render         # la primera versión, en out/iron-fuel-teaser.mp4
    npm run render:epico   # la épica, en out/iron-fuel-teaser-epico.mp4

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

- Los textos: los `<Rotulo>` de `src/escenas/*.tsx` (primera versión) y de
  `src/epico/*.tsx` (la épica). El texto blanco va como hijo y el azul en
  `destacado`.
- Qué trozo de cada clip sale: `inicio` (en segundos) de cada `<Plano>`, y
  `velocidad` para la cámara lenta.
- Las transiciones: `entrada` y `salida` de cada `<Plano>` (`corte`, `zoom`,
  `barrido-izq`, `barrido-der`).
- La música: `audio/banda_sonora.py` y `audio/banda_sonora_epica.py`;
  después hay que volver a ejecutarlos. Si se mueve un corte en el vídeo,
  hay que mover su golpe en el script.
- Las chispas, brasas y destellos: `src/vfx.tsx`. Todo sale de `random()`
  con semilla, así que cada render es idéntico; para cambiar la forma de un
  estallido basta con cambiar su `semilla`.
- Colores y parpadeo de las luces: `src/marca.ts`.

## Licencia de Remotion

Remotion es gratis para particulares y para empresas de hasta 3 personas. A
partir de ahí la empresa necesita una licencia: <https://www.remotion.pro/license>.
La fuente Exo 2 (`public/fuentes/`) es de Google Fonts, con licencia SIL Open
Font License.
