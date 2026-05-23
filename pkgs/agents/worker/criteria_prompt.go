package worker

import (
	"fmt"
	"strings"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/store"
)

func injectCriteria(prompt string, items []store.ChecklistVerifyItem, cycleID string) string {
	if len(items) == 0 {
		return prompt
	}
	var b strings.Builder
	b.WriteString(prompt)
	b.WriteString("\n\n## Done criteria (required)\n\n")
	b.WriteString("You must satisfy every criterion below. When finished, write a JSON report at:\n")
	b.WriteString(fmt.Sprintf("`.t2a/%s/criteria-report.json`\n\n", cycleID))
	b.WriteString("Schema:\n```json\n{\"criteria\":[{\"id\":\"<id>\",\"claimed_done\":true,\"evidence\":\"...\"}]}\n```\n\n")
	for _, it := range items {
		b.WriteString(fmt.Sprintf("- [%s] %s\n", it.ID, it.Text))
		if strings.TrimSpace(it.Check) != "" {
			b.WriteString(fmt.Sprintf("  (deterministic check will run: %s)\n", it.Check))
		}
	}
	return b.String()
}

func appendVerifyFeedback(prompt string, feedback string) string {
	feedback = strings.TrimSpace(feedback)
	if feedback == "" {
		return prompt
	}
	return prompt + "\n\n## Previous verification feedback\n\n" + feedback + "\n"
}
