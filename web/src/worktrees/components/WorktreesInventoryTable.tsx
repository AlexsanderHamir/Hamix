import type { GitRepository } from "@/types/git";
import { worktreeGitCopy } from "../worktreeGitCopy";
import { RepositoryInventoryGroup } from "./RepositoryInventoryGroup";

type RepositoryCallbacks = {
  onRegisterWorktree: (repository: GitRepository) => void;
  onCreateWorktree: (repository: GitRepository) => void;
  onDeleteRepository: (repository: GitRepository) => void;
  onDeleteWorktree: (repositoryId: string, worktreeId: string, label: string) => void;
  onReconcile: (repository: GitRepository) => void;
  reconcilePendingId?: string;
  reconcileErrors: Record<string, unknown>;
};

type Props = {
  repositories: GitRepository[];
} & RepositoryCallbacks;

export function WorktreesInventoryTable({
  repositories,
  onRegisterWorktree,
  onCreateWorktree,
  onDeleteRepository,
  onDeleteWorktree,
  onReconcile,
  reconcilePendingId,
  reconcileErrors,
}: Props) {
  return (
    <div className="worktrees-inventory">
      <div className="worktrees-inventory-head" role="row">
        <span className="worktrees-inventory-head__label worktrees-inventory-head__label--name" role="columnheader">
          {worktreeGitCopy.listColumnName}
        </span>
        <span className="worktrees-inventory-head__label worktrees-inventory-head__label--branch" role="columnheader">
          {worktreeGitCopy.listColumnBranch}
        </span>
        <span className="worktrees-inventory-head__label worktrees-inventory-head__label--count" role="columnheader">
          {worktreeGitCopy.listColumnWorktreeCount}
        </span>
        <span className="worktrees-inventory-head__label worktrees-inventory-head__label--menu" aria-hidden />
      </div>
      <ul className="worktrees-inventory-rows" aria-label="Repositories and worktrees">
        {repositories.map((repository, index) => (
          <RepositoryInventoryGroup
            key={repository.id}
            repository={repository}
            isFirst={index === 0}
            reconcilePending={reconcilePendingId === repository.id}
            reconcileError={reconcileErrors[repository.id]}
            onReconcile={() => onReconcile(repository)}
            onRegisterWorktree={() => onRegisterWorktree(repository)}
            onCreateWorktree={() => onCreateWorktree(repository)}
            onDeleteRepository={() => onDeleteRepository(repository)}
            onDeleteWorktree={(worktreeId, label) =>
              onDeleteWorktree(repository.id, worktreeId, label)
            }
          />
        ))}
      </ul>
    </div>
  );
}
