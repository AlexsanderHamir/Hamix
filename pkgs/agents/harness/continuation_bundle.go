package harness

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
)

type failureClass string

const (
	failureClassRunner         failureClass = "runner"
	failureClassExecuteGate    failureClass = "executeGate"
	failureClassVerify         failureClass = "verify"
	failureClassInfrastructure failureClass = "infrastructure"
	failureClassOperator       failureClass = "operator"
)

// ContinuationBundle rehydrates cross-cycle resume context from a parent attempt.
type ContinuationBundle struct {
	Entry            resumeEntry
	LineageAttempt   int64
	ParentCycleID    string
	FailureClass     failureClass
	FailureReason    string
	FailurePhase     domain.Phase
	ScopeFiles       []string
	Commits          []domain.TaskCycleCommit
	CriteriaEvidence []domain.TaskCycleCriteriaReport
	PreviouslyPassed map[string]criterionVerdict
	VerifyFeedback   string
	ExecuteFeedback  string
	RunnerFeedback   string
	GitDiagnostics   string
	Warnings         []string
	Sufficient       bool
}

func (h *Harness) loadContinuationBundle(ctx context.Context, parentCycleID string) (ContinuationBundle, error) {
	slog.Debug("trace", "cmd", harnessLogCmd, "operation", "agent.harness.loadContinuationBundle",
		"parent_cycle_id", parentCycleID)
	var bundle ContinuationBundle
	bundle.PreviouslyPassed = map[string]criterionVerdict{}
	parentCycleID = strings.TrimSpace(parentCycleID)
	if parentCycleID == "" {
		return bundle, fmt.Errorf("continuation: empty parent cycle id")
	}
	cycle, err := h.store.GetCycle(ctx, parentCycleID)
	if err != nil {
		return bundle, err
	}
	if !domain.TerminalCycleStatus(cycle.Status) {
		return bundle, fmt.Errorf("continuation: parent cycle %q is not terminal", cycle.Status)
	}
	bundle.ParentCycleID = parentCycleID
	bundle.LineageAttempt = cycle.AttemptSeq

	phases, err := h.store.ListPhasesForCycle(ctx, parentCycleID)
	if err != nil {
		return bundle, err
	}
	bundle.FailureReason = parentFailureReason(phases, cycle)
	if len(phases) == 0 {
		bundle.Warnings = append(bundle.Warnings, "parent cycle has no phases")
	} else {
		lastPhase := phases[len(phases)-1]
		bundle.FailurePhase = lastPhase.Phase
		bundle.FailureClass = classifyParentFailure(phases, cycle, lastPhase)
		lastExecute := lastExecutePhase(phases)
		if lastExecute != nil {
			bundle.ScopeFiles = scopeFilesFromExecutePhase(ctx, h.opts.WorkingDir, lastExecute.DetailsJSON)
			bundle.RunnerFeedback = runnerFeedbackFromPhase(lastExecute)
			if lastExecute.Status == domain.PhaseStatusFailed {
				summary := phaseSummary(*lastExecute)
				if isExecuteGateReason(summary) {
					bundle.ExecuteFeedback = reasonRemediation(summary)
				}
			}
		}
		if bundle.ExecuteFeedback == "" && bundle.FailureClass == failureClassExecuteGate {
			bundle.ExecuteFeedback = reasonRemediation(bundle.FailureReason)
		}
		if bundle.FailureClass == failureClassExecuteGate && strings.Contains(bundle.FailureReason, executeUncommittedWorkReason) {
			if diag, derr := gitStatusPorcelain(ctx, h.opts.WorkingDir); derr == nil && diag != "" {
				bundle.GitDiagnostics = diag
			}
		}
		eligible, err := h.store.ListEligibleCommitsForCycle(ctx, parentCycleID)
		if err != nil {
			return bundle, err
		}
		bundle.Entry = routeResumeEntry(phases, lastExecute, lastPhase, cycle, len(eligible) > 0)
	}

	previouslyPassed, _, verifyFeedback, err := h.loadVerifyCheckpointData(ctx, parentCycleID)
	if err != nil {
		return bundle, err
	}
	bundle.PreviouslyPassed = previouslyPassed
	bundle.VerifyFeedback = verifyFeedback

	commits, err := h.loadKnownCommitsForTask(ctx, cycle.TaskID)
	if err != nil {
		return bundle, err
	}
	bundle.Commits = commits

	criteriaRows, err := h.store.ListCriteriaReportsForCycle(ctx, parentCycleID)
	if err != nil {
		return bundle, err
	}
	for i := range criteriaRows {
		if criteriaRows[i].AttemptSeq == domain.ExecuteCriteriaReportAttemptSeq {
			bundle.CriteriaEvidence = append(bundle.CriteriaEvidence, criteriaRows[i])
		}
	}

	if len(phases) == 0 {
		bundle.Entry = resumeEntryExecute
	} else {
		lastPhase := phases[len(phases)-1]
		lastExecute := lastExecutePhase(phases)
		eligible, err := h.store.ListEligibleCommitsForCycle(ctx, parentCycleID)
		if err != nil {
			return bundle, err
		}
		bundle.Entry = routeResumeEntry(phases, lastExecute, lastPhase, cycle, len(eligible) > 0)
	}

	bundle.Sufficient = continuationSufficient(bundle, cycle)
	if !bundle.Sufficient {
		bundle.Warnings = append(bundle.Warnings, "insufficient continuation data for parent attempt")
	}
	return bundle, nil
}

