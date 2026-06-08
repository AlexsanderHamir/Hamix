package worker

import (
	"fmt"
	"log/slog"
	"strings"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/store"
)

// injectCriteria prepends the Done-criteria block before the operator's
// initial prompt. alreadyVerified is the set of criterion IDs proven
// passed in earlier retry attempts (carried across the retry loop in
// processState.previouslyPassed); when non-empty, those items render
// under a separate "Already verified" header and are omitted from the
// active checklist + the report schema's expected-IDs set so the
// agent doesn't waste tokens re-doing settled work.
//
// reportPath is the absolute path the worker has chosen for this
// cycle's criteria-report.json (under Options.ReportDir, not under
// the operator's RepoRoot). The prompt renders that absolute path
// verbatim so the agent CLI writes outside the working tree and never
// dirties the operator's repo. cycleID is retained for the trace log
// only; it is no longer baked into a relative path.
func injectCriteria(prompt string, items []store.ChecklistVerifyItem, cycleID, reportPath string, alreadyVerified map[string]criterionVerdict) string {
	slog.Debug("trace", "cmd", workerLogCmd, "operation", "agent.worker.injectCriteria",
		"cycle_id", cycleID, "items", len(items), "already_verified", len(alreadyVerified))
	if len(items) == 0 {
		return prompt
	}
	active := make([]store.ChecklistVerifyItem, 0, len(items))
	locked := make([]store.ChecklistVerifyItem, 0, len(alreadyVerified))
	for _, it := range items {
		if _, ok := alreadyVerified[it.ID]; ok {
			locked = append(locked, it)
			continue
		}
		active = append(active, it)
	}

	var criteria strings.Builder

	if len(locked) > 0 {
		criteria.WriteString("\n\n## Already verified (do not re-do)\n\n")
		criteria.WriteString("These criteria were proven passed in an earlier attempt. Do not undo or modify the work that satisfied them; do not include them in your report.\n\n")
		for _, it := range locked {
			criteria.WriteString(fmt.Sprintf("- [%s] %s\n", it.ID, it.Text))
		}
	}

	if len(active) == 0 {
		criteria.WriteString("\n\n## Done criteria (required)\n\nAll criteria are already verified. Re-run is a no-op; the worker will exit successfully.\n")
		return strings.TrimPrefix(criteria.String(), "\n\n") + "\n\n" + prompt
	}

	criteria.WriteString("\n\n## Done criteria (required)\n\n")
	criteria.WriteString("You must satisfy every criterion below. When finished, write a JSON report at:\n")
	criteria.WriteString(fmt.Sprintf("`%s`\n\n", reportPath))
	criteria.WriteString("Schema:\n```json\n{\"criteria\":[{\"id\":\"<id>\",\"claimed_done\":true,\"evidence\":\"...\"}]}\n```\n")
	criteria.WriteString("claimed_done is your assertion that you completed the work; the verification agent independently decides whether each criterion is satisfied.\n")
	if len(locked) > 0 {
		criteria.WriteString("(Report only the criteria below; do NOT include already-verified IDs.)\n")
	}
	criteria.WriteString("\n")
	for _, it := range active {
		criteria.WriteString(fmt.Sprintf("- [%s] %s\n", it.ID, it.Text))
	}
	return strings.TrimPrefix(criteria.String(), "\n\n") + "\n\n" + prompt
}

func appendVerifyFeedback(prompt string, feedback string) string {
	feedback = strings.TrimSpace(feedback)
	if feedback == "" {
		return prompt
	}
	return prompt + "\n\n## Previous verification feedback\n\n" + feedback + "\n"
}
