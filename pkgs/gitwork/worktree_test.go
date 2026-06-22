package gitwork_test

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/AlexsanderHamir/Hamix/pkgs/gitwork"
)

func openRepo(t *testing.T, dir string) *gitwork.Repository {
	t.Helper()
	repo, err := svc().OpenRepository(context.Background(), dir)
	if err != nil {
		t.Fatalf("OpenRepository: %v", err)
	}
	return repo
}

func TestWorktree_addListRemove(t *testing.T) {
	main := initRepo(t)
	repo := openRepo(t, main)
	wtPath := filepath.Join(filepath.Dir(main), "wt-feature")

	wt, err := svc().AddWorktree(context.Background(), repo, wtPath, gitwork.AddWorktreeOptions{
		Branch:       "feature",
		CreateBranch: true,
	})
	if err != nil {
		t.Fatalf("AddWorktree: %v", err)
	}
	if wt.Branch != "feature" {
		t.Fatalf("Branch=%q want feature", wt.Branch)
	}

	list, err := svc().ListWorktrees(context.Background(), repo)
	if err != nil {
		t.Fatalf("ListWorktrees: %v", err)
	}
	if len(list) != 2 {
		t.Fatalf("len(worktrees)=%d want 2", len(list))
	}

	if err := svc().RemoveWorktree(context.Background(), repo, wtPath, false); err != nil {
		t.Fatalf("RemoveWorktree: %v", err)
	}
	list, err = svc().ListWorktrees(context.Background(), repo)
	if err != nil {
		t.Fatalf("ListWorktrees after remove: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("len(worktrees)=%d want 1", len(list))
	}
}

func TestWorktree_pathAlreadyExists(t *testing.T) {
	main := initRepo(t)
	repo := openRepo(t, main)
	if err := os.Mkdir(main+"/existing", 0o755); err != nil {
		t.Fatal(err)
	}
	_, err := svc().AddWorktree(context.Background(), repo, main+"/existing", gitwork.AddWorktreeOptions{
		Branch:       "feature",
		CreateBranch: true,
	})
	if !errors.Is(err, gitwork.ErrWorktreeExists) {
		t.Fatalf("got %v want ErrWorktreeExists", err)
	}
}

func TestWorktree_branchCheckedOutElsewhere(t *testing.T) {
	main := initRepo(t)
	repo := openRepo(t, main)
	wt1 := filepath.Join(filepath.Dir(main), "wt-one")
	if _, err := svc().AddWorktree(context.Background(), repo, wt1, gitwork.AddWorktreeOptions{
		Branch:       "feature",
		CreateBranch: true,
	}); err != nil {
		t.Fatalf("AddWorktree wt1: %v", err)
	}
	wt2 := filepath.Join(filepath.Dir(main), "wt-two")
	_, err := svc().AddWorktree(context.Background(), repo, wt2, gitwork.AddWorktreeOptions{
		Branch: "feature",
	})
	if !errors.Is(err, gitwork.ErrBranchCheckedOut) {
		t.Fatalf("got %v want ErrBranchCheckedOut", err)
	}
}

func TestWorktree_removeDirtyRefused(t *testing.T) {
	main := initRepo(t)
	repo := openRepo(t, main)
	wtPath := filepath.Join(filepath.Dir(main), "wt-dirty")
	if _, err := svc().AddWorktree(context.Background(), repo, wtPath, gitwork.AddWorktreeOptions{
		Branch:       "dirty",
		CreateBranch: true,
	}); err != nil {
		t.Fatalf("AddWorktree: %v", err)
	}
	writeFile(t, filepath.Join(wtPath, "dirty.txt"), "x\n")
	err := svc().RemoveWorktree(context.Background(), repo, wtPath, false)
	if !errors.Is(err, gitwork.ErrDirty) {
		t.Fatalf("got %v want ErrDirty", err)
	}
	if err := svc().RemoveWorktree(context.Background(), repo, wtPath, true); err != nil {
		t.Fatalf("RemoveWorktree force: %v", err)
	}
}

func TestWorktree_prunableSurfacesInList(t *testing.T) {
	main := initRepo(t)
	repo := openRepo(t, main)
	wtPath := filepath.Join(filepath.Dir(main), "wt-prune")
	if _, err := svc().AddWorktree(context.Background(), repo, wtPath, gitwork.AddWorktreeOptions{
		Branch:       "prune-me",
		CreateBranch: true,
	}); err != nil {
		t.Fatalf("AddWorktree: %v", err)
	}
	if err := os.RemoveAll(wtPath); err != nil {
		t.Fatal(err)
	}
	list, err := svc().ListWorktrees(context.Background(), repo)
	if err != nil {
		t.Fatalf("ListWorktrees: %v", err)
	}
	var found bool
	for _, wt := range list {
		if wt.Prunable {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("expected a prunable worktree in list")
	}
}

func TestParseWorktreePorcelain_detachedAndLocked(t *testing.T) {
	t.Parallel()
	out := "worktree /repo/main\nHEAD abc\nbranch refs/heads/main\n\n" +
		"worktree /repo/detached\nHEAD def\ndetached\n\n" +
		"worktree /repo/locked\nHEAD ghi\nbranch refs/heads/feat\nlocked reason\n"
	list, err := gitwork.ParseWorktreePorcelainForTest(out, "/repo/main")
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 3 {
		t.Fatalf("len=%d want 3", len(list))
	}
	if list[0].Branch != "main" || !list[0].IsMain {
		t.Fatalf("main worktree: %+v", list[0])
	}
	if list[1].Branch != "" {
		t.Fatalf("detached Branch=%q want empty", list[1].Branch)
	}
	if !list[2].Locked {
		t.Fatal("expected locked worktree")
	}
}
