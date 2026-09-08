-- El libro solo admite añadir.
--
-- Esto no para a un superusuario decidido, pero sí para un UPDATE despistado de
-- la propia aplicación, que es el accidente que de verdad va a ocurrir algún
-- día. Va en su propio fichero porque el cuerpo de la función lleva puntos y
-- coma dentro y conviene que no se mezcle con las tablas.

create or replace function prohibir_cambios_en_el_libro() returns trigger
language plpgsql as $$
begin
    raise exception
        'El libro de fichajes solo admite añadir; se ha intentado % sobre la '
        'anotación %/% . Una corrección es una anotación nueva.',
        tg_op, old.empresa_id, old.numero;
end $$;

create trigger anotacion_solo_anadir
    before update or delete on anotacion
    for each row execute function prohibir_cambios_en_el_libro();
