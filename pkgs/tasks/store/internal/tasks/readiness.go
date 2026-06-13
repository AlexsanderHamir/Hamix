package tasks

import (
	"context"
	"log/slog"
	"time"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
	"gorm.io/gorm"
)

// ReadyForAgentPickup applies the same predicates as ListQueueCandidates for one task row.
func ReadyForAgentPickup(ctx context.Context, db *gorm.DB, t *domain.Task, now time.Time) (bool, error) {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.tasks.ReadyForAgentPickup")
	if t == nil || t.Status != domain.StatusReady {
		return false, nil
	}
	if t.PickupNotBefore != nil && t.PickupNotBefore.After(now) {
		return false, nil
	}
	if t.Gate != nil && t.Gate.GateBlocksWorker() {
		return false, nil
	}
	return DependenciesSatisfied(ctx, db, t.ID)
}
