import { redirect } from 'next/navigation';
import { PanelShell } from '@/components/panel/PanelShell';
import { createClient } from '@/lib/supabase/server';
import { emailAUsuario } from '@/lib/auth';

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

  return (
    <PanelShell usuario={emailAUsuario(user.email)}>{children}</PanelShell>
  );
}
