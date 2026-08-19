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
