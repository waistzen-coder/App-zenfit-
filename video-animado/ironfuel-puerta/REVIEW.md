# Revisión · «Cinco palabras en la puerta»

## Decisiones creativas

- Historia **A** de `STORYLINES.md`: el argumento lo llevan las palabras reales del cartel de la
  puerta. Sin personajes ni dibujos: foto real, cromo, luz azul del rótulo, Saira (como «IRON FUEL»)
  y Oswald (como el cartel). Una sola cámara recorre un solo mundo: la puerta → el cartel → el
  mostrador (a la izquierda, «dentro») → el cartel otra vez → el rótulo (arriba).
- La voz está montada frase a frase sobre el ritmo de «A Game» (128 BPM): las cinco palabras caen
  en tiempos de la música y «Construye» cae justo en la vuelta del bajo tras el bajón.
- No construidas: **B** «Lee la etiqueta» (una lupa recorre etiquetas reales en un zum sin fin) y
  **C** «De 9:00 a 21:00 en la puerta» (un día entero en la fachada con la luz cambiando).

## Qué se midió y qué solo se miró

- `hyperframes check`: 0 errores en lint, runtime, layout, motion, contraste, craft y audio.
- `tools/zonas.mjs`: todo lo importante dentro de 60–1020 px en horizontal y 220–1500 px en vertical.
- `tools/sincronia.mjs`: 44 de 44 apariciones dentro de ±3 fotogramas de su palabra (`SINCRONIA.md`).
  Los tiempos de las palabras salen de `tools/alinear.py`, no de whisper (whisper adelantaba hasta 0,45 s).
- Mirado: unos 60 fotogramas en hojas de contacto, la hoja de teléfono a 360 px (todo se lee) y
  el zum de entrada y el golpe final fotograma a fotograma.
- El sonido está medido (sonoridad y picos en el MP4), no escuchado.

## Notas de la revisión (ya corregidas)

- P0 · t=0 · el primer fotograma tenía la caja de subtítulos vacía → la primera línea ya está entera en el fotograma 0.
- P0 · t=2,5 · la foto y el cartel vectorial se veían a la vez descolocados → primero se va la foto, el cartel aparece alineado con ella y luego se estira.
- P0 · t=2,9 · el icono del brazo se leía como una bota → redibujado (brazo flexionado que marca bíceps).
- P1 · t=8,6 · el sol detrás de RECUPERACIÓN quitaba contraste → el sol sale por encima del horizonte, la palabra queda sobre el suelo oscuro.
- P1 · t=21,5 · al apagar el foco se veía un rectángulo oscuro alrededor del bote → la sombra va recortada a la silueta del bote.
- P1 · t=26,2 · «TOTAL» tocaba «0,00 €» y el sello tapaba líneas → TOTAL más pequeño y el sello debajo, en papel en blanco.
- P1 · t=35 · el logo pisaba la tira de luz del rótulo y abajo asomaba «FUERZA» cortada → cierre recolocado y franjas apagadas.
- P2 · t=2,76 · dos fotogramas con FUERZA impresa y en cromo a la vez → la impresa desaparece en el golpe.
- P2 · t=13 · los iconos del plan se acercaban al borde derecho → movidos 30 px a la izquierda.

## El plano más flojo

14,4–16,9 s («antes de venderte nada»): entre los subtítulos y el rodillo girando queda un hueco
oscuro hasta que cae «¿PARA QUÉ ENTRENAS?». Con más tiempo, un signo de interrogación de cromo
ocuparía ese hueco y se convertiría en el titular. La foto de la puerta viene de una captura y se
ve algo blanda al ampliarla: con una foto buena de la puerta, el arranque ganaría mucho.

## Avisos que se quedan a propósito

- `contrast_aa_failure` en las palabras de cromo: el medidor promedia el degradado y el contorno
  azul; en pantalla y a 360 px se leen bien. Es el material del rótulo de la tienda.
- `line_unread` en RESISTENCIA, ENERGIA, RENDIMIENTO y RECUPERACIÓN impresas durante el zum de
  entrada (0,26–0,37 s): son las palabras del cartel alejándose; cada una vuelve a salir en grande.
- `line_unread` en «VEN A VERNOS» (1,4 s): el vídeo dura exactamente lo que la voz (regla del encargo).
- `outside_safe_zone`: avisos por las zonas de cada plataforma (más estrechas que las del encargo,
  que sí se cumplen). Los subtítulos van arriba, a 236 px, como pide el encargo.
- `composition_file_too_large` / `timeline_track_too_dense`: el mundo lo genera `tools/build.mjs`.
