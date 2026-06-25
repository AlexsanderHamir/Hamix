package store

import (
	"context"

	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/domain"
	"gorm.io/gorm"
)

// hasRunningTaskOnGitTarget reports whether any task with status running
// references the target id as a worktree, branch, worktree_branch association,
// or descendant of a repository.
//
//funclogmeasure:skip category=hot-path reason="DB read helper; operation trace is emitted by the calling delete chokepoint."
func hasRunningTaskOnGitTarget(ctx context.Context, db *gorm.DB, targetID string) (bool, error) {
	if targetID == "" {
		return false, nil
	}
	var n int64
	err := db.WithContext(ctx).Raw(`
SELECT COUNT(*) FROM tasks
WHERE status = ?
  AND (
        worktree_branch_id = ?
     OR worktree_branch_id IN (
          SELECT wb.id FROM worktree_branches wb
          WHERE wb.worktree_id = ? OR wb.branch_id = ?
        )
     OR worktree_branch_id IN (
          SELECT wb.id FROM worktree_branches wb
          JOIN git_worktrees wt ON wt.id = wb.worktree_id
          WHERE wt.repository_id = ?
        )
  )`, domain.StatusRunning, targetID, targetID, targetID, targetID).Scan(&n).Error
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

//funclogmeasure:skip category=hot-path reason="DB read helper; operation trace is emitted by the calling delete chokepoint."
func guardNoRunningTaskOnWorktreeBranch(ctx context.Context, db *gorm.DB, worktreeBranchID string) error {
	ok, err := hasRunningTaskOnGitTarget(ctx, db, worktreeBranchID)
	if err != nil {
		return err
	}
	if ok {
		return domain.NewGitErr(domain.GitCodeHasRunningTask, "a task is running on this worktree branch association")
	}
	return nil
}

//funclogmeasure:skip category=hot-path reason="DB read helper; operation trace is emitted by the calling delete chokepoint."
func guardNoRunningTask(ctx context.Context, db *gorm.DB, targetID string) error {
	ok, err := hasRunningTaskOnGitTarget(ctx, db, targetID)
	if err != nil {
		return err
	}
	if ok {
		return domain.NewGitErr(domain.GitCodeHasRunningTask, "a task is running on this git target")
	}
	return nil
}

//funclogmeasure:skip category=hot-path reason="DB read helper; operation trace is emitted by ReconcileGitRepository chokepoint."
func hasAnyTaskOnWorktree(ctx context.Context, db *gorm.DB, worktreeID string) (bool, error) {
	if worktreeID == "" {
		return false, nil
	}
	var n int64
	err := db.WithContext(ctx).Raw(`
SELECT COUNT(*) FROM tasks
WHERE worktree_branch_id IN (
  SELECT id FROM worktree_branches WHERE worktree_id = ?
)`, worktreeID).Scan(&n).Error
	return n > 0, err
}
