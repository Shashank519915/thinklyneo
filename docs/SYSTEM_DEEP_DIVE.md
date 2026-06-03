# System Deep Dive

Architecture reference for the Galaxy platform. Execution and API logic live in **galaxy-temp-backend**; this repo owns the canvas UI and realtime subscription.

---

## Key code paths

### Frontend (this repo)

| Area | Path |
|------|------|
| Canvas + run | `app/workflow/[id]/canvas/page.tsx` |
| Realtime subscriber | `useRealtimeRun` in canvas page / components |
| Workflow store | `store/workflow-store.ts` |
| Canvas | `components/workflow/Canvas.tsx` |
| Run history modals | `components/workflow/RunDetailsModal.tsx`, `NodeDetailModal.tsx` |
| Cost estimate UI | `lib/node-estimates.ts` |
| Upload client | `lib/upload.ts` → `POST /api/upload` |
| API proxy | `next.config.ts` rewrites to `BACKEND_URL` |
| Shared (synced) | `shared/` via `pnpm sync-shared` |

### Backend (companion repo: galaxy-temp-backend)

| Area | Path |
|------|------|
| Execute | `app/api/workflows/[id]/execute/route.ts` |
| Orchestrator | `trigger/workflowOrchestrator.ts` |
| Provider chain | `trigger/provider-chain.ts` |
| Definitions | `shared/src/definitions/*.node.ts` |
| Credits | `lib/credits.ts` |

---

## Provider fallback (summary)

Providers are defined per node in `@galaxy/shared` (synced from backend) and executed via `runProviderChain` on Trigger workers. The orchestrator only dispatches by `node.type`.

Full provider table and executor kinds: see **galaxy-temp-backend** `docs/SYSTEM_DEEP_DIVE.md` or the Provider fallback section in this repo's README.

Executor kinds: `openrouter`, `webhook-sim`, `ffmpeg` (task-local), `stub`.

---

## Coordinator-waitpoint (summary)

Non-blocking `tasks.trigger` + `wait.forToken` + `notifyCoordinator` loop. State in Postgres; this repo implements live UI via orchestrator metadata and `restoreLiveRun()`.

Sequence diagrams: [README](../README.md#execution-flow).

---

## Credits lifecycle

Canvas shows estimate from `lib/node-estimates.ts` (uses synced `registry.ts`). Backend places hold and reconciles — see backend `lib/credits.ts`.

---

## Input limits

- **Upload:** browser → `/api/upload` (backend sharp + size).
- **Run click:** `validateWorkflowInputsSync` from `@galaxy/shared`.
- **Server:** backend `validate-input-limits.ts` before hold.

Video duration declared but not probed pre-run.
