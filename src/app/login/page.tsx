'use client';

import Image from 'next/image';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usuarioAEmail } from '@/lib/auth';

export default function LoginPage() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: usuarioAEmail(usuario),
      password,
    });

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Usuario o contraseña incorrectos.'
          : error.message
      );
      setEntrando(false);
      return;
    }

    // Si el middleware nos mandó acá desde otra ruta, volvemos a esa.
    const next = new URLSearchParams(window.location.search).get('next');
    const destino = next && next.startsWith('/') ? next : '/camisetas';

    // Navegación completa a propósito: con router.replace() + router.refresh()
    // salían dos renders del panel y el segundo abortaba al primero justo
    // mientras reintentaba la consulta, así que el reintento nunca llegaba a
    // salir. Una sola carga también evita que el router sirva una versión
    // cacheada de antes del login.
    window.location.assign(destino);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/adeo-logo.png"
            alt="Escudo de la Asociación Deportiva Everton Olimpia"
            width={128}
            height={131}
            priority
            className="h-32 w-32 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,.6)]"
          />
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            ADEO <span className="text-adeo-rojo">Fútbol Mayor</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-400">Panel de gestión</p>
        </div>

        <div className="card p-5">
          <form onSubmit={entrar} className="space-y-3">
            <label className="block text-sm font-medium text-zinc-300">
              Usuario
              <input
                type="text"
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="usuario"
                className="input-base mt-1.5"
              />
            </label>

            <label className="block text-sm font-medium text-zinc-300">
              Contraseña
              <div className="relative mt-1.5">
                <input
                  type={verPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-base pr-16"
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-zinc-400 transition hover:text-zinc-100"
                >
                  {verPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </label>

            {error && (
              <p className="rounded-lg bg-adeo-rojo/10 px-3 py-2 text-sm text-adeo-rojo-claro">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={entrando || !usuario.trim() || !password}
              className="btn-primary w-full"
            >
              {entrando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Asociación Deportiva Everton Olimpia · Cañada de Gómez
        </p>
      </div>
    </main>
  );
}
