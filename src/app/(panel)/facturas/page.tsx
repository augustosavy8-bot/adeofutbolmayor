import Link from 'next/link';
import { FacturasClient } from '@/components/facturas/FacturasClient';
import { createClient } from '@/lib/supabase/server';
import { conReintentos } from '@/lib/supabase/consultas';
import type { Factura } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function FacturasPage() {
  const supabase = createClient();

  const { data: facturas, error } = await conReintentos<Factura>(() =>
    supabase
      .from('adeo_facturas')
      .select('*')
      .order('periodo', { ascending: false })
      .order('created_at', { ascending: true })
  );

  if (error) {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <p className="font-semibold text-adeo-rojo-claro">
          No se pudieron cargar las facturas
        </p>
        <p className="mt-2 text-sm text-zinc-400">{error.message}</p>
        <Link href="/facturas" className="btn-primary mt-4">
          Reintentar
        </Link>
      </div>
    );
  }

  const datos = (facturas ?? []).map((f) => ({
    ...f,
    neto: Number(f.neto),
    alicuota: Number(f.alicuota),
    iva: Number(f.iva),
    total: Number(f.total),
    futbol: Number(f.futbol),
  }));

  return <FacturasClient facturas={datos} />;
}
