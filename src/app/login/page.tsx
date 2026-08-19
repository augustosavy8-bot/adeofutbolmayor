'use client';

import Image from 'next/image';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'enviado'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function enviarLink(e: React.FormEvent) {
    e.preventDefault();
    setEstado('enviando');
    setError(null);

    // Si el middleware nos mandó acá desde otra ruta, volvemos a esa.
    const destino = new URLSearchParams(window.location.search).get('next');
    const callback = new URL('/auth/callback', window.location.origin);
    if (destino && destino.startsWith('/')) callback.searchParams.set('next', destino);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: callback.toString(),
      },
    });

    if (error) {
      setError(error.message);
      setEstado('idle');
      return;
    }
    setEstado('enviado');
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/adeo-logo.png"
            alt="Escudo ADEO"
            width={88}
            height={88}
            priority
            className="h-22 w-22 object-contain"
          />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            ADEO <span className="text-adeo-rojo">Fútbol Mayor</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-400">Panel de gestión</p>
        </div>

        <div className="card p-5">
          {estado === 'enviado' ? (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-adeo-rojo/15 text-2xl">
                ✉️
              </div>
              <p className="font-medium">Revisá tu mail</p>
              <p className="mt-1 text-sm text-zinc-400">
                Te mandamos un link de acceso a{' '}
                <span className="text-zinc-200">{email}</span>.
              </p>
              <button
                type="button"
                onClick={() => setEstado('idle')}
                className="btn-ghost mt-4 w-full"
              >
                Usar otro mail
              </button>
            </div>
          ) : (
            <form onSubmit={enviarLink} className="space-y-3">
              <label className="block text-sm font-medium text-zinc-300">
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vos@ejemplo.com"
                  className="input-base mt-1.5"
                />
              </label>

              {error && (
                <p className="rounded-lg bg-adeo-rojo/10 px-3 py-2 text-sm text-adeo-rojo-claro">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={estado === 'enviando'}
                className="btn-primary w-full"
              >
                {estado === 'enviando' ? 'Enviando…' : 'Enviar link de acceso'}
              </button>
              <p className="text-center text-xs text-zinc-500">
                Sin contraseña: entrás con un link mágico al mail.
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
