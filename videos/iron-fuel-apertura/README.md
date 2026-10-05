# Teaser de apertura · Iron Fuel Nutrition

Vídeo vertical de 30 s (1080×1920, 30 fps) para Reels, TikTok y Shorts,
montado con [Remotion](https://www.remotion.dev) a partir de los vídeos y
fotos de la tienda grabados con el móvil.

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
    npm run medios     # clips, fotos, logo, grano y banda sonora (~15 min)
    npm run render     # deja el vídeo en out/iron-fuel-teaser.mp4

En una sesión de Claude Code en la nube no se puede descargar el navegador de
Remotion ni hay GPU, así que el render necesita dos variables:

    REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell \
    REMOTION_GL=swangle npm run render

Ese Chromium no decodifica H.264; por eso `preparar-medios.sh` pasa los clips a
VP9. Con H.264, Remotion reproduce los clips con `<OffthreadVideo>`, que no
aplica los efectos.

## Dónde se cambia cada cosa

- Los textos: los `<Rotulo>` de `src/escenas/*.tsx`. El texto blanco va como
  hijo y el azul en `destacado`.
- Qué trozo de cada clip sale: `inicio` (en segundos) de cada `<Plano>`, y
  `velocidad` para la cámara lenta.
- Las transiciones: `entrada` y `salida` de cada `<Plano>` (`corte`, `zoom`,
  `barrido-izq`, `barrido-der`).
- La música: `audio/banda_sonora.py`; después hay que volver a ejecutarlo.
  Si se mueve un corte en el vídeo, hay que mover su golpe en el script.
- Colores y parpadeo de las luces: `src/marca.ts`.

## Licencia de Remotion

Remotion es gratis para particulares y para empresas de hasta 3 personas. A
partir de ahí la empresa necesita una licencia: <https://www.remotion.pro/license>.
La fuente Exo 2 (`public/fuentes/`) es de Google Fonts, con licencia SIL Open
Font License.
