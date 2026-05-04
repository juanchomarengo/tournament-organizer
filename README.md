# Sirius Padel — Tournament Organizer

App Next.js 16 para organizar torneos de pádel internos: inscripción, sorteo de parejas, grupos, cronograma y bracket.

## Stack

- **Next.js 16** (App Router) + React 19 + Tailwind 4
- **Storage**: Upstash Redis en producción, archivo local (`.tournament-state.json`) en dev
- **Auth admin**: password único + cookie con SHA-256 del password (httpOnly, secure en prod)

## Getting Started

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). En dev no necesitás env vars: el estado persiste en `.tournament-state.json` y `/admin` usa el password default `padel2026`.

### Variables de entorno

Copiar `.env.example` a `.env.local` y completar las que necesites:

| Variable | Cuándo es requerida | Notas |
|---|---|---|
| `ADMIN_PASSWORD` | **Producción** (la app crashea sin ella) | En dev cae a `padel2026` si no está |
| `KV_REST_API_URL` | **Producción** (filesystem read-only en Vercel) | La integración Upstash de Vercel la setea sola |
| `KV_REST_API_TOKEN` | **Producción** | Idem |

Alias aceptados: `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (si usás Upstash sin la integración Vercel).

## Deploy a Vercel

### Paso 1 — Importar el repo

1. [vercel.com/new](https://vercel.com/new) → Import Git Repository → seleccionar `tournament-organizer`.
2. **Antes de deployar**, en "Environment Variables" agregar:
   - `ADMIN_PASSWORD` = un password fuerte (no `padel2026`)
3. Deploy.

### Paso 2 — Storage (Upstash Redis)

1. En el proyecto Vercel: **Storage → Create Database → Upstash for Redis → Free tier**.
2. Vercel inyecta automáticamente `KV_REST_API_URL` y `KV_REST_API_TOKEN` en todos los environments.
3. Redeploy desde Deployments → último → ⋯ → Redeploy.

Sin Upstash, la app intenta escribir al filesystem y falla en Vercel (read-only).

### Auth en producción

- `lib/auth.ts:getAdminPassword()` tira `Error` si `NODE_ENV === "production"` y `ADMIN_PASSWORD` no está seteada. Eso evita un deploy accidental con el password default.
- La cookie de sesión guarda `SHA-256(ADMIN_PASSWORD)`, no el password en plano. Si rotás el password, las sesiones existentes se invalidan.
- `secure: true` en la cookie en producción (HTTPS-only).

## Repos remotos

Este repo vive en dos lados:

- `origin` → [`sirius-valley/tournament-organizer`](https://github.com/sirius-valley/tournament-organizer) (canónico, equipo)
- `personal` → [`juanchomarengo/tournament-organizer`](https://github.com/juanchomarengo/tournament-organizer) (mirror personal)

Los pushes hay que hacerlos a cada uno explícito (`git push origin main`, `git push personal main`). Vercel deploya desde uno solo de los dos — el que se haya importado en el dashboard.

## Tests

```bash
npm run test:e2e        # Playwright headless
npm run test:e2e:ui     # Playwright con UI
```

## Estructura

```
app/
  admin/         # Panel admin (protegido por password)
  api/           # Routes: /auth, /draw, /match, /state
  bracket/       # Bracket público
  cronograma/    # Cronograma público
  sorteo/        # Animación de sorteo público
components/      # UI compartida
lib/
  auth.ts        # Auth admin (password + cookie SHA-256)
  storage.ts     # Persistencia (Upstash o filesystem)
  draw.ts        # Algoritmo de sorteo
  estimator.ts   # Cálculo de duración del torneo
  seed.ts        # Lista inicial de jugadores
  types.ts       # Tipos del dominio
```

Decisiones de diseño documentadas en [`DECISIONS.md`](./DECISIONS.md).
