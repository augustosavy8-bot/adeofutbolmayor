-- adeofutbolmayor :: carga inicial de grupos y personas
-- Idempotente: si el grupo ya tiene personas, no vuelve a insertar.
-- created_at se desplaza por fila para conservar el orden de la lista original.

insert into public.adeo_grupos (nombre, tipo, orden) values
  ('Cuerpo Técnico', 'talle_numerico',     1),
  ('Jugadores',      'talle_numerico',     2),
  ('Reserva',        'talle_numerico',     3),
  ('Comisión',       'talle_letra_doble',  4)
on conflict (nombre) do nothing;

-- ------------------------------------------------------- Cuerpo Técnico
insert into public.adeo_personas (grupo_id, nombre, talle, pago_sena, monto_sena, created_at)
select g.id, v.nombre, v.talle, v.pago, v.monto, now() + (v.ord * interval '1 millisecond')
from public.adeo_grupos g
cross join (values
  (1, 'Mariano kine',  '46', false, 0::numeric),
  (2, 'Bruno Merlini', '46', false, 0::numeric),
  (3, 'Pulpo',         '46', false, 0::numeric),
  (4, 'Colo',          null, false, 0::numeric)
) as v(ord, nombre, talle, pago, monto)
where g.nombre = 'Cuerpo Técnico'
  and not exists (select 1 from public.adeo_personas p where p.grupo_id = g.id);

-- ------------------------------------------------------------ Jugadores
insert into public.adeo_personas (grupo_id, nombre, talle, pago_sena, monto_sena, created_at)
select g.id, v.nombre, v.talle, v.pago, v.monto, now() + (v.ord * interval '1 millisecond')
from public.adeo_grupos g
cross join (values
  ( 1, 'Julio',       '56', true,  30000::numeric),
  ( 2, 'Zaca',        '46', false, 0::numeric),
  ( 3, 'Nacho',       '48', false, 0::numeric),
  ( 4, 'Gordo',       '46', false, 0::numeric),
  ( 5, 'Cabe',        '46', false, 0::numeric),
  ( 6, 'Angelo',      '48', false, 0::numeric),
  ( 7, 'Pani',        '48', false, 0::numeric),
  ( 8, 'Berto',       '48', false, 0::numeric),
  ( 9, 'Lena',        '48', false, 0::numeric),
  (10, 'Joaquin',     '48', false, 0::numeric),
  (11, 'Tin Mercuri', '48', true,  30000::numeric),
  (12, 'Fer Sánchez', '50', false, 0::numeric),
  (13, 'Ortiz',       '48', false, 0::numeric),
  (14, 'Facu',        '48', true,  30000::numeric),
  (15, 'Zurita',      '56', false, 0::numeric),
  (16, 'Diaz',        '48', false, 0::numeric),
  (17, 'Mauri',       '48', false, 0::numeric),
  (18, 'Mati',        '46', false, 0::numeric),
  (19, 'Tin G',       '46', false, 0::numeric),
  (20, 'Mauro',       '46', false, 0::numeric),
  (21, 'Negro',       '46', false, 0::numeric),
  (22, 'Benja',       '48', false, 0::numeric)
) as v(ord, nombre, talle, pago, monto)
where g.nombre = 'Jugadores'
  and not exists (select 1 from public.adeo_personas p where p.grupo_id = g.id);

-- -------------------------------------------------------------- Reserva
insert into public.adeo_personas (grupo_id, nombre, talle, pago_sena, monto_sena, created_at)
select g.id, v.nombre, v.talle, v.pago, v.monto, now() + (v.ord * interval '1 millisecond')
from public.adeo_grupos g
cross join (values
  ( 1, 'Pulga',    '44', false, 0::numeric),
  ( 2, 'Juani',    '48', false, 0::numeric),
  ( 3, 'Bruno',    '44', false, 0::numeric),
  ( 4, 'Angelo',   '48', false, 0::numeric),
  ( 5, 'Tomi',     '44', false, 0::numeric),
  ( 6, 'Cañe',     '48', false, 0::numeric),
  ( 7, 'Herrera',  '48', false, 0::numeric),
  ( 8, 'Kuki',     '48', false, 0::numeric),
  ( 9, 'Bauti',    '44', false, 0::numeric),
  (10, 'Lazaro',   '48', false, 0::numeric),
  (11, 'Roman',    '44', false, 0::numeric),
  (12, 'Tanque',   '50', false, 0::numeric),
  (13, 'Mateo',    '48', false, 0::numeric),
  (14, 'Flu',      '48', false, 0::numeric),
  (15, 'Nehemias', '48', false, 0::numeric),
  (16, 'Gian',     '48', false, 0::numeric),
  (17, 'Adriano',  '52', false, 0::numeric),
  (18, 'Bana',     '48', false, 0::numeric),
  (19, 'Mora',     '46', false, 0::numeric),
  (20, 'Joaquín',  '44', false, 0::numeric)
) as v(ord, nombre, talle, pago, monto)
where g.nombre = 'Reserva'
  and not exists (select 1 from public.adeo_personas p where p.grupo_id = g.id);

-- ------------------------------------------------- Comisión (pantalón / chomba)
insert into public.adeo_personas (grupo_id, nombre, talle_pantalon, talle_chomba, pago_sena, monto_sena, created_at)
select g.id, v.nombre, v.pantalon, v.chomba, false, 0::numeric, now() + (v.ord * interval '1 millisecond')
from public.adeo_grupos g
cross join (values
  (1, 'Bruno Lavini',   'L',   'XL'),
  (2, 'Pichón',         'L',   'XL'),
  (3, 'Serafín Savy',   'XL',  'L'),
  (4, 'Guido Taborra',  'XL',  'L'),
  (5, 'Mirko Castillo', 'XXL', 'XXL'),
  (6, 'Adrián Vasconi', '6XL', '6XL'),
  (7, 'Tomás Poggiana', 'L',   'L')
) as v(ord, nombre, pantalon, chomba)
where g.nombre = 'Comisión'
  and not exists (select 1 from public.adeo_personas p where p.grupo_id = g.id);
