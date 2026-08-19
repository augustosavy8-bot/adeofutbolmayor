# adeofutbolmayor

Panel de gestión del fútbol mayor del **Club ADEO**.
Next.js 14 (App Router) + Supabase + TypeScript + Tailwind.

**En producción: https://adeofutbolmayor-augusavy.vercel.app**

Módulos activos:

- **Camisetas** — control de conjuntos: talles y señas.
- **Plantel** — jugadores por puesto, con foto, sueldo y estado de pago.

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
2. `supabase/migrations/0002_seed.sql` — grupos y personas iniciales (idempotente: no duplica).
3. `supabase/migrations/0003_plantel.sql` — tabla `adeo_jugadores`, RLS, realtime y el bucket
   `jugadores` de Storage para las fotos.
4. `supabase/migrations/0004_seed_plantel.sql` — plantel inicial (idempotente).

El bucket `jugadores` queda **público para lectura** (las fotos se sirven en `<img>` sin token)
y con escritura solo para usuarios logueados. Las fotos se achican a 800px y se convierten a
webp en el navegador antes de subirse.

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
      plantel/          módulo de jugadores
    auth/               callback, confirm y signout del magic link
    login/              ingreso por email
  components/
    panel/              shell, sidebar, header
    camisetas/          tablas, resumen y export del pedido
    plantel/            cards de jugadores, resumen y carga de fotos
  lib/                  clientes de Supabase, tipos, talles, posiciones, formato
supabase/migrations/    SQL de esquema y seed
```
