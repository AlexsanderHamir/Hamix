package worker

import (
	"strings"
	"testing"
)

// verification_reason_test.go pins the terminate-reason format
// emitted on terminal verification failure. Two contracts are at
// stake:
//
//  1. Information density: the SPA cycle-list view should be able to
//     show "which criteria failed" without a second round-trip, so
//     the failing IDs are inlined.
//  2. Prefix-stability: clients consuming `terminate_reason` MUST be
//     allowed to use `startsWith("verification_failed")`. The test
//     here is the regression boundary for any future change to the
//     format — break the prefix and this test fails.

func TestFormatVerificationFailedReason_NoFailures_BareReason(t *testing.T) {
	got := formatVerificationFailedReason(nil, nil)
	if got != "verification_failed" {
		t.Fatalf("empty verdicts -> bare reason; got %q", got)
	}
}

func TestFormatVerificationFailedReason_SortsAndDedupes(t *testing.T) {
	verdicts := []criterionVerdict{
		{id: "c-zebra", passed: false},
		{id: "c-alpha", passed: false},
		{id: "c-beta", passed: true},
		{id: "c-alpha", passed: false},
	}
	got := formatVerificationFailedReason(verdicts, nil)
	want := "verification_failed:c-alpha,c-zebra"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestFormatVerificationFailedReason_ExcludesLockedPasses(t *testing.T) {
	verdicts := []criterionVerdict{
		{id: "c1", passed: false},
		{id: "c2", passed: false},
	}
	locked := map[string]criterionVerdict{
		"c1": {id: "c1", passed: true},
	}
	got := formatVerificationFailedReason(verdicts, locked)
	want := "verification_failed:c2"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

// TestFormatVerificationFailedReason_TruncatesUnder256 pins the
// column-width safety net: even when many criteria fail, the reason
// stays <= 256 chars while keeping the prefix intact, so the SPA's
// startsWith guard never breaks under load.
func TestFormatVerificationFailedReason_TruncatesUnder256(t *testing.T) {
	var verdicts []criterionVerdict
	for i := 0; i < 200; i++ {
		verdicts = append(verdicts, criterionVerdict{
			id:     "criterion-with-a-fairly-long-id-suffix-" + itoa(i),
			passed: false,
		})
	}
	got := formatVerificationFailedReason(verdicts, nil)
	if len(got) > 256 {
		t.Fatalf("len(got) = %d, want <= 256; got=%q", len(got), got)
	}
	if !strings.HasPrefix(got, "verification_failed:") {
		t.Fatalf("prefix must remain verification_failed:; got %q", got)
	}
	if !strings.HasSuffix(got, "…") {
		t.Fatalf("expected ellipsis suffix on truncated reason; got %q", got)
	}
}

// TestFormatVerificationFailedReason_PrefixStabilityContract is the
// regression boundary for SPA `startsWith("verification_failed")`
// rendering. If a future change breaks this test, the SPA renderer
// has to update in the same commit.
func TestFormatVerificationFailedReason_PrefixStabilityContract(t *testing.T) {
	cases := [][]criterionVerdict{
		nil,
		{{id: "c1", passed: false}},
		{{id: "c1", passed: true}, {id: "c2", passed: false}},
	}
	for i, verdicts := range cases {
		got := formatVerificationFailedReason(verdicts, nil)
		if !strings.HasPrefix(got, "verification_failed") {
			t.Errorf("case %d: %q must start with verification_failed", i, got)
		}
	}
}
