# Cómo rehacer el vídeo de prueba de IronFuel Nutrition · «Cinco palabras en la puerta»

Un vídeo con otro lenguaje visual que la serie de dibujos (partes 1 a 9): sin personajes,
hecho con los materiales de la propia tienda. Empieza en la foto real de la puerta, entra en el
cartel de las cinco palabras (FUERZA, RESISTENCIA, ENERGÍA, RENDIMIENTO, RECUPERACIÓN), cada una
estalla en cromo con su propio mundo, se juntan en cinco franjas, giran como un rodillo bajo
«¿PARA QUÉ ENTRENAS?», pasa al mostrador (IFLEX PRIME real con sus etiquetas, el foco que se
apaga, «ESTO NO TE HACE FALTA», un tique a 0,00 €) y termina con la frase de abajo del cartel en
cromo gigante, el rótulo real de la fachada, el logo y SÍGUENOS.

La ficha del vídeo, con todos los números y los planos, está en `SPEC.md`. Las otras dos
historias que no se hicieron, en `STORYLINES.md`. La revisión, en `REVIEW.md`.

## Qué necesitas

- Node 22 o superior, Python 3 con `numpy`, y ffmpeg.
- Las skills de HyperFrames (`npx hyperframes skills`) y Chromium con Playwright (para `sincronia.mjs`).
- Voz gratis, local: Kokoro (la usa `npx hyperframes tts`). No hace falta ninguna clave ni se guarda
  ninguna en el proyecto.
- Para las comprobaciones: `cd tools/node && npm install gsap@3.15.0` (una sola vez).
- Tipografías en `assets/fonts/` (licencia OFL): Saira (cursiva, ancho variable) para el cromo, como
  «IRON FUEL» del rótulo, y Oswald para lo impreso, como el cartel de la puerta.

> En un entorno con proxy (como el de Claude Code en la nube), `transcribe` necesita
> `export NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`.

## Los pasos (desde esta carpeta)

```bash
# 1. El guion: una frase por línea. Cada frase va también en tools/frases/NN.txt
#    («Áiron Fiul Nutríshon» es la marca «como suena»; en pantalla sale el rótulo real)
nano guion.txt

# 2. Una voz por frase (em_alex, un poco más pausada)
for n in $(seq -w 1 16); do
  npx hyperframes tts tools/frases/$n.txt --voice em_alex --lang es --speed 0.9 -o tools/frases/$n.wav
done

# 3. Monta la voz sobre el ritmo de la música (128 BPM): las cinco palabras cada dos tiempos,
#    el resto en el medio tiempo siguiente y «Construye tu mejor versión» justo en la entrada
#    fuerte de la música. Escribe assets/audio/voz.wav y tools/montaje.json
python3 tools/montar_voz.py

# 4. Comprueba con whisper que la voz dice el guion, palabra por palabra
npx hyperframes transcribe assets/audio/voz.wav --language es --model large-v3
cp assets/audio/transcript.json tools/sueltas/transcript-whisper.json
node tools/tiempos.mjs            # «El guion y la voz coinciden…» (salvo la marca, dicha como suena)

# 5. El momento exacto de cada palabra. Whisper adelanta 0,3-0,5 s las palabras de dentro
#    de cada frase; alinear.py las engancha a los silencios de las p, t, k y a las s, z, f, j
#    del audio real (escribe assets/audio/transcript.json). --tira dibuja la energía de cada frase
python3 tools/alinear.py
node tools/tiempos.mjs --palabras

# 6. Genera la composición: index.html, compositions/mundo.html y compositions/subtitulos.html
node tools/build.mjs

# 7. Mezcla voz + música + efectos a -14 LUFS (assets/audio/mezcla.wav)
python3 tools/mezclar.py

# 8. Comprobaciones
npx hyperframes check             # 0 errores
node tools/zonas.mjs              # lo importante, dentro de las zonas seguras
node tools/sincronia.mjs          # cada aparición en su palabra (escribe SINCRONIA.md)
npx hyperframes snapshot --review

# 9. Render, con y sin subtítulos, y verificación (negros, duración, -14 LUFS)
npx hyperframes render --quality delivery -o renders/video-FINAL.mp4
npx hyperframes render --quality delivery --variables '{"subtitulos":false}' -o renders/video-SIN-SUBTITULOS.mp4
bash tools/verificar.sh renders/video-FINAL.mp4 renders/video-SIN-SUBTITULOS.mp4
```

