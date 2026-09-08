-- «Rechazada» era la palabra equivocada.
--
-- Cuando la empresa propone cambiar una hora y el trabajador no está de acuerdo,
-- lo que ocurre no es que la propuesta se rechace y desaparezca: ocurre que hay
-- un desacuerdo, y las dos versiones tienen que quedar escritas. El proyecto de
-- real decreto va en esa dirección —en ausencia de acuerdo, la empresa refleja
-- la modificación y la persona trabajadora su discrepancia— pero aunque no
-- dijera nada, «rechazada» ya describía mal lo que guardamos.
--
-- No se reescribe nada. Las anotaciones que ya digan 'correccion_rechazada' se
-- siguen leyendo y verificando: su huella se calculó con esa palabra y cambiarla
-- las invalidaría. Lo nuevo se escribe como 'correccion_discrepancia'.

alter table anotacion drop constraint tipo_conocido;
alter table anotacion add constraint tipo_conocido check (tipo in (
    'entrada', 'salida', 'pausa_inicio', 'pausa_fin',
    'correccion_propuesta', 'correccion_aceptada',
    'correccion_discrepancia',
    'correccion_rechazada'));   -- se sigue admitiendo para leer lo ya escrito

alter table anotacion drop constraint solo_las_correcciones_corrigen;
alter table anotacion add constraint solo_las_correcciones_corrigen check (
    corrige is null or tipo in (
        'correccion_propuesta', 'correccion_aceptada',
        'correccion_discrepancia', 'correccion_rechazada'));

drop index una_resolucion_por_propuesta;
create unique index una_resolucion_por_propuesta
    on anotacion (empresa_id, corrige)
    where tipo in ('correccion_aceptada', 'correccion_discrepancia',
                   'correccion_rechazada');