func classifyParentFailure(phases []domain.TaskCyclePhase, cycle *domain.TaskCycle, lastPhase domain.TaskCyclePhase) failureClass {
	reason := parentFailureReason(phases, cycle)
	if reason == "" {
		reason = phaseSummary(lastPhase)
	}
	if reason == CancelledByOperatorReason {
		return failureClassOperator
	}
	if strings.HasPrefix(reason, verificationFailedReason) || lastPhase.Phase == domain.PhaseVerify {
		return failureClassVerify
	}
	if isExecuteGateReason(reason) || (lastPhase.Phase == domain.PhaseExecute && lastPhase.Status == domain.PhaseStatusFailed) {
		if isExecuteGateReason(phaseSummary(lastPhase)) || isExecuteGateReason(reason) {
			return failureClassExecuteGate
		}
	}
	if strings.HasPrefix(reason, "runner_") || strings.Contains(reason, "runner_") {
		return failureClassRunner
	}
	if lastPhase.Phase == domain.PhaseExecute && lastPhase.Status == domain.PhaseStatusFailed {
		return failureClassRunner
	}
	if reason == "shutdown" || reason == "panic" || strings.HasSuffix(reason, "_failed") {
		return failureClassInfrastructure
	}
	return failureClassInfrastructure
}

func routeResumeEntry(phases []domain.TaskCyclePhase, lastExecute *domain.TaskCyclePhase, lastPhase domain.TaskCyclePhase, cycle *domain.TaskCycle, hasEligible bool) resumeEntry {
	reason := parentFailureReason(phases, cycle)
	if reason == "" {
		reason = phaseSummary(lastPhase)
	}
	if lastExecute != nil &&
		lastExecute.Status == domain.PhaseStatusSucceeded &&
		cycle.Status == domain.CycleStatusFailed &&
		(lastPhase.Phase == domain.PhaseVerify || strings.HasPrefix(reason, verificationFailedReason)) &&
		hasEligible {
		return resumeEntryVerifyOnly
	}
	return resumeEntryExecute
}

func parentFailureReason(phases []domain.TaskCyclePhase, cycle *domain.TaskCycle) string {
	if len(phases) > 0 {
		last := phases[len(phases)-1]
		if last.Status == domain.PhaseStatusFailed {
			if s := phaseSummary(last); s != "" {
				return s
			}
		}
		for i := len(phases) - 1; i >= 0; i-- {
			if phases[i].Status == domain.PhaseStatusFailed {
				if s := phaseSummary(phases[i]); s != "" {
					return s
				}
			}
		}
	}
	return ""
}

