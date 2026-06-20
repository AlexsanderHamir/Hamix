package git

import (
	"fmt"
	"strings"
	"time"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
)

// FormatGitContextForPrompt renders worker-indexed commit context for verify prompts.
//
//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by the calling chokepoint."
func FormatGitContextForPrompt(commits []domain.TaskCycleCommit) string {
	if len(commits) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("## Git context (worker-indexed)\n\n")
	first := commits[0]
	if first.Repo != "" {
		b.WriteString("Repo:     ")
		b.WriteString(first.Repo)
		b.WriteByte('\n')
	}
	if first.Worktree != "" && first.Worktree != first.Repo {
		b.WriteString("Worktree: ")
		b.WriteString(first.Worktree)
		b.WriteByte('\n')
	}
	if first.Branch != "" {
		b.WriteString("Branch:   ")
		b.WriteString(first.Branch)
		b.WriteByte('\n')
	}
	b.WriteString("Commits:\n")
	for _, c := range commits {
		short := c.SHA
		if len(short) > 7 {
			short = short[:7]
		}
		ts := c.CommittedAt.UTC().Format(time.RFC3339)
		b.WriteString(fmt.Sprintf("%d. %s… @ %s — %q\n", c.Seq, short, ts, c.Message))
	}
	b.WriteString(fmt.Sprintf("commit_count=%d\n\n", len(commits)))
	return b.String()
}

// FormatKnownCommitsForResume lists prior indexed commits for resume prompts.
//
//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by the calling chokepoint."
func FormatKnownCommitsForResume(commits []domain.TaskCycleCommit) string {
	if len(commits) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("Known commits already indexed for this task (all prior attempts):\n")
	for _, c := range commits {
		short := c.SHA
		if len(short) > 12 {
			short = short[:12]
		}
		b.WriteString(fmt.Sprintf("- %s — %s\n", short, c.Message))
	}
	b.WriteByte('\n')
	return b.String()
}

// ReasonRemediation returns operator-facing guidance for execute gate reasons.
//
//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by the calling chokepoint."
func ReasonRemediation(reason string) string {
	switch strings.TrimSpace(reason) {
	case ExecuteUncommittedWorkReason:
		return "Commit or discard all uncommitted changes before finishing execute. The worker observed your commits but blocked admission because the working tree was dirty."
	case ExecuteNoCommitsReason:
		return "Create at least one new commit in cycle_base_sha..HEAD before finishing execute."
	case ExecuteInvalidCommitReason:
		return "A commit from this cycle could not be resolved in the repository. Create a new follow-up commit instead of rewriting history."
	case ExecuteRewrittenHistoryReason:
		return "Do not amend, rebase, or squash commits from this cycle. Create new follow-up commits instead."
	default:
		if reason != "" {
			return "Prior attempt failed: " + reason
		}
		return ""
	}
}

// IsExecuteGateReason reports whether reason is an execute commit gate failure.
//
//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by the calling chokepoint."
func IsExecuteGateReason(reason string) bool {
	switch strings.TrimSpace(reason) {
	case ExecuteNoCommitsReason, ExecuteUncommittedWorkReason, ExecuteInvalidCommitReason, ExecuteRewrittenHistoryReason:
		return true
	default:
		return false
	}
}
