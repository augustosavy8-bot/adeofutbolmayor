# adeofutbolmayor

Panel de gestión del fútbol mayor del **Club ADEO**.
Next.js 14 (App Router) + Supabase + TypeScript + Tailwind.

**En producción: https://adeofutbolmayor-augusavy.vercel.app**

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

## 4. Auth (usuario + contraseña)

El panel entra con usuario y contraseña, no con mail. Supabase Auth necesita un email,
así que `src/lib/auth.ts` mapea el usuario a uno interno: `usuario` → `usuario@adeofutbolmayor.com`.

Para dar de alta a alguien, en Supabase → Authentication → Users → **Add user**:

- Email: `<usuario>@adeofutbolmayor.com`
- Password: la que corresponda
- Tildar **Auto Confirm User** (si no, queda sin confirmar y no puede entrar)

Importante: en Authentication → Sign In / Providers → Email, dejar **Allow new users to
sign up** desactivado. Si queda activo, cualquiera con la anon key (que es pública) puede
crearse una cuenta y, con la policy actual, leer y escribir todo.

## 5. Escudo

Reemplazar `public/adeo-logo.png` por el escudo real (PNG cuadrado, fondo transparente).
El que está ahora es un placeholder.

## 6. Desarrollo

```bash
npm run dev
```

## 7. Deploy en Vercel

El proyecto ya existe en Vercel (`adeofutbolmayor`, team `augusavy`) y la primera
subida se hizo por upload directo de archivos.

Para que cada push a `main` redespliegue solo:

1. Vercel → proyecto `adeofutbolmayor` → *Settings* → *Git* → *Connect Git Repository*
   → elegir `augustosavy8-bot/adeofutbolmayor`.
2. *Settings* → *Environment Variables*: cargar `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` para *Production* y *Preview*. Sin esto el build
   desde git no levanta, porque el repo no incluye ningún `.env`.
3. Agregar la URL de producción a las *Redirect URLs* de Supabase
   (`https://adeofutbolmayor-augusavy.vercel.app/auth/callback`).

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