func continuationSufficient(bundle ContinuationBundle, cycle *domain.TaskCycle) bool {
	if cycle == nil || cycle.ID == "" {
		return false
	}
	if len(bundle.PreviouslyPassed) > 0 || len(bundle.Commits) > 0 || len(bundle.CriteriaEvidence) > 0 {
		return true
	}
	if bundle.FailureReason != "" || bundle.FailurePhase != "" {
		return true
	}
	return domain.TerminalCycleStatus(cycle.Status)
}

func lastExecutePhase(phases []domain.TaskCyclePhase) *domain.TaskCyclePhase {
	var last *domain.TaskCyclePhase
	for i := range phases {
		p := &phases[i]
		if p.Phase != domain.PhaseExecute {
			continue
		}
		if last == nil || p.PhaseSeq > last.PhaseSeq {
			last = p
		}
	}
	return last
}

func phaseSummary(p domain.TaskCyclePhase) string {
	if p.Summary == nil {
		return ""
	}
	return strings.TrimSpace(*p.Summary)
}

func isExecuteGateReason(reason string) bool {
	switch strings.TrimSpace(reason) {
	case executeNoCommitsReason, executeUncommittedWorkReason, executeInvalidCommitReason, executeRewrittenHistoryReason:
		return true
	default:
		return false
	}
}

func runnerFeedbackFromPhase(p *domain.TaskCyclePhase) string {
	if p == nil {
		return ""
	}
	summary := phaseSummary(*p)
	if summary == "" {
		return ""
	}
	if len(summary) > 512 {
		summary = summary[:512] + "…"
	}
	return summary
}

func scopeFilesFromExecutePhase(ctx context.Context, workdir string, details []byte) []string {
	if len(details) == 0 {
		return nil
	}
	base := gitCycleBaseFromPhaseDetails(details)
	if base == "" {
		return nil
	}
	out, err := runGit(ctx, workdir, "diff", "--name-only", base+"..HEAD")
	if err != nil {
		return nil
	}
	lines := strings.Split(strings.TrimSpace(out), "\n")
	var files []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			files = append(files, line)
		}
	}
	return files
}

func gitStatusPorcelain(ctx context.Context, workdir string) (string, error) {
	out, err := runGit(ctx, workdir, "status", "--porcelain")
	if err != nil {
		return "", err
	}
	const maxLen = 2048
	out = strings.TrimSpace(out)
	if len(out) > maxLen {
		out = out[:maxLen] + "\n…"
	}
	return out, nil
}

func reasonRemediation(reason string) string {
	switch strings.TrimSpace(reason) {
	case executeUncommittedWorkReason:
		return "Commit or discard all uncommitted changes before finishing execute. The worker observed your commits but blocked admission because the working tree was dirty."
	case executeNoCommitsReason:
		return "Create at least one new commit in cycle_base_sha..HEAD before finishing execute."
	case executeInvalidCommitReason:
		return "Fix criteria-report.json: list only SHAs from cycle_base_sha..HEAD using full or unambiguous abbreviated hashes."
	case executeRewrittenHistoryReason:
		return "Do not amend, rebase, or squash commits from this cycle. Create new follow-up commits instead."
	default:
		if reason != "" {
			return "Prior attempt failed: " + reason
		}
		return ""
	}
}

func bundleToCheckpoint(bundle ContinuationBundle) resumeCheckpoint {
	return resumeCheckpoint{
		entry:            bundle.Entry,
		previouslyPassed: bundle.PreviouslyPassed,
		verifyAttempt:    0,
		verifyFeedback:   bundle.VerifyFeedback,
		knownCommits:     bundle.Commits,
		continuation:     &bundle,
	}
}

func runnerDetailsExcerpt(details []byte) string {
	if len(details) == 0 {
		return ""
	}
	var root map[string]json.RawMessage
	if err := json.Unmarshal(details, &root); err != nil {
		return ""
	}
	if raw, ok := root["summary"]; ok {
		var s string
		if json.Unmarshal(raw, &s) == nil && s != "" {
			if len(s) > 256 {
				s = s[:256] + "…"
			}
			return s
		}
	}
	return ""
}
