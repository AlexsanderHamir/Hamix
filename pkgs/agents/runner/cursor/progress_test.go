package cursor

import (
	"encoding/json"
	"testing"
)

func TestToolInputSummary_progressVerbsAndGlobFields(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		tool  string
		input map[string]any
		want  string
	}{
		{
			name: "read file uses Reading",
			tool: "ReadFile",
			input: map[string]any{
				"path": "README.md",
			},
			want: "Reading README.md",
		},
		{
			name: "glob camelCase pattern",
			tool: "Glob",
			input: map[string]any{
				"globPattern":     "Makefile",
				"targetDirectory": "/repo/pkgs/agents/worker",
			},
			want: "Searching for Makefile in worker",
		},
		{
			name: "glob missing pattern does not duplicate files",
			tool: "Glob",
			input: map[string]any{
				"targetDirectory": "/repo",
			},
			want: "Searching files in repo",
		},
		{
			name:  "glob missing pattern and scope",
			tool:  "Glob",
			input: map[string]any{},
			want:  "Searching files",
		},
		{
			name: "delete uses Deleting",
			tool: "Delete",
			input: map[string]any{
				"path": "old.txt",
			},
			want: "Deleting old.txt",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			raw, err := json.Marshal(tt.input)
			if err != nil {
				t.Fatalf("marshal input: %v", err)
			}
			if got := toolInputSummary(tt.tool, raw); got != tt.want {
				t.Fatalf("toolInputSummary() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestToolProgressMessage_fallbackUsesIng(t *testing.T) {
	t.Parallel()

	if got := toolProgressMessage("ReadFile", "started", nil); got != "Starting ReadFile" {
		t.Fatalf("started fallback = %q, want Starting ReadFile", got)
	}
	if got := toolProgressMessage("ReadFile", "completed", nil); got != "Finishing ReadFile" {
		t.Fatalf("completed fallback = %q, want Finishing ReadFile", got)
	}
}
