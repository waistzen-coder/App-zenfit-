-- El resultado de verificar el libro de cada empresa, guardado.
--
-- Verificar una cadena es recorrerla entera y rehacer todas las huellas: es
-- O(n) por definición y no puede pasar en la carga de una página. Medido con
-- 505 empresas y 80.000 anotaciones: 2,2 segundos, y creciendo con cada fichaje
-- que entra. Con un año de datos reales serían decenas de segundos.
--
-- Así que se guarda el resultado y el panel enseña el último conocido, con su
-- fecha. Una empresa sin comprobar se dice que está sin comprobar, en vez de
-- fingir que está bien.

create table verificacion_libro (
    empresa_id        uuid primary key references empresa(id),
    momento           timestamptz not null default now(),
    valido            boolean not null,
    anotaciones       integer not null,
    primera_fallida   integer,
    motivo            text not null default ''
);
