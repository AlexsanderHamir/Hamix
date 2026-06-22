package gitwork

// DefaultService is the production Service implementation.
type DefaultService struct{}

// New returns a DefaultService for worktree and branch operations.
//
//funclogmeasure:skip category=hot-path reason="Constructor with no I/O; callers trace at operation boundaries."
func New() *DefaultService {
	return &DefaultService{}
}
