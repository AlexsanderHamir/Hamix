package scheduling

import "time"

// ShouldNotifyReadyNow returns true when a freshly-ready task may enter the
// in-memory queue immediately. Only pickup_not_before is checked — see ADR-0023 I7.
func ShouldNotifyReadyNow(pickupNotBefore *time.Time, now time.Time) bool {
	if pickupNotBefore == nil {
		return true
	}
	return !pickupNotBefore.After(now)
}
