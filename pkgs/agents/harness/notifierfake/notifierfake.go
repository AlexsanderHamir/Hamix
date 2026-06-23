// Package notifierfake records harness CycleChangeNotifier and ProgressNotifier calls.
package notifierfake

import (
	"sync"

	"github.com/AlexsanderHamir/Hamix/pkgs/agents/runner"
)

// PublishCall records one cycle-change notification.
type PublishCall struct {
	TaskID  string
	CycleID string
}

// RecordingCycleNotifier implements harness.CycleChangeNotifier for tests.
type RecordingCycleNotifier struct {
	mu    sync.Mutex
	calls []PublishCall
}

// NewRecordingCycleNotifier constructs an empty recorder.
func NewRecordingCycleNotifier() *RecordingCycleNotifier {
	return &RecordingCycleNotifier{}
}

// PublishCycleChange records the call.
func (r *RecordingCycleNotifier) PublishCycleChange(taskID, cycleID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.calls = append(r.calls, PublishCall{TaskID: taskID, CycleID: cycleID})
}

// Snapshot returns a copy of recorded calls.
func (r *RecordingCycleNotifier) Snapshot() []PublishCall {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]PublishCall, len(r.calls))
	copy(out, r.calls)
	return out
}

// ProgressCall records one live-progress notification.
type ProgressCall struct {
	TaskID           string
	CycleID          string
	PhaseSeq         int64
	RunCorrelationID string
	Event            runner.ProgressEvent
}

// RecordingProgressNotifier implements harness.ProgressNotifier for tests.
type RecordingProgressNotifier struct {
	mu    sync.Mutex
	calls []ProgressCall
}

// NewRecordingProgressNotifier constructs an empty recorder.
func NewRecordingProgressNotifier() *RecordingProgressNotifier {
	return &RecordingProgressNotifier{}
}

// PublishRunProgress records the call.
func (n *RecordingProgressNotifier) PublishRunProgress(taskID, cycleID string, phaseSeq int64, runCorrelationID string, ev runner.ProgressEvent) {
	n.mu.Lock()
	defer n.mu.Unlock()
	n.calls = append(n.calls, ProgressCall{
		TaskID:           taskID,
		CycleID:          cycleID,
		PhaseSeq:         phaseSeq,
		RunCorrelationID: runCorrelationID,
		Event:            ev,
	})
}

// Snapshot returns a copy of recorded calls.
func (n *RecordingProgressNotifier) Snapshot() []ProgressCall {
	n.mu.Lock()
	defer n.mu.Unlock()
	out := make([]ProgressCall, len(n.calls))
	copy(out, n.calls)
	return out
}
