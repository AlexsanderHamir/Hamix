package checklist

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
	"github.com/AlexsanderHamir/T2A/pkgs/tasks/store/internal/kernel"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const maxEvidenceBytes = 16 * 1024
const maxReasoningBytes = 16 * 1024

// SetDoneWithEvidenceInTx records completion with proof metadata inside
// an existing transaction. Only domain.ActorAgent may write.
func SetDoneWithEvidenceInTx(
	tx *gorm.DB,
	subjectTaskID, itemID string,
	evidence string,
	verifier domain.VerifierKind,
	reasoning, cycleID string,
	by domain.Actor,
) error {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.checklist.SetDoneWithEvidenceInTx")
	if err := kernel.ValidateActor(by); err != nil {
		return err
	}
	if by != domain.ActorAgent {
		return fmt.Errorf("%w: only the agent may mark checklist items done or undone", domain.ErrInvalidInput)
	}
	if err := validateEvidencePayload(evidence, verifier, reasoning); err != nil {
		return err
	}
	subjectTaskID = strings.TrimSpace(subjectTaskID)
	itemID = strings.TrimSpace(itemID)
	if subjectTaskID == "" || itemID == "" {
		return fmt.Errorf("%w: id", domain.ErrInvalidInput)
	}
	if _, err := kernel.LoadTask(tx, subjectTaskID); err != nil {
		return err
	}
	defOwner, err := DefinitionSourceTaskIDInTx(tx, subjectTaskID)
	if err != nil {
		return err
	}
	var it domain.TaskChecklistItem
	if err := tx.Where("id = ? AND task_id = ?", itemID, defOwner).First(&it).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return domain.ErrNotFound
		}
		return fmt.Errorf("load checklist item: %w", err)
	}
	row := domain.TaskChecklistCompletion{
		TaskID:            subjectTaskID,
		ItemID:            itemID,
		At:                time.Now().UTC(),
		By:                by,
		Evidence:          evidence,
		VerifiedBy:        verifier,
		VerifierReasoning: reasoning,
		CycleID:           strings.TrimSpace(cycleID),
	}
	if err := tx.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "task_id"}, {Name: "item_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"at", "done_by", "evidence", "verified_by", "verifier_reasoning", "cycle_id",
		}),
	}).Create(&row).Error; err != nil {
		return fmt.Errorf("save completion: %w", err)
	}
	seq, err := kernel.NextEventSeq(tx, subjectTaskID)
	if err != nil {
		return err
	}
	b, _ := json.Marshal(map[string]any{
		"item_id": itemID, "done": true,
		"verified_by": string(verifier), "cycle_id": row.CycleID,
	})
	return kernel.AppendEvent(tx, subjectTaskID, seq, domain.EventChecklistItemToggled, by, b)
}

func validateEvidencePayload(evidence string, verifier domain.VerifierKind, reasoning string) error {
	if !domain.ValidVerifierKind(verifier) {
		return fmt.Errorf("%w: invalid verified_by", domain.ErrInvalidInput)
	}
	if verifier != domain.VerifierLegacy {
		if strings.TrimSpace(evidence) == "" {
			return fmt.Errorf("%w: evidence required", domain.ErrInvalidInput)
		}
	}
	if len(evidence) > maxEvidenceBytes {
		return fmt.Errorf("%w: evidence too long", domain.ErrInvalidInput)
	}
	if len(reasoning) > maxReasoningBytes {
		return fmt.Errorf("%w: verifier_reasoning too long", domain.ErrInvalidInput)
	}
	return nil
}

// SetDoneWithEvidence is the non-transactional wrapper.
func SetDoneWithEvidence(
	ctx context.Context,
	db *gorm.DB,
	subjectTaskID, itemID string,
	evidence string,
	verifier domain.VerifierKind,
	reasoning, cycleID string,
	by domain.Actor,
) error {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.checklist.SetDoneWithEvidence")
	defer kernel.DeferLatency(kernel.OpSetChecklistItemDone)()
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return SetDoneWithEvidenceInTx(tx, subjectTaskID, itemID, evidence, verifier, reasoning, cycleID, by)
	})
}
