package store

import (
	"context"
	"log/slog"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
	"github.com/AlexsanderHamir/T2A/pkgs/tasks/store/internal/commits"
)

// CycleCommitEntry is the public re-export of a commit upsert payload.
type CycleCommitEntry = commits.Entry

// UpsertCycleCommits persists worker-indexed git commits for one cycle.
func (s *Store) UpsertCycleCommits(ctx context.Context, taskID, cycleID string, entries []CycleCommitEntry) error {
	slog.Debug("trace", "cmd", storeLogCmd, "operation", "tasks.store.UpsertCycleCommits")
	return commits.UpsertCycleCommits(ctx, s.db, taskID, cycleID, entries)
}

// ListCommitsForCycle returns commits for a cycle ordered by ancestry seq.
func (s *Store) ListCommitsForCycle(ctx context.Context, cycleID string) ([]domain.TaskCycleCommit, error) {
	slog.Debug("trace", "cmd", storeLogCmd, "operation", "tasks.store.ListCommitsForCycle")
	return commits.ListCommitsForCycle(ctx, s.db, cycleID)
}

// ListEligibleCommitsForCycle returns eligible commits for verify on one cycle.
func (s *Store) ListEligibleCommitsForCycle(ctx context.Context, cycleID string) ([]domain.TaskCycleCommit, error) {
	slog.Debug("trace", "cmd", storeLogCmd, "operation", "tasks.store.ListEligibleCommitsForCycle")
	return commits.ListEligibleCommitsForCycle(ctx, s.db, cycleID)
}

// MarkCycleCommitsSuperseded marks commits removed from ancestry as superseded.
func (s *Store) MarkCycleCommitsSuperseded(ctx context.Context, cycleID string, keepSHAs map[string]struct{}) error {
	slog.Debug("trace", "cmd", storeLogCmd, "operation", "tasks.store.MarkCycleCommitsSuperseded")
	return commits.MarkCycleCommitsSuperseded(ctx, s.db, cycleID, keepSHAs)
}

// ListCommitsForTask returns distinct commits indexed for a task across all cycles.
func (s *Store) ListCommitsForTask(ctx context.Context, taskID string) ([]domain.TaskCycleCommit, error) {
	slog.Debug("trace", "cmd", storeLogCmd, "operation", "tasks.store.ListCommitsForTask")
	return commits.ListCommitsForTask(ctx, s.db, taskID)
}
