import { useGlobalBranches } from "../hooks/useGlobalBranches";
import { useGlobalWorktrees } from "../hooks/useGlobalWorktrees";
import { WorktreeRow } from "./WorktreeRow";

type Props = {
  repositoryId: string;
  onRegisterWorktree: () => void;
  onCreateWorktree: () => void;
  onAssociateBranch: (worktreeId: string) => void;
  onDeleteWorktree: (worktreeId: string, label: string) => void;
  onDeleteAssociation: (
    assocId: string,
    branchId: string,
    worktreeId: string,
    label: string,
  ) => void;
};

export function RepositoryWorktreesPanel({
  repositoryId,
  onRegisterWorktree,
  onCreateWorktree,
  onAssociateBranch,
  onDeleteWorktree,
  onDeleteAssociation,
}: Props) {
  const worktreesQuery = useGlobalWorktrees(repositoryId);
  const branchesQuery = useGlobalBranches(repositoryId);
  const worktrees = worktreesQuery.data ?? [];
  const branches = branchesQuery.data ?? [];
  const loading = worktreesQuery.isLoading || branchesQuery.isLoading;

  return (
    <section
      className="worktrees-repo-card__section worktrees-detail__worktrees"
      aria-labelledby="repository-worktrees-heading"
    >
      <div className="worktrees-repo-card__section-header">
        <h2 id="repository-worktrees-heading" className="worktrees-repo-card__section-title">
          Worktrees
        </h2>
        <div className="worktrees-repo-card__section-actions">
          <button type="button" className="secondary" onClick={onRegisterWorktree}>
            Register worktree
          </button>
          <button type="button" className="secondary" onClick={onCreateWorktree}>
            Create worktree
          </button>
        </div>
      </div>
      {loading ? (
        <p className="worktrees-repo-card__loading" aria-busy="true">
          Loading worktrees…
        </p>
      ) : worktrees.length === 0 ? (
        <p className="worktrees-repo-card__empty">
          No worktrees yet. Register an existing linked directory or create a new one.
        </p>
      ) : (
        <div className="worktrees-repo-card__rows">
          {worktrees.map((worktree) => (
            <WorktreeRow
              key={worktree.id}
              worktree={worktree}
              branches={branches}
              onDelete={() =>
                onDeleteWorktree(worktree.id, worktree.name.trim() || worktree.path)
              }
              onAssociateBranch={() => onAssociateBranch(worktree.id)}
              onDeleteAssociation={(assocId, branchId, label) =>
                onDeleteAssociation(assocId, branchId, worktree.id, label)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
