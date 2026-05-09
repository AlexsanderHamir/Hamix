package projects

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
	"github.com/AlexsanderHamir/T2A/pkgs/tasks/store/internal/kernel"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	gateActionRelease   = "release"
	gateActionHold      = "hold"
	gateActionClearHold = "clear_hold"
)

const (
	maxProjectStepCriteria       = 40
	maxProjectStepCriterionChars = 500
)

// CreateProjectStepInput is the store input for creating a project step.
type CreateProjectStepInput struct {
	ID          string
	GoalID      *string
	Title       string
	Description string
	SortOrder   *int
	Criteria    []domain.ProjectStepCriterion
}

// UpdateProjectStepInput is a partial update for one step row plus gate actions.
type UpdateProjectStepInput struct {
	Title       *string
	Description *string
	SortOrder   *int
	GateAction  *string
	Criteria    *[]domain.ProjectStepCriterion
}

// ListProjectSteps returns steps for a project. When goalID is non-empty, only
// steps in that goal bucket are returned; otherwise every step is included, ordered
// by goal bucket then sort_order.
func ListProjectSteps(ctx context.Context, db *gorm.DB, projectID, goalID string) ([]domain.ProjectStep, error) {
	defer kernel.DeferLatency(kernel.OpListProjectSteps)()
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.projects.ListProjectSteps")
	projectID = strings.TrimSpace(projectID)
	if projectID == "" {
		return nil, fmt.Errorf("%w: project id required", domain.ErrInvalidInput)
	}
	q := db.WithContext(ctx).Where("project_id = ?", projectID)
	goalID = strings.TrimSpace(goalID)
	if goalID != "" {
		q = q.Where("goal_id = ?", goalID)
	}
	var rows []domain.ProjectStep
	if err := q.Order("(CASE WHEN goal_id IS NULL OR goal_id = '' THEN 0 ELSE 1 END) ASC").Order("goal_id ASC").Order("sort_order ASC").Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("list project steps: %w", err)
	}
	return rows, nil
}

func normalizeProjectStepCriteria(raw []domain.ProjectStepCriterion) ([]domain.ProjectStepCriterion, error) {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.projects.normalizeProjectStepCriteria")
	if len(raw) == 0 {
		return []domain.ProjectStepCriterion{}, nil
	}
	if len(raw) > maxProjectStepCriteria {
		return nil, fmt.Errorf("%w: at most %d criteria per step", domain.ErrInvalidInput, maxProjectStepCriteria)
	}
	out := make([]domain.ProjectStepCriterion, 0, len(raw))
	for i, c := range raw {
		text := strings.TrimSpace(c.Text)
		if text == "" {
			return nil, fmt.Errorf("%w: criterion text required", domain.ErrInvalidInput)
		}
		if len(text) > maxProjectStepCriterionChars {
			return nil, fmt.Errorf("%w: criterion text too long", domain.ErrInvalidInput)
		}
		id := strings.TrimSpace(c.ID)
		if id == "" {
			id = uuid.NewString()
		}
		sortOrder := c.SortOrder
		if sortOrder <= 0 {
			sortOrder = i + 1
		}
		out = append(out, domain.ProjectStepCriterion{
			ID:        id,
			Text:      text,
			Done:      c.Done,
			SortOrder: sortOrder,
		})
	}
	return out, nil
}

func loadProjectStepGateGraceSeconds(db *gorm.DB) int {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.projects.loadProjectStepGateGraceSeconds")
	var row domain.AppSettings
	if err := db.First(&row, "id = ?", domain.AppSettingsRowID).Error; err != nil {
		return domain.DefaultProjectStepGateGraceSeconds
	}
	return row.ProjectStepGateGraceSeconds
}

func advanceProjectStepGateIfReady(tx *gorm.DB, step *domain.ProjectStep, graceSeconds int, now time.Time) error {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.projects.advanceProjectStepGateIfReady")
	switch step.GateStatus {
	case domain.ProjectStepGateActive:
		if graceSeconds <= 0 {
			return releaseStepAndUnlockNext(tx, step, now)
		}
		deadline := now.Add(time.Duration(graceSeconds) * time.Second)
		step.GateStatus = domain.ProjectStepGatePendingRelease
		step.PendingReleaseDeadlineUTC = &deadline
		step.UpdatedAt = now
		if err := tx.Save(step).Error; err != nil {
			return mapWriteError(err)
		}
		gs := loadGateSettings(tx)
		if GateGraceNotify != nil {
			GateGraceNotify.NotifyStepPendingRelease(context.Background(), step.ProjectID, step.ID, deadline.UnixMilli(), gs.stepEmail, gs.stepSMS)
		}
		return nil
	case domain.ProjectStepGatePendingRelease:
		return nil
	default:
		return nil
	}
}

