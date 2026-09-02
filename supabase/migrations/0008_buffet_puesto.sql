-- adeofutbolmayor :: puesto de venta (buffet | entrada)
--
-- El club tiene dos puntos de venta con la misma tickeadora: el buffet y la
-- boleteria. Comparten tablas, pero cada uno tiene su lista de productos y su
-- propio turno, para que los arqueos no se mezclen.
--
-- Lo que ya estaba cargado era del buffet, que era el unico que existia: por
-- eso el default.

alter table public.buffet_productos
  add column if not exists puesto text not null default 'buffet';

alter table public.buffet_turnos
  add column if not exists puesto text not null default 'buffet';

alter table public.buffet_productos
  drop constraint if exists buffet_productos_puesto_check;
alter table public.buffet_productos
  add constraint buffet_productos_puesto_check
  check (puesto in ('buffet', 'entrada'));

alter table public.buffet_turnos
  drop constraint if exists buffet_turnos_puesto_check;
alter table public.buffet_turnos
  add constraint buffet_turnos_puesto_check
  check (puesto in ('buffet', 'entrada'));

create index if not exists buffet_productos_puesto_idx
  on public.buffet_productos (puesto, orden);

create index if not exists buffet_turnos_puesto_idx
  on public.buffet_turnos (puesto, abierto_en desc);
