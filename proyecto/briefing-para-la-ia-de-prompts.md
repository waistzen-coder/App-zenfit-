# Corrección de contexto para la IA que genera los prompts

Se pega tal cual en la IA que está generando la cadena de prompts. Cuatro de
ellos fallaron por asumir que el anterior había salido bien. Este documento
corta esa cadena y la reengancha al proyecto real.

---

```
CORRECCIÓN DE CONTEXTO — LEE ESTO ANTES DE GENERAR EL SIGUIENTE PROMPT

Me estás generando una cadena de prompts para Claude Code. Los cuatro últimos
han fallado porque cada uno asume que el anterior salió bien, y no salió. Este
es el estado real. Genera los siguientes a partir de esto, no de lo que
supusiste.

── LO QUE PASÓ DE VERDAD ──

Prompt 1 (buscar una oportunidad en el sunset de las Legacy CRM Cards de
HubSpot): se ejecutó y la investigación TUMBÓ la tesis en la primera fase. La
fecha del sunset era correcta —31 de octubre de 2026— pero la oportunidad no
existe, por tres motivos verificados con fuentes:

1. HubSpot publicó el 21 de abril de 2026 el "Legacy CRM Card View Swapping
   Tool", que junto al "Legacy Card Converter" migra la tarjeta y actualiza las
   vistas de todos los clientes existentes SIN NINGUNA ACCIÓN DEL CLIENTE. El
   cliente nunca ve una tarjeta rota, así que nunca busca alternativa. Sin
   ruptura visible no hay a quién vender.

2. Las legacy cards están prohibidas para nuevos listings, certificaciones y
   recertificaciones. Toda app con vida comercial ya ha sido forzada a migrar.
   Las que no migren son las abandonadas, y las abandonadas no tienen clientes
   de pago que heredar. El conjunto "tiene clientes pagando" ∩ "no va a migrar"
   está vacío.

3. Para LISTAR una app hacen falta tres instalaciones activas en cuentas de
   PRODUCCIÓN ajenas a tu organización (las cuentas de desarrollador y de
   prueba no cuentan). Para CERTIFICAR, seis meses listada y sesenta
   instalaciones activas. Cuando se hizo el análisis quedaban 53 días para el
   sunset. La distribución del Marketplace no estaba disponible a tiempo.

VEREDICTO: NO CONSTRUIR, 25/100.

NUNCA SE ELIGIÓ UNA APP GANADORA. Tus prompts 3, 4 y 5 llevaban literalmente el
hueco "[UTILIZA LA GANADORA DEL INFORME ANTERIOR]" sin rellenar, y daban por
hecho una especificación técnica aprobada y "una versión funcional del producto
HubSpot". NUNCA SE ESCRIBIÓ NI UNA LÍNEA DE CÓDIGO DE HUBSPOT. El repositorio
lo confirma: no hay package.json, ni tsconfig.json, ni hsproject.json, ni src/.

── LIMITACIONES DEL ENTORNO (no generes prompts que las ignoren) ──

- TODOS los dominios de HubSpot (developers, ecosystem, community, knowledge)
  devuelven 403 por la política de red de la sesión. No se puede consultar la
  documentación oficial, ni el Marketplace, ni las reviews, ni la community. Es
  inútil pedir "verifica contra developers.hubspot.com".
- No hay cuenta de desarrollador de HubSpot ni portal de prueba.
- No hay tres empresas dispuestas a instalar nada.
- El fundador trabaja solo, sin presupuesto, sin equipo, no programa, y no
  quiere publicidad pagada, ni venta empresarial, ni soporte 24/7.

── EL PROYECTO QUE SÍ EXISTE Y EN EL QUE SEGUIMOS ──

Producto: FICHAJE DIGITAL PARA MICROEMPRESAS ESPAÑOLAS.

Tesis: el registro de jornada pasa a ser obligatoriamente digital, automático e
interoperable con la Inspección de Trabajo; el papel y el Excel editable dejan
de valer. Entrada en vigor prevista entre marzo y abril de 2027. Afecta a todas
las empresas y autónomos con empleados, sin excepción por tamaño ni sector
(≈1,5 millones). Las sanciones se plantean por trabajador afectado.

Diferencia frente a Factorial, Sesame y las cincuenta apps de fichar: ellas
cobran por empleado con mínimos de ~82 €/mes. Nosotros hacemos precio plano por
empresa, sin instalar nada (móvil o QR en la pared), y sobre todo hacemos lo
que el decreto exige y un Excel no puede: registro inalterable, y cada
corrección con acuerdo entre empresa y trabajador dejando constancia de quién
cambió qué y por qué. Canal de venta: gestorías y asesorías laborales.

CÓDIGO YA CONSTRUIDO Y PROBADO (Python, sin dependencias):
- fichaje/registro.py — el libro: solo se añade, encadenado con SHA-256.
- fichaje/jornada.py — las horas, deducidas de los hechos del libro.
- fichaje/pruebas.py — 43 comprobaciones, todas en verde.

AUDITORÍA DE SEGURIDAD YA EJECUTADA. Tres fallos reales encontrados,
reproducidos y arreglados:
1. La empresa no entraba en la huella: las anotaciones de un bar verificaban
   como válidas en el libro de un taller. Arreglado.
2. Se podía fabricar hoy un fichaje de hace tres meses sin que nada avisara.
   Ahora el libro exige que la hora de escritura no retroceda, prohíbe fichar
   en el futuro y marca lo escrito con retraso como retroactivo.
3. El cálculo era cuadrático: una nómina de veinte personas y tres años tardaba
   12,07 segundos. Ahora tarda 0,01.

FALTA POR CONSTRUIR: persistencia, el fichaje en sí (móvil y QR), el panel de
la gestoría, y la exportación firmada para la Inspección.

── CÓMO GENERAR LOS PRÓXIMOS PROMPTS ──

1. El objetivo es el fichaje. No vuelvas a HubSpot, ni a Shopify, ni al
   contrareembolso, ni a Verifactu, ni a la morosidad: todo eso está
   investigado y descartado, y los motivos están escritos en proyecto/.
2. No dejes huecos tipo [X] ni [LA GANADORA]. Si necesitas un dato, pídemelo
   antes de generar el prompt.
3. No asumas que la fase anterior terminó bien. Empieza cada prompt pidiendo
   que se verifique el estado real del repositorio.
4. No pidas verificar documentación en dominios bloqueados.
5. Prohibido pedir que se inventen datos: instalaciones, precios, clientes,
   competidores o reviews que no se puedan comprobar.
6. MANTÉN el sistema de fases con puertas duras, la clasificación
   PASS/FAIL/PARTIAL/NOT TESTED, los red team y los pre-mortem. Esa parte
   funciona muy bien y es la que ha ahorrado semanas de trabajo inútil.

El siguiente prompt debería cubrir: persistencia del libro en base de datos con
las mismas garantías de inalterabilidad, y el fichaje real desde el móvil con
un QR, sin que el trabajador instale nada.
```
