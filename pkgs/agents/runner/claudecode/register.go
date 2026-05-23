package claudecode

import (
	"github.com/AlexsanderHamir/T2A/pkgs/agents/runner"
	"github.com/AlexsanderHamir/T2A/pkgs/agents/runner/registry"
)

const (
	RunnerID          = "claude-code"
	RunnerLabel       = "Claude Code CLI"
	DefaultBinaryHint = "claude"
)

func init() {
	registry.Register(
		registry.Descriptor{
			ID:                RunnerID,
			Label:             RunnerLabel,
			DefaultBinaryHint: DefaultBinaryHint,
		},
		func(opts registry.BuildOptions) (runner.Runner, error) {
			return New(Options{
				BinaryPath:   opts.BinaryPath,
				Version:      opts.Version,
				DefaultModel: opts.CursorModel,
			}), nil
		},
	)
}
