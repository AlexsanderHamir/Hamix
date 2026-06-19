package harness

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
	"github.com/AlexsanderHamir/T2A/pkgs/tasks/store"
)

type startCycleOpts struct {
	parentCycleID *string
	retryMode     domain.RetryMode
}

// RunWithRetry starts a new cycle. intent==nil is the existing first-run path.
func (h *Harness) RunWithRetry(parentCtx context.Context, task *domain.Task, intent *domain.PendingRetry) {
	if intent == nil {
		h.runFreshCycle(parentCtx, task, startCycleOpts{})
		return
	}
	if err := intent.Validate(); err != nil {
		slog.Warn("agent harness retry intent invalid", "cmd", harnessLogCmd,
			"operation", "agent.harness.Harness.RunWithRetry.invalid_intent",
			"task_id", task.ID, "err", err)
		h.failTaskAfterRetryPrep(parentCtx, task.ID, "retry_invalid_intent")
		return
	}
	switch intent.Mode {
	case domain.RetryFresh:
		h.runFreshRetry(parentCtx, task, intent)
	case domain.RetryResume:
		h.runResumeRetry(parentCtx, task, intent)
	default:
		h.failTaskAfterRetryPrep(parentCtx, task.ID, "retry_invalid_intent")
	}
}

func (h *Harness) runFreshRetry(parentCtx context.Context, task *domain.Task, intent *domain.PendingRetry) {
	if _, err := h.gitResetForFreshRetry(parentCtx, intent.ParentCycleID); err != nil {
		reason := retryGitResetFailed
		if strings.Contains(err.Error(), retryResetAnchorMissing) {
			reason = retryResetAnchorMissing
		}
		slog.Warn("agent harness fresh retry git reset failed", "cmd", harnessLogCmd,
			"operation", "agent.harness.Harness.runFreshRetry.reset_err",
			"task_id", task.ID, "parent_cycle_id", intent.ParentCycleID, "err", err)
		h.failTaskAfterRetryPrep(parentCtx, task.ID, reason)
		return
	}
	parentID := intent.ParentCycleID
	h.runFreshCycle(parentCtx, task, startCycleOpts{
		parentCycleID: &parentID,
		retryMode:     domain.RetryFresh,
	})
}

const crossCycleExecuteCarriedForward = "cross_cycle_execute_carried_forward"

func (h *Harness) runResumeRetry(parentCtx context.Context, task *domain.Task, intent *domain.PendingRetry) {
	cp, err := h.loadCheckpointFromParent(parentCtx, intent.ParentCycleID)
	if err != nil {
		slog.Warn("agent harness resume retry checkpoint failed", "cmd", harnessLogCmd,
			"operation", "agent.harness.Harness.runResumeRetry.checkpoint_err",
			"task_id", task.ID, "parent_cycle_id", intent.ParentCycleID, "err", err)
		h.failTaskAfterRetryPrep(parentCtx, task.ID, "retry_checkpoint_failed")
		return
	}
	startedAt := h.opts.Clock()
	state := processState{
		startedAt:        startedAt,
		previouslyPassed: cp.previouslyPassed,
		verifyAttempt:    0,
		verifyFeedback:   cp.verifyFeedback,
	}
	defer h.recoverFromPanic(&state, *task)

	parentID := intent.ParentCycleID
	cycle, ok := h.startCycle(parentCtx, task, &state, startCycleOpts{
		parentCycleID: &parentID,
		retryMode:     domain.RetryResume,
	})
	if !ok {
		h.bestEffortFailTask(parentCtx, task.ID)
		return
	}
	if cp.entry == resumeEntryVerifyOnly {
		if err := h.seedCrossCycleExecuteFromParent(parentCtx, cycle, intent.ParentCycleID); err != nil {
			slog.Warn("agent harness verify-only resume seed execute failed", "cmd", harnessLogCmd,
				"operation", "agent.harness.Harness.runResumeRetry.seed_execute_err",
				"task_id", task.ID, "parent_cycle_id", intent.ParentCycleID, "err", err)
			h.failTaskAfterRetryPrep(parentCtx, task.ID, "retry_verify_only_seed_failed")
			return
		}
		if err := h.mirrorParentCriteriaForVerifyOnly(parentCtx, cycle.ID, intent.ParentCycleID); err != nil {
			slog.Warn("agent harness verify-only resume mirror criteria failed", "cmd", harnessLogCmd,
				"operation", "agent.harness.Harness.runResumeRetry.mirror_criteria_err",
				"task_id", task.ID, "parent_cycle_id", intent.ParentCycleID, "err", err)
			h.failTaskAfterRetryPrep(parentCtx, task.ID, "retry_verify_only_mirror_failed")
			return
		}
	}
	state.verifySnap, _ = h.loadVerificationSnapshot(parentCtx, task.ID)
	h.runCycleLoop(parentCtx, task, cycle, &state, cycleLoopOpts{
		resumeNotice:     true,
		interruptedPhase: domain.PhaseExecute,
		skipFirstExecute: cp.entry == resumeEntryVerifyOnly,
		knownCommits:     cp.knownCommits,
		continuation:     cp.continuation,
	})
}

