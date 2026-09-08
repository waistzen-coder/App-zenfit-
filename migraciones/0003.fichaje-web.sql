-- Lo que hace falta para que alguien fiche desde el móvil.
--
-- Cuatro cosas y ninguna más: un identificador público para el QR del centro,
-- credenciales del trabajador, sesiones e intentos de acceso, y la tabla que
-- evita que un doble toque cuente dos veces.

-- El QR lleva este identificador, no el UUID interno. Se puede rotar sin tocar
-- nada más: si alguien publica una foto del cartel, se genera otro y el viejo
-- deja de servir.
alter table centro add column token_publico text unique;
alter table centro add column token_rotado_en timestamptz;

-- El código es para que la persona se identifique y no es secreto. El PIN sí,
-- y por eso solo se guarda derivado: nunca en claro, y nunca con un hash de los
-- de firmar ficheros.
alter table trabajador add column codigo text;
alter table trabajador add column pin_derivado text;
alter table trabajador add column pin_actualizado_en timestamptz;
create unique index trabajador_codigo_por_empresa
    on trabajador (empresa_id, codigo) where codigo is not null;

create table sesion (
    id             text primary key,      -- derivado del testigo, nunca el testigo
    trabajador_id  uuid not null references trabajador(id),
    centro_id      uuid not null references centro(id),
    creada_en      timestamptz not null default now(),
    expira_en      timestamptz not null,
    cerrada_en     timestamptz
);
create index sesion_por_trabajador on sesion (trabajador_id);

-- Para frenar la fuerza bruta contra el PIN. Se guarda el código tecleado, no
-- el trabajador: quien lo teclea aún no ha demostrado ser nadie.
create table intento_acceso (
    id          bigserial primary key,
    centro_id   uuid not null references centro(id),
    codigo      text not null,
    origen      text not null default '',   -- la IP, para el límite por red
    momento     timestamptz not null default now(),
    acertado    boolean not null
);
create index intento_por_centro_codigo on intento_acceso (centro_id, codigo, momento);
create index intento_por_origen on intento_acceso (origen, momento);

-- Un doble toque, un reenvío de Safari o una red móvil lenta no pueden dejar
-- dos fichajes. La clave se escribe en la MISMA transacción que la anotación,
-- así que o entran las dos o no entra ninguna.
create table peticion_fichaje (
    clave       text primary key,
    empresa_id  uuid not null references empresa(id),
    numero      integer not null,
    creada_en   timestamptz not null default now(),
    foreign key (empresa_id, numero) references anotacion (empresa_id, numero)
);
