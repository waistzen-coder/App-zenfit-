# Pre-mortem: mañana lo miran un inspector, un abogado y un pentester

Ejercicio de imaginar el fracaso antes de que ocurra. Quince motivos por los que
nos lo podrían tirar, ordenados por lo que de verdad preocupa.

---

## LEGAL

**1 · Alguien da de alta a un representante que no lo es.**
Probabilidad media · Impacto muy alto. El portal ya no depende de un paso
manual: existe, y se abre desde el panel. Eso mueve el riesgo de sitio, no lo
elimina. Ahora el punto débil es el alta: quien tenga el permiso en la gestoría
puede abrirle a alguien la jornada de una plantilla entera, y desde fuera no se
distingue un alta legítima de una que no lo es. **Mitigación:** el permiso está
en el rol de administración, el alta queda apuntada con nombre de quien la hizo,
el mandato caduca solo si se le pone fecha, la empresa ve en su propia página
quién ha consultado su registro, y **cada trabajador ve en su móvil quién puede
mirar sus horas**, con el aviso de que si ahí aparece alguien que no representa
a su plantilla lo diga.

Eso no es confirmación y no se vende como tal: nadie del lado de la plantilla
tiene que dar el visto bueno para que el acceso exista. Lo que cambia es que un
acceso silencioso pasa a ser uno que cualquiera de la plantilla puede ver y
discutir, y que alguien mire tus horas sin que tú sepas que puede es lo que no
debería pasar nunca. La confirmación de verdad sigue pendiente.

**1b · El acceso de los representantes dependía de un paso manual.**
Resuelto. Se deja escrito porque el razonamiento sigue valiendo. Lo que está en
vigor desde 2019 es la **disponibilidad** del registro para quien representa a
la plantilla. El
artículo 34.9 no impone un mecanismo concreto, así que no tener un portal no es
por sí solo un incumplimiento, y decir lo contrario sería vender miedo. El
riesgo real es otro y es nuestro: hoy depende de que la empresa o la gestoría
exporte y entregue, y eso se olvida, se retrasa y no deja rastro. Delante de un
inspector, «se lo dimos» sin constancia vale poco. **Mitigación aplicada:** el
portal de solo lectura, con registro de quién consultó y cuándo.

**2 · Vender urgencia que no existe.**
Probabilidad media · Impacto muy alto. Decirle a una gestoría «entra en vigor en
marzo» y que no entre destruye la confianza de golpe. Ya ocurrió dentro de
nuestra propia documentación. **Mitigación:** `pruebas_lenguaje.py` recorre
código y documentación en cada ejecución de CI.

**3 · Los cuatro años no están probados.**
Probabilidad media · Impacto alto. Nada borra, pero nadie ha restaurado todavía
un libro de hace años. **Mitigación:** `copia.py` restaura y verifica; falta
hacerlo con datos antiguos de verdad, y no los hay todavía.

## SEMÁNTICA

**4 · Solo se corrige la hora, no el día.**
Probabilidad alta · Impacto medio. Quien se olvidó de fichar un día entero no
puede arreglarlo desde la web. **Mitigación:** hoy lo hace la gestoría dando de
alta el fichaje, y queda marcado como retroactivo. Conviene resolverlo bien.

**5 · No hay guardias, disponibilidad ni desplazamientos.**
Probabilidad media · Impacto medio. Un transportista o un técnico de guardia no
caben en «entrada, pausa, salida».

**6 · La discrepancia deja la hora original.**
Probabilidad media · Impacto medio. El borrador dice que sin acuerdo la empresa
refleja la modificación y el trabajador su discrepancia, lo que podría
interpretarse como que la modificación sí se aplica. Hemos elegido no cambiar la
hora unilateralmente y guardarlo todo. **Mitigación:** ninguna información se
pierde, así que el día que la norma lo aclare se puede recalcular sin haber
destruido nada.

## SEGURIDAD

**7 · Un PIN de seis cifras.**
Probabilidad media · Impacto alto si se filtra la base. Un millón de
combinaciones son catorce horas de una máquina. **Mitigación:** scrypt, límite
de intentos y bloqueo; escrito en `credenciales.py` sin adornos.

**8 · El QR fotografiado.**
Probabilidad alta · Impacto bajo. No es un fallo: el QR es la puerta del centro,
no una prueba de presencia. Se puede rotar. **Mitigación:** dicho en la
documentación, y nunca presentado como prueba de que alguien estuvo allí.

**9 · Un fichaje desde casa.**
Probabilidad alta · Impacto medio. Sin geolocalización, nada impide fichar desde
el sofá. Es una decisión: no se recoge la ubicación de nadie. **Mitigación:**
decirlo claro. Quien quiera control de presencia física necesita otra cosa.

**10 · Una ruta nueva que se olvide de la frontera entre gestorías.**
Probabilidad media · Impacto muy alto. Es el riesgo permanente del panel.
**Mitigación:** las consultas llevan la frontera dentro, y el banco de pruebas
ataca todas las rutas desde la gestoría equivocada. Cada ruta nueva entra ahí.

## INTEGRIDAD

**11 · Truncar el libro por el final no se detecta.**
Probabilidad baja · Impacto muy alto si ocurre. Escrito en el LEEME de cada
expediente y en la documentación. **Mitigación:** anclaje externo, diseñado pero
no implementado. Es la siguiente fase.

**12 · Quien controle la aplicación y la base puede rehacer la historia.**
Probabilidad baja · Impacto muy alto. Misma mitigación, mismo estado.

**13 · La verificación es nocturna.**
Probabilidad media · Impacto medio. El panel puede enseñar un dato de hasta
veinticuatro horas atrás. **Mitigación:** siempre se muestra la fecha de la
comprobación, y una empresa sin comprobar lo dice.

## PRIVACIDAD

**14 · Se guarda la IP en los intentos de acceso.**
Probabilidad media · Impacto medio. Es dato personal y no hay política de
borrado escrita. **Mitigación:** solo se guarda en intentos, no en fichajes.
**Falta** definir la retención.

## OPERACIÓN

**15 · Todo depende de una persona.**
Probabilidad alta · Impacto alto. Sin despliegue, sin monitorización, sin nadie
de guardia. Una gestoría con cien empresas fichando a las ocho de la mañana no
puede esperar a que alguien se levante. **Mitigación:** ninguna hoy. Es la razón
por la que no debe haber piloto sin antes desplegar en serio.