// seedCrossCycleExecuteFromParent records a succeeded execute phase on a new
// retry cycle so verify can start when the parent attempt already passed execute.
func (h *Harness) seedCrossCycleExecuteFromParent(ctx context.Context, cycle *domain.TaskCycle, parentCycleID string) error {
	slog.Debug("trace", "cmd", harnessLogCmd, "operation", "agent.harness.seedCrossCycleExecuteFromParent",
		"cycle_id", cycle.ID, "parent_cycle_id", parentCycleID)
	phases, err := h.store.ListPhasesForCycle(ctx, parentCycleID)
	if err != nil {
		return err
	}
	var parentExec *domain.TaskCyclePhase
	for i := range phases {
		p := &phases[i]
		if p.Phase != domain.PhaseExecute {
			continue
		}
		if parentExec == nil || p.PhaseSeq > parentExec.PhaseSeq {
			parentExec = p
		}
	}
	if parentExec == nil || parentExec.Status != domain.PhaseStatusSucceeded {
		return fmt.Errorf("parent %q has no succeeded execute phase", parentCycleID)
	}
	exec, err := h.store.StartPhase(ctx, cycle.ID, domain.PhaseExecute, domain.ActorAgent)
	if err != nil {
		return err
	}
	summary := crossCycleExecuteCarriedForward
	details := []byte(parentExec.DetailsJSON)
	if len(details) == 0 {
		details = nil
	}
	_, err = h.store.CompletePhase(ctx, store.CompletePhaseInput{
		CycleID: cycle.ID, PhaseSeq: exec.PhaseSeq,
		Status: domain.PhaseStatusSucceeded, Summary: &summary,
		Details: details, By: domain.ActorAgent,
	})
	return err
}

func (h *Harness) mirrorParentCriteriaForVerifyOnly(ctx context.Context, childCycleID, parentCycleID string) error {
	slog.Debug("trace", "cmd", harnessLogCmd, "operation", "agent.harness.mirrorParentCriteriaForVerifyOnly",
		"child_cycle_id", childCycleID, "parent_cycle_id", parentCycleID)
	rows, err := h.store.ListCriteriaReportsForCycle(ctx, parentCycleID)
	if err != nil {
		return err
	}
	byAttempt := map[int64][]store.CriteriaReportEntry{}
	for _, row := range rows {
		byAttempt[row.AttemptSeq] = append(byAttempt[row.AttemptSeq], store.CriteriaReportEntry{
			CriterionID: row.CriterionID, ClaimedDone: row.ClaimedDone, Evidence: row.Evidence,
		})
	}
	for attempt, entries := range byAttempt {
		if len(entries) == 0 {
			continue
		}
		if err := h.store.UpsertCriteriaReports(ctx, childCycleID, attempt, entries); err != nil {
			return err
		}
	}
	return nil
}

func (h *Harness) runFreshCycle(parentCtx context.Context, task *domain.Task, opts startCycleOpts) {
	startedAt := h.opts.Clock()
	state := processState{startedAt: startedAt, previouslyPassed: map[string]criterionVerdict{}}
	defer h.recoverFromPanic(&state, *task)

	cycle, ok := h.startCycle(parentCtx, task, &state, opts)
	if !ok {
		h.bestEffortFailTask(parentCtx, task.ID)
		return
	}
	state.verifySnap, _ = h.loadVerificationSnapshot(parentCtx, task.ID)
	h.runCycleLoop(parentCtx, task, cycle, &state, cycleLoopOpts{})
}

func (h *Harness) failTaskAfterRetryPrep(ctx context.Context, taskID, reason string) {
	slog.Debug("trace", "cmd", harnessLogCmd, "operation", "agent.harness.failTaskAfterRetryPrep",
		"task_id", taskID, "reason", reason)
	failed := domain.StatusFailed
	if _, err := h.store.Update(ctx, taskID, store.UpdateTaskInput{Status: &failed}, domain.ActorAgent); err != nil {
		level := slog.LevelWarn
		if errors.Is(err, domain.ErrNotFound) {
			level = slog.LevelInfo
		}
		slog.Log(ctx, level, "agent harness retry prep task transition failed",
			"cmd", harnessLogCmd, "operation", "agent.harness.failTaskAfterRetryPrep.err",
			"task_id", taskID, "reason", reason, "err", err)
	}
}
