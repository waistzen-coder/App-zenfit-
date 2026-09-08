-- La gestoría, que es quien nos va a comprar.
--
-- Aparece un inquilino por encima de la empresa: una gestoría lleva muchas
-- empresas cliente, y sus datos no pueden mezclarse jamás con los de otra
-- gestoría. La empresa sigue siendo una frontera fuerte por debajo.
--
-- Nada de esto toca el libro de fichajes. El panel administra entidades; no
-- reescribe historia, y no hay ni habrá un camino desde aquí que modifique una
-- anotación.

create table gestoria (
    id         uuid primary key,
    nombre     text not null,
    activa     boolean not null default true,
    creada_en  timestamptz not null default now()
);

create table usuario_gestoria (
    id                   uuid primary key,
    gestoria_id          uuid not null references gestoria(id),
    email                text not null,
    nombre               text not null,
    contrasena_derivada  text not null,
    rol                  text not null,
    activo               boolean not null default true,
    creado_en            timestamptz not null default now(),
    contrasena_cambiada_en timestamptz,

    -- El email identifica dentro de la gestoría, en minúsculas.
    constraint email_por_gestoria unique (gestoria_id, email),
    constraint rol_conocido check (rol in ('gestoria_admin', 'gestoria_user'))
);
-- Y también globalmente: si dos gestorías tuvieran el mismo email, al entrar no
-- se sabría a cuál pertenece quien escribe.
create unique index usuario_email_unico on usuario_gestoria (email);

-- La empresa pasa a colgar de una gestoría. Se admite nula para no romper las
-- empresas que ya existieran; el panel solo enseña las que tienen dueño.
alter table empresa add column gestoria_id uuid references gestoria(id);
alter table empresa add column activa boolean not null default true;
create index empresa_por_gestoria on empresa (gestoria_id);

alter table centro add column activo boolean not null default true;

-- La sesión del panel es otra cosa que la del trabajador: otra tabla, otra
-- cookie y otra vida. Confundirlas sería el camino más corto a que alguien
-- entre donde no debe.
create table sesion_panel (
    id          text primary key,          -- huella del testigo, nunca el testigo
    usuario_id  uuid not null references usuario_gestoria(id),
    creada_en   timestamptz not null default now(),
    expira_en   timestamptz not null,
    cerrada_en  timestamptz
);
create index sesion_panel_por_usuario on sesion_panel (usuario_id);

create table intento_panel (
    id        bigserial primary key,
    email     text not null,
    origen    text not null default '',
    momento   timestamptz not null default now(),
    acertado  boolean not null
);
create index intento_panel_por_email on intento_panel (email, momento);
create index intento_panel_por_origen on intento_panel (origen, momento);

-- El registro de lo que hace el personal de la gestoría.
--
-- No es el libro laboral y no se encadena con él: son dos cosas distintas y
-- mezclarlas ensuciaría el libro con hechos que no son de nadie que trabaje.
create table registro_administrativo (
    id           bigserial primary key,
    momento      timestamptz not null default now(),
    actor_id     uuid,
    gestoria_id  uuid,
    accion       text not null,
    entidad      text not null,
    entidad_id   text,
    resultado    text not null default 'ok',
    detalle      text not null default ''
);
create index registro_por_gestoria on registro_administrativo (gestoria_id, momento);
