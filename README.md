# adeofutbolmayor

Panel de gestión del fútbol mayor del **Club ADEO**.
Next.js 14 (App Router) + Supabase + TypeScript + Tailwind.

Módulo activo: **Camisetas** (control de conjuntos: talles y señas).
La estructura (sidebar + route group `(panel)`) ya queda lista para sumar cuotas, fichajes, etc.

## 1. Instalar

```bash
npm install
```

## 2. Variables de entorno

Copiar `.env.example` a `.env.local` y completar con los datos del proyecto de Supabase
(Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## 3. Base de datos

En el SQL Editor de Supabase, correr en orden:

1. `supabase/migrations/0001_init.sql` — tablas `adeo_grupos` y `adeo_personas`, RLS y realtime.
2. `supabase/migrations/0002_seed.sql` — grupos y plantel inicial (idempotente: no duplica).

Con Supabase CLI: `supabase db push`.

## 4. Auth (magic link)

En Supabase → Authentication:

- **Providers → Email**: activar *Email* y desactivar *Confirm password* (se usa OTP por link).
- **URL Configuration → Site URL**: `http://localhost:3000` en local, el dominio de Vercel en producción.
- **Redirect URLs**: agregar `http://localhost:3000/auth/callback` y `https://TU-APP.vercel.app/auth/callback`.

Cualquier usuario autenticado lee y escribe todo (política única por ahora).
Para restringir quién entra, limitar el registro desde Supabase o refinar las policies más adelante.

## 5. Escudo

Reemplazar `public/adeo-logo.png` por el escudo real (PNG cuadrado, fondo transparente).
El que está ahora es un placeholder.

## 6. Desarrollo

```bash
npm run dev
```

## 7. Deploy en Vercel

1. Subir el repo a GitHub.
2. En Vercel: *New Project* → importar el repo (framework Next.js, se detecta solo).
3. Cargar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en *Environment Variables*.
4. Deploy y agregar la URL final a las *Redirect URLs* de Supabase.

## Estructura

```
src/
  app/
    (panel)/            layout protegido con sidebar
      camisetas/        módulo de conjuntos
    auth/               callback, confirm y signout del magic link
    login/              ingreso por email
  components/
    panel/              shell, sidebar, header
    camisetas/          tablas, resumen y export del pedido
  lib/                  clientes de Supabase, tipos, talles, formato
supabase/migrations/    SQL de esquema y seed
```
