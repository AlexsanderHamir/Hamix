package store

import (
	"context"
	"log/slog"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
	"github.com/AlexsanderHamir/T2A/pkgs/tasks/store/internal/automations"
)

// CreateAutomationInput is the store input for creating an automation.
type CreateAutomationInput = automations.CreateInput

// UpdateAutomationInput is a partial patch for one automation.
type UpdateAutomationInput = automations.UpdateInput

// ResolvedAutomation is a library row plus task toggle state for harness injection.
type ResolvedAutomation = domain.ResolvedAutomation

// CreateAutomation inserts a new global automation.
func (s *Store) CreateAutomation(ctx context.Context, input CreateAutomationInput) (domain.Automation, error) {
	slog.Debug("trace", "cmd", storeLogCmd, "operation", "tasks.store.CreateAutomation")
	return automations.Create(ctx, s.db, input)
}

// ListAutomations returns library automations ordered by title.
func (s *Store) ListAutomations(ctx context.Context, includeArchived bool, limit int) ([]domain.Automation, error) {
	slog.Debug("trace", "cmd", storeLogCmd, "operation", "tasks.store.ListAutomations")
	return automations.List(ctx, s.db, includeArchived, limit)
}

// GetAutomation returns one automation by id.
func (s *Store) GetAutomation(ctx context.Context, id string) (domain.Automation, error) {
	slog.Debug("trace", "cmd", storeLogCmd, "operation", "tasks.store.GetAutomation")
	return automations.GetByID(ctx, s.db, id)
}

// UpdateAutomation applies a partial patch.
func (s *Store) UpdateAutomation(ctx context.Context, id string, input UpdateAutomationInput) (domain.Automation, error) {
	slog.Debug("trace", "cmd", storeLogCmd, "operation", "tasks.store.UpdateAutomation")
	return automations.Update(ctx, s.db, id, input)
}

// ArchiveAutomation soft-deletes an automation.
func (s *Store) ArchiveAutomation(ctx context.Context, id string) error {
	slog.Debug("trace", "cmd", storeLogCmd, "operation", "tasks.store.ArchiveAutomation")
	return automations.Archive(ctx, s.db, id)
}

// ResolveAutomationsForTask loads library rows for task selections.
func (s *Store) ResolveAutomationsForTask(ctx context.Context, selections []domain.AutomationSelection) ([]ResolvedAutomation, error) {
	slog.Debug("trace", "cmd", storeLogCmd, "operation", "tasks.store.ResolveAutomationsForTask")
	return automations.ResolveForTask(ctx, s.db, selections)
}
