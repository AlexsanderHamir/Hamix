import type { GitRepository } from "@/types/git";
import { MutationErrorBanner } from "@/shared/MutationErrorBanner";
import { useGlobalBranches } from "../hooks/useGlobalBranches";
import { useGlobalWorktrees } from "../hooks/useGlobalWorktrees";
import {
  repositoryDisplayName,
  repositoryPathsEquivalent,
} from "../repositoryDisplay";
import { worktreeGitCopy, worktreeCountLabel } from "../worktreeGitCopy";
import { isLinkedWorktreeForDisplay } from "../worktreeRegistration";
import { gitReconcileErrorMessage } from "../gitReconcileErrors";
import {
  WorktreesFolderIcon,
  WorktreesMoreIcon,
  WorktreesPlusIcon,
} from "./WorktreesIcons";
import { WorktreesMenu } from "./WorktreesMenu";
import { WorktreeRow } from "./WorktreeRow";
import { WorktreeReconcileStatus } from "./WorktreeReconcileStatus";

type Props = {
  repository: GitRepository;
  isFirst?: boolean;
  onRegisterWorktree: () => void;
  onCreateWorktree: () => void;
  onDeleteRepository: () => void;
  onDeleteWorktree: (worktreeId: string, label: string) => void;
  onReconcile: () => void;
  reconcilePending?: boolean;
  reconcileError?: unknown;
};

export function RepositoryInventoryGroup({
  repository,
  isFirst = false,
  onRegisterWorktree,
  onCreateWorktree,
  onDeleteRepository,
  onDeleteWorktree,
  onReconcile,
  reconcilePending = false,
  reconcileError,
}: Props) {
  const worktreesQuery = useGlobalWorktrees(repository.id);
  const branchesQuery = useGlobalBranches(repository.id);
  const worktrees = (worktreesQuery.data ?? []).filter(isLinkedWorktreeForDisplay);
  const branches = branchesQuery.data ?? [];
  const loading = worktreesQuery.isLoading || branchesQuery.isLoading;
  const worktreesError =
    worktreesQuery.isError && !worktreesQuery.isLoading
      ? worktreesQuery.error instanceof Error
        ? worktreesQuery.error.message
        : "Could not load worktrees."
      : null;
  const reconcileErrorMessage =
    reconcileError != null ? gitReconcileErrorMessage(reconcileError) : null;
  const repoName = repositoryDisplayName(repository.path);
  const showHostPath =
    repository.host_path.trim() !== "" &&
    !repositoryPathsEquivalent(repository.path, repository.host_path);

  return (
    <>
      <li
        className={[
          "worktrees-inventory-row",
          "worktrees-inventory-row--repo",
          isFirst ? "" : "worktrees-inventory-row--repo-separated",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-labelledby={`repo-${repository.id}-title`}
        aria-busy={reconcilePending || undefined}
      >
        <div className="worktrees-inventory-row__name">
          <h2 id={`repo-${repository.id}-title`} className="worktrees-repo-row__title">
            {repoName}
          </h2>
          <span className="worktrees-repo-row__path" title={repository.path}>
            <WorktreesFolderIcon className="worktrees-repo-row__path-icon" aria-hidden />
            <span className="worktrees-repo-row__path-text">{repository.path}</span>
          </span>
          {showHostPath ? (
            <span className="worktrees-repo-row__host-path">
              <span className="worktrees-repo-row__meta-label">
                {worktreeGitCopy.hostPathLabel}
              </span>
              <code>{repository.host_path}</code>
            </span>
          ) : null}
        </div>
        <div className="worktrees-inventory-row__branch" aria-hidden />
        <div className="worktrees-inventory-row__status">
          {loading ? (
            <span className="worktrees-inventory-row__status-muted">…</span>
          ) : (
            <span>{worktreeCountLabel(worktrees.length)}</span>
          )}
        </div>
        <div className="worktrees-inventory-row__actions">
          <WorktreesMenu
            triggerLabel={worktreeGitCopy.repositoryActions}
            className="task-list-icon-btn"
            icon={<WorktreesMoreIcon />}
            iconOnly
            triggerDisabled={reconcilePending}
            triggerBusy={reconcilePending}
            items={[
              {
                id: "reconcile",
                label: reconcilePending ? worktreeGitCopy.reconciling : worktreeGitCopy.reconcile,
                onSelect: onReconcile,
                disabled: reconcilePending,
              },
              {
                id: "delete-repository",
                label: worktreeGitCopy.deleteRepository,
                onSelect: onDeleteRepository,
                danger: true,
              },
            ]}
          />
        </div>
      </li>

      {reconcilePending ? (
        <li className="worktrees-inventory-row worktrees-inventory-row--status">
          <WorktreeReconcileStatus className="worktrees-inventory-reconcile" />
        </li>
      ) : null}

      {reconcileErrorMessage ? (
        <li className="worktrees-inventory-row worktrees-inventory-row--status">
          <MutationErrorBanner
            error={reconcileErrorMessage}
            className="worktrees-inventory-error"
          />
        </li>
      ) : null}

      {worktreesError ? (
        <li className="worktrees-inventory-row worktrees-inventory-row--status">
          <MutationErrorBanner error={worktreesError} className="worktrees-inventory-error" />
        </li>
      ) : null}

      {loading ? (
        <li className="worktrees-inventory-row worktrees-inventory-row--status">
          <p className="worktrees-inventory-loading" aria-busy="true">
            Loading worktrees…
          </p>
        </li>
      ) : null}

      {!loading && !worktreesError
        ? worktrees.map((worktree) => (
            <WorktreeRow
              key={worktree.id}
              worktree={worktree}
              branches={branches}
              onDelete={() =>
                onDeleteWorktree(worktree.id, worktree.name.trim() || worktree.path)
              }
            />
          ))
        : null}

      {!loading && !worktreesError && worktrees.length === 0 ? (
        <li className="worktrees-inventory-row worktrees-inventory-row--empty">
          <p className="worktrees-inventory-empty">{worktreeGitCopy.emptyWorktreesTitle}</p>
        </li>
      ) : null}

      <li className="worktrees-inventory-row worktrees-inventory-row--add">
        <div className="worktrees-inventory-row__name">
          <WorktreesMenu
            triggerLabel={worktreeGitCopy.addWorktree}
            className="worktrees-inventory-add-btn"
            icon={<WorktreesPlusIcon className="worktrees-inventory-add-btn__icon" aria-hidden />}
            items={[
              {
                id: "register-worktree",
                label: worktreeGitCopy.registerWorktree,
                onSelect: onRegisterWorktree,
              },
              {
                id: "create-worktree",
                label: worktreeGitCopy.createWorktree,
                onSelect: onCreateWorktree,
              },
            ]}
          />
        </div>
      </li>
    </>
  );
}
