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
