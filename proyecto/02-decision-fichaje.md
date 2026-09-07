# El registro de jornada que aguanta una inspección

Decidido el 7 de septiembre de 2026, sobre cuatro ideas verificadas una a una.
No tiene relación con la tienda, ni con Shopify, ni con las ideas anteriores.

**El producto: fichaje digital de precio plano para microempresas, con un
registro inalterable que se puede poner delante de la Inspección de Trabajo.**

---

## Las cuatro que se miraron

**1. Fichaje digital para microempresas.** Elegida.

**2. Canal de denuncias (Ley 2/2023).** Obligatorio desde diciembre de 2023 para
empresas de más de 50 empleados, con multas de 10.000 € a 1.000.000 €. Lo nuevo
es que la AIPI, la autoridad que sanciona, arrancó el 1 de septiembre de 2025 y
ya ha puesto las primeras multas. Descartada por precio: EticAlert cobra 9 €/mes
e ithikios 29 €. La guerra de precios ya está hecha.

**3. Plataforma de oposiciones con IA.** Las academias cobran entre 60 y 250 €
al mes y preparar una oposición cuesta de 1.000 a 5.000 €. Mercado enorme y
recurrente. Descartada por el canal: es venta a consumidor, necesita marketing
constante y el opositor abandona. La de mayor techo y la peor para una persona
sola sin presupuesto.

**4. Software para administradores de fincas.** La mayoría siguen con hojas de
cálculo, correos sin estructurar y circulares en papel, y los programas del
sector son pesados, sin nube y con interfaces obsoletas. Un administrador lleva
de 50 a 200 comunidades, así que una venta son cien edificios. Descartada por
lentitud: migrar los datos del programa viejo duele y la venta es larga.

*Se cayó una quinta por el camino:* el registro único de alquiler turístico.
**El Tribunal Supremo lo anuló en mayo de 2026.** Habría costado meses.

## Por qué la primera

Es la única en la que el cliente no elige. El registro de jornada va a ser
obligatoriamente **digital, automático e interoperable con la Inspección de
Trabajo**; el papel y el Excel editable dejan de ser válidos. Si la reforma se
aprueba, entra en vigor **entre marzo y abril de 2027**. Y afecta a **todas las
empresas y autónomos con empleados, sin excepción por tamaño ni por sector**:
cerca de un millón y medio. Las sanciones se plantean **por trabajador
afectado**, no por centro de trabajo, lo que multiplica la factura de quien no
cumpla.

## Por qué no es un suicidio contra Factorial

Porque el decreto exige tres cosas que un Excel no puede hacer y que los planes
baratos de las suites de RRHH no resuelven:

1. Un registro **inalterable**.
2. **Cada corrección de un fichaje exige el acuerdo entre empresa y persona
   trabajadora**, y queda registrado quién cambió qué y por qué.
3. **Interoperabilidad**: la Inspección accede telemáticamente.

Así que el producto no es «una app de fichar», de las que hay cincuenta. Es el
registro que aguanta una inspección. Y el hueco de mercado es de precio:
Factorial y Sesame cobran por empleado, con mínimos de unos 82 €/mes. Un bar con
cuatro camareros no quiere una suite de recursos humanos; quiere fichar y que no
le multen. **Precio plano por empresa, empleados ilimitados, sin instalar nada:
móvil o un QR pegado en la pared.**

## El canal

Gestorías y asesorías laborales. Cada uno de ese millón y medio de empresarios
tiene una gestoría haciéndole las nóminas, y esa gestoría va a recibir
trescientas llamadas en marzo de 2027. Una conversación con ella son trescientos
clientes. Es el mismo patrón que funciona siempre para un fundador solo: vender
al intermediario, no al cliente final.

## El riesgo

**Esta reforma ya se anunció antes y no salió, y puede retrasarse otra vez.** Lo
que sostiene el negocio aunque se retrase es que la obligación de registrar la
jornada existe desde 2019 y ya es de lo que más multa la Inspección de Trabajo:
el decreto acelera un mercado que ya existe, no lo inventa.

El segundo riesgo es el tamaño del cliente: son empresas de tres a diez
empleados, así que el precio por cliente es bajo y hace falta volumen. Por eso el
canal no es opcional, es la única forma de que salgan las cuentas.

## Lo que ya está construido

    fichaje/registro.py   el libro: solo se añade, encadenado por huellas
    fichaje/jornada.py    las horas, deducidas de los hechos del libro
    fichaje/pruebas.py    27 comprobaciones · todas pasan

El corazón es `registro.py`, y es lo que nos diferencia:

**Nada se borra ni se reescribe.** Un fichaje mal puesto no se corrige
machacándolo: se añade una corrección que apunta al original, y los dos quedan.

**Cada anotación va encadenada a la anterior por su huella SHA-256.** Si alguien
edita la base de datos por detrás para arreglar un mes entero, la cadena se rompe
y `verificar()` dice en qué anotación exactamente.

**Una corrección necesita a las dos partes.** No es un cambio: es una propuesta
que la otra parte acepta o rechaza, y hasta que la acepta no cuenta para nada. Si
la propone la empresa, la acepta el trabajador, y al revés. Nadie puede tocar la
nómina por su cuenta.

## Lo que falta

1. El texto oficial del real decreto, para ajustar el formato de exportación a lo
   que la Inspección vaya a pedir. Hasta que exista, el libro guarda de más, que
   es el lado seguro por el que equivocarse.
2. El fichaje en sí: móvil y QR, sin instalar nada.
3. El panel de la gestoría, que es quien vende.
4. Conservación de cuatro años y exportación firmada.

## Las fuentes

- Registro digital, interoperable, y entrada en vigor entre marzo y abril de 2027: https://www.sesamehr.es/blog/control-horario/novedades-control-horario/
- El acuerdo obligatorio para corregir un fichaje, y el fin del papel y el Excel: https://kronjop.com/es/newsroom/control-horario/digital/obligatorio/
- Sanciones por trabajador afectado y acceso telemático de la Inspección: https://www.chorario.com/hub/legal/Registro-Horario-Obligatorio-2026
- Afecta a todas las empresas y autónomos con empleados: https://wenohr.com/2026/02/registro-horario-digital-obligatorio-lo-que-toda-empresa-debe-saber-antes-de-2026-2027/
- Canal de denuncias, multas y la AIPI sancionando desde 2025: https://www.7experts.com/canal-de-denuncias-ley-2-2023-empresas/
- Precios del canal de denuncias: https://eticalert.com/blog/canal-denuncias-precio-comparativa
- Precios de las academias de oposiciones: https://blog.opositatest.com/academia-oposiciones-precio/
- Administradores de fincas con hojas de cálculo y papel: https://systemforge.es/blog/software-comunidad-de-propietarios-administrador-fincas/
- El Supremo anula el registro único de alquiler turístico: https://www.vivedonde.com/blog/supremo-anula-registro-unico-alquiler-turistico-espana-2026
