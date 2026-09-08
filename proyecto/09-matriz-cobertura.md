# Matriz de cobertura

**Revisión: 8 de septiembre de 2026.** Estado normativo en
[`08-estado-normativo.md`](08-estado-normativo.md).

Esto no es una declaración de cumplimiento y no la sustituye. Es la lista de lo
que el programa hace y de lo que no, para poder mirarla de frente antes de que
lo haga un inspector.

**Un hueco no hace fallar nada.** Interesa conocerlo. Lo que sí sería un
problema es tenerlo y no saberlo.

---

## Sobre lo que ESTÁ EN VIGOR · artículo 34.9 del Estatuto de los Trabajadores

| Requisito | Implementado | Evidencia | Hueco | Acción |
| --- | :---: | --- | --- | --- |
| Registro **diario** de jornada | **SÍ** | `registro.py`, cada fichaje es una anotación con su instante | — | — |
| **Horario concreto de inicio y final** | **SÍ** | tipos `entrada` y `salida`; `jornada.py` los empareja | — | — |
| **Conservación cuatro años** | **PARCIAL** | nada borra: el libro solo admite añadir, y el rol de la aplicación no tiene `DELETE` | No hay política de retención escrita, ni archivado, ni una prueba de que a los cuatro años siga ahí. Depende de que las copias del proveedor funcionen | Definir retención y probar una restauración de un año atrás cuando haya un año atrás |
| Disponibilidad para **la persona trabajadora** | **SÍ** | `/f/<token>/mis-registros` y su descarga en CSV | — | — |
| Disponibilidad para **sus representantes** | **NO** | — | No existe la figura del representante ni del comité: nadie puede ver el registro de un colectivo | Diseñarla. Es un requisito **vigente**, no de borrador |
| Disponibilidad para la **Inspección** | **PARCIAL** | expediente auditable exportable desde el panel, verificable sin base de datos | La descarga la hace la gestoría, no la Inspección. No hay acceso directo ni remoto | Depende de la Orden técnica, que está en consulta |

## Sobre el PROYECTO de real decreto · no está en vigor

| Requisito del borrador | Implementado | Evidencia | Hueco |
| --- | :---: | --- | --- |
| Registro por medios **digitales** | **SÍ** | toda la aplicación | — |
| Asientos **personales, directos e inmediatos** | **SÍ** | cada persona ficha con su código y su PIN; la hora la pone el servidor al recibir | — |
| **Identificación del trabajador** | **SÍ** | identidad estable en `organizacion.py`, firmada en cada anotación | — |
| **Pausas** | **SÍ** | `pausa_inicio` y `pausa_fin`, descontadas en `jornada.py` | — |
| **Huella de las modificaciones y su autoría** | **SÍ** | cadena SHA-256; cada corrección guarda quién la pidió y quién respondió | — |
| **Autorización de empresa y trabajador** | **SÍ** | una propuesta solo la resuelve la otra parte | — |
| **Discrepancia en ausencia de acuerdo** | **SÍ** | `correccion_discrepancia`: no borra nada y la hora sigue siendo la original | — |
| **Totalización diaria** | **SÍ** | `Jornada.horas` | — |
| **Totalización mensual** | **PARCIAL** | existe `horas_del_mes()` | No se enseña en el panel ni sale en el expediente |
| **Formatos tratables y legibles** | **PARCIAL** | CSV y JSONL, abiertos y documentados | Son formatos nuestros. No hay especificación publicada con la que compararse |
| **Acceso remoto de la Inspección** | **NO** | — | No existe. Depende de la Orden técnica |
| **Cuatro años de conservación** | **PARCIAL** | igual que arriba | igual que arriba |
| **Otras categorías de tiempo** (guardias, disponibilidad, desplazamientos) | **NO** | — | Solo hay entrada, salida y pausa |

## Huecos, ordenados por lo que importan

1. **Representantes de los trabajadores.** Es el único hueco de un requisito
   **vigente**. Hoy no hay forma de dar acceso al registro de una plantilla a
   quien la representa.
2. **Retención de cuatro años, sin probar.** Nada borra, pero eso no es lo mismo
   que haber demostrado que dentro de cuatro años sigue estando y se puede leer.
3. **Anclaje externo.** Sin él no se detecta que a un libro le falten las últimas
   anotaciones. Está escrito en el LEEME de cada expediente.
4. **Totalización mensual, calculada pero no enseñada.**
5. **Categorías de tiempo distintas de trabajar y pausar.**
6. **Acceso de la Inspección**, que depende de una Orden que aún no existe.

## Lo que no se va a decir

Que el producto «cumple». Cumplir lo dice un inspector o un juez mirando un caso
concreto. Lo que se puede decir es qué guarda, cómo lo guarda y cómo se
comprueba, que es lo que hay en esta tabla.
