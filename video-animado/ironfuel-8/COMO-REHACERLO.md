# Cómo rehacer el vídeo de IronFuel Nutrition · Parte 8 (berberina: lo que es y lo que no es)

Octava parte: todo el mundo habla de la berberina y a la madre del flaco le prometían de todo
en el móvil. En la tienda le cuentan lo que es (extracto de agracejo, 97 %, 970 mg por dosis)
y lo que no es, con el aviso de medicación, embarazo y lactancia. Luego, paseos con medio barrio.

Todo el vídeo sale de `guion.txt` y de la voz. Si cambias una frase o la voz, repites
los pasos 2 a 8 y todo se recoloca solo: la cámara, los personajes, los subtítulos y
los efectos van pegados a las palabras.

## Qué necesitas

- Node 22 o superior, Python 3 y ffmpeg.
- Las skills de HyperFrames: `npx hyperframes skills` y después `npx hyperframes doctor`.
- Para la voz gratis: `pip install kokoro-onnx soundfile numpy`.
- En el guion, los números van con letras y algunas marcas «como suenan» (ver `DISPLAY`); en pantalla salen con cifras y bien escritas.
- Para comprobar la sincronía: `cd tools/node && npm install gsap@3.15.0` (una sola vez).

> En un entorno con proxy (como el de Claude Code en la nube), las descargas de modelos
> necesitan `export NODE_USE_ENV_PROXY=1` antes de `transcribe`.

## Los pasos (desde esta carpeta)

```bash
# 1. Edita el guion: una frase por línea, sin saltos de línea dentro de una frase
nano guion.txt

# 2. Voz gratis (em_alex = hombre; ef_dora = mujer)
npx hyperframes tts guion.txt --voice em_alex --lang es -o assets/audio/voz-bruta.wav

# 3. Pausas de 0,25 s como mucho entre frases (no acelera la voz)
python3 tools/limpiar_voz.py assets/audio/voz-bruta.wav assets/audio/voz.wav

# 4. El momento exacto de cada palabra (escribe assets/audio/transcript.json)
npx hyperframes transcribe assets/audio/voz.wav --language es --model large-v3

# 5. Compara guion y voz palabra por palabra (y ve los tiempos con --palabras)
node tools/tiempos.mjs

# 6. Genera la composición: index.html, compositions/mundo.html y compositions/subtitulos.html
node tools/build.mjs

# 7. Mezcla voz + música + efectos a -14 LUFS (assets/audio/mezcla.wav)
python3 tools/mezclar.py

# 8. Comprobaciones
npx hyperframes check          # sin errores
node tools/zonas.mjs           # lo importante, dentro de las zonas seguras de Shorts, Reels y TikTok
node tools/sincronia.mjs       # cada aparición en su palabra (escribe SINCRONIA.md)
npx hyperframes snapshot --at 1.3,4.8,6.9,8.2,16.9,21.6,25.9,28.8,31.2,33.9,35.5,38.6

# 9. Render
npx hyperframes render --quality delivery -o video-FINAL.mp4
npx hyperframes render --quality delivery --variables '{"subtitulos":false}' -o video-SIN-SUBTITULOS.mp4

# 10. Que no haya negros, que dure lo que la voz y que suene a -14 LUFS
ffmpeg -i video-FINAL.mp4 -vf blackdetect=d=0.05:pix_th=0.05 -an -f null - 2>&1 | grep black_start
ffprobe -v error -show_entries format=duration -of csv=p=0 video-FINAL.mp4
ffmpeg -i video-FINAL.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -A3 Summary
```

Para ver y retocar el vídeo en el navegador: `npx hyperframes preview`.

## Dónde se cambia cada cosa

| Quieres cambiar… | Dónde |
| --- | --- |
| Lo que se dice | `guion.txt` (y repetir los pasos 2-9) |
| A qué palabra va pegada cada cosa | `tools/build.mjs`, bloque `T`: `P("palabra", n)` es cuándo empieza la n-ésima vez que se dice esa palabra |
| Qué hace cada personaje y cuándo | `tools/motor.js`: `madre()` (personaje nuevo, en `PJ.madre`), `dependiente()` y `paseante()` (los que se unen al paseo) |
| La cámara | `tools/motor.js`, lista `CAM`: `[segundo, x, y, zoom, curva]` |
| Colores, ropa de los personajes, carteles, tarjetas | `tools/build.mjs` (`C`, `PJ` y las funciones de cada sitio) |
| Efectos de sonido y su volumen | `tools/build.mjs`, lista `SFX`: `[segundo, archivo, dB, qué lo provoca]` |
| La música | `tools/build.mjs`, `cues.musica` (archivo, desde qué segundo y dB) |
| Las tarjetas (lo que es, lo que no es, el aviso y «primero la información») y la de seguir | `tools/build.mjs`: lista `CARDS` y `seguir()`; el móvil en `telefono()` |
| Los subtítulos (palabras clave en azul) | `tools/build.mjs`, conjunto `CLAVE` y estilos de `subtitulos.html` |

