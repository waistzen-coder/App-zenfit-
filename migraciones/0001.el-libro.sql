-- El libro de fichajes y a quién pertenece.
--
-- Es el esquema que ya estaba en producción de pruebas, movido aquí tal cual.
-- A partir de ahora la forma de la base de datos se cambia añadiendo un fichero
-- nuevo, nunca editando este: quien ya lo tenga aplicado no lo volvería a
-- ejecutar y su base se quedaría distinta de la de los demás.

create table empresa (
    id          uuid primary key,
    nombre      text not null,
    creada_en   timestamptz not null default now()
);

create table centro (
    id            uuid primary key,
    empresa_id    uuid not null references empresa(id),
    nombre        text not null,
    zona_horaria  text not null,
    creado_en     timestamptz not null default now()
);

create table trabajador (
    id          uuid primary key,
    empresa_id  uuid not null references empresa(id),
    nombre      text not null,
    activo      boolean not null default true,
    alta_en     timestamptz not null default now()
);

create table anotacion (
    empresa_id         uuid not null references empresa(id),
    numero             integer not null,
    version            smallint not null,
    centro_id          uuid not null references centro(id),
    trabajador_id      uuid not null references trabajador(id),
    tipo               text not null,
    momento            timestamptz not null,
    anotado_en         timestamptz not null,
    zona_horaria       text not null,
    autor_id           uuid not null,
    parte              text not null,
    origen             text not null default '',
    motivo             text not null default '',
    corrige            integer,
    momento_propuesto  timestamptz,
    huella_anterior    char(64) not null,
    huella             char(64) not null,

    primary key (empresa_id, numero),

    -- Una bifurcación de la cadena no se puede ni escribir: dos anotaciones no
    -- pueden colgar de la misma.
    constraint sin_bifurcacion unique (empresa_id, huella_anterior),
    constraint huella_unica unique (huella),

    constraint numero_desde_uno check (numero >= 1),
    constraint no_se_anota_el_futuro check (momento <= anotado_en),
    constraint tipo_conocido check (tipo in (
        'entrada', 'salida', 'pausa_inicio', 'pausa_fin',
        'correccion_propuesta', 'correccion_aceptada', 'correccion_rechazada')),
    constraint parte_conocida check (parte in ('empresa', 'trabajador')),
    constraint solo_las_correcciones_corrigen check (
        corrige is null or tipo in (
            'correccion_propuesta', 'correccion_aceptada', 'correccion_rechazada'))
);

create index anotacion_por_trabajador on anotacion (empresa_id, trabajador_id, numero);
