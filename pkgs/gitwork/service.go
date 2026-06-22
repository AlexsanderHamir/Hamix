package gitwork

// DefaultService is the production Service implementation.
type DefaultService struct{}

// New returns a DefaultService for worktree and branch operations.
func New() *DefaultService {
	return &DefaultService{}
}
