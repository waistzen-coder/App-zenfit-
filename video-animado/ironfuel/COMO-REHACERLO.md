# Cómo rehacer el vídeo de IronFuel Nutrition

Todo el vídeo sale de `guion.txt` y de la voz. Si cambias una frase o la voz, repites
los pasos 2 a 8 y todo se recoloca solo: la cámara, los personajes, los subtítulos y
los efectos van pegados a las palabras.

## Qué necesitas

- Node 22 o superior, Python 3 y ffmpeg.
- Las skills de HyperFrames: `npx hyperframes skills` y después `npx hyperframes doctor`.
- Para la voz gratis: `pip install kokoro-onnx soundfile numpy`.
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
npx hyperframes snapshot --at 1.2,4.6,9.9,19.8,24.5,29,35.6,37.2,41,44.6

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
| Qué hace cada personaje y cuándo | `tools/motor.js`: funciones `flaco()`, `dependiente()`, `acompanante()`, `vecinoGym()` |
| La cámara | `tools/motor.js`, lista `CAM`: `[segundo, x, y, zoom, curva]` |
| Colores, ropa de los personajes, carteles, tarjetas | `tools/build.mjs` (`C`, `PJ` y las funciones de cada sitio) |
| Efectos de sonido y su volumen | `tools/build.mjs`, lista `SFX`: `[segundo, archivo, dB, qué lo provoca]` |
| La música | `tools/build.mjs`, `cues.musica` (archivo, desde qué segundo y dB) |
| Los subtítulos (palabras clave en naranja) | `tools/build.mjs`, conjunto `CLAVE` y estilos de `subtitulos.html` |

Si cambias una frase y desaparece una palabra que usa el bloque `T`, `node tools/build.mjs`
se para y te dice cuál es: cámbiala por la palabra nueva que nombre esa misma cosa.

## Cómo está hecho

- **Un solo mundo y una sola cámara.** La calle, la tienda y el gimnasio son un único
  lienzo SVG. Una línea naranja en el suelo une el mostrador con el gimnasio y se dibuja
  mientras la cámara sigue al protagonista. El desenfoque solo aparece en los viajes largos.
- **Todo es una función del tiempo.** `motor.js` pinta cada fotograma con `render(t)` y una
  única línea de tiempo de GSAP mueve `t`: la vista previa y el render salen idénticos.
- **Personajes articulados.** Cabeza, tronco, brazos, antebrazos, piernas y ojos que
  parpadean, con respiración, andar y correr. El protagonista crece «en su sitio»: la
  musculatura es un número de 0 a 1 que engorda el tronco, los brazos y el cuello.
- **Los tiempos de la voz se corrigen con el audio.** Whisper adelanta las palabras entre
  0,2 y 0,4 s porque se come las pausas. `tiempos.mjs` coloca cada frase en su hueco
  real de voz y pega a su microsilencio las palabras que empiezan por p, t, c, b, d o g.

## Créditos

Efectos y música: Mixkit (licencia gratuita, uso comercial permitido); ver
`assets/CREDITOS.md`. Iconos: Phosphor Icons (MIT). Voz: Kokoro (em_alex). Tipografía: Inter.
