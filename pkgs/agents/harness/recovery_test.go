package harness

import (
	"testing"

	"github.com/AlexsanderHamir/Hamix/pkgs/agents/harness/internal/orchestration"
)

// Recovery paths must persist stable terminate_reason strings for shutdown
// and operator cancel so resume and audit UIs stay consistent.
func TestRecovery_shutdownReasonContract(t *testing.T) {
	t.Parallel()
	if ShutdownReason != "shutdown" {
		t.Fatalf("ShutdownReason = %q, want shutdown", ShutdownReason)
	}
}

func TestRecovery_operatorCancelTerminationReason(t *testing.T) {
	t.Parallel()
	effects := orchestration.DecideExecutePostRun(orchestration.ExecutePostRunInput{
		RunnerOutcome:     orchestration.ExecuteRunnerOutcomeOK,
		OperatorCancelled: true,
	})
	if effects.Reason != orchestration.ReasonCancelledByOperator {
		t.Fatalf("reason = %q, want %q", effects.Reason, orchestration.ReasonCancelledByOperator)
	}
	if !effects.TerminateFailed {
		t.Fatalf("operator cancel must terminal-fail execute: %+v", effects)
	}
}
