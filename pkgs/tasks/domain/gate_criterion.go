package domain

// GateCriterion is a checklist-style requirement attached to a task gate.
type GateCriterion struct {
	ID        string `json:"id"`
	Text      string `json:"text"`
	Done      bool   `json:"done"`
	SortOrder int    `json:"sort_order"`
}

// GateCriteriaAllDone reports whether every criterion is done. Empty criteria
// imposes no checklist requirement on gate release in V1 (operator-driven).
func GateCriteriaAllDone(criteria []GateCriterion) bool {
	for _, c := range criteria {
		if !c.Done {
			return false
		}
	}
	return true
}
