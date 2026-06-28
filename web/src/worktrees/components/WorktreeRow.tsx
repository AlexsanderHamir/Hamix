import type { GitBranch, GitWorktree } from "@/types/git";
import {
  worktreeAriaLabel,
  worktreeGitCopy,
} from "../worktreeGitCopy";
import { BranchPill } from "./BranchPill";
import { WorktreesChevronRightIcon, WorktreesMoreIcon } from "./WorktreesIcons";
import { WorktreesMenu } from "./WorktreesMenu";

type Props = {
  worktree: GitWorktree;
  branches: GitBranch[];
  onDelete: () => void;
  deleteDisabled?: boolean;
};

export function WorktreeRow({
  worktree,
  branches,
  onDelete,
  deleteDisabled = false,
}: Props) {
  const displayName = worktree.name.trim() || worktree.path;
  const branchById = new Map(branches.map((b) => [b.id, b]));
  const branch = worktree.branch_id ? branchById.get(worktree.branch_id) : undefined;
  const deleteBlocked = deleteDisabled;
  const kindLabel = worktree.is_main ? worktreeGitCopy.mainWorktreeShortLabel : null;

  const unregisterMenuItem = {
    id: "unregister-worktree",
    label: worktreeGitCopy.unregisterWorktree,
    onSelect: onDelete,
    disabled: deleteBlocked,
    danger: true,
  };

  return (
    <li
      className="worktrees-inventory-row worktrees-inventory-row--worktree"
      data-main={worktree.is_main ? "true" : "false"}
      aria-label={worktreeAriaLabel(displayName)}
    >
      <div className="worktrees-inventory-row__name worktree-row__name">
        <WorktreesChevronRightIcon className="worktree-row__chevron" aria-hidden />
        <span className="worktree-row__label" title={displayName}>
          {displayName}
        </span>
        {kindLabel ? (
          <span className="worktree-row__kind" title={worktreeGitCopy.mainWorktreeHint}>
            {kindLabel}
          </span>
        ) : null}
      </div>

      <div className="worktrees-inventory-row__branch worktree-row__branch" aria-label="Branch">
        {branch ? (
          <BranchPill branch={branch} />
        ) : worktree.branch_id ? (
          <span className="worktree-row__branch-empty">{worktree.branch_id}</span>
        ) : (
          <span className="worktree-row__branch-empty">{worktreeGitCopy.detachedHead}</span>
        )}
      </div>

      <div
        className="worktrees-inventory-row__status worktree-row__status"
        title={worktreeGitCopy.statusUnavailableTitle}
        aria-label={worktreeGitCopy.statusUnavailableTitle}
      >
        <span className="worktree-row__status-value" aria-hidden>
          {worktreeGitCopy.statusUnavailable}
        </span>
      </div>

      <div className="worktrees-inventory-row__actions worktree-row__actions">
        <div className="task-list-row-actions">
          <WorktreesMenu
            triggerLabel={worktreeGitCopy.worktreeActions(displayName)}
            className="task-list-icon-btn"
            icon={<WorktreesMoreIcon />}
            iconOnly
            items={[unregisterMenuItem]}
          />
        </div>
      </div>
    </li>
  );
}
