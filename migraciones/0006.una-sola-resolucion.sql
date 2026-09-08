-- Una propuesta se resuelve una sola vez, y lo impide la base de datos.
--
-- Medido antes de esto: cien intentos simultáneos de resolver la misma
-- propuesta escribieron NUEVE resoluciones. La comprobación de «sigue
-- pendiente» ocurría fuera del bloqueo, así que varios pasaban el control antes
-- de que ninguno hubiera escrito.
--
-- El arreglo principal está en el código —la comprobación se mueve dentro de la
-- transacción— pero eso solo protege a quien pase por ahí. Esto lo impide para
-- cualquiera, venga por donde venga.
--
-- El índice es PARCIAL a propósito. `corrige` lo usan también las propuestas,
-- que apuntan al fichaje original: sin filtrar por tipo, dos propuestas
-- distintas sobre el mismo fichaje chocarían entre ellas, y eso sí tiene que
-- poder pasar (una propuesta resuelta, y después otra nueva).
--
-- Lo que permite:
--     fichaje 5 → propuesta 6 → resolución 7
--     fichaje 5 → propuesta 8 → resolución 9
-- Lo que impide:
--     propuesta 6 → resolución 7 y resolución 10

create unique index una_resolucion_por_propuesta
    on anotacion (empresa_id, corrige)
    where tipo in ('correccion_aceptada', 'correccion_rechazada');

-- Si esta migración falla con «could not create unique index», la base ya tiene
-- propuestas resueltas dos veces: son las que escribió el fallo que esto viene a
-- cerrar. No se pueden borrar —el libro solo admite añadir— así que en una base
-- con datos reales habría que decidir qué resolución vale, dejarlo escrito y
-- crear el índice después. Aquí no hace falta: no hay ningún cliente todavía, y
-- las únicas duplicadas son las de la prueba que reprodujo el fallo.
