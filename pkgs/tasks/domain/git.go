package domain

import (
	"errors"
	"time"
)

// Git API error codes returned in JSON {"error","code"} responses.
const (
	GitCodeNotARepository     = "not_a_git_repository"
	GitCodePathExists         = "path_exists"
	GitCodeBranchExists       = "branch_exists"
	GitCodeBranchCheckedOut   = "branch_checked_out"
	GitCodeHasRunningTask     = "has_running_task"
	GitCodeRepositoryNotFound = "repository_not_found"
	GitCodeWorktreeNotFound   = "worktree_not_found"
	GitCodeBranchNotFound     = "branch_not_found"
	GitCodeDuplicate          = "duplicate"
)

// GitErr is a domain error with a stable API code for git entity routes.
type GitErr struct {
	Code string
	Msg  string
}

func (e *GitErr) Error() string { return e.Msg }

// NewGitErr returns an error tagged with a stable git API code.
func NewGitErr(code, msg string) error {
	return &GitErr{Code: code, Msg: msg}
}

// GitErrCode returns the stable code when err wraps *GitErr.
func GitErrCode(err error) string {
	var ge *GitErr
	if errors.As(err, &ge) {
		return ge.Code
	}
	return ""
}

// GitRepository is a registered main git checkout for a project.
type GitRepository struct {
	ID            string    `json:"id" gorm:"primaryKey"`
	ProjectID     string    `json:"project_id" gorm:"not null;index;uniqueIndex:idx_git_repo_project_path,priority:1"`
	Path          string    `json:"path" gorm:"not null;uniqueIndex:idx_git_repo_project_path,priority:2"`
	HostPath      string    `json:"host_path" gorm:"not null;default:''"`
	DefaultBranch string    `json:"default_branch" gorm:"not null;default:main"`
	CreatedAt     time.Time `json:"created_at" gorm:"not null;index"`
	UpdatedAt     time.Time `json:"updated_at" gorm:"not null;index"`
}

// GitWorktree is a linked working directory for a GitRepository.
type GitWorktree struct {
	ID           string    `json:"id" gorm:"primaryKey"`
	RepositoryID string    `json:"repository_id" gorm:"not null;index;uniqueIndex:idx_git_worktree_repo_path,priority:1"`
	Path         string    `json:"path" gorm:"not null;uniqueIndex:idx_git_worktree_repo_path,priority:2"`
	Name         string    `json:"name" gorm:"not null"`
	IsMain       bool      `json:"is_main" gorm:"not null;default:false"`
	CreatedAt    time.Time `json:"created_at" gorm:"not null;index"`
}

// GitBranch is a local branch tracked for a GitRepository.
type GitBranch struct {
	ID           string    `json:"id" gorm:"primaryKey"`
	RepositoryID string    `json:"repository_id" gorm:"not null;index;uniqueIndex:idx_git_branch_repo_name,priority:1"`
	Name         string    `json:"name" gorm:"not null;uniqueIndex:idx_git_branch_repo_name,priority:2"`
	HeadSHA      string    `json:"head_sha" gorm:"not null;default:''"`
	CreatedAt    time.Time `json:"created_at" gorm:"not null;index"`
}
