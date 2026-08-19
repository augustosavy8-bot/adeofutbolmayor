import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ADEO Fútbol Mayor',
  description: 'Panel de gestión del fútbol mayor del Club ADEO',
};

export const viewport: Viewport = {
  themeColor: '#0b0b0d',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-dvh bg-panel-950 text-zinc-100">{children}</body>
    </html>
  );
}
