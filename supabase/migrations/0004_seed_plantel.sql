-- adeofutbolmayor :: plantel inicial
-- Idempotente: si ya hay jugadores cargados, no vuelve a insertar.
-- El sueldo y el estado de pago se cargan despues desde el panel.

insert into public.adeo_jugadores (nombre, posicion, orden)
select v.nombre, v.posicion, v.ord
from (values
  ( 1, 'Julio Borini',       'delantero'),
  ( 2, 'Zaca Acosta',        'defensor'),
  ( 3, 'Ignacio Montenegro', 'arquero'),
  ( 4, 'Alex Blasco',        'defensor'),
  ( 5, 'Facundo Lavini',     'mediocampista'),
  ( 6, 'Angelo Olivanti',    'defensor'),
  ( 7, 'Diego Paniagua',     'delantero'),
  ( 8, 'Santino Bertorello', 'delantero'),
  ( 9, 'Joaquin Lenardon',   'mediocampista'),
  (10, 'Joaquin Sosa',       'delantero'),
  (11, 'Valentin Mercuri',   'defensor'),
  (12, 'Fernando Sánchez',   'delantero'),
  (13, 'Alexander Ortiz',    'delantero'),
  (14, 'Facundo Taborra',    'arquero'),
  (15, 'Ezequiel Zurita',    'defensor'),
  (16, 'David Diaz',         'mediocampista'),
  (17, 'Mauricio Germi',     'delantero'),
  (18, 'Agustin Germi',      'defensor'),
  (19, 'Mauro Vega',         'mediocampista'),
  (20, 'Lucas Amarilla',     'mediocampista'),
  (21, 'Benjamin Alvarez',   'mediocampista')
) as v(ord, nombre, posicion)
where not exists (select 1 from public.adeo_jugadores);