func tryAdvanceStepGateIfTasksAndCriteriaComplete(tx *gorm.DB, stepID string, now time.Time) error {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.projects.tryAdvanceStepGateIfTasksAndCriteriaComplete")
	var step domain.ProjectStep
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&step, "id = ?", stepID).Error; err != nil {
		return mapNotFound(err)
	}
	var pending int64
	if err := tx.Model(&domain.Task{}).Where("project_step_id = ? AND status <> ?", stepID, domain.StatusDone).Count(&pending).Error; err != nil {
		return fmt.Errorf("count open tasks for step: %w", err)
	}
	if pending > 0 {
		return nil
	}
	if !domain.StepCriteriaAllDone(step.Criteria) {
		return nil
	}
	grace := loadProjectStepGateGraceSeconds(tx)
	return advanceProjectStepGateIfReady(tx, &step, grace, now)
}

// CreateProjectStep inserts one step with gate status derived from existing steps.
func CreateProjectStep(ctx context.Context, db *gorm.DB, projectID string, input CreateProjectStepInput) (domain.ProjectStep, error) {
	defer kernel.DeferLatency(kernel.OpCreateProjectStep)()
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.projects.CreateProjectStep")
	projectID = strings.TrimSpace(projectID)
	if projectID == "" {
		return domain.ProjectStep{}, fmt.Errorf("%w: project id required", domain.ErrInvalidInput)
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return domain.ProjectStep{}, fmt.Errorf("%w: step title required", domain.ErrInvalidInput)
	}
	var n int64
	if err := db.WithContext(ctx).Model(&domain.Project{}).Where("id = ? AND status = ?", projectID, domain.ProjectStatusActive).Count(&n).Error; err != nil {
		return domain.ProjectStep{}, fmt.Errorf("project lookup: %w", err)
	}
	if n == 0 {
		return domain.ProjectStep{}, fmt.Errorf("%w: project not found", domain.ErrInvalidInput)
	}
	if input.GoalID == nil || strings.TrimSpace(*input.GoalID) == "" {
		return domain.ProjectStep{}, fmt.Errorf("%w: goal_id required", domain.ErrInvalidInput)
	}
	gid := strings.TrimSpace(*input.GoalID)
	var goalCount int64
	if err := db.WithContext(ctx).Model(&domain.ProjectGoal{}).Where("id = ? AND project_id = ?", gid, projectID).Count(&goalCount).Error; err != nil {
		return domain.ProjectStep{}, fmt.Errorf("goal lookup: %w", err)
	}
	if goalCount == 0 {
		return domain.ProjectStep{}, fmt.Errorf("%w: goal not in project", domain.ErrInvalidInput)
	}
	id := strings.TrimSpace(input.ID)
	if id == "" {
		id = uuid.NewString()
	}
	qMax := db.WithContext(ctx).Model(&domain.ProjectStep{}).Where("project_id = ? AND goal_id = ?", projectID, gid)
	var maxOrder int
	if err := qMax.Select("COALESCE(MAX(sort_order),0)").Scan(&maxOrder).Error; err != nil {
		return domain.ProjectStep{}, fmt.Errorf("step sort scan: %w", err)
	}
	sortOrder := maxOrder + 1
	if input.SortOrder != nil && *input.SortOrder > 0 {
		sortOrder = *input.SortOrder
	}
	criteria, err := normalizeProjectStepCriteria(input.Criteria)
	if err != nil {
		return domain.ProjectStep{}, err
	}
	now := time.Now().UTC()
	gidPtr := gid
	gate := initialGateStatusForNewStep(db.WithContext(ctx), projectID, &gidPtr, sortOrder, now)
	row := domain.ProjectStep{
		ID:          id,
		ProjectID:   projectID,
		GoalID:      &gidPtr,
		Title:       title,
		Description: strings.TrimSpace(input.Description),
		SortOrder:   sortOrder,
		GateStatus:  gate,
		GateHold:    false,
		Criteria:    criteria,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := db.WithContext(ctx).Create(&row).Error; err != nil {
		return domain.ProjectStep{}, mapWriteError(err)
	}
	if err := recalcLockedSteps(db.WithContext(ctx), projectID, now); err != nil {
		return domain.ProjectStep{}, err
	}
	var out domain.ProjectStep
	if err := db.WithContext(ctx).First(&out, "id = ?", id).Error; err != nil {
		return domain.ProjectStep{}, mapNotFound(err)
	}
	return out, nil
}

func initialGateStatusForNewStep(db *gorm.DB, projectID string, goalID *string, sortOrder int, now time.Time) domain.ProjectStepGateStatus {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.projects.initialGateStatusForNewStep")
	q := db.Where("project_id = ? AND sort_order < ?", projectID, sortOrder)
	if goalID == nil || strings.TrimSpace(*goalID) == "" {
		q = q.Where("(goal_id IS NULL OR goal_id = '')")
	} else {
		g := strings.TrimSpace(*goalID)
		q = q.Where("goal_id = ?", g)
	}
	var prior []domain.ProjectStep
	if err := q.Order("sort_order ASC").Find(&prior).Error; err != nil || len(prior) == 0 {
		return domain.ProjectStepGateActive
	}
	for _, p := range prior {
		if p.GateStatus != domain.ProjectStepGateReleased {
			return domain.ProjectStepGateLocked
		}
	}
	return domain.ProjectStepGateActive
}

// recalcLockedSteps promotes locked steps within each (project, goal) bucket when
// every lower sort_order step in that bucket is released. Steps whose goal is
// still locked are forced to locked unless already released.
func recalcLockedSteps(db *gorm.DB, projectID string, now time.Time) error {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.projects.recalcLockedSteps")
	var goals []domain.ProjectGoal
	if err := db.Where("project_id = ?", projectID).Find(&goals).Error; err != nil {
		return err
	}
	goalStatus := make(map[string]domain.ProjectStepGateStatus, len(goals))
	for _, g := range goals {
		goalStatus[g.ID] = g.GateStatus
	}

	var rows []domain.ProjectStep
	if err := db.Where("project_id = ?", projectID).
		Order("(CASE WHEN goal_id IS NULL OR goal_id = '' THEN 0 ELSE 1 END) ASC").
		Order("goal_id ASC").
		Order("sort_order ASC").
		Find(&rows).Error; err != nil {
		return err
	}

	stepBucketKey := func(st *domain.ProjectStep) string {
		if st.GoalID == nil || strings.TrimSpace(*st.GoalID) == "" {
			return ""
		}
		return strings.TrimSpace(*st.GoalID)
	}

	prevBucket := "__init__"
	priorReleasedInBucket := true
	for i := range rows {
		st := &rows[i]
		bucket := stepBucketKey(st)
		if bucket != prevBucket {
			priorReleasedInBucket = true
			prevBucket = bucket
		}

		goalLocked := bucket != "" && goalStatus[bucket] == domain.ProjectStepGateLocked
		if goalLocked {
			if st.GateStatus == domain.ProjectStepGateReleased {
				priorReleasedInBucket = true
				continue
			}
			if st.GateStatus != domain.ProjectStepGateLocked {
				if err := db.Model(&domain.ProjectStep{}).Where("id = ?", st.ID).Updates(map[string]any{
					"gate_status": string(domain.ProjectStepGateLocked),
					"updated_at":  now,
				}).Error; err != nil {
					return err
				}
				st.GateStatus = domain.ProjectStepGateLocked
			}
			priorReleasedInBucket = false
			continue
		}

		switch st.GateStatus {
		case domain.ProjectStepGateReleased:
			priorReleasedInBucket = true
		case domain.ProjectStepGateActive, domain.ProjectStepGatePendingRelease:
			priorReleasedInBucket = false
		case domain.ProjectStepGateLocked:
			if priorReleasedInBucket {
				if err := db.Model(&domain.ProjectStep{}).Where("id = ?", st.ID).Updates(map[string]any{
					"gate_status": string(domain.ProjectStepGateActive),
					"updated_at":  now,
				}).Error; err != nil {
					return err
				}
				st.GateStatus = domain.ProjectStepGateActive
			}
			priorReleasedInBucket = false
		}
	}
	return nil
}

// GetProjectStep loads one step scoped to projectID.
func GetProjectStep(ctx context.Context, db *gorm.DB, projectID, stepID string) (domain.ProjectStep, error) {
	defer kernel.DeferLatency(kernel.OpGetProjectStep)()
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.projects.GetProjectStep")
	projectID = strings.TrimSpace(projectID)
	stepID = strings.TrimSpace(stepID)
	if projectID == "" || stepID == "" {
		return domain.ProjectStep{}, fmt.Errorf("%w: project id and step id required", domain.ErrInvalidInput)
	}
	var row domain.ProjectStep
	if err := db.WithContext(ctx).First(&row, "id = ? AND project_id = ?", stepID, projectID).Error; err != nil {
		return domain.ProjectStep{}, mapNotFound(err)
	}
	return row, nil
}

// UpdateProjectStep applies metadata and gate_action to one step.
func UpdateProjectStep(ctx context.Context, db *gorm.DB, projectID, stepID string, input UpdateProjectStepInput) (domain.ProjectStep, error) {
	defer kernel.DeferLatency(kernel.OpUpdateProjectStep)()
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.projects.UpdateProjectStep")
	projectID = strings.TrimSpace(projectID)
	stepID = strings.TrimSpace(stepID)
	if projectID == "" || stepID == "" {
		return domain.ProjectStep{}, fmt.Errorf("%w: project id and step id required", domain.ErrInvalidInput)
	}
	if input.Title == nil && input.Description == nil && input.SortOrder == nil && input.GateAction == nil && input.Criteria == nil {
		return domain.ProjectStep{}, fmt.Errorf("%w: no fields to update", domain.ErrInvalidInput)
	}
	var out domain.ProjectStep
	now := time.Now().UTC()
	err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var row domain.ProjectStep
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&row, "id = ? AND project_id = ?", stepID, projectID).Error; err != nil {
			return mapNotFound(err)
		}
		if input.Title != nil {
			t := strings.TrimSpace(*input.Title)
			if t == "" {
				return fmt.Errorf("%w: step title required", domain.ErrInvalidInput)
			}
			row.Title = t
		}
		if input.Description != nil {
			row.Description = strings.TrimSpace(*input.Description)
		}
		if input.SortOrder != nil {
			if *input.SortOrder <= 0 {
				return fmt.Errorf("%w: sort_order must be positive", domain.ErrInvalidInput)
			}
			row.SortOrder = *input.SortOrder
		}
		if input.Criteria != nil {
			criteria, err := normalizeProjectStepCriteria(*input.Criteria)
			if err != nil {
				return err
			}
			row.Criteria = criteria
		}
		row.UpdatedAt = now
		saved := false
		if input.GateAction != nil {
			act := strings.TrimSpace(strings.ToLower(*input.GateAction))
			switch act {
			case gateActionRelease:
				if err := releaseStepAndUnlockNext(tx, &row, now); err != nil {
					return err
				}
				saved = true
			case gateActionHold:
				if row.GateStatus != domain.ProjectStepGatePendingRelease {
					return fmt.Errorf("%w: hold only applies while gate is pending_release", domain.ErrInvalidInput)
				}
				row.GateHold = true
				row.UpdatedAt = now
				if err := tx.Save(&row).Error; err != nil {
					return mapWriteError(err)
				}
				saved = true
			case gateActionClearHold:
				row.GateHold = false
				row.UpdatedAt = now
				deadlinePassed := row.GateStatus == domain.ProjectStepGatePendingRelease &&
					row.PendingReleaseDeadlineUTC != nil && !now.Before(*row.PendingReleaseDeadlineUTC)
				if deadlinePassed {
					if err := releaseStepAndUnlockNext(tx, &row, now); err != nil {
						return err
					}
					saved = true
				} else {
					if err := tx.Save(&row).Error; err != nil {
						return mapWriteError(err)
					}
					saved = true
				}
			default:
				return fmt.Errorf("%w: invalid gate_action", domain.ErrInvalidInput)
			}
		}
		if !saved {
			if err := tx.Save(&row).Error; err != nil {
				return mapWriteError(err)
			}
		}
		if err := recalcLockedSteps(tx, projectID, now); err != nil {
			return err
		}
		if input.Criteria != nil {
			if err := tryAdvanceStepGateIfTasksAndCriteriaComplete(tx, stepID, now); err != nil {
				return err
			}
		}
		if err := tx.First(&out, "id = ?", stepID).Error; err != nil {
			return mapNotFound(err)
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return domain.ProjectStep{}, domain.ErrNotFound
		}
		return domain.ProjectStep{}, err
	}
	return out, nil
}

