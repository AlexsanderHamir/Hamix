package harness

import (
	"fmt"
	"log/slog"
	"strings"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
)

func composeContinuationPrompt(base string, cycle *domain.TaskCycle, bundle *ContinuationBundle) string {
	slog.Debug("trace", "cmd", harnessLogCmd, "operation", "agent.harness.composeContinuationPrompt",
		"cycle_id", cycleIDOrEmpty(cycle))
	if bundle == nil || cycle == nil {
		return base
	}
	var b strings.Builder
	b.WriteString("## Continuation — resume from failure\n\n")
	b.WriteString(fmt.Sprintf("You are continuing work from attempt #%d into attempt #%d (new cycle_id=%s).\n",
		bundle.LineageAttempt, cycle.AttemptSeq, cycle.ID))
	b.WriteString("Do **not** restart discovery or revert eligible work from prior attempts.\n\n")

	if bundle.FailureReason != "" {
		b.WriteString("### Prior failure\n\n")
		b.WriteString(fmt.Sprintf("- Class: %s\n", bundle.FailureClass))
		b.WriteString(fmt.Sprintf("- Reason: %s\n", bundle.FailureReason))
		if bundle.FailurePhase != "" {
			b.WriteString(fmt.Sprintf("- Last phase: %s\n", bundle.FailurePhase))
		}
		b.WriteString("\n")
	}
	if len(bundle.ScopeFiles) > 0 {
		b.WriteString("### Scope lock (files already touched)\n\n")
		b.WriteString("Continue work on these paths — do not pick a different target:\n")
		for _, f := range bundle.ScopeFiles {
			b.WriteString("- ")
			b.WriteString(f)
			b.WriteByte('\n')
		}
		b.WriteString("\n")
	}
	if block := formatCommitsByStatusForResume(bundle.Commits); block != "" {
		b.WriteString(block)
	}
	if bundle.ExecuteFeedback != "" {
		b.WriteString("### Execute harness feedback\n\n")
		b.WriteString(bundle.ExecuteFeedback)
		b.WriteString("\n\n")
	}
	if bundle.RunnerFeedback != "" {
		b.WriteString("### Prior runner outcome\n\n")
		b.WriteString(bundle.RunnerFeedback)
		b.WriteString("\n\n")
	}
	if bundle.GitDiagnostics != "" {
		b.WriteString("### Git working tree (porcelain)\n\n```\n")
		b.WriteString(bundle.GitDiagnostics)
		b.WriteString("\n```\n\n")
	}
	for _, w := range bundle.Warnings {
		b.WriteString("> ")
		b.WriteString(w)
		b.WriteByte('\n')
	}
	if len(bundle.Warnings) > 0 {
		b.WriteByte('\n')
	}
	return b.String() + base
}

func formatCommitsByStatusForResume(commits []domain.TaskCycleCommit) string {
	if len(commits) == 0 {
		return ""
	}
	var eligible, observed, inherited, other []domain.TaskCycleCommit
	for _, c := range commits {
		switch c.Status {
		case domain.CommitEligible:
			eligible = append(eligible, c)
		case domain.CommitObserved:
			observed = append(observed, c)
		case domain.CommitInherited:
			inherited = append(inherited, c)
		default:
			other = append(other, c)
		}
	}
	var b strings.Builder
	b.WriteString("### Known commits (by status)\n\n")
	writeCommitGroup := func(title string, rows []domain.TaskCycleCommit) {
		if len(rows) == 0 {
			return
		}
		b.WriteString("**")
		b.WriteString(title)
		b.WriteString(":**\n")
		for _, c := range rows {
			short := c.SHA
			if len(short) > 12 {
				short = short[:12]
			}
			b.WriteString("- ")
			b.WriteString(short)
			b.WriteString(" — ")
			b.WriteString(c.Message)
			if c.GateReason != "" {
				b.WriteString(" (")
				b.WriteString(c.GateReason)
				b.WriteString(")")
			}
			b.WriteByte('\n')
		}
		b.WriteByte('\n')
	}
	writeCommitGroup("Eligible (verify-ready)", eligible)
	writeCommitGroup("Observed (blocked by gates)", observed)
	writeCommitGroup("Inherited", inherited)
	writeCommitGroup("Other", other)
	b.WriteString("Do **not** re-discover targets when scope files or eligible commits exist above.\n\n")
	return b.String()
}
