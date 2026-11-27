# SPEC · «Cinco palabras en la puerta» (vídeo de prueba, estilo nuevo)

GOAL:    que quien lo vea sienta que en Iron Fuel le preguntan antes de venderle, y que siga la cuenta y vaya a la tienda.
OUTPUT:  HyperFrames, 1080 × 1920, 30 fps. Dos versiones: con subtítulos y sin ellos.
TIME:    35,30 s × 30 = 1059 fotogramas (la duración exacta de la voz).
         Música «A Game» (Mixkit) a 127,99 BPM = 14,06 fotogramas por tiempo; la pista entra en su segundo 53,032.
         Rejilla del vídeo: tiempos en 0,3727 + k · 0,46879 s. Compás fuerte en 28,969 s («Construye»): la música
         vuelve a entrar tras el bajón (22,41 → 28,97 s). Cada frase de la voz empieza en un tiempo o medio tiempo.

LOOK:    medio = la rotulación de la propia tienda, nada más:
         · panel: negro del rótulo #0E1219 con veta de aluminio cepillado (líneas horizontales de 2 px al 4 %);
           en la foto, el cartel de la puerta es marrón grisáceo #3A3531 y pasa a #0E1219 al entrar en él.
         · cromo: letras con degradado vertical #FFFFFF → #C9CED6 45 % → #5E6671 52 % → #E8ECF1 62 % → #9AA2AD,
           contorno azul #1D6BFF de 7 u (como la «IF» del rótulo) y luz de canto azul (desenfoque 10 u al 55 %).
           Es la única luz permitida: la del rótulo real y las llamas azules del logo.
         · impresión: blanco #F4F6F8 en Oswald 700, como las letras del cartel de la puerta.
         · acento: azul #1D6BFF, una palabra o una línea por plano. Cálido solo en el sol de RECUPERACIÓN (#E3EF6A, el del cartel).
         · tipografía: titulares Saira 900 cursiva, anchura 125 % (como «IRON FUEL»), 120–190 u;
           etiquetas Oswald 700 en mayúsculas, ≥ 54 px en pantalla; subtítulos Inter 900 arriba (y 236 px).
         · fotos reales: la puerta (captura del Reel de la tienda, recortada sin la interfaz de Instagram),
           el rótulo «IF IRON FUEL NUTRITION», el bote de IFLEX PRIME recortado y el logo.
         · profundidad: sombra de apoyo 0 14 u, desenfoque 16, 38 %; viñeta 0; grano 0.
OBJECTS: el cartel de la puerta (panel con borde azul, icono encima de cada palabra: brazo, corredor, rayo,
         engranajes, sol con hojas), un pedestal negro con foco cenital, el bote real de IFLEX PRIME,
         un tique térmico blanco con «TOTAL 0,00 €», el rótulo real de la fachada, el logo redondo, el botón SEGUIR.
MOTION:  entradas expo.out (0,30–0,45 s); cámara power3.inOut; barridos de cámara 0,28–0,40 s que aterrizan
         en el golpe (empiezan 0,28 s antes); los golpes son instantáneos (0 fotogramas) y se asientan con
         back.out(1.6) en 0,25 s; salidas power3.in, un 40 % más cortas que la entrada; muelle solo en posición
         y escala (amortiguación 0,6), nunca en opacidad ni color. Desenfoque de movimiento solo en los barridos:
         direccional, hasta 18 px. Un titular aterrizado no se mueve; se mueve la cámara o el mundo de detrás.
