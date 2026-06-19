package scheduling

import (
	"testing"
	"time"
)

func TestShouldNotifyReadyNow_boundaries(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	cases := []struct {
		name string
		t    *time.Time
		want bool
	}{
		{"nil", nil, true},
		{"past", ptrTime(now.Add(-time.Hour)), true},
		{"exactly-now", ptrTime(now), true},
		{"future", ptrTime(now.Add(time.Second)), false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := ShouldNotifyReadyNow(c.t, now); got != c.want {
				t.Fatalf("got %v want %v", got, c.want)
			}
		})
	}
}

func ptrTime(t time.Time) *time.Time { return &t }
