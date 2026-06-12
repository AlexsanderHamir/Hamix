package tasks

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
	"gorm.io/gorm"
)

// ParentAwaitingSubtasks reports whether a parent finished criteria but still
// has open subtasks and must not re-enter the agent queue.
func ParentAwaitingSubtasks(ctx context.Context, db *gorm.DB, task *domain.Task) (bool, error) {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.tasks.ParentAwaitingSubtasks")
	if task == nil || task.CriteriaSatisfiedAt == nil {
		return false, nil
	}
	var n int64
	err := db.WithContext(ctx).Model(&domain.Task{}).
		Where("parent_id = ? AND status <> ?", task.ID, domain.StatusDone).
		Count(&n).Error
	if err != nil {
		return false, fmt.Errorf("count open subtasks: %w", err)
	}
	return n > 0, nil
}

// HasIncompleteSubtasks reports whether taskID has any direct child not done.
func HasIncompleteSubtasks(ctx context.Context, db *gorm.DB, taskID string) (bool, error) {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.tasks.HasIncompleteSubtasks")
	var n int64
	err := db.WithContext(ctx).Model(&domain.Task{}).
		Where("parent_id = ? AND status <> ?", taskID, domain.StatusDone).
		Count(&n).Error
	if err != nil {
		return false, fmt.Errorf("count subtasks: %w", err)
	}
	return n > 0, nil
}

// TryAutoCompleteParent transitions parent to done when checklist is complete
// and every subtask is done. Returns the parent id when transitioned.
func TryAutoCompleteParent(ctx context.Context, db *gorm.DB, childID string, by domain.Actor) (string, error) {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.tasks.TryAutoCompleteParent")
	child, err := Get(ctx, db, childID)
	if err != nil {
		return "", err
	}
	if child.ParentID == nil || strings.TrimSpace(*child.ParentID) == "" {
		return "", nil
	}
	parentID := strings.TrimSpace(*child.ParentID)
	parent, err := Get(ctx, db, parentID)
	if err != nil {
		return "", err
	}
	if parent.Status == domain.StatusDone {
		return "", nil
	}
	incomplete, err := HasIncompleteSubtasks(ctx, db, parentID)
	if err != nil {
		return "", err
	}
	if incomplete {
		return "", nil
	}
	done := domain.StatusDone
	updated, _, err := Update(ctx, db, parentID, UpdateInput{Status: &done}, by)
	if err != nil {
		return "", err
	}
	if updated != nil && updated.Status == domain.StatusDone {
		return parentID, nil
	}
	return "", nil
}

// BackfillAwaitingSubtasksStatus sets status=awaiting_subtasks for legacy
// parent rows that already passed criteria but still have open subtasks while
// status=ready. Idempotent migration helper; does not append audit events.
func BackfillAwaitingSubtasksStatus(ctx context.Context, db *gorm.DB) error {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.tasks.BackfillAwaitingSubtasksStatus")
	res := db.WithContext(ctx).Exec(`
UPDATE tasks
SET status = ?
WHERE criteria_satisfied_at IS NOT NULL
  AND status = ?
  AND EXISTS (
    SELECT 1 FROM tasks AS child
    WHERE child.parent_id = tasks.id AND child.status <> ?
  )`, domain.StatusAwaitingSubtasks, domain.StatusReady, domain.StatusDone)
	if res.Error != nil {
		return fmt.Errorf("backfill awaiting_subtasks status: %w", res.Error)
	}
	if res.RowsAffected > 0 {
		slog.Info("backfilled awaiting_subtasks status",
			"cmd", logCmd, "operation", "tasks.store.tasks.BackfillAwaitingSubtasksStatus",
			"rows", res.RowsAffected)
	}
	return nil
}
