// Package orchestration defines the pure cycle state machine: given loop state
// and an event, Decide returns the next state and a list of effects for the
// harness root to apply. No store, runner, or filesystem imports.
package orchestration
