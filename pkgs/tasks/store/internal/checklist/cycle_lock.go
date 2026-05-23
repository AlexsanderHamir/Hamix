package checklist

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
	"gorm.io/gorm"
)

// IsTaskCycleRunning reports whether taskID or any checklist-inherit
// ancestor has a task_cycles row with status=running.
func IsTaskCycleRunning(ctx context.Context, db *gorm.DB, taskID string) (bool, error) {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.checklist.IsTaskCycleRunning")
	return isTaskCycleRunningInTx(db.WithContext(ctx), taskID)
}

func isTaskCycleRunningInTx(tx *gorm.DB, taskID string) (bool, error) {
	cur := taskID
	seen := make(map[string]bool)
	for {
		if seen[cur] {
			return false, fmt.Errorf("%w: parent cycle", domain.ErrInvalidInput)
		}
		seen[cur] = true
		var n int64
		if err := tx.Model(&domain.TaskCycle{}).
			Where("task_id = ? AND status = ?", cur, domain.CycleStatusRunning).
			Count(&n).Error; err != nil {
			return false, fmt.Errorf("running cycle lookup: %w", err)
		}
		if n > 0 {
			return true, nil
		}
		var t domain.Task
		if err := tx.Where("id = ?", cur).First(&t).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return false, domain.ErrNotFound
			}
			return false, fmt.Errorf("load task: %w", err)
		}
		if !t.ChecklistInherit || t.ParentID == nil || *t.ParentID == "" {
			return false, nil
		}
		cur = *t.ParentID
	}
}
