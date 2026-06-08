# Thinkly — Visual AI Workflow Builder (Frontend)

Thinkly is a DAG-based visual builder for AI media workflows. Users drag nodes onto a React Flow
canvas, wire them together, and run the graph. Each node is an isolated Trigger.dev task with
Zod input/output schemas. Runs execute in parallel where the graph allows, stream live status
to the canvas, and are metered against a real credit ledger. The platform is also exposed as a
public REST API (`/api/v1`), OpenAPI 3.1 docs, and an MCP server for AI assistants.

**This repository:** Canvas UI, dashboard, workflow pages, Zustand store. Companion API:
**thinkly-backend**.

## Features

- Visual DAG workflow builder (React Flow)
- Schema-driven nodes (Zod, single `@thinkly/shared` source)
- Trigger.dev orchestration with coordinator-waitpoint pattern
- Config-driven provider fallback chains
- Live execution history and run-detail modals
- Credit ledger (hold, reconcile, ledger audit)
- Public REST API with Unkey or local API keys
- OpenAPI 3.1 docs and interactive playground (`/docs`)
- Outbound Svix-style webhooks
- MCP server (hosted Streamable HTTP)

## Repositories

| Path | Role | Stack |
|------|------|-------|
| `thinkly-frontend` | Canvas UI, dashboard, history | Next.js 16, React 19, React Flow, Zustand |
| `thinkly-backend` | API routes, Trigger.dev tasks, Prisma | Next.js 16 API, Prisma 7, Trigger.dev v4 |
| `thinkly-docs` | Public docs + OpenAPI | Mintlify |

Frontend and backend are separate deployments with their own `.git` and env. `@thinkly/shared`
is owned by the backend repo and synced into **this repo** (`shared/`) at build time via
`pnpm sync-shared`.

**Docs:** [docs/SETUP.md](docs/SETUP.md) · [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) · [docs/DATABASE.md](docs/DATABASE.md) · [docs/SYSTEM_DEEP_DIVE.md](docs/SYSTEM_DEEP_DIVE.md)

---

## Architecture overview

### Two runtimes, one database

```
Browser  --/api/*-->  Frontend (Vercel)  --rewrite-->  Backend (Vercel)  --Prisma-->  Postgres
     ^                         |                              |
     | useRealtimeRun          |                              | tasks.trigger
     +-------------------------+------------------------------+----> Trigger.dev workers
```

The frontend rewrites `/api/:path*` to the backend (`BACKEND_URL`), so the browser sends the
Clerk session cookie on the same origin. The backend uses non-blocking Clerk middleware and
returns `401` JSON from route handlers. Run **starts** on Vercel; the **DAG executes** on
Trigger.dev workers. Both need access to the same database; worker secrets are configured in
the Trigger dashboard separately from Vercel.

### Execution flow

End-to-end path from Run click to history update:

```mermaid
sequenceDiagram
    participant User
    participant FE as Frontend
    participant API as Backend API
    participant Orch as Orchestrator
    participant Node as Node Task
    participant DB as PostgreSQL

    User->>FE: Run Workflow
    FE->>API: POST /execute
    API->>DB: Create WorkflowRun
    API->>DB: Place Credit Hold
    API->>Orch: trigger(workflow-orchestrator)
    FE->>Orch: Subscribe (Realtime)
    Orch->>DB: Create NodeRuns
    Orch->>Node: trigger(Node A)
    Orch->>Node: trigger(Node B)
    Orch->>Orch: wait.forToken()
    Node->>DB: Save Output
    Node->>Orch: notifyCoordinator()
    Orch->>DB: Reload Status
    Orch->>Node: Trigger Next Ready Layer
    Node->>DB: Save Final Outputs
    Orch->>DB: Reconcile Credits
    Orch->>DB: Mark Workflow Complete
    Orch-->>FE: Realtime Updates
    FE-->>User: History + Outputs
```

`POST /execute` returns `202` with `{ runId, orchestratorRunId, publicAccessToken }`. The client
subscribes to orchestrator metadata (`nodeStates`). On completion, credits reconcile and the
history panel refreshes. `restoreLiveRun()` re-attaches SSE after page reload if a run is still
active.

### Coordinator pattern (core design)

Instead of `triggerAndWait` per topological layer, one orchestrator dispatches ready nodes with
non-blocking `tasks.trigger`, parks on `wait.forToken`, and wakes when any node calls
`notifyCoordinator`. Scheduling state lives in Postgres — restart-safe and re-attachable.

```mermaid
sequenceDiagram
    participant O as Orchestrator
    participant A as Node A
    participant B as Node B
    participant DB as PostgreSQL

    O->>A: trigger()
    O->>B: trigger()
    O->>O: wait.forToken()
    A->>DB: Save NodeRun
    A->>O: notifyCoordinator()
    O->>DB: Recompute DAG State
    B->>DB: Save NodeRun
    B->>O: notifyCoordinator()
    O->>DB: Recompute DAG State
    O->>O: Dispatch Next Layer
    O->>DB: Mark Complete
```

