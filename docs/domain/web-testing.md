# Web testing

Contributor playbook for Vitest projects, MSW handlers, and the CI web matrix.

| | |
| --- | --- |
| **Applies to** | Adding or fixing tests under `web/` |
| **Audience** | Frontend contributors and agents |
| **Prerequisite** | [docs/web.md](../web.md), [CONTRIBUTING.md](../../CONTRIBUTING.md) |

## CI groups

CI runs four parallel `web` jobs via `scripts/check-web.sh --group=<name>`:

| Group | Runs |
| --- | --- |
| `lint` | check-brand, eslint, check:standards |
| `build` | `tsc --noEmit`, vite build |
| `test-fast` | Vitest `unit` + `components` projects |
| `test-slow` | Vitest `integration` project |

Locally:

```powershell
.\scripts\check-web.ps1 -Group test-fast
.\scripts\check-web.ps1 -Group test-slow
```

Unix: `./scripts/check-web.sh --group=test-fast`

Scoped iteration inside `web/`:

```bash
npm test -- --project=unit
npm test -- --project=integration src/app/AppRouting.test.tsx
```

## Vitest projects

Defined in [`web/vitest.workspace.ts`](../../web/vitest.workspace.ts):

| Project | Owns |
| --- | --- |
| `unit` | `*.test.ts` — parsers, pure helpers, `renderHook` |
| `components` | `*.test.tsx` rendering one component (no `<App />`, no full pages) |
| `integration` | `<App />`, page components, create-modal flows through routing |

## Five rules

1. **Network via MSW.** New tests use `server.use(...)` with handlers in [`web/src/test/handlers/`](../../web/src/test/handlers/). Do not add `vi.spyOn(globalThis, "fetch")`.
2. **No bare async.** No `setTimeout` and no `new Promise(() => {})` in tests — use `vi.useFakeTimers()` or `createDeferred()` from [`web/src/test/deferred.ts`](../../web/src/test/deferred.ts).
3. **One unit per file.** No `<App />` outside `integration`; no full page render outside `integration`.
4. **File size ≤ 500 lines** (see `CODE_STANDARDS.mdc`).
5. **Mind the budget.** Tests over ~2s or files over ~30s should be split or simplified.

## MSW pattern

```ts
import { server } from "@/test/server";
import { appDefaultHandlers, renderApp, setupAppTest } from "@/test/integration/appHarness";
import { tasksListEmpty } from "@/test/handlers/tasks";

beforeEach(() => {
  setupAppTest();
  server.use(...appDefaultHandlers(), tasksListEmpty());
});
```

Baseline handlers: [`bootstrap.ts`](../../web/src/test/handlers/bootstrap.ts) (404 bootstrap), [`tasks.ts`](../../web/src/test/handlers/tasks.ts), [`repo.ts`](../../web/src/test/handlers/repo.ts).

## See also

- [docs/domain/testing.md](testing.md) — Go verification ladder
- [docs/web.md](../web.md) — SPA architecture
