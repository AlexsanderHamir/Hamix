package commits

import (
	"testing"
	"time"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
)

func TestDedupeCommitsBySHA_prefersHigherStatusRank(t *testing.T) {
	t.Parallel()
	when := time.Date(2026, 6, 18, 12, 0, 0, 0, time.UTC)
	rows := []domain.TaskCycleCommit{
		{SHA: "aaa", Message: "observed", Status: domain.CommitObserved, CommittedAt: when, Seq: 1},
		{SHA: "bbb", Message: "second", CommittedAt: when.Add(time.Minute), Seq: 1},
		{SHA: "aaa", Message: "eligible", Status: domain.CommitEligible, CommittedAt: when.Add(2 * time.Minute), Seq: 2},
	}
	got := dedupeCommitsBySHA(rows)
	if len(got) != 2 {
		t.Fatalf("len = %d, want 2", len(got))
	}
	if got[0].SHA != "aaa" || got[0].Status != domain.CommitEligible {
		t.Fatalf("first = %+v", got[0])
	}
	if got[1].SHA != "bbb" {
		t.Fatalf("second = %+v", got[1])
	}
}
