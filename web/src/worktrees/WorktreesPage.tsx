import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { GitRepository } from "@/types";
import { Button } from "@/components/ui";
import { useDocumentTitle } from "@/shared/useDocumentTitle";
import { useOptionalToast } from "@/shared/toast";
import { EmptyState } from "@/shared/EmptyState";
import { useDelayedTrue } from "@/lib/useDelayedTrue";
import { TASK_TIMINGS } from "@/constants/tasks";
import { TaskDraftsListSkeleton } from "@/components/skeletons/TaskDraftsListSkeleton";
import { useGlobalRepositories } from "./hooks/useGlobalRepositories";
import { useGlobalGitMutations } from "./hooks/useGlobalGitMutations";
import { WorktreesInventoryTable } from "./components/WorktreesInventoryTable";
import { DeleteConfirmDialog } from "./components/DeleteConfirmDialog";
import type { GitDeleteTarget } from "./gitDeleteErrors";
import { RegisterRepositoryModal } from "./modals/RegisterRepositoryModal";
import { RegisterWorktreeModal } from "./modals/RegisterWorktreeModal";
import { CreateWorktreeModal } from "./modals/CreateWorktreeModal";
import { RelocateRepositoryModal } from "./modals/RelocateRepositoryModal";
import { formatReconcileSuccess } from "./gitReconcileErrors";
import {
  deriveWorktreesPageMode,
  worktreesPageErrorMessage,
  worktreesPageTitle,
} from "./worktreesPageMode";
import { worktreeGitCopy } from "./worktreeGitCopy";
import { WorktreesPlusIcon } from "./components/WorktreesIcons";

type ActiveRepoModal =
  | { kind: "register-worktree"; repository: GitRepository }
  | { kind: "create-worktree"; repository: GitRepository }
  | null;

