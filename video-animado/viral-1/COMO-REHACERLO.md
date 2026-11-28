# Vídeo viral · «POV: eres su creatina»

El bote de creatina del flaco cuenta su vida en 28 segundos: el día 1 le compran, el día 2 sale en
Instagram, el día 10 acaba escondido detrás de los cereales y el día 30 el flaco dice que «la creatina no
funciona». El bote estalla: «¡Si no me tomas!». Cierra con cómo se toma de verdad y «etiqueta a quien tiene
su creatina abandonada».

## Por qué este formato

Mezcla lo que más se repite en los vídeos de gimnasio con millones de visitas:

| Lo que funciona | Cómo está aquí |
| --- | --- |
| Objetos y comida que hablan (tendencia de 2025 con millones de vistas) | El bote es el narrador, con cara, brazos y boca sincronizada con la voz |
| Gancho de historia en el primer fotograma («antes» que pide ver el «después») | «POV: eres su creatina» + el bote feliz; el espectador se queda a ver el día 30 |
| Diario «Día 1… Día 30» | Calendario que cambia de hoja en cada «Día…» |
| Humor reconocible (todos conocemos al que deja el bote) | Foto para Instagram, «hoy no me toca», los cereales |
| Desmontar una creencia con datos correctos | Tarjeta CÓMO TOMARLA: 3 g al día, todos los días, también los de descanso |
| Llamada a etiquetar (comentarios y compartidos) | «Etiqueta a ese amigo» con el @ escribiéndose |
| Bucle | Acaba con el bote triste y empieza con el bote saludando |

Lo que dice de la creatina sigue la declaración autorizada en la UE: la creatina aumenta el rendimiento
físico en series sucesivas de ejercicios cortos y de alta intensidad, con una toma diaria de 3 g
(Reglamento (UE) 432/2012). No promete músculo, ni adelgazar, ni curar nada.

## Rehacerlo

Este vídeo usa el mismo mundo y el mismo motor que «Mitos del gimnasio» (`../comun/mitos`), con piezas nuevas:
la cocina, el calendario, el bote que habla, los cereales, el flash de la foto y las telarañas.
Lo que pasa en cada palabra está en `tools/episodio.mjs`; el texto, en `guion.txt`.

```bash
# voz (Kokoro, voz femenina ef_dora un 5 % más rápida) y alineación palabra a palabra
VOZ=ef_dora VEL=1.05 python3 ../comun/mitos/voz.py && python3 tools/alinear.py
# composición, mezcla, comprobaciones, los dos render y la verificación
cd .. && bash comun/mitos/rehacer.sh viral-1
```

Entrega: `video-FINAL.mp4` (con subtítulos) y `video-SIN-SUBTITULOS.mp4`. Sincronía y zonas seguras: `SINCRONIA.md`.

### El bote que habla (`tipo: "botevivo"` en `tools/episodio.mjs`)

- `emo`: cara en cada momento: `alegre`, `feliz`, `triste`, `enfadada`, `sorpresa`, `aburrida`, `seria`.
- `brazos`: `abajo`, `triste`, `arriba`, `saludo`, `senala`, `dedo`, `posa`, `jarras`, `abiertos`; `saluda` = tramos en los que agita la mano.
- La boca se abre con cada palabra de la voz (sale sola de los tiempos de la transcripción).
- `saltos`, `yk` (asomarse por encima de los cereales), `polvo`, `telas` (telarañas) y `temblor` (rabia).

### Ideas para la serie

El mismo formato sirve para otros productos que se quedan en el armario: la proteína que solo se usa para
la foto, el pre-entreno de las 22:00, el shaker que nadie lava. Cambia `guion.txt`, la voz y `tools/episodio.mjs`.

[COMPROBAR] El sonido está medido (-14 LUFS), no escuchado: escúchalo antes de publicar.
