-- El tercer contexto de acceso: quien representa a la plantilla.
--
-- Ya había dos, el del trabajador y el de la gestoría, y este no es una
-- variante de ninguno. Un representante no es un empleado de la gestoría con
-- menos botones ni un trabajador que ve más: es otra parte, con otro interés y
-- otra legitimación. Mezclarlo con cualquiera de los dos habría acabado en un
-- «if» dentro de una consulta, y un «if» es exactamente lo que falla el día que
-- alguien cambia la consulta de al lado.
--
-- Lo que la ley obliga es a que el registro esté DISPONIBLE para esta parte.
-- No obliga a esto. Esto es la forma de darlo sin depender de que alguien se
-- acuerde de exportar y enviar un correo, y de que quede constancia de que se
-- dio.

-- Aquí NO hay sindicato, ni afiliación, ni sección sindical, y no es un olvido.
-- La afiliación sindical es una categoría especial de datos (artículo 9.1 del
-- RGPD) y guardarla exigiría una base de licitud y unas garantías que no
-- tenemos, para una función que no la necesita: para dar acceso al registro
-- basta con saber que esta persona representa a esta plantilla y hasta cuándo.
-- Que un campo sea fácil de añadir no es motivo para añadirlo; un dato que no
-- está no se filtra, no se pierde y no hay que justificarlo ante nadie.
create table representante (
    id                   uuid primary key,
    empresa_id           uuid not null references empresa(id),
    nombre               text not null,
    email                text not null,
    contrasena_derivada  text not null,

    -- De quién es representante. «empresa» es toda la plantilla; «centro», solo
    -- la de ese centro. No hay un tercer ámbito «todos los centros de la
    -- gestoría» y no lo habrá: la representación es de una plantilla concreta.
    ambito               text not null default 'empresa',
    centro_id            uuid references centro(id),

    -- El mandato caduca. Un representante que dejó de serlo hace dos años y
    -- sigue entrando es una fuga de datos con la puerta abierta desde dentro,
    -- así que la vigencia es parte de la fila y se comprueba en cada petición,
    -- no solo al entrar.
    vigente_desde        date not null,
    vigente_hasta        date,                 -- nulo: sin fecha de fin
    revocado_en          timestamptz,          -- corte inmediato, sin esperar a la fecha

    creado_en            timestamptz not null default now(),
    creado_por           uuid references usuario_gestoria(id),

    constraint ambito_conocido check (ambito in ('empresa', 'centro')),
    -- Un ámbito de centro sin centro sería un representante de nada, y uno de
    -- empresa con centro sería ambiguo. La base no deja escribir ni uno ni otro.
    constraint ambito_coherente check (
        (ambito = 'centro'  and centro_id is not null) or
        (ambito = 'empresa' and centro_id is null)),
    constraint vigencia_coherente check (vigente_hasta is null
                                         or vigente_hasta >= vigente_desde)
);

-- El correo identifica globalmente, como en el panel: si el mismo correo
-- estuviera en dos empresas, al entrar no se sabría a cuál pertenece.
create unique index representante_email_unico on representante (lower(email));
create index representante_por_empresa on representante (empresa_id);

-- Sesión propia, tabla propia, cookie propia. Es la tercera y sigue el mismo
-- criterio que las dos anteriores: compartir la tabla de sesiones entre dos
-- contextos es el camino más corto a que un testigo válido en uno abra el otro.
create table sesion_representante (
    id                text primary key,       -- huella del testigo, nunca el testigo
    representante_id  uuid not null references representante(id),
    creada_en         timestamptz not null default now(),
    expira_en         timestamptz not null,
    cerrada_en        timestamptz
);
create index sesion_repr_por_representante on sesion_representante (representante_id);

create table intento_representante (
    id        bigserial primary key,
    email     text not null,
    origen    text not null default '',
    momento   timestamptz not null default now(),
    acertado  boolean not null
);
create index intento_repr_por_email on intento_representante (email, momento);
create index intento_repr_por_origen on intento_representante (origen, momento);

-- Quién consultó, qué y cuándo.
--
-- Esta tabla es media razón de ser del portal. Entregar un CSV por correo
-- también da acceso, pero no deja constancia de haberlo dado: el día que se
-- discuta si la empresa facilitó el registro, «se lo dimos» sin traza vale
-- poco, y el representante tampoco puede demostrar que lo pidió. Aquí las dos
-- partes tienen el mismo apunte.
--
-- Se apunta la consulta, no lo consultado: guardar una copia de lo que se miró
-- sería duplicar el libro en una tabla que sí se puede modificar.
create table acceso_representante (
    id                bigserial primary key,
    representante_id  uuid not null references representante(id),
    empresa_id        uuid not null references empresa(id),
    momento           timestamptz not null default now(),
    accion            text not null,
    detalle           text not null default '',
    origen            text not null default ''
);
create index acceso_repr_por_representante
    on acceso_representante (representante_id, momento desc);
create index acceso_repr_por_empresa on acceso_representante (empresa_id, momento desc);
