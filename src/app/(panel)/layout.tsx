import { redirect } from 'next/navigation';
import { PanelShell } from '@/components/panel/PanelShell';
import { createClient } from '@/lib/supabase/server';

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <PanelShell email={user.email ?? null}>{children}</PanelShell>;
}
