package handlertest

import (
	"net/http/httptest"
	"testing"

	"github.com/AlexsanderHamir/Hamix/internal/gittest"
	"github.com/AlexsanderHamir/Hamix/internal/tasktestdb"
	"github.com/AlexsanderHamir/Hamix/pkgs/repo"
	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/handler"
	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/store"
)

// NewServer returns an httptest.Server wrapping handler.NewHandler with SQLite,
// SSE hub, and no workspace repo.
//
//funclogmeasure:skip category=tool-required-noop reason="Test-only HTTP wiring; not part of production trace paths."
func NewServer(t *testing.T) *httptest.Server {
	t.Helper()
	db := tasktestdb.OpenSQLite(t)
	h := handler.NewHandler(store.NewStore(db), handler.NewSSEHub(), nil)
	return httptest.NewServer(h)
}

// NewServerWithStore is like [NewServer] but also returns the store for direct DB setup.
//
//funclogmeasure:skip category=tool-required-noop reason="Test-only HTTP wiring; not part of production trace paths."
func NewServerWithStore(t *testing.T) (*httptest.Server, *store.Store) {
	t.Helper()
	db := tasktestdb.OpenSQLite(t)
	st := store.NewStore(db)
	h := handler.NewHandler(st, handler.NewSSEHub(), nil)
	return httptest.NewServer(h), st
}

// NewServerWithRepo is like [NewServer] but mounts a workspace repo rooted at repoDir.
//
//funclogmeasure:skip category=tool-required-noop reason="Test-only HTTP wiring; not part of production trace paths."
func NewServerWithRepo(t *testing.T, repoDir string) *httptest.Server {
	t.Helper()
	srv, _, _, _, _ := NewServerWithRepoStore(t, repoDir)
	return srv
}

// NewServerWithRepoStore mounts a workspace repo, seeds git worktree rows, and returns IDs for repo routes.
//
//funclogmeasure:skip category=tool-required-noop reason="Test-only HTTP wiring; not part of production trace paths."
func NewServerWithRepoStore(t *testing.T, repoDir string) (*httptest.Server, *store.Store, string, string, string) {
	t.Helper()
	db := tasktestdb.OpenSQLite(t)
	st := store.NewStore(db)
	worktreeID, branchID, worktreeBranchID := gittest.SeedWorktreeBranch(t, st, repoDir)
	r, err := repo.OpenRoot(repoDir)
	if err != nil {
		t.Fatal(err)
	}
	h := handler.NewHandler(st, handler.NewSSEHub(), r, handler.WithRepoProvider(handler.NewSettingsRepoProvider(st)))
	return httptest.NewServer(h), st, worktreeID, branchID, worktreeBranchID
}