// DeleteProjectStep removes a step when no tasks reference it.
func DeleteProjectStep(ctx context.Context, db *gorm.DB, projectID, stepID string) error {
	defer kernel.DeferLatency(kernel.OpDeleteProjectStep)()
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.projects.DeleteProjectStep")
	projectID = strings.TrimSpace(projectID)
	stepID = strings.TrimSpace(stepID)
	if projectID == "" || stepID == "" {
		return fmt.Errorf("%w: project id and step id required", domain.ErrInvalidInput)
	}
	var taskCount int64
	if err := db.WithContext(ctx).Model(&domain.Task{}).Where("project_step_id = ?", stepID).Count(&taskCount).Error; err != nil {
		return fmt.Errorf("count tasks for step: %w", err)
	}
	if taskCount > 0 {
		return domain.ErrProjectStepHasTasks
	}
	res := db.WithContext(ctx).Where("id = ? AND project_id = ?", stepID, projectID).Delete(&domain.ProjectStep{})
	if res.Error != nil {
		return fmt.Errorf("delete project step: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// MaybeAdvanceStepGateAfterTaskDone runs when a task transitions to done. All tasks
// for the step must be done before the gate moves to pending_release or releases immediately.
func MaybeAdvanceStepGateAfterTaskDone(tx *gorm.DB, task *domain.Task, graceSeconds int, now time.Time) error {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.projects.MaybeAdvanceStepGateAfterTaskDone")
	if task == nil || task.ProjectStepID == nil || strings.TrimSpace(*task.ProjectStepID) == "" {
		return nil
	}
	stepID := strings.TrimSpace(*task.ProjectStepID)
	var step domain.ProjectStep
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&step, "id = ?", stepID).Error; err != nil {
		return mapNotFound(err)
	}
	if task.ProjectID == nil || strings.TrimSpace(*task.ProjectID) != step.ProjectID {
		return fmt.Errorf("%w: task project_id does not match step project", domain.ErrInvalidInput)
	}
	var pending int64
	if err := tx.Model(&domain.Task{}).Where("project_step_id = ? AND status <> ?", stepID, domain.StatusDone).Count(&pending).Error; err != nil {
		return fmt.Errorf("count open tasks for step: %w", err)
	}
	if pending > 0 {
		return nil
	}
	if !domain.StepCriteriaAllDone(step.Criteria) {
		return nil
	}
	return advanceProjectStepGateIfReady(tx, &step, graceSeconds, now)
}

func releaseStepAndUnlockNext(tx *gorm.DB, step *domain.ProjectStep, now time.Time) error {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.projects.releaseStepAndUnlockNext")
	step.GateStatus = domain.ProjectStepGateReleased
	step.GateHold = false
	step.PendingReleaseDeadlineUTC = nil
	step.UpdatedAt = now
	if err := tx.Save(step).Error; err != nil {
		return mapWriteError(err)
	}
	return recalcLockedSteps(tx, step.ProjectID, now)
}

// SweepProjectStepGates auto-releases pending steps past deadline. Returns distinct
// project IDs that had at least one step updated (for SSE fan-out).
func SweepProjectStepGates(ctx context.Context, db *gorm.DB, now time.Time) ([]string, error) {
	defer kernel.DeferLatency(kernel.OpSweepProjectStepGates)()
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.projects.SweepProjectStepGates")
	if db == nil {
		return nil, errors.New("tasks store: nil database")
	}
	var due []domain.ProjectStep
	if err := db.WithContext(ctx).Where("gate_status = ? AND gate_hold = ? AND pending_release_deadline_utc IS NOT NULL AND pending_release_deadline_utc <= ?",
		domain.ProjectStepGatePendingRelease, false, now).Find(&due).Error; err != nil {
		return nil, fmt.Errorf("list pending project steps: %w", err)
	}
	seen := make(map[string]struct{})
	for _, s := range due {
		released := false
		if err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			var row domain.ProjectStep
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&row, "id = ?", s.ID).Error; err != nil {
				return mapNotFound(err)
			}
			if row.GateStatus != domain.ProjectStepGatePendingRelease || row.GateHold {
				return nil
			}
			if row.PendingReleaseDeadlineUTC == nil || now.Before(*row.PendingReleaseDeadlineUTC) {
				return nil
			}
			if err := releaseStepAndUnlockNext(tx, &row, now); err != nil {
				return err
			}
			released = true
			return nil
		}); err != nil {
			return nil, err
		}
		if released {
			seen[s.ProjectID] = struct{}{}
		}
	}
	out := make([]string, 0, len(seen))
	for id := range seen {
		out = append(out, id)
	}
	return out, nil
}
