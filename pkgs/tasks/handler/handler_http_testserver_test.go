package handler

import (
	"context"
	"net/http/httptest"
	"net/url"
	"os/exec"
	"testing"

	"github.com/AlexsanderHamir/Hamix/internal/tasktestdb"
	"github.com/AlexsanderHamir/Hamix/pkgs/gitwork"
	"github.com/AlexsanderHamir/Hamix/pkgs/repo"
	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/domain"
	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/store"
)

func newTaskTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	db := tasktestdb.OpenSQLite(t)
	h := NewHandler(store.NewStore(db), NewSSEHub(), nil)
	return httptest.NewServer(h)
}

func newTaskTestServerWithStore(t *testing.T) (*httptest.Server, *store.Store) {
	t.Helper()
	db := tasktestdb.OpenSQLite(t)
	st := store.NewStore(db)
	h := NewHandler(st, NewSSEHub(), nil)
	return httptest.NewServer(h), st
}

func ensureGitRepo(t *testing.T, dir string) {
	t.Helper()
	if err := exec.Command("git", "-C", dir, "rev-parse", "--git-dir").Run(); err == nil {
		return
	}
	if out, err := exec.Command("git", "init", "-b", "main", dir).CombinedOutput(); err != nil {
		t.Fatalf("git init: %v %s", err, out)
	}
	for _, args := range [][]string{
		{"config", "user.email", "test@test.local"},
		{"config", "user.name", "Test"},
	} {
		if out, err := exec.Command("git", append([]string{"-C", dir}, args...)...).CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v %s", args, err, out)
		}
	}
	_ = exec.Command("git", "-C", dir, "commit", "-m", "init", "--allow-empty").Run()
}

func seedTestGitWorktree(t *testing.T, st *store.Store, repoDir string) (worktreeID, branchID, worktreeBranchID string) {
	t.Helper()
	ensureGitRepo(t, repoDir)
	ctx := context.Background()
	gitSvc := gitwork.New()
	repoRow, err := st.CreateGitRepository(ctx, domain.DefaultProjectID, store.CreateGitRepositoryInput{
		Path: repoDir,
	}, gitSvc)
	if err != nil {
		t.Fatalf("CreateGitRepository: %v", err)
	}
	wts, err := st.ListGitWorktrees(ctx, domain.DefaultProjectID, repoRow.ID)
	if err != nil || len(wts) == 0 {
		t.Fatalf("ListGitWorktrees: %v len=%d", err, len(wts))
	}
	branches, err := st.ListGitBranches(ctx, domain.DefaultProjectID, repoRow.ID)
	if err != nil || len(branches) == 0 {
		t.Fatalf("ListGitBranches: %v len=%d", err, len(branches))
	}
	wb, err := st.AssociateWorktreeBranch(ctx, store.AssociateWorktreeBranchInput{
		WorktreeID: wts[0].ID,
		BranchID:   branches[0].ID,
	})
	if err != nil {
		t.Fatalf("AssociateWorktreeBranch: %v", err)
	}
	return wts[0].ID, branches[0].ID, wb.ID
}

func newTaskTestServerWithRepo(t *testing.T, repoDir string) (*httptest.Server, string, string, string) {
	srv, _, wt, br, wb := newTaskTestServerWithRepoStore(t, repoDir)
	return srv, wt, br, wb
}

func newTaskTestServerWithRepoStore(t *testing.T, repoDir string) (*httptest.Server, *store.Store, string, string, string) {
	t.Helper()
	db := tasktestdb.OpenSQLite(t)
	st := store.NewStore(db)
	worktreeID, branchID, worktreeBranchID := seedTestGitWorktree(t, st, repoDir)
	r, err := repo.OpenRoot(repoDir)
	if err != nil {
		t.Fatal(err)
	}
	h := NewHandler(st, NewSSEHub(), r, WithRepoProvider(NewSettingsRepoProvider(st)))
	return httptest.NewServer(h), st, worktreeID, branchID, worktreeBranchID
}

func repoPathWithWorktree(worktreeID, path string) string {
	q := url.Values{}
	q.Set("worktree_id", worktreeID)
	if path != "" {
		q.Set("path", path)
	}
	return "/repo/file?" + q.Encode()
}

func repoSearchWithWorktree(worktreeID, q string) string {
	v := url.Values{}
	v.Set("worktree_id", worktreeID)
	v.Set("q", q)
	return "/repo/search?" + v.Encode()
}

func repoValidateRangeWithWorktree(worktreeID, path, start, end string) string {
	v := url.Values{}
	v.Set("worktree_id", worktreeID)
	v.Set("path", path)
	v.Set("start", start)
	v.Set("end", end)
	return "/repo/validate-range?" + v.Encode()
}

func repoDiffWithWorktree(worktreeID, sha string) string {
	v := url.Values{}
	v.Set("worktree_id", worktreeID)
	v.Set("sha", sha)
	return "/repo/diff?" + v.Encode()
}
