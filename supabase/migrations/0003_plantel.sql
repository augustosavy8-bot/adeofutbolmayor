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
