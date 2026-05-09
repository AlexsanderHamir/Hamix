package domain

import "errors"

var (
	// ErrNotFound is returned by store methods when a requested row or
	// resource does not exist. Handlers map this to HTTP 404.
	ErrNotFound = errors.New("tasks: not found")

	// ErrInvalidInput is returned when input fails validation or an
	// operation would violate domain rules (including illegal state
	// transitions surfaced as input errors). Handlers map this to HTTP 400.
	ErrInvalidInput = errors.New("tasks: invalid input")

	// ErrConflict is returned when the request conflicts with current
	// persisted state (for example a uniqueness or ordering constraint).
	// Handlers map this to HTTP 409.
	ErrConflict = errors.New("tasks: conflict")

	// ErrProjectStepHasTasks is returned when deleting a project step that
	// tasks still reference. Handlers map this to HTTP 409.
	ErrProjectStepHasTasks = errors.New("tasks: project step has tasks")

	// ErrProjectGoalHasSteps is returned when deleting a project goal that
	// steps still reference. Handlers map this to HTTP 409.
	ErrProjectGoalHasSteps = errors.New("tasks: project goal has steps")

	// ErrProjectGoalHasDependents is returned when deleting a project goal
	// that other goals still list as a prerequisite.
	ErrProjectGoalHasDependents = errors.New("tasks: project goal has dependents")
)
