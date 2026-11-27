# Cómo rehacer un episodio de «Mitos del gimnasio» (IronFuel Nutrition)

Serie de vídeos verticales (1080 × 1920, 30 fps) con los muñequitos, la tienda y el gimnasio de
las partes 1 a 9. Cada episodio desmonta un mito con la misma estructura:

1. **Gancho**: el cliente con el mito en un bocadillo y la etiqueta «¿MITO?» (ya visible en el fotograma 0).
2. **La historia**: lo que se imagina (nube con su versión exagerada) o lo que hace por culpa del mito.
3. **En la tienda**: el dependiente dice que no, sello rojo «MITO» sobre el bocadillo.
4. **REALIDAD**: tarjeta que crece fila a fila, cada fila en la palabra que la nombra; el bote en el mostrador.
5. **El resultado** (gimnasio, paseo, ducha o dormir).
6. **Veredicto**: el mito tachado y el sello «MITO».
7. **Llamada**: «¿Qué mito desmontamos?», un comentario que se escribe solo y SEGUIR → SIGUIENDO.

## Dónde está cada cosa

| Qué | Dónde |
| --- | --- |
| El generador común (mundo, personajes, piezas) | `comun/mitos/construir.mjs` |
| El motor común (cámara, personajes, objetos) | `comun/mitos/_util.js`, `_rig.js`, `_obj.js` (de la parte 9) y `serie.js` |
| La voz por frases (Kokoro, em_alex) | `comun/mitos/voz.py` |
| Las comprobaciones (sincronía y zonas seguras) | `comun/mitos/comprobar.mjs` → `SINCRONIA.md` |
| Rehacer y renderizar un episodio | `bash comun/mitos/rehacer.sh mitos-N` |
| Crear un episodio nuevo | `bash comun/mitos/nuevo.sh N` (copia `_guiones/mitos-N.txt` como guion) |
| Lo propio de cada episodio | `mitos-N/guion.txt` y `mitos-N/tools/episodio.mjs` |

## Los pasos (desde la carpeta del episodio, p. ej. `mitos-1/`)

```bash
nano guion.txt                          # una frase por línea
python3 ../comun/mitos/voz.py           # voz frase a frase → assets/audio/voz.wav + tools/montaje.json
python3 tools/alinear.py                # cuándo empieza cada palabra → assets/audio/transcript.json
npx hyperframes transcribe assets/audio/voz.wav --language es --model large-v3   # opcional: comprobar con whisper
node tools/tiempos.mjs                  # guion y voz palabra por palabra
node tools/build.mjs                    # genera index.html y compositions/
python3 tools/mezclar.py                # voz + música + efectos a -14 LUFS
npx hyperframes check                   # 0 errores
node ../comun/mitos/comprobar.mjs       # todo en su palabra y dentro de la zona segura
bash ../comun/mitos/rehacer.sh mitos-N  # todo lo anterior + render con y sin subtítulos
```

## `tools/episodio.mjs`

- `palabras`: las claves de tiempo. `clave: ["palabra", n]` es cuándo empieza la n-ésima vez que se dice
  (sin tildes ni mayúsculas), y con `"fin"` cuándo acaba. Si una palabra deja de existir, `build.mjs` se para.
- Un momento se escribe `"clave"`, `["clave", desfase en s]` o un número de segundos.
- `cam`: `[momento, x, y, zum, curva]`. La tienda está entre x 300 y 2500 (mostrador hacia x 1000), la puerta en
  2340 y el gimnasio entre 2800 y 4500 (barra hacia 3450). El veredicto está en (1350, -850) y la llamada en (1350, 450).
- `actores`: x, mirada, postura (`reposo`, `explica`, `senala`, `dedo`, `flex`, `pecho`, `arriba`, `batido`,
  `telefono`, `miedo`, `cruzados`, `bolsa`, `toalla`…), gesto, cuándo habla, `trota` (correr en el sitio), `ojos`, `temblor`…
- `objetos`: `bocadillo` (con `sello` para el «MITO»), `nube` (gags `globo`, `armario`, `gigante`), `pildora`, `reloj`,
  `noche`, `zzz`, `gotas`, `rayos`, `brillos`, `cacitos`, `marcador`, `barra`, `cinta`, `pulgares`, `estelas` y `prop`
  (`movil`, `batido`, `bolsa`, `toalla`).
- `tarjeta`, `producto` (`creatina`, `proteina`, `preentreno`), `veredicto`, `cta` y `sfx` (`[momento, efecto, dB, qué lo provoca]`).

## Lo que dicen los vídeos (cumplimiento)

Las frases sobre producto usan declaraciones autorizadas o información general: la creatina, «3 g al día»
y «rendir más en esfuerzos cortos e intensos»; la proteína «ayuda a conservar el músculo»; la cafeína,
el límite orientativo de 400 mg al día para un adulto sano (EFSA). Nada promete un resultado de un suplemento.
