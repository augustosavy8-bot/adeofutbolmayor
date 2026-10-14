-- adeofutbolmayor :: modulo de estadisticas por jugador
-- Privado por usuario: cada uno ve y edita solo sus propios partidos.

-- ------------------------------------------------------------- partidos
create table if not exists public.adeo_partidos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha        date not null default current_date,
  rival        text not null,
  torneo       text,
  condicion    text check (condicion in ('local', 'visitante')),
  -- Los goles a favor salen de los eventos 'gol'; los en contra se cargan a mano.
  goles_contra int  not null default 0 check (goles_contra >= 0),
  -- Reloj del partido: el minuto de cada evento se calcula desde aca.
  estado       text not null default 'previa'
               check (estado in ('previa', 'primer_tiempo', 'entretiempo', 'segundo_tiempo', 'final')),
  inicio_at    timestamptz,
  inicio_st_at timestamptz,
  notas        text,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------- jugadores citados al partido
-- nombre y posicion son una copia: si despues borran al jugador del plantel,
-- las estadisticas del partido siguen siendo legibles.
create table if not exists public.adeo_partido_jugadores (
  id         uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.adeo_partidos(id) on delete cascade,
  jugador_id uuid references public.adeo_jugadores(id) on delete set null,
  nombre     text not null,
  posicion   text,
  orden      int  not null default 0,
  created_at timestamptz not null default now(),
  unique (partido_id, jugador_id)
);

-- --------------------------------------------------------------- eventos
-- Una fila por toque. Deshacer = borrar la ultima. Los totales son sumas.
create table if not exists public.adeo_eventos (
  id         uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.adeo_partidos(id) on delete cascade,
  citado_id  uuid not null references public.adeo_partido_jugadores(id) on delete cascade,
  tipo       text not null check (tipo in (
    -- con pelota
    'pase_dado', 'pase_errado', 'asistencia', 'gol', 'remate_arco', 'remate_afuera',
    -- sin pelota
    'recuperacion', 'perdida', 'quite', 'despeje', 'falta_cometida', 'falta_recibida'
  )),
  minuto     int check (minuto between 0 and 130),
  created_at timestamptz not null default now()
);

create index if not exists adeo_partidos_user_fecha_idx    on public.adeo_partidos (user_id, fecha desc);
create index if not exists adeo_partido_jugadores_pid_idx  on public.adeo_partido_jugadores (partido_id, orden);
create index if not exists adeo_eventos_partido_idx        on public.adeo_eventos (partido_id, created_at desc);
create index if not exists adeo_eventos_citado_tipo_idx    on public.adeo_eventos (citado_id, tipo);

-- ------------------------------------------------------------------- RLS
alter table public.adeo_partidos           enable row level security;
alter table public.adeo_partido_jugadores  enable row level security;
alter table public.adeo_eventos            enable row level security;

-- El partido es del usuario que lo creo. Nadie mas lo lee ni lo toca.
drop policy if exists adeo_partidos_propios on public.adeo_partidos;
create policy adeo_partidos_propios
  on public.adeo_partidos
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Los hijos heredan el dueño del partido.
drop policy if exists adeo_partido_jugadores_propios on public.adeo_partido_jugadores;
create policy adeo_partido_jugadores_propios
  on public.adeo_partido_jugadores
  for all
  to authenticated
  using (exists (
    select 1 from public.adeo_partidos p
    where p.id = partido_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.adeo_partidos p
    where p.id = partido_id and p.user_id = auth.uid()
  ));

drop policy if exists adeo_eventos_propios on public.adeo_eventos;
create policy adeo_eventos_propios
  on public.adeo_eventos
  for all
  to authenticated
  using (exists (
    select 1 from public.adeo_partidos p
    where p.id = partido_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.adeo_partidos p
    where p.id = partido_id and p.user_id = auth.uid()
  ));

-- -------------------------------------------------------------- realtime
-- Para cargar desde dos telefonos a la vez (uno por banda) sin pisarse.
alter table public.adeo_eventos replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.adeo_eventos;
exception
  when duplicate_object then null;
end
$$;
