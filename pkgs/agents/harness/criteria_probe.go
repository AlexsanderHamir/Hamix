package harness

import (
	"github.com/AlexsanderHamir/T2A/pkgs/agents/harness/internal/reports"
)

func expectedActiveCriterionIDs(state *processState) map[string]struct{} {
	expected := make(map[string]struct{}, len(state.verifySnap.Criteria))
	for _, it := range state.verifySnap.Criteria {
		if _, locked := state.previouslyPassed[it.ID]; locked {
			continue
		}
		expected[it.ID] = struct{}{}
	}
	return expected
}

// probeCriteriaReport validates criteria-report.json for active checklist ids and
// records any parse error on state for Cursor recovery hints (ADR-0031).
func (h *Harness) probeCriteriaReport(state *processState, cycleID string) {
	state.reportParseErr = ""
	if !state.verifySnap.Enabled || len(state.verifySnap.Criteria) == 0 {
		return
	}
	expected := expectedActiveCriterionIDs(state)
	if len(expected) == 0 {
		return
	}
	if _, err := reports.ParseCriteriaReport(h.opts.ReportDir, cycleID, expected); err != nil {
		state.reportParseErr = err.Error()
	}
}