export function WorktreesPage() {
  const repositoriesQuery = useGlobalRepositories();
  const mutations = useGlobalGitMutations();
  const [searchParams, setSearchParams] = useSearchParams();

  const [registerOpen, setRegisterOpen] = useState(false);
  const [activeRepoModal, setActiveRepoModal] = useState<ActiveRepoModal>(null);
  const [deleteTarget, setDeleteTarget] = useState<GitDeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  const [relocateRepository, setRelocateRepository] = useState<GitRepository | null>(null);
  const [reconcileErrors, setReconcileErrors] = useState<Record<string, unknown>>({});
  const [autoReconcileBlocked, setAutoReconcileBlocked] = useState<Record<string, true>>({});
  const toast = useOptionalToast();

  const repositories = repositoriesQuery.data ?? [];
  const repositoryCount = repositories.length;
  const pageMode = deriveWorktreesPageMode({
    isLoading: repositoriesQuery.isLoading && !repositoriesQuery.data,
    isError: repositoriesQuery.isError,
    repositoryCount: repositories.length,
  });
  const pageTitle = worktreesPageTitle();
  useDocumentTitle(pageTitle);

  const showSkeleton = useDelayedTrue(
    pageMode === "loading",
    TASK_TIMINGS.draftResumeMinLoadingMs,
  );

  useEffect(() => {
    if (searchParams.get("register") !== "1") return;
    setRegisterOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const closeDelete = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const runDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      if (deleteTarget.kind === "repository") {
        await mutations.deleteRepository.mutateAsync(deleteTarget.id);
      } else {
        await mutations.unregisterWorktree.mutateAsync({
          worktreeId: deleteTarget.id,
          repositoryId: deleteTarget.repositoryId,
        });
      }
      closeDelete();
    } catch (err) {
      setDeleteError(err);
    }
  };

  const deletePending =
    mutations.deleteRepository.isPending ||
    mutations.unregisterWorktree.isPending;

  const reconcilingRepositoryId =
    mutations.reconcile.isPending || mutations.relocateRepository.isPending
      ? mutations.reconcile.variables?.repositoryId ??
        mutations.relocateRepository.variables?.repositoryId
      : undefined;

  const handleReconcile = useCallback(
    async (repository: GitRepository) => {
      setReconcileErrors((prev) => {
        const next = { ...prev };
        delete next[repository.id];
        return next;
      });
      try {
        const result = await mutations.reconcile.mutateAsync({
          repositoryId: repository.id,
          input: { repair: true },
        });
        if (result.status === "needs_bootstrap_path") {
          setAutoReconcileBlocked((prev) => ({ ...prev, [repository.id]: true }));
          setRelocateRepository(repository);
          return;
        }
        toast?.success(formatReconcileSuccess(result));
      } catch (err) {
        setReconcileErrors((prev) => ({ ...prev, [repository.id]: err }));
      }
    },
    [mutations.reconcile, toast],
  );

  const closeRelocateModal = () => {
    setRelocateRepository(null);
    mutations.relocateRepository.reset();
  };

  const activeRepository =
    activeRepoModal?.kind === "register-worktree" ||
    activeRepoModal?.kind === "create-worktree"
      ? activeRepoModal.repository
      : null;

  const activeReconcileBlocked =
    activeRepository != null && autoReconcileBlocked[activeRepository.id] === true;

  return (
    <section
      className="panel task-list-section-panel task-detail-content--enter worktrees-page"
      aria-labelledby="worktrees-heading"
    >
      <div className="task-list-toolbar">
        <header className="task-list-section-head">
          <div className="task-list-section-head__text">
            <h2 id="worktrees-heading" className="task-list-section-title">
              {pageTitle}
            </h2>
            {pageMode === "manage" && repositoryCount > 0 ? (
              <span className="draft-count-pill" aria-live="polite">
                <strong>{repositoryCount}</strong>{" "}
                {repositoryCount === 1 ? "repository" : "repositories"}
              </span>
            ) : null}
          </div>
          <div className="task-list-section-actions">
            {pageMode === "setup" || pageMode === "manage" ? (
              <Button
                type="button"
                variant="primary"
                className="task-home-new-task-btn worktrees-register-btn"
                onClick={() => setRegisterOpen(true)}
              >
                <WorktreesPlusIcon className="worktrees-register-btn__icon" aria-hidden />
                {worktreeGitCopy.registerRepository}
              </Button>
            ) : null}
          </div>
        </header>
      </div>

      {pageMode === "error" ? (
        <div className="err" role="alert">
          <p>{worktreesPageErrorMessage(repositoriesQuery.error)}</p>
          <div className="task-detail-error-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                void repositoriesQuery.refetch();
              }}
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      <div className="task-list-content task-list-content--enter">
        {showSkeleton ? <TaskDraftsListSkeleton /> : null}
        {pageMode === "setup" ? (
          <div className="task-list-empty-cell">
            <EmptyState
              title="Register a repository to get started"
              description="Hamix needs a git checkout before you can register worktrees, bind branches, and run agent tasks."
              hideIcon
              className="empty-state--in-table empty-state--task-list-fresh"
            />
          </div>
        ) : null}
        {pageMode === "manage" ? (
          <WorktreesInventoryTable
            repositories={repositories}
            reconcilePendingId={reconcilingRepositoryId}
            reconcileErrors={reconcileErrors}
            onReconcile={(repository) => void handleReconcile(repository)}
            onRegisterWorktree={(repository) =>
              setActiveRepoModal({ kind: "register-worktree", repository })
            }
            onCreateWorktree={(repository) =>
              setActiveRepoModal({ kind: "create-worktree", repository })
            }
            onDeleteRepository={(repository) =>
              setDeleteTarget({
                kind: "repository",
                id: repository.id,
                label: repository.path,
                repositoryId: repository.id,
              })
            }
            onDeleteWorktree={(repositoryId, worktreeId, label) =>
              setDeleteTarget({
                kind: "worktree",
                id: worktreeId,
                label,
                repositoryId,
              })
            }
          />
        ) : null}
      </div>

      <RegisterRepositoryModal
        open={registerOpen}
        pending={mutations.createRepository.isPending}
        error={mutations.createRepository.error}
        onClose={() => {
          setRegisterOpen(false);
          mutations.createRepository.reset();
        }}
        onSubmit={(input) => {
          void mutations.createRepository
            .mutateAsync(input)
            .then(() => setRegisterOpen(false));
        }}
      />

      <RegisterWorktreeModal
        open={activeRepoModal?.kind === "register-worktree"}
        pending={mutations.registerWorktree.isPending}
        error={mutations.registerWorktree.error}
        repositoryId={activeRepository?.id ?? ""}
        storedPath={activeRepository?.path ?? ""}
        reconcilePending={reconcilingRepositoryId === activeRepository?.id}
        reconcileError={
          activeRepository != null ? reconcileErrors[activeRepository.id] : undefined
        }
        reconcileBlocked={activeReconcileBlocked}
        onReconcile={() => {
          if (activeRepository != null) void handleReconcile(activeRepository);
        }}
        onClose={() => {
          setActiveRepoModal(null);
          mutations.registerWorktree.reset();
        }}
        onSubmit={(input) => {
          const repo = activeRepoModal?.repository;
          if (!repo || activeRepoModal?.kind !== "register-worktree") return;
          void mutations.registerWorktree
            .mutateAsync({ repositoryId: repo.id, input })
            .then(() => setActiveRepoModal(null));
        }}
      />

      <CreateWorktreeModal
        open={activeRepoModal?.kind === "create-worktree"}
        pending={mutations.createWorktree.isPending}
        error={mutations.createWorktree.error}
        repositoryId={activeRepository?.id ?? ""}
        storedPath={activeRepository?.path ?? ""}
        reconcilePending={reconcilingRepositoryId === activeRepository?.id}
        reconcileError={
          activeRepository != null ? reconcileErrors[activeRepository.id] : undefined
        }
        reconcileBlocked={activeReconcileBlocked}
        onReconcile={() => {
          if (activeRepository != null) void handleReconcile(activeRepository);
        }}
        onClose={() => {
          setActiveRepoModal(null);
          mutations.createWorktree.reset();
        }}
        onSubmit={(input) => {
          const repo = activeRepoModal?.repository;
          if (!repo || activeRepoModal?.kind !== "create-worktree") return;
          void mutations.createWorktree
            .mutateAsync({ repositoryId: repo.id, input })
            .then(() => setActiveRepoModal(null));
        }}
      />

      <DeleteConfirmDialog
        target={deleteTarget}
        pending={deletePending}
        error={deleteError}
        onClose={closeDelete}
        onConfirm={() => void runDelete()}
      />

      <RelocateRepositoryModal
        open={relocateRepository != null}
        pending={mutations.relocateRepository.isPending}
        error={mutations.relocateRepository.error}
        storedPath={relocateRepository?.path ?? ""}
        onClose={closeRelocateModal}
        onSubmit={(input) => {
          const repo = relocateRepository;
          if (!repo) return;
          void mutations.relocateRepository
            .mutateAsync({ repositoryId: repo.id, input })
            .then((result) => {
              setAutoReconcileBlocked((prev) => {
                const next = { ...prev };
                delete next[repo.id];
                return next;
              });
              closeRelocateModal();
              toast?.success(formatReconcileSuccess(result));
            });
        }}
      />
    </section>
  );
}

