# ADR-TENANCY-001 · La frontera entre gestorías

## Contexto

El canal de venta es la gestoría: una asesoría laboral lleva las empresas de
otros y nos paga por llevarlas. Eso mete un inquilino nuevo por encima de la
empresa, y con él el riesgo que de verdad puede matar el producto.

Si una gestoría ve los datos de otra, no es un fallo de software: es una brecha
de datos laborales de terceros, con la gestoría respondiendo ante sus clientes.
Ninguna otra cosa de este proyecto tiene esa consecuencia.

## Las fronteras

Dos, y las dos duras:

**Gestoría.** Es el inquilino comercial. Nada de una gestoría es visible desde
otra: ni empresas, ni personas, ni fichajes, ni su registro de actividad, ni
siquiera saber que existen.

**Empresa.** Dentro de una gestoría sigue siendo una frontera de datos
laborales. El libro de fichajes es por empresa y su cadena de huellas ya lo ata
criptográficamente desde antes de esta fase.

## Identidades

| Quién | Cómo se identifica | Dónde |
| ----- | ------------------ | ----- |
| Trabajador | código + PIN | aplicación de fichaje |
| Personal de gestoría | correo + contraseña | panel |

Son dos sistemas separados a propósito: aplicaciones Flask distintas, cookies
con nombres distintos y tablas de sesión distintas. Si compartieran sesión, un
trabajador con el móvil en la mano estaría a un enlace de la administración de
su empresa.

## El modelo de autorización

**La consulta lleva la frontera dentro.** Ninguna función busca por
identificador a secas para comprobar después de quién es. Se pregunta «esta
empresa, *dentro de* esta gestoría», y la restricción va en el `where` de la
misma sentencia que trae los datos:

```sql
select ... from empresa where id = %s and gestoria_id = %s
```

No es una preferencia de estilo. Consultar primero y comprobar después crea un
hueco entre las dos cosas, y en ese hueco es donde se cuelan los fallos de
autorización: el que se olvida de comprobar, el que comprueba mal, el que
añade una ruta nueva y copia la consulta pero no la comprobación.

**404 y no 403.** Un identificador de otra gestoría responde «no encontrado».
Decir «existe pero no es tuya» ya confirma que existe, y eso permite enumerar
clientes de la competencia.

**Lo que no está concedido, está denegado.** El permiso se comprueba en el
servidor, dentro de la propia función. Esconder un botón no es seguridad, y
hay pruebas que llaman a las rutas directamente saltándose la interfaz.

## Roles

Dos, y cinco permisos. Con doce roles nadie sabe quién puede qué, y el día que
hay que revisarlo no se revisa.

| Permiso | Administración | Uso diario |
| ------- | :------------: | :--------: |
| Ver empresas, personas y jornadas | sí | sí |
| Dar de alta gente, resetear PIN, altas y bajas | sí | sí |
| Crear y editar empresas y centros | sí | **no** |
| Rotar el QR de un centro | sí | **no** |
| Crear y desactivar usuarios del panel | sí | **no** |
| Modificar un fichaje | **nadie** | **nadie** |

El reparto sale del trabajo real de una asesoría: quien atiende el teléfono da
de alta gente y resetea PIN todo el día, y eso no puede necesitar al jefe. Dar
de alta una empresa cliente, rotar un QR o crear usuarios sí son decisiones de
quien manda.

## El modelo de datos

    gestoria
      ├── usuario_gestoria     (correo, contraseña derivada, rol)
      └── empresa              (gestoria_id)
            ├── centro         (zona horaria, testigo del QR)
            ├── trabajador     (código, PIN derivado)
            └── anotacion      ← el libro, intocable desde el panel

Aparte, y sin mezclarse con el libro:

    sesion_panel               sesiones del personal
    intento_panel              intentos de acceso, para frenar fuerza bruta
    registro_administrativo    qué hizo quién en el panel
    verificacion_libro         último resultado de comprobar cada cadena

## Riesgos, y qué se ha hecho con cada uno

**Una ruta nueva que se olvide de la frontera.** Es el riesgo real y permanente.
Se mitiga con la forma de las funciones —no hay manera cómoda de consultar sin
frontera— y con un banco de pruebas que ataca todas las rutas desde la gestoría
equivocada. Cada ruta nueva tiene que entrar en esa lista.

**Escalada de privilegios dentro de una gestoría.** Probado llamando a las
rutas de administración con un usuario de uso diario, sin pasar por la
interfaz.

**Un trabajador entrando en el panel.** Probado metiendo su testigo de sesión
en la cookie del panel.

**Campos colados en un formulario.** Probado mandando `gestoria_id`, `activa` y
un rol inventado: se ignoran, el dueño lo pone el servidor y un rol desconocido
cae al de menos permisos.

**El panel tocando el libro.** No hay ruta que lo permita, y una prueba ejecuta
todas las operaciones administrativas y comprueba que el número de anotaciones
no se mueve.

## Decisión

Se adopta lo anterior. Y una consecuencia que conviene dejar escrita: **el
panel administra entidades y no reescribe historia**. Una equivocación en un
fichaje no se arregla desde aquí; se arreglará en la fase siguiente añadiendo
hechos nuevos con el acuerdo de la empresa y de la persona, que es lo que el
decreto exige y lo que el dominio ya sabe hacer.