Los pasos 6 a 9 de una vez: `bash ../comun/rehacer.sh ironfuel-puerta`.

## Dónde se cambia cada cosa

| Quieres cambiar… | Dónde |
| --- | --- |
| Lo que se dice | `guion.txt` y `tools/frases/NN.txt` (y repetir los pasos 2-9) |
| Dónde cae cada frase sobre la música | `tools/montar_voz.py` (`INICIO`, `HUECO`, `PALABRAS`, `CLIMAX`) |
| A qué palabra va pegada cada cosa | `tools/build.mjs`, bloque `T`: `P("palabra", n)` es cuándo empieza la n-ésima vez que se dice |
| La cámara | `tools/motor.js`, lista `CAM`: `[segundo, x, y, zum, curva]`; las sacudidas en `SACUDIDAS` |
| Las cinco palabras: tamaños, franjas y rodillo | `tools/build.mjs`, lista `PAL` (medidas de la foto real) y `palabra()` en `tools/motor.js` |
| El mundo de cada palabra (acero, estelas, rayo, engranajes, amanecer) | `mundos()` en `tools/build.mjs`; su movimiento, en «mundos» de `tools/motor.js` |
| El plan de cada franja | `PLANES` en `tools/build.mjs` (iconos de Phosphor de `assets/icons`) |
| El mostrador: bote, etiquetas, bocadillo y tique | `mostrador()` en `tools/build.mjs` |
| El cierre: rótulo, logo, SÍGUENOS | `cierre()` y `FIN` en `tools/build.mjs` |
| Efectos de sonido | `tools/build.mjs`, lista `SFX`: `[segundo, archivo, dB, qué lo provoca]` |
| La música y su volumen a lo largo del vídeo | `tools/build.mjs`, `cues.musica` (`desde` y la `curva` de dB) |
| Los subtítulos | `tools/build.mjs`: `EN_EL_MUNDO` (frases que ya se escriben en grande y no se repiten) y `CLAVE` |

Si cambias una frase y desaparece una palabra del bloque `T`, `node tools/build.mjs` se para y
te dice cuál es.

## Decisiones que conviene saber

- **El gancho**: la primera línea de subtítulos («EN NUESTRA PUERTA») ya está entera en el
  fotograma 0, porque es la miniatura. Todo lo demás aparece cuando empieza su palabra
  (`SINCRONIA.md`: 44 de 44 dentro de ±3 fotogramas).
- **Subtítulos**: no repiten lo que ya está escrito en grande en el mundo y a la vez que se dice
  (las cinco palabras, ¿PARA QUÉ ENTRENAS?, CONSTRUYE TU MEJOR VERSIÓN, el rótulo y la llamada final).
- **Fotos reales**: la puerta y el rótulo salen de la captura del Reel de la tienda, recortados
  para que no se vea nada de Instagram; el bote de IFLEX PRIME, de su publicación, recortado del fondo.
- **Producto**: las etiquetas solo dicen lo que pone en su envase (colágeno, glucosamina +
  condroitina, ácido hialurónico); no se promete ningún efecto ni se une a ninguna de las cinco palabras.

## [COMPROBAR] antes de publicar

- [COMPROBAR] El sonido está medido (-14 LUFS, pico ≤ -1 dBTP), no escuchado: escucha la mezcla,
  sobre todo el golpe de «Construye» y el volumen de la música en la parte del tique.
- [COMPROBAR] La foto de la puerta viene de una captura de pantalla y se amplía casi ×2: si tenéis
  una foto de la puerta en buena calidad, sustituye `assets/img/fachada-foto.png` con el mismo encuadre.
- [COMPROBAR] Que os parece bien decir en un anuncio «si no te hace falta, te lo decimos» y el tique a 0,00 €.
