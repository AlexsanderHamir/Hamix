package harness

import (
	"testing"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
	"github.com/AlexsanderHamir/T2A/pkgs/tasks/store"
)

func TestReasonRemediation_executeGates(t *testing.T) {
	t.Parallel()
	tests := []struct {
		reason string
		want   string
	}{
		{executeUncommittedWorkReason, "uncommitted"},
		{executeNoCommitsReason, "at least one"},
		{executeInvalidCommitReason, "criteria-report"},
		{executeRewrittenHistoryReason, "amend"},
	}
	for _, tc := range tests {
		got := reasonRemediation(tc.reason)
		if got == "" {
			t.Fatalf("reason=%q got empty", tc.reason)
		}
		if tc.want != "" && !containsSubstr(got, tc.want) {
			t.Fatalf("reason=%q got=%q want substring %q", tc.reason, got, tc.want)
		}
	}
}

func TestAssignCommitAdmissionStatuses(t *testing.T) {
	t.Parallel()
	entries := []struct {
		status domain.CommitStatus
		sha    string
	}{
		{domain.CommitInherited, "aaa"},
		{"", "bbb"},
	}
	out := make([]store.CycleCommitEntry, len(entries))
	for i, e := range entries {
		out[i] = store.CycleCommitEntry{SHA: e.sha, Status: e.status}
	}
	assignCommitAdmissionStatuses(out, "")
	if out[0].Status != domain.CommitEligible {
		t.Fatalf("inherited promoted: %+v", out[0])
	}
	if out[1].Status != domain.CommitEligible {
		t.Fatalf("default eligible: %+v", out[1])
	}
	assignCommitAdmissionStatuses(out, executeUncommittedWorkReason)
	if out[0].Status != domain.CommitObserved || out[0].GateReason != executeUncommittedWorkReason {
		t.Fatalf("observed on gate fail: %+v", out[0])
	}
}

func TestFormatCommitsByStatusForResume_groups(t *testing.T) {
	t.Parallel()
	got := formatCommitsByStatusForResume([]domain.TaskCycleCommit{
		{SHA: "abc", Status: domain.CommitEligible, Message: "ok"},
		{SHA: "def", Status: domain.CommitObserved, Message: "blocked", GateReason: executeUncommittedWorkReason},
	})
	if !containsSubstr(got, "Eligible") || !containsSubstr(got, "Observed") {
		t.Fatalf("got=%q", got)
	}
	if !containsSubstr(got, "re-discover") {
		t.Fatalf("missing anti-discovery: %q", got)
	}
}