The orchestrator never reads `providers[]` — only `node.type`, dependency resolution, and
`pending → running → completed/failed/skipped`.

### Provider fallback

Config-driven provider fallback: providers are defined per node in `@thinkly/shared` and executed
through a generic `runProviderChain()` in the backend (`trigger/provider-chain.ts`). Primary
failure logs an attempt and advances to the next provider. Executor kinds: `openrouter`,
`webhook-sim`, `ffmpeg` (task-local), `stub`.

Full detail: [docs/SYSTEM_DEEP_DIVE.md](docs/SYSTEM_DEEP_DIVE.md)

### Credits

Microcredit ledger (1,000,000 micro = 1.00 credit). Flow: estimate in-scope `credits.base` →
`placeCreditHold` (Prisma transaction) → per-node `creditCost` → `reconcileWorkflowCredits`
(release hold, deduct actual, ledger refund/adjustment). New users receive an initial grant.

### Auth surfaces

| Surface | Mechanism | Routes |
|---------|-----------|--------|
| Dashboard / canvas | Clerk session + `userId` ownership | `/api/workflows/*`, `/api/execute/*`, `/api/keys`, `/api/credits` |
| Public API | Unkey or SHA-256 `ApiKey` table | `/api/v1/*` |
| MCP | Bearer API key | `/api/mcp` (hosted Streamable HTTP — single supported transport) |

### Outbound webhooks

`emitWebhookTask` posts Svix-style signed payloads for `run.started`, `run.completed`,
`run.failed`, and `node.completed`, with retries.

---

## Setup (this repo)

```bash
pnpm install
pnpm sync-shared
pnpm dev
```

Requires **thinkly-backend** running (`BACKEND_URL`, default `http://localhost:3000`) and
Trigger worker (`npx trigger.dev dev` in backend repo). Full stack: [docs/SETUP.md](docs/SETUP.md)

## Environment variables

See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for Vercel (frontend + backend), Trigger.dev
cloud, GitHub Actions (`TRIGGER_ACCESS_TOKEN`), and MCP client variables.

## Deployment

- **Vercel frontend project** — build: `pnpm sync-shared && pnpm build`; set `BACKEND_URL` to backend deployment.
- **Backend + Trigger** — **thinkly-backend** repo and Trigger.dev dashboard.
- **Docs** — Mintlify at `/docs` via `vercel.json` rewrites.

## Design decisions and trade-offs

**Coordinator-waitpoint vs `triggerAndWait` per layer.** Non-blocking dispatch + `wait.forToken`
avoids nested blocked parents on wide fan-out and zero idle compute during long provider waits.
Trade-off: more moving parts than literal layer-batching; functionally parallel and sequential
correct. State in Postgres enables `restoreLiveRun`.

**`medium-2x` for `merge-video`.** Default `small-1x` (512MB) OOMs on xfade + `libx264`. Task uses
`machine: "medium-2x"` with OOM retry to `large-1x`. Higher cost for that node only.

**Config-driven providers in `@thinkly/shared`.** One `runProviderChain`, unit-tested once; orchestrator
unchanged. FFmpeg stays task-local; webhook-sim timeout falls back to stub, not a third live provider.

**`@thinkly/shared` synced, not published.** Build-time single source of truth; run `pnpm sync-shared`
after backend definition changes. `requestInputs` / `response` remain bespoke canvas nodes.

**Mid-run credit-exhaustion abort.** Orchestrator aborts when the next layer estimate exceeds remaining hold (see backend `lib/credits.ts`).

**External-run auto-attach.** On tab focus, if SSE is not mounted, `restoreLiveRun` attaches when history shows a `running` row (API/MCP/another tab); skips when `orchestratorState` is already set.

**Unkey + local mock fallback.** Production Unkey when configured; SHA-256 key table for dev/tests.

**Viewport in localStorage.** Per-device pan/zoom; graph JSON stays clean for API/MCP.

**Input limits.** Images: size + dimensions via **sharp** at backend `/api/upload`. Pre-run: sync
validation + server HEAD for URL size (fail-open if unreachable). Video **duration** declared but
not probed pre-run.


---

## What I'd improve with more time

- **MSW / API integration tests** for `/api/v1` (auth, 409 concurrency, rate headers) with mocked Unkey/OpenRouter/Transloadit.
- **Per-run graph snapshot** on `WorkflowRun` so history modals show deleted nodes.
- **Video duration probing** at execute time (ffprobe); stricter policy for unreachable HEAD URLs.

---

## Testing

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e
```

CI runs build, typecheck, lint, and tests; Playwright smoke against the deployed URL.
