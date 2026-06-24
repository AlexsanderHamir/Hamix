# ADR-0037: Global repos, project overlay, worktree-branch task binding

**Date:** 2026-06-23
**Status:** Accepted (supersedes the project-ownership parts of [ADR-0033](./ADR-0033-git-worktrees-and-branches.md))
**Deciders:** Hamix maintainers

## Context

[ADR-0033](./ADR-0033-git-worktrees-and-branches.md) scoped every git entity to a project: `git_repositories.project_id`, worktrees and branches under a repo, and tasks bound to a `(worktree_id, branch_id)` pair. In practice the same physical checkout was re-registered per project, branches (which git keeps at the repo level) were modeled as if owned by a worktree, and the two-column task binding allowed a task to reference a branch that was never registered on its worktree.

The operator-facing model we want is a strict tree the UI can drill into: **a registered repo on disk → its worktrees (directories) → the branches checked out/registered on each worktree → the queued tasks on a given branch-in-a-directory**. A **project** is a grouping/context overlay, not a node in the git chain, and a task must be creatable with or without one.

The [Projects UI was hidden at launch](../omitted-features.md), not removed; restoring it is part of this change.

## Decision

### 1. Repos are global

Drop `git_repositories.project_id`. A repo is registered **once per canonical path** (`path` unique globally) and is not owned by any project. One physical checkout is one repo row, reused by any number of projects.

### 2. The git chain is `repo → worktree → branch → task` and is project-free

- `git_worktrees.repository_id` (no `project_id` on worktrees).
- `git_branches` are **repo-level refs** (`repository_id`, `name`, `head_sha`).
- A worktree **associates** with many branches over its lifetime via a `worktree_branches` link table; the `worktree_branches` row is the precise "this branch, in this directory" node a task runs against.
- At most one branch is the **active checkout** in a given worktree at a time, tracked by `git_worktrees.active_branch_id`.

### 3. Projects are an optional overlay tied to one repo

- `projects.repository_id` (a project belongs to exactly one repo; the repo must exist first; a repo may have many projects).
- Projects do not own worktrees or branches; selecting a project at task-create time scopes the same repo's worktrees and tags the task.

### 4. Tasks bind a `worktree_branches` association via a single FK

- Replace `tasks.worktree_id` + `tasks.branch_id` with `tasks.worktree_branch_id` (required FK → `worktree_branches.id`). This makes "the branch is registered on the worktree" true by construction and removes two-column drift.
- `tasks.project_id` stays **optional**.
- Many tasks may queue on the same association; the worker resolves worktree path + branch from the association and checks out the branch before each run.

### 5. Two task-creation flows, one end state

Both resolve to a single `worktree_branch_id`:

- **Case A (no project):** repo → worktree → branch. `project_id` null.
- **Case B (with project):** project → (its repo) → worktree → branch. `project_id` set; `project.repository_id` must equal the association's repo.

### 6. No defaults

Worktrees and branches lists start empty; nothing is auto-created. The only nicety: when registering an **existing** worktree, read its current branch and offer it pre-selected for association (user confirms). The built-in `DEFAULT_PROJECT_ID` requirement is dropped — existing default-project tasks migrate to `project_id = null` (Case A); the row, if kept for back-compat, becomes legacy with a nullable `repository_id`. OS browse defaults are removed separately (narrows [ADR-0036](./ADR-0036-workspace-place-providers.md); see that ADR and Cycle 7).

### 7. Restore Projects UI

Flip the `projects` flag in [web/src/launch/omittedFeatures.ts](../../web/src/launch/omittedFeatures.ts) and build the new repo-rooted navigation.

### Invariants enforced in code

- For any `worktree_branches` row, `worktree.repository_id == branch.repository_id`.
- `task.worktree_branch_id` references a real association; when `task.project_id` is set, `project.repository_id` equals the association's repo (`project_repo_mismatch` otherwise).
- A branch is the active checkout in at most one worktree at a time; Hamix pre-validates with a clean **409 `branch_active_elsewhere`** (replaces the soft warning in [handler_task_git_binding.go](../../pkgs/tasks/handler/handler_task_git_binding.go)).
- New git error codes: `branch_active_elsewhere`, `branch_not_associated`, `project_repo_mismatch`.

### Delete semantics

- Repo delete: blocked by any **running** task under it (`has_running_task`, 409).
- Worktree delete: blocked while a running task targets it.
- Branch delete: removes its `worktree_branches` associations.
- Removing a single worktree↔branch association: blocked if a running task uses that pair.
- Deleting a project: allowed; referencing tasks fall back to `project_id = null` (overlay only).

## Consequences

### Positive

- The UI maps 1:1 to the real git layout: repo → worktree → branch → task.
- One checkout = one repo row, shared across projects (no per-project duplication).
- A task can never reference a branch that is not registered on its worktree.
- Tasks are creatable without a project; projects are a clean grouping overlay.

### Negative / trade-offs

- A data migration is required: flip repo scoping, backfill `projects.repository_id`, seed `worktree_branches`, convert `(worktree_id, branch_id)` task bindings to `worktree_branch_id`, and null out default-project task ownership.
- More relations to reconcile against `git worktree list` (active branch, associations).
- Cross-stack churn (domain → store → API → web) delivered over multiple cycles.

## Alternatives considered

| Alternative | Reason rejected |
| --- | --- |
| Keep repos project-scoped (ADR-0033) | Forces re-registering the same checkout per project; conflicts with the global-repo navigation the user wants |
| Branches owned by a worktree row | Git keeps branches at the repo level; a worktree checks out one at a time but works on many — association-over-time is the correct model |
| Keep two-column `(worktree_id, branch_id)` task binding | Allows a task to bind a branch not registered on its worktree; single `worktree_branch_id` makes the invariant structural |
| Make `project_id` required (default project) | User requires tasks creatable without a project; default project becomes optional/legacy |
| Soft "branch checked out elsewhere" warning | Race-prone; a hard `branch_active_elsewhere` 409 gives a clean, deterministic error |

## See also

- Plan: `repo-project_model_analysis` (Decision log + cycle plan)
- [docs/data-model.md](../data-model.md) — git section
- [docs/domain/worktrees-and-branches.md](../domain/worktrees-and-branches.md)
- [ADR-0033](./ADR-0033-git-worktrees-and-branches.md), [ADR-0036](./ADR-0036-workspace-place-providers.md)
