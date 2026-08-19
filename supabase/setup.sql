-- adeofutbolmayor :: setup completo (esquema + seed)
-- Pegar tal cual en el SQL Editor de Supabase y ejecutar una sola vez.
-- Equivale a correr 0001_init.sql y 0002_seed.sql en orden.

-- adeofutbolmayor :: esquema inicial
-- Modulo 1: control de conjuntos (camisetas)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- grupos
create table if not exists public.adeo_grupos (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  tipo       text not null check (tipo in ('talle_numerico', 'talle_letra_doble')),
  orden      int  not null default 0,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------- personas
create table if not exists public.adeo_personas (
  id             uuid primary key default gen_random_uuid(),
  grupo_id       uuid not null references public.adeo_grupos(id) on delete cascade,
  nombre         text not null,
  talle          text,
  talle_pantalon text,
  talle_chomba   text,
  pago_sena      boolean not null default false,
  monto_sena     numeric(12,2) not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists adeo_personas_grupo_id_idx on public.adeo_personas (grupo_id);
create index if not exists adeo_personas_orden_idx    on public.adeo_personas (grupo_id, created_at);

-- ------------------------------------------------------------------- RLS
alter table public.adeo_grupos   enable row level security;
alter table public.adeo_personas enable row level security;

-- Por ahora: cualquier usuario autenticado lee y escribe todo.
-- (Mas adelante se refina por rol.)
drop policy if exists adeo_grupos_authenticated_all on public.adeo_grupos;
create policy adeo_grupos_authenticated_all
  on public.adeo_grupos
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists adeo_personas_authenticated_all on public.adeo_personas;
create policy adeo_personas_authenticated_all
  on public.adeo_personas
  for all
  to authenticated
  using (true)
  with check (true);

-- -------------------------------------------------------------- realtime
-- replica identity full => los eventos DELETE traen la fila completa
alter table public.adeo_grupos   replica identity full;
alter table public.adeo_personas replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.adeo_grupos;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.adeo_personas;
exception
  when duplicate_object then null;
end
$$;


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
-- adeofutbolmayor :: modulo Plantel
-- Jugadores por posicion, con sueldo y estado de pago.

create table if not exists public.adeo_jugadores (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  posicion   text not null check (posicion in ('arquero', 'defensor', 'mediocampista', 'delantero')),
  sueldo     numeric(12,2) not null default 0,
  al_dia     boolean not null default false,
  -- ruta dentro del bucket 'jugadores' de Storage; la URL publica se arma en el front
  foto_path  text,
  orden      int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists adeo_jugadores_orden_idx on public.adeo_jugadores (orden, created_at);

-- ------------------------------------------------------------------- RLS
alter table public.adeo_jugadores enable row level security;

drop policy if exists adeo_jugadores_authenticated_all on public.adeo_jugadores;
create policy adeo_jugadores_authenticated_all
  on public.adeo_jugadores
  for all
  to authenticated
  using (true)
  with check (true);

-- -------------------------------------------------------------- realtime
alter table public.adeo_jugadores replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.adeo_jugadores;
exception
  when duplicate_object then null;
end
$$;

-- --------------------------------------------------- fotos de los jugadores
-- Bucket publico: las fotos se leen sin token (van en <img>), pero solo un
-- usuario logueado puede subirlas o borrarlas.
insert into storage.buckets (id, name, public)
values ('jugadores', 'jugadores', true)
on conflict (id) do nothing;

drop policy if exists adeo_fotos_lectura_publica on storage.objects;
create policy adeo_fotos_lectura_publica
  on storage.objects
  for select
  to public
  using (bucket_id = 'jugadores');

drop policy if exists adeo_fotos_escritura_autenticada on storage.objects;
create policy adeo_fotos_escritura_autenticada
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'jugadores')
  with check (bucket_id = 'jugadores');
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
-- adeofutbolmayor :: modulo Facturacion
-- Replica la planilla FACTURAS <MES>: una fila por factura, agrupadas por mes.
--
-- La planilla calcula con formulas y guarda solo el neto:
--   IVA    = neto * 21/100
--   TOTAL  = neto + IVA
--   FUTBOL = IVA / 2
-- Se mantiene igual: lo unico que se carga a mano es cliente, neto y
-- responsable; el resto son columnas generadas, asi cualquier consulta las
-- tiene sin repetir la cuenta.

create table if not exists public.adeo_facturas (
  id          uuid primary key default gen_random_uuid(),
  -- primer dia del mes al que pertenece la factura (2026-08-01 = AGOSTO 2026)
  periodo     date not null,
  cliente     text not null,
  neto        numeric(14,2) not null default 0,
  -- por si algun dia hay que facturar al 10,5%
  alicuota    numeric(5,4) not null default 0.21,
  -- la columna G de la planilla: quien trajo la factura
  responsable text,
  created_at  timestamptz not null default now(),

  -- El IVA se redondea a centavos por factura, que es lo que sale en cada
  -- comprobante. `futbol` NO lleva un segundo redondeo: si se redondeara por
  -- fila, el medio centavo de cada una se acumula y el total del mes deja de
  -- ser exactamente la mitad del IVA. Se muestra redondeado.
  iva    numeric(14,2) generated always as (round(neto * alicuota, 2)) stored,
  total  numeric(14,2) generated always as (neto + round(neto * alicuota, 2)) stored,
  futbol numeric         generated always as (round(neto * alicuota, 2) / 2) stored
);

create index if not exists adeo_facturas_periodo_idx
  on public.adeo_facturas (periodo, created_at);

-- ------------------------------------------------------------------- RLS
alter table public.adeo_facturas enable row level security;

drop policy if exists adeo_facturas_authenticated_all on public.adeo_facturas;
create policy adeo_facturas_authenticated_all
  on public.adeo_facturas
  for all
  to authenticated
  using (true)
  with check (true);

-- -------------------------------------------------------------- realtime
alter table public.adeo_facturas replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.adeo_facturas;
exception
  when duplicate_object then null;
end
$$;
-- adeofutbolmayor :: facturacion de agosto 2026
-- Carga inicial tomada de la planilla FACTURAS_AGOSTO.xlsx.
-- Idempotente: si el periodo ya tiene facturas, no vuelve a insertar.
-- created_at se desplaza por fila para conservar el orden de la planilla.

insert into public.adeo_facturas (periodo, cliente, neto, responsable, created_at)
select date '2026-08-01', v.cliente, v.neto, v.responsable,
       now() + (v.ord * interval '1 millisecond')
from (values
  ( 1, 'AXION'               ,     44264.98, 'MONCHO'),
  ( 2, 'CUTINI'              ,    115124.01, 'BRUNO'),
  ( 3, 'CUTINI'              ,    167933.89, 'BRUNO'),
  ( 4, 'GRUPO PAGNUTTI'      ,      53719.0, 'LUCHO'),
  ( 5, 'BRITO NORBERTO'      ,     14876.03, 'LUCHO'),
  ( 6, 'JOHANSEN'            ,    296632.57, 'CLUB'),
  ( 7, 'CUTINI'              ,    330578.51, 'BRUNO'),
  ( 8, 'JOHANSEN'            ,     29893.91, 'TOMI'),
  ( 9, 'JOHANSEN'            ,     60473.83, 'TOMI'),
  (10, 'YPF'                 ,     28969.26, 'TOMI'),
  (11, 'YPF'                 ,     28978.94, 'BRUNO'),
  (12, 'TODO BRASA'          ,     33057.86, 'LUCHO'),
  (13, 'YPF'                 ,     65212.74, 'SERA'),
  (14, 'BYECON'              ,     48925.62, 'FRANCO.A'),
  (15, 'MAYORISTA DEL SUR'   ,    560619.78, 'DAMIAN'),
  (16, 'INGENIO'             ,     39755.66, 'DAMIAN'),
  (17, 'DIMARTSKY'           ,     47292.37, 'DAMIAN'),
  (18, 'MAYORISTA DEL SUR'   ,     48975.21, 'DAMIAN'),
  (19, 'RESTOLBY'            ,     23801.65, 'LUCHO'),
  (20, 'MARASCA'             ,    142986.69, 'BRUNO'),
  (21, 'YPF'                 ,     43494.41, 'BRUNO'),
  (22, 'YPF'                 ,     36238.23, 'TOMI'),
  (23, 'JOHANSEN'            ,     71860.54, 'TOMI'),
  (24, 'JOHANSEN'            ,     19794.47, 'TOMI'),
  (25, 'MARASCA'             ,     262813.8, 'BRUNO')
) as v(ord, cliente, neto, responsable)
where not exists (
  select 1 from public.adeo_facturas where periodo = date '2026-08-01'
);
