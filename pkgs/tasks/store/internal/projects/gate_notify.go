package projects

import "context"

// GateGraceNotifier receives hooks when a goal or step enters pending_release
// after its completion criteria are satisfied. Production wiring leaves this nil;
// future email/SMS integrations can be attached without changing store contracts.
type GateGraceNotifier interface {
	NotifyGoalPendingRelease(ctx context.Context, projectID, goalID string, deadlineUnixMilli int64, emailEnabled, smsEnabled bool)
	NotifyStepPendingRelease(ctx context.Context, projectID, stepID string, deadlineUnixMilli int64, emailEnabled, smsEnabled bool)
}

// GateGraceNotify is optional process-wide wiring (cmd/taskapi may set it).
var GateGraceNotify GateGraceNotifier
