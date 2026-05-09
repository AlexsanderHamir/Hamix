package domain

// ProjectStepCriterion is a checklist-style requirement tracked on a project step.
// When a step has at least one criterion, the gate does not advance until every
// criterion is done and every task assigned to the step is done.
type ProjectStepCriterion struct {
	ID        string `json:"id"`
	Text      string `json:"text"`
	Done      bool   `json:"done"`
	SortOrder int    `json:"sort_order"`
}

// StepCriteriaAllDone reports whether every criterion is done. Empty criteria
// imposes no checklist requirement (tasks alone may advance the gate).
func StepCriteriaAllDone(criteria []ProjectStepCriterion) bool {
	for _, c := range criteria {
		if !c.Done {
			return false
		}
	}
	return true
}
