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
