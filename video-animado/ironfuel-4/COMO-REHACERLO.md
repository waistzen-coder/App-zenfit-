# Cómo rehacer el vídeo de IronFuel Nutrition · Parte 4 (isotónica y magnesio)

Cuarta parte: la vecina del quinto quiere correr su primera carrera de 10 km y en el kilómetro
tres ya pide agua. Mismo mundo y misma tienda; el gimnasio se cambia por la carrera.

Todo el vídeo sale de `guion.txt` y de la voz. Si cambias una frase o la voz, repites
los pasos 2 a 8 y todo se recoloca solo: la cámara, los personajes, los subtítulos y
los efectos van pegados a las palabras.

## Qué necesitas

- Node 22 o superior, Python 3 y ffmpeg.
- Las skills de HyperFrames: `npx hyperframes skills` y después `npx hyperframes doctor`.
- Para la voz gratis: `pip install kokoro-onnx soundfile numpy`.
- En el guion, los números van con letras para que la voz los lea bien; en pantalla salen con cifras.
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
npx hyperframes snapshot --at 0.3,2.5,5.0,8.0,10.5,15.0,19.5,24.0,28.0,32.0,36.5,40.0,44.8

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
| Qué hace cada personaje y cuándo | `tools/motor.js`: funciones `vecina()`, `abuelo()` (en la meta), `flaco()`, `companero()` (gancho final) y `dependiente()` |
| La cámara | `tools/motor.js`, lista `CAM`: `[segundo, x, y, zoom, curva]` |
| Colores, ropa de los personajes, carteles, tarjetas | `tools/build.mjs` (`C`, `PJ` y las funciones de cada sitio) |
| Efectos de sonido y su volumen | `tools/build.mjs`, lista `SFX`: `[segundo, archivo, dB, qué lo provoca]` |
| La música | `tools/build.mjs`, `cues.musica` (archivo, desde qué segundo y dB) |
| La tarjeta «sin entrenar, los botes no corren por ti» y la de seguir | `tools/build.mjs`: `regla()` y `seguir()` |
| Los subtítulos (palabras clave en azul) | `tools/build.mjs`, conjunto `CLAVE` y estilos de `subtitulos.html` |

Si cambias una frase y desaparece una palabra que usa el bloque `T`, `node tools/build.mjs`
se para y te dice cuál es: cámbiala por la palabra nueva que nombre esa misma cosa.

## Cómo está hecho

- **Un solo mundo y una sola cámara.** La calle, la tienda y el gimnasio son un único
  lienzo SVG. Una línea azul en el suelo une el mostrador con el gimnasio y se dibuja
  mientras la cámara sigue al protagonista. El desenfoque solo aparece en los viajes largos.
- **Todo es una función del tiempo.** `motor.js` pinta cada fotograma con `render(t)` y una
  única línea de tiempo de GSAP mueve `t`: la vista previa y el render salen idénticos.
- **La carrera.** La vecina lleva un reloj con los kilómetros; en la semana ocho cruza la meta
  y la espera el abuelo con el bastón en alto. Al final asoma el compañero de piso con su hoja
  de «vegano», el gancho de la quinta parte.
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

- [COMPROBAR] Bebida isotónica: las declaraciones («mantener la resistencia en esfuerzos largos» y «mejorar la absorción del agua») solo valen para bebidas con la composición de hidratos y sodio que marca la norma. Revisa el producto real.
- [COMPROBAR] Magnesio: «contribuye al funcionamiento normal de los músculos y a disminuir el cansancio». Revisa la dosis.
- [COMPROBAR] Dosis («a sorbos mientras corres», «uno al día con la cena») según el producto real.

## Créditos

Efectos y música: Mixkit (licencia gratuita, uso comercial permitido); ver
`assets/CREDITOS.md`. Iconos: Phosphor Icons (MIT). Voz: Kokoro (em_alex). Tipografía: Inter.
