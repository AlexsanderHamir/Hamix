package readpolicy_test

import (
	"testing"

	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/handler/readpolicy"
)

func TestBootstrapLimits_matchSPAContract(t *testing.T) {
	tests := []struct {
		name  string
		got   int
		want  int
		label string
	}{
		{"list", readpolicy.BootstrapListLimit, 20, "home task list"},
		{"projects", readpolicy.BootstrapProjectsLimit, 100, "AppShell projects"},
		{"drafts", readpolicy.BootstrapDraftsLimit, 50, "task create drafts"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.want {
				t.Fatalf("%s: got %d want %d", tt.label, tt.got, tt.want)
			}
		})
	}
}

func TestShellChecklistIncluded(t *testing.T) {
	if !readpolicy.ShellChecklistIncluded {
		t.Fatal("shell route must embed checklist items when shipped")
	}
}
