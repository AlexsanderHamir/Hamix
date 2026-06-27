import type { GitBranch, GitLiveWorktree, GitWorktree } from "@/types/git";
import { worktreeGitCopy } from "../worktreeGitCopy";
import { worktreePathsMatch } from "../worktreePathMatch";
import { WorktreeRow } from "./WorktreeRow";

type Props = {
  worktrees: GitWorktree[];
  branches: GitBranch[];
  liveWorktrees: GitLiveWorktree[];
  onDeleteWorktree: (worktreeId: string, label: string) => void;
};

export function WorktreeList({
  worktrees,
  branches,
  liveWorktrees,
  onDeleteWorktree,
}: Props) {
  return (
    <div className="worktree-list table-wrap">
      <div className="worktree-list-head" role="row">
        <span className="worktree-list-head__label" role="columnheader">
          {worktreeGitCopy.listColumnName}
        </span>
        <span
          className="worktree-list-head__label worktree-list-head__label--branch"
          role="columnheader"
        >
          {worktreeGitCopy.listColumnBranch}
        </span>
        <span
          className="worktree-list-head__label worktree-list-head__label--status"
          role="columnheader"
        >
          {worktreeGitCopy.listColumnStatus}
        </span>
        <span className="worktree-list-head__label worktree-list-head__label--menu" aria-hidden />
      </div>
      <ul className="draft-row-list worktree-list-rows" aria-label="Worktrees">
        {worktrees.map((worktree) => {
          const liveWorktree = liveWorktrees.find((row) =>
            worktreePathsMatch(row.path, worktree.path),
          );
          return (
            <WorktreeRow
              key={worktree.id}
              worktree={worktree}
              branches={branches}
              liveWorktree={liveWorktree}
              onDelete={() =>
                onDeleteWorktree(worktree.id, worktree.name.trim() || worktree.path)
              }
            />
          );
        })}
      </ul>
    </div>
  );
}
