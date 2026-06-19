package scheduling

import "time"

// FailedPredicate identifies the first worker readiness check that failed.
// String values are stable for logs and metrics.
type FailedPredicate string

const (
	FailedPredicateNone         FailedPredicate = "none"
	FailedPredicateStatus       FailedPredicate = "status"
	FailedPredicatePickup       FailedPredicate = "pickup"
	FailedPredicateGate         FailedPredicate = "gate"
	FailedPredicateDependencies FailedPredicate = "dependencies"
)

// ReadinessResult is the outcome of EvaluateWorkerReadiness.
type ReadinessResult struct {
	Ready           bool
	FailedPredicate FailedPredicate
}

// NotifyDecision is the post-commit notify/wake action for a ready transition.
type NotifyDecision struct {
	NotifyQueue  bool
	ScheduleWake *time.Time
	CancelWake   bool
}
