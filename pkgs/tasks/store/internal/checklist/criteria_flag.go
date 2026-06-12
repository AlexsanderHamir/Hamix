package checklist

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
	"github.com/AlexsanderHamir/T2A/pkgs/tasks/store/internal/kernel"
	"gorm.io/gorm"
)

// CriteriaFlagChange reports whether criteria_satisfied_at transitioned in a
// checklist completion write.
type CriteriaFlagChange struct {
	BecameComplete   bool
	BecameIncomplete bool
}

// IsChecklistCompleteInTx reports whether every inherited checklist item
// for subjectTaskID has a verified completion row.
func IsChecklistCompleteInTx(tx *gorm.DB, subjectTaskID string) (bool, error) {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.checklist.IsChecklistCompleteInTx")
	err := validateChecklistCompleteInTx(tx, subjectTaskID)
	if err == nil {
		return true, nil
	}
	return false, nil
}

func hasIncompleteSubtasksInTx(tx *gorm.DB, taskID string) (bool, error) {
	var n int64
	err := tx.Model(&domain.Task{}).
		Where("parent_id = ? AND status <> ?", taskID, domain.StatusDone).
		Count(&n).Error
	if err != nil {
		return false, fmt.Errorf("count open subtasks: %w", err)
	}
	return n > 0, nil
}

func transitionStatusInTx(tx *gorm.DB, taskID string, from, to domain.Status, by domain.Actor) error {
	b, err := kernel.EventPairJSON(string(from), string(to))
	if err != nil {
		return err
	}
	seq, err := kernel.NextEventSeq(tx, taskID)
	if err != nil {
		return err
	}
	if err := kernel.AppendEvent(tx, taskID, seq, domain.EventStatusChanged, by, b); err != nil {
		return err
	}
	res := tx.Model(&domain.Task{}).Where("id = ? AND status = ?", taskID, from).Update("status", to)
	if res.Error != nil {
		return fmt.Errorf("update status: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return fmt.Errorf("status transition %s -> %s did not apply", from, to)
	}
	return nil
}

func maybeTransitionAwaitingSubtasksInTx(tx *gorm.DB, taskID string, by domain.Actor) error {
	var t domain.Task
	if err := tx.Where("id = ?", taskID).First(&t).Error; err != nil {
		return fmt.Errorf("load task for awaiting_subtasks transition: %w", err)
	}
	if t.Status != domain.StatusReady || t.CriteriaSatisfiedAt == nil {
		return nil
	}
	incomplete, err := hasIncompleteSubtasksInTx(tx, taskID)
	if err != nil {
		return err
	}
	if !incomplete {
		return nil
	}
	return transitionStatusInTx(tx, taskID, domain.StatusReady, domain.StatusAwaitingSubtasks, by)
}

func maybeRevertAwaitingSubtasksInTx(tx *gorm.DB, taskID string, by domain.Actor) error {
	var t domain.Task
	if err := tx.Where("id = ?", taskID).First(&t).Error; err != nil {
		return fmt.Errorf("load task for awaiting_subtasks revert: %w", err)
	}
	if t.Status != domain.StatusAwaitingSubtasks {
		return nil
	}
	return transitionStatusInTx(tx, taskID, domain.StatusAwaitingSubtasks, domain.StatusReady, by)
}

// syncCriteriaSatisfiedAtInTx updates tasks.criteria_satisfied_at when
// checklist completeness transitions. Called inside checklist completion TX.
func syncCriteriaSatisfiedAtInTx(tx *gorm.DB, subjectTaskID string, by domain.Actor) (CriteriaFlagChange, error) {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.checklist.syncCriteriaSatisfiedAtInTx")
	var change CriteriaFlagChange
	var t domain.Task
	if err := tx.Where("id = ?", subjectTaskID).First(&t).Error; err != nil {
		return change, fmt.Errorf("load task for criteria flag: %w", err)
	}
	wasComplete := t.CriteriaSatisfiedAt != nil
	nowComplete, err := IsChecklistCompleteInTx(tx, subjectTaskID)
	if err != nil {
		return change, err
	}
	switch {
	case nowComplete && !wasComplete:
		now := time.Now().UTC()
		if err := tx.Model(&domain.Task{}).Where("id = ?", subjectTaskID).
			Update("criteria_satisfied_at", now).Error; err != nil {
			return change, fmt.Errorf("set criteria_satisfied_at: %w", err)
		}
		change.BecameComplete = true
	case !nowComplete && wasComplete:
		if err := tx.Model(&domain.Task{}).Where("id = ?", subjectTaskID).
			Update("criteria_satisfied_at", nil).Error; err != nil {
			return change, fmt.Errorf("clear criteria_satisfied_at: %w", err)
		}
		change.BecameIncomplete = true
	}
	if change.BecameComplete {
		if err := maybeTransitionAwaitingSubtasksInTx(tx, subjectTaskID, by); err != nil {
			return change, err
		}
	}
	if change.BecameIncomplete {
		if err := maybeRevertAwaitingSubtasksInTx(tx, subjectTaskID, by); err != nil {
			return change, err
		}
	}
	return change, nil
}

// validateDescendantsDoneInTx requires every direct child subtask to be done
// before a parent may reach status=done.
func validateDescendantsDoneInTx(tx *gorm.DB, taskID string) error {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.checklist.validateDescendantsDoneInTx")
	var children []domain.Task
	if err := tx.Where("parent_id = ?", taskID).Find(&children).Error; err != nil {
		return fmt.Errorf("list subtasks: %w", err)
	}
	for _, ch := range children {
		if ch.Status != domain.StatusDone {
			return fmt.Errorf("%w: all subtasks must be done before marking this task done", domain.ErrInvalidInput)
		}
	}
	return nil
}

// BackfillCriteriaSatisfiedAt sets criteria_satisfied_at for tasks whose
// checklist is already complete. Idempotent migration helper.
func BackfillCriteriaSatisfiedAt(ctx context.Context, db *gorm.DB) error {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.checklist.BackfillCriteriaSatisfiedAt")
	var ids []string
	if err := db.WithContext(ctx).Model(&domain.Task{}).Where("criteria_satisfied_at IS NULL").Pluck("id", &ids).Error; err != nil {
		return fmt.Errorf("list tasks for criteria backfill: %w", err)
	}
	for _, id := range ids {
		if err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			_, err := syncCriteriaSatisfiedAtInTx(tx, id, domain.ActorAgent)
			return err
		}); err != nil {
			return fmt.Errorf("backfill criteria_satisfied_at for %s: %w", id, err)
		}
	}
	return nil
}
