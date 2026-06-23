# ADR-0035: Docusaurus documentation site

**Date:** 2026-06-23
**Status:** Accepted
**Deciders:** Maintainers

## Context

Hamix documentation lived as ~70 markdown files under `docs/`, indexed by purpose in [guide.md](../guide.md) and [README.md](../README.md). That worked for contributors with the repo open but offered no searchable, branded reading experience for operators or newcomers. Diagrams (mermaid) and narrative articles such as [architecture.md](../architecture.md) were already written to a high bar; they needed a first-class site without duplicating source files.

Constraints:

- `docs/` must remain the single source of truth (no copied markdown in git).
- CI must fail on broken internal links before deploy.
- Production hosting on GitHub Pages for the `AlexsanderHamir/Hamix` repository.

## Decision

1. Add a Docusaurus 3 app in [`website/`](../../website/) that reads content from [`docs/`](../) via `path: '../docs'` and `routeBasePath: '/'`.
2. Publish at `https://alexsanderhamir.github.io/Hamix/` with `baseUrl: '/Hamix/'`.
3. Order the sidebar narratively in [`website/sidebars.ts`](../../website/sidebars.ts) (get started → understand → build → reference → deep dives → ADRs).
4. Include [`CONTRIBUTING.md`](../../CONTRIBUTING.md) and [`AGENTS.md`](../../AGENTS.md) via a second docs plugin instance at `routeBasePath: 'contributing'`.
5. Rewrite markdown links at build time ([`website/src/remark/rewriteHamixLinks.ts`](../../website/src/remark/rewriteHamixLinks.ts)): strip `.md` for in-tree docs, map repo-root files to GitHub blob URLs, map contributor docs to `/contributing/*`.
6. Use `markdown.format: 'md'` globally so angle-bracket paths in domain articles are not parsed as MDX.
7. CI: [`scripts/check-docs.sh`](../../scripts/check-docs.sh) + `docs` job in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).
8. Deploy: [`.github/workflows/docs-deploy.yml`](../../.github/workflows/docs-deploy.yml) on push to `main` when `docs/**`, `website/**`, or related paths change.

## Consequences

### Positive

- One narrative site with search, dark mode, and mermaid rendering.
- Contributors keep editing `docs/*.md` only; the site rebuilds automatically.
- Broken link detection in CI matches production routing.

### Negative / Trade-offs

- Second Node project (`website/`) alongside `web/` — separate lockfile and CI cache.
- Some markdown links to repo paths become GitHub blob URLs on the site (intentional).
- `docs/README.md` is excluded from the site; [guide.md](../guide.md) is the documentation index route.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Copy `docs/` into `website/docs` at build | Duplication risk and drift from source of truth |
| MkDocs / VitePress | Team chose Docusaurus for React ecosystem alignment and GitHub Pages examples |
| Host docs inside `web/` SPA | Mixes product UI with contributor docs; separate deploy cadence |
