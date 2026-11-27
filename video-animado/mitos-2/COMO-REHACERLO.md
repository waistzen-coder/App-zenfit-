# Mitos del gimnasio · Nº 2

**Mito: la proteína es solo para culturistas.**

Este episodio sale de `guion.txt` y de `tools/episodio.mjs` (quién sale, qué hace en cada palabra, la cámara,
la tarjeta REALIDAD y los efectos de sonido). El mundo, los personajes y las comprobaciones son comunes a toda
la serie: lee `../comun/mitos/COMO-REHACERLO.md`.

Para rehacerlo entero (voz incluida) desde esta carpeta:

```bash
python3 ../comun/mitos/voz.py && python3 tools/alinear.py
cd .. && bash comun/mitos/rehacer.sh mitos-2
```

Entrega: `video-FINAL.mp4` (con subtítulos) y `video-SIN-SUBTITULOS.mp4`. Sincronía y zonas seguras: `SINCRONIA.md`.

[COMPROBAR] El sonido está medido (-14 LUFS), no escuchado: escúchalo antes de publicar.
