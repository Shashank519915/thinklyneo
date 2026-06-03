# Setup Guide (Frontend)

Local development for **galaxy-temp-frontend**. Requires **galaxy-temp-backend** for `/api/*` and Trigger execution. Env vars: [ENVIRONMENT.md](./ENVIRONMENT.md).

---

## Prerequisites

- Node.js 22
- pnpm
- **galaxy-temp-backend** cloned and configured (Postgres, Clerk, Trigger, OpenRouter, Transloadit)

---

## Quick start (this repo)

```bash
pnpm install
pnpm sync-shared
pnpm dev
```

App: `http://localhost:3001` (proxies `/api/*` to `BACKEND_URL`).

**Before starting:** backend on `:3000` and `npx trigger.dev dev` running in the backend repo.

---

## Full stack

```bash
# Backend (sibling repo)
cd ../galaxy-temp-backend
pnpm install
pnpm db:push
pnpm dev

# Trigger worker
cd ../galaxy-temp-backend
npx trigger.dev@latest dev

# Frontend (this repo)
cd ../galaxy-temp-frontend
pnpm install
pnpm sync-shared
pnpm dev
```

`.env.local` here:

```
BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

Clerk keys must match the backend.

---

## `pnpm sync-shared`

Copies `@galaxy/shared` from the backend into `shared/` before build. Re-run after changing node definitions in **galaxy-temp-backend**.

Vercel build: `pnpm sync-shared && pnpm build`

---

## Scripts

`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`

---

## Testing

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e
```

---

## Further reading

- [ENVIRONMENT.md](./ENVIRONMENT.md)
- [DATABASE.md](./DATABASE.md)
- [SYSTEM_DEEP_DIVE.md](./SYSTEM_DEEP_DIVE.md)