Si cambias una frase y desaparece una palabra que usa el bloque `T`, `node tools/build.mjs`
se para y te dice cuál es: cámbiala por la palabra nueva que nombre esa misma cosa.

## Cómo está hecho

- **Un solo mundo y una sola cámara.** La calle, la tienda y el gimnasio son un único
  lienzo SVG. Una línea azul en el suelo une el mostrador con el gimnasio y se dibuja
  mientras la cámara sigue al protagonista. El desenfoque solo aparece en los viajes largos.
- **Todo es una función del tiempo.** `motor.js` pinta cada fotograma con `render(t)` y una
  única línea de tiempo de GSAP mueve `t`: la vista previa y el render salen idénticos.
- **Lo que es y lo que no es.** Dos tarjetas enfrentadas y, arriba, el aviso del médico, que
  luego queda tapado por «1. la información, 2. el bote». Las semanas son paseos tras comer.
- **Tarjetas por datos y réplicas de producto.** Las tarjetas son una lista `CARDS` en
  `tools/build.mjs`: cada fila dice su palabra (`t`), su contenido y hasta dónde llega; la
  tarjeta crece sola en su sitio, y `zonas.mjs` y `sincronia.mjs` comprueban cada fila sin
  tocarlos. Las réplicas de los productos (IFLEX PRIME, VitoBest, Pro Tella, berberina y
  NAD+) están en `../comun/kit-build.js`; el motor común de tarjetas, en `../comun/kit-motor.js`.
- **Marcas que se leen como suenan.** En `guion.txt` las marcas van escritas para que la voz
  las pronuncie bien; el diccionario `DISPLAY` de `tools/build.mjs` las devuelve a su
  ortografía en los subtítulos.
- **Personajes articulados.** Cabeza, tronco, brazos, antebrazos, piernas y ojos que
  parpadean, con respiración, andar y correr. El protagonista crece «en su sitio»: la
  musculatura es un número de 0 a 1 que engorda el tronco, los brazos y el cuello.
- **Los tiempos de la voz se corrigen con el audio.** Whisper adelanta las palabras entre
  0,2 y 0,4 s porque se come las pausas. `tiempos.mjs` coloca cada frase en su hueco
  real de voz y pega a su microsilencio las palabras que empiezan por p, t, c, b, d o g.

## La marca y la tienda

- Colores sacados del logo de Iron Fuel Nutrition: azul eléctrico `#1D6BFF` y gama de acero.
  Están en `tools/build.mjs`, objeto `C`.
- El logo está en `assets/brand/logo.png` (recorte circular del que pasaste).
- La tienda copia la fachada real: edificio de ladrillo con balcones blancos, cartel negro con
  «IF» cromado, «IRON FUEL» en cursiva y «NUTRITION» en azul con la raya diagonal, el lema
  «CONSTRUYE TU MEJOR VERSIÓN» sobre la puerta y estanterías blancas con tira LED azul.
  El original común está en `../comun/tienda.js`; `../comun/aplicar_marca.py` lo copia en
  cada `tools/build.mjs`.

## Todo de una vez

Desde `video-animado/`: `bash comun/rehacer.sh NOMBRE-DE-LA-CARPETA` genera, mezcla, comprueba
(check, zonas seguras y sincronía), renderiza los dos vídeos y verifica negros, duración y volumen.

## Datos que hay que comprobar antes de publicar

- [COMPROBAR] Composición y dosis: 1.000 mg de extracto de agracejo, 970 mg de berberina HCl (97 %) por dosis, dos cápsulas al día con una comida. Revisa la etiqueta.
- [COMPROBAR] La berberina no tiene declaraciones de salud autorizadas en la UE: el vídeo no habla de glucosa, metabolismo ni peso. No lo añadas.
- [COMPROBAR] Mantén el aviso de medicación, embarazo y lactancia (y revisa si la etiqueta añade otros, como menores).

## Créditos

Efectos y música: Mixkit (licencia gratuita, uso comercial permitido); ver
`assets/CREDITOS.md`. Iconos: Phosphor Icons (MIT). Voz: Kokoro (em_alex). Tipografía: Inter.
