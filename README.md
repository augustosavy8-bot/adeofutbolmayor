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

El proyecto vive en Vercel (`adeofutbolmayor`, team `augusavy`) y ya está conectado
al repo: cada push a `main` publica a producción y cada push a otra rama levanta un
preview.

Las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` tienen que
estar cargadas en *Settings* → *Environment Variables* para **Production, Preview y
Development**. Son `NEXT_PUBLIC_*`, así que se hornean en el build: si faltan, el
deploy compila igual pero después tira 500 en cada request
(`MIDDLEWARE_INVOCATION_FAILED`, "Your project's URL and Key are required to create a
Supabase client"). El repo no incluye ningún `.env`, por eso no se puede depender de él.

Cuidado con subir builds a mano (upload directo): pisan el deploy de git y quedan como
producción, con las claves horneadas de un `.env.local` local. Sirve como parche, pero
tapa que la config de Vercel está incompleta.

La URL de producción también va en las *Redirect URLs* de Supabase
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
