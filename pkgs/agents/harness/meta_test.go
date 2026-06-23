package harness

import (
	"encoding/json"
	"testing"

	"github.com/AlexsanderHamir/Hamix/pkgs/agents/runner"
	"github.com/AlexsanderHamir/Hamix/pkgs/agents/runner/runnerfake"
)

func TestSha256Hex_deterministic(t *testing.T) {
	t.Parallel()
	const prompt = "audit-correlation-prompt"
	a := sha256Hex(prompt)
	b := sha256Hex(prompt)
	if a != b || a == "" {
		t.Fatalf("sha256Hex not stable: %q vs %q", a, b)
	}
}

func TestBuildCycleMeta_promptHashMatchesSha256(t *testing.T) {
	t.Parallel()
	r := runnerfake.New()
	prompt := "same prompt across runner versions"
	meta := buildCycleMeta(r, prompt, runner.Request{})
	var parsed struct {
		PromptHash     string `json:"prompt_hash"`
		Runner         string `json:"runner"`
		RunnerVersion  string `json:"runner_version"`
	}
	if err := json.Unmarshal(meta, &parsed); err != nil {
		t.Fatalf("unmarshal meta: %v", err)
	}
	if parsed.PromptHash != sha256Hex(prompt) {
		t.Fatalf("prompt_hash = %q, want %q", parsed.PromptHash, sha256Hex(prompt))
	}
	if parsed.Runner != r.Name() || parsed.RunnerVersion != r.Version() {
		t.Fatalf("runner metadata mismatch: %+v", parsed)
	}
}
