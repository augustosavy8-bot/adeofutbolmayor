-- adeofutbolmayor :: buffet (punto de venta offline)
--
-- La tablet opera 100% contra IndexedDB y sube acá cuando hay red. Los id los
-- genera la tablet con crypto.randomUUID(), asi que el upsert por id es
-- idempotente: reintentar una sincronizacion cortada no duplica nada.

-- ------------------------------------------------------------- productos
-- Catalogo. Es la unica tabla que ademas baja hacia la tablet.
create table if not exists public.buffet_productos (
  id         uuid primary key,
  nombre     text not null,
  precio     numeric(12,2) not null default 0,
  categoria  text not null default 'General',
  activo     boolean not null default true,
  orden      int not null default 0,
  -- Lo compara el sync para no pisar un cambio hecho en la tablet.
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- turnos
create table if not exists public.buffet_turnos (
  id            uuid primary key,
  -- Los cajeros viven solo en la tablet (PIN local): se sube el id para poder
  -- agrupar y el nombre para que el turno se entienda desde el servidor.
  cajero_id     text not null,
  cajero_nombre text,
  abierto_en    timestamptz not null,
  cerrado_en    timestamptz,
  fondo_inicial numeric(12,2) not null default 0,
  cerrado       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists buffet_turnos_abierto_en_idx
  on public.buffet_turnos (abierto_en desc);

-- ---------------------------------------------------------------- ventas
create table if not exists public.buffet_ventas (
  id         uuid primary key,
  turno_id   uuid not null references public.buffet_turnos(id) on delete cascade,
  -- [{productoId, nombre, precio, cantidad}] congelado al momento de cobrar:
  -- si despues cambia el precio del producto, la venta vieja no se altera.
  items      jsonb not null default '[]'::jsonb,
  total      numeric(12,2) not null default 0,
  medio_pago text not null check (medio_pago in ('efectivo', 'transferencia', 'qr')),
  creado_en  timestamptz not null,
  -- Anular no borra: la venta queda para el arqueo.
  anulada    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists buffet_ventas_turno_idx
  on public.buffet_ventas (turno_id, creado_en);

-- ------------------------------------------------------------------- RLS
-- Solo usuarios logueados del panel. La tablet sincroniza con la sesion de
-- Supabase que quedo guardada en ese navegador (ver src/app/buffet/README.md).
--
-- Si alguna vez hace falta que la tablet suba sin ninguna sesion, hay que
-- agregar politicas para el rol `anon` — pero eso deja escribir a cualquiera
-- que tenga la anon key, que es publica. Mejor no, salvo que se acepte.
alter table public.buffet_productos enable row level security;
alter table public.buffet_turnos    enable row level security;
alter table public.buffet_ventas    enable row level security;

drop policy if exists buffet_productos_authenticated_all on public.buffet_productos;
create policy buffet_productos_authenticated_all
  on public.buffet_productos for all to authenticated
  using (true) with check (true);

drop policy if exists buffet_turnos_authenticated_all on public.buffet_turnos;
create policy buffet_turnos_authenticated_all
  on public.buffet_turnos for all to authenticated
  using (true) with check (true);

drop policy if exists buffet_ventas_authenticated_all on public.buffet_ventas;
create policy buffet_ventas_authenticated_all
  on public.buffet_ventas for all to authenticated
  using (true) with check (true);
