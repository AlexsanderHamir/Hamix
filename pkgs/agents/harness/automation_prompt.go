package harness

import (
	"fmt"
	"log/slog"
	"strings"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
)

// injectAutomations prepends the agent-behavior toggle block before the
// operator's initial prompt. Yes-state rows affirm the description; no-state
// rows explicitly prohibit it.
func injectAutomations(prompt string, items []domain.ResolvedAutomation) string {
	slog.Debug("trace", "cmd", harnessLogCmd, "operation", "agent.harness.injectAutomations",
		"items", len(items))
	if len(items) == 0 {
		return prompt
	}
	var b strings.Builder
	b.WriteString("## Agent behaviors\n\n")
	for _, it := range items {
		switch it.State {
		case domain.AutomationStateYes:
			b.WriteString(fmt.Sprintf("- [YES] %s: %s\n", it.Title, it.Description))
		case domain.AutomationStateNo:
			b.WriteString(fmt.Sprintf("- [NO] %s: Do NOT %s\n", it.Title, it.Description))
		}
	}
	b.WriteString("\n")
	return b.String() + prompt
}