SHOTS:
  1  f0–69     (0,00–2,30)  Foto real de la puerta llenando el plano, empuje lento 1,93 → 2,25 px/px.
                            «cinco» (1,30): cinco tiras de luz azul subrayan las cinco palabras reales, 3 fotogramas
                            entre una y otra (5 clics de relé). Lee: el cartel. Pasa a 2 por zum a través de FUERZA.
  2  f69–81    (2,30–2,72)  Zum a través: la cámara entra en FUERZA (×2,4 en 0,40 s, power3.in); la foto se va
                            (0,20 s) y el cartel vectorial ocupa su sitio, pierde la inclinación y se estira.
  3  f81–110   (2,72–3,65)  FUERZA: la palabra se vuelve cromo y crece en su sitio ×1,8; detrás, chapa de acero
                            lagrimada; el brazo del icono se flexiona. Golpe metálico.
  4  f110–152  (3,65–5,06)  barrido hacia abajo → RESISTENCIA: estelas azules horizontales sin parar, el corredor corre.
  5  f152–194  (5,06–6,47)  → ENERGÍA: un rayo cae a través de la palabra (destello 2 fotogramas), chispas en el borde.
  6  f194–236  (6,47–7,87)  → RENDIMIENTO: dos engranajes de acero giran detrás (40°/s), la aguja de un reloj
                            de presión llega al máximo.
  7  f236–278  (7,87–9,28)  → RECUPERACIÓN: amanece detrás (sol del cartel subiendo tras las hojas), todo se calma.
  8  f278–342  (9,28–11,39) «Cinco objetivos distintos»: las cinco celdas se pliegan como un acordeón en cinco
                            franjas de 220 u (cada franja conserva su mundo). Sonido de rebobinado.
  9  f342–419  (11,39–13,97) «un plan distinto»: las palabras se apartan a la izquierda y cada franja recibe sus
                            tres iconos de plan (entreno, comida, descanso…), distintos en cada una.
 10  f419–545  (13,97–18,19) «Por eso…»: las cinco franjas se funden en una ventana que gira como un rodillo
                            de tragaperras; con «para qué entrenas» cae encima el titular ¿PARA QUÉ ENTRENAS?
                            (cromo, palabra a palabra). El rodillo sigue girando: la respuesta es tuya.
 11  f545–629  (18,19–20,99) barrido a la izquierda por la tira azul hasta el pedestal: se enciende el foco, sube
                            el bote real de IFLEX PRIME; con «explicamos» salen tres etiquetas de su etiqueta
                            (colágeno, glucosamina + condroitina, ácido hialurónico).
 12  f629–707  (20,99–23,58) «Si no te hace falta»: el foco se apaga, el bote baja y desaparece en el pedestal.
 13  f707–799  (23,58–26,63) del pedestal sale un tique impreso: CONSEJO 0,00 € · COMPRA 0,00 € · TOTAL 0,00 €.
 14  f799–869  (26,63–28,97) barrido de vuelta al cartel: las cinco palabras encendidas y debajo la frase en blanco.
                            Bajón de la música, la cámara baja hasta la frase y se queda quieta 0,4 s.
 15  f869–939  (28,97–31,31) GOLPE: CONSTRUYE / TU MEJOR / VERSIÓN en cromo gigante, línea a línea con la voz,
                            sacudida de 16 px, MEJOR en azul. Golpe cinematográfico.
 16  f939–995  (31,31–33,19) barrido hacia arriba por la columna del cartel hasta el rótulo real (foto) y sube el logo.
 17  f995–1059 (33,19–35,30) SÍGUENOS (botón que se pulsa) y VEN A VERNOS; la luz recorre el borde del rótulo.
BANNED:  personajes y dibujos de las partes 1–9; tarjetas blancas; fondo vacío con cosas flotando (siempre hay panel,
         bordes y celda); halos, destellos de lente, anillos y orbes; partículas de adorno; todo centrado y fundido
         a la vez; títulos que siguen moviéndose al aterrizar; el logo pegado en una esquina; etiquetas «01/02»;
         degradados morados; texto que se mueve mientras se lee; nada importante fuera de 60–1020 px en horizontal,
         ni en los 220 px de arriba ni en los 420 de abajo; un producto relacionado con una palabra-objetivo
         (no se promete ningún efecto: solo lo que pone su etiqueta).
QA:      f0 (gancho: foto real y subtítulo), f45 (cinco tiras), f76 (zum a través, desenfoque), f84/f115/f156/f198/f240
         (cada palabra en su mundo), f330 (cinco franjas), f400 (planes), f520 (¿PARA QUÉ ENTRENAS?), f600 (bote y
         etiquetas), f690 (foco apagado), f780 (tique), f860 (la frase antes del golpe), f875/f905 (el golpe),
         f1000 y f1058 (rótulo, logo y llamada final).
