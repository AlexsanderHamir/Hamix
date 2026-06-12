package store

import (
	"context"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/store/internal/checklist"
	"github.com/AlexsanderHamir/T2A/pkgs/tasks/store/internal/tasks"
	"gorm.io/gorm"
)

// BackfillCriteriaSatisfiedAt sets criteria_satisfied_at for tasks whose
// checklist is already complete. Idempotent migration helper.
func BackfillCriteriaSatisfiedAt(ctx context.Context, db *gorm.DB) error {
	return checklist.BackfillCriteriaSatisfiedAt(ctx, db)
}

// BackfillAwaitingSubtasksStatus repairs legacy parent rows stuck at ready
// after criteria pass while subtasks remain open.
func BackfillAwaitingSubtasksStatus(ctx context.Context, db *gorm.DB) error {
	return tasks.BackfillAwaitingSubtasksStatus(ctx, db)
}
