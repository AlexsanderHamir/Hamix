package domain

// ProjectGoalCriterion is the same checklist shape as ProjectStepCriterion.
// Goals advance through the grace gate only when every criterion is done.
type ProjectGoalCriterion = ProjectStepCriterion

// GoalCriteriaAllDone reports whether every goal criterion is done. Empty
// criteria imposes no checklist requirement for that gate edge.
func GoalCriteriaAllDone(criteria []ProjectGoalCriterion) bool {
	return StepCriteriaAllDone(criteria)
}
