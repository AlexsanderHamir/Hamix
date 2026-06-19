package prompt

import (
	"strings"
	"testing"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
)

func TestInjectAutomations(t *testing.T) {
	t.Parallel()
	base := "Fix the bug."
	out := InjectAutomations(base, []domain.ResolvedAutomation{
		{Title: "Tests", Description: "run tests before claiming done", State: domain.AutomationStateYes},
		{Title: "Comments", Description: "add inline comments", State: domain.AutomationStateNo},
	})
	if !strings.Contains(out, "[YES] Tests:") {
		t.Fatalf("missing yes line: %q", out)
	}
	if !strings.Contains(out, "[NO] Comments: Do NOT add inline comments") {
		t.Fatalf("missing no line: %q", out)
	}
	if !strings.HasSuffix(strings.TrimSpace(out), base) {
		t.Fatalf("base prompt not preserved: %q", out)
	}
	if InjectAutomations(base, nil) != base {
		t.Fatal("empty items should be no-op")
	}
}
