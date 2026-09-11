-- El sello periódico del libro, y para qué sirve exactamente.
--
-- La cadena de huellas detecta que se cambie una anotación, pero NO detecta que
-- se borren las últimas. Un libro al que le quitan los diez últimos fichajes
-- sigue siendo una cadena perfectamente válida: un prefijo de una cadena válida
-- también lo es. Y esa es justo la manipulación que interesa a quien quiere
-- esconder horas extra.
--
-- Un sello es una fila que dice: «el día tal, este libro tenía N anotaciones y
-- la última era la número X con la huella H». Si mañana el libro tiene menos de
-- N, o la número X ya no es H, alguien ha recortado.
--
-- Los sellos se encadenan entre ellos igual que las anotaciones, así que
-- tampoco se les puede quitar el del medio.
--
-- LO QUE ESTO NO ES, y conviene que esté escrito aquí y no en un folleto: no es
-- un anclaje externo. Los sellos los generamos nosotros y viven en nuestra base
-- de datos. Lo que demuestran es que el libro no se ha recortado DESPUÉS del
-- sello sin recortar también los sellos, que son dos tablas distintas, con dos
-- disparadores distintos, y ninguna de las dos la puede tocar el usuario con el
-- que corre la aplicación. Es una barrera más alta, no una barrera infranqueable.
-- Un anclaje de verdad exige publicar la huella donde no mandemos nosotros, y
-- eso sigue sin estar.
create table sello (
    empresa_id      uuid not null references empresa(id),
    numero          integer not null,          -- el del sello, no el de la anotación
    version         smallint not null default 1,

    hasta_numero    integer not null,          -- la última anotación sellada
    hasta_huella    text not null,             -- y su huella
    anotaciones     integer not null,          -- cuántas había en total

    sellado_en      timestamptz not null default now(),
    huella_anterior text not null,             -- el sello anterior, o ceros
    huella          text not null,

    primary key (empresa_id, numero),
    constraint sello_numero_desde_uno check (numero >= 1),
    constraint sello_cuenta_positiva check (anotaciones >= 1),
    -- Igual que en el libro: dos sellos no pueden colgar del mismo anterior, así
    -- que la cadena no se puede bifurcar ni escribiendo a la vez.
    constraint sello_sin_bifurcacion unique (empresa_id, huella_anterior),
    constraint sello_huella_unica unique (huella)
);
create index sello_por_empresa on sello (empresa_id, numero desc);

-- Y solo se puede añadir, como el libro. Si los sellos se pudieran editar no
-- servirían para nada: quien recorta el libro editaría el sello y a otra cosa.
create or replace function prohibir_cambios_en_los_sellos() returns trigger as $$
begin
    raise exception 'Los sellos solo admiten añadir; se ha intentado % sobre el '
                    'sello %/% . Un sello equivocado se corrige sellando otra vez.',
                    tg_op, old.empresa_id, old.numero;
end;
$$ language plpgsql;

create trigger sello_solo_anadir
    before update or delete on sello
    for each row execute function prohibir_cambios_en_los_sellos();
