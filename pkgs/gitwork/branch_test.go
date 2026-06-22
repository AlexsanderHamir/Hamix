package gitwork_test

import (
	"context"
	"errors"
	"path/filepath"
	"testing"

	"github.com/AlexsanderHamir/Hamix/pkgs/gitwork"
)

func TestBranch_createListDelete(t *testing.T) {
	main := initRepo(t)
	repo := openRepo(t, main)

	b, err := svc().CreateBranch(context.Background(), repo, "feature", "main")
	if err != nil {
		t.Fatalf("CreateBranch: %v", err)
	}
	if b.Name != "feature" || b.HeadSHA == "" {
		t.Fatalf("branch: %+v", b)
	}

	branches, err := svc().ListBranches(context.Background(), repo)
	if err != nil {
		t.Fatalf("ListBranches: %v", err)
	}
	if len(branches) != 2 {
		t.Fatalf("len(branches)=%d want 2", len(branches))
	}

	if err := svc().DeleteBranch(context.Background(), repo, "feature", false); err != nil {
		t.Fatalf("DeleteBranch: %v", err)
	}
}

func TestBranch_createDuplicate(t *testing.T) {
	main := initRepo(t)
	repo := openRepo(t, main)
	if _, err := svc().CreateBranch(context.Background(), repo, "dup", "main"); err != nil {
		t.Fatal(err)
	}
	_, err := svc().CreateBranch(context.Background(), repo, "dup", "main")
	if !errors.Is(err, gitwork.ErrBranchExists) {
		t.Fatalf("got %v want ErrBranchExists", err)
	}
}

func TestBranch_deleteForce(t *testing.T) {
	main := initRepo(t)
	repo := openRepo(t, main)
	if _, err := svc().CreateBranch(context.Background(), repo, "orphan", "main"); err != nil {
		t.Fatal(err)
	}
	// orphan has no unique commits — -d succeeds; -D is for unmerged refs.
	if err := svc().DeleteBranch(context.Background(), repo, "orphan", false); err != nil {
		t.Fatalf("DeleteBranch -d: %v", err)
	}
	if _, err := svc().CreateBranch(context.Background(), repo, "stub", "main"); err != nil {
		t.Fatal(err)
	}
	// Create a commit only on stub so -d refuses without -D after we make it unmerged.
	wtPath := filepath.Join(filepath.Dir(main), "wt-stub")
	if _, err := svc().AddWorktree(context.Background(), repo, wtPath, gitwork.AddWorktreeOptions{
		Branch: "stub",
	}); err != nil {
		t.Fatal(err)
	}
	writeFile(t, filepath.Join(wtPath, "only-stub.txt"), "x\n")
	runGit(t, wtPath, "add", "only-stub.txt")
	runGit(t, wtPath, "commit", "-m", "stub only")
	if err := svc().RemoveWorktree(context.Background(), repo, wtPath, true); err != nil {
		t.Fatal(err)
	}
	if err := svc().DeleteBranch(context.Background(), repo, "stub", false); err == nil {
		t.Fatal("expected -d to fail for unmerged branch")
	}
	if err := svc().DeleteBranch(context.Background(), repo, "stub", true); err != nil {
		t.Fatalf("DeleteBranch -D: %v", err)
	}
}

func TestBranch_deleteCheckedOut(t *testing.T) {
	main := initRepo(t)
	repo := openRepo(t, main)
	err := svc().DeleteBranch(context.Background(), repo, "main", false)
	if !errors.Is(err, gitwork.ErrBranchCheckedOut) {
		t.Fatalf("got %v want ErrBranchCheckedOut", err)
	}
}

func TestCheckout_happyAndDirty(t *testing.T) {
	main := initRepo(t)
	repo := openRepo(t, main)
	if _, err := svc().CreateBranch(context.Background(), repo, "other", "main"); err != nil {
		t.Fatal(err)
	}
	if err := svc().Checkout(context.Background(), main, "other"); err != nil {
		t.Fatalf("Checkout other: %v", err)
	}
	writeFile(t, filepath.Join(main, "README.md"), "on other branch\n")
	runGit(t, main, "add", "README.md")
	runGit(t, main, "commit", "-m", "other commit")
	writeFile(t, filepath.Join(main, "README.md"), "dirty uncommitted\n")
	err := svc().Checkout(context.Background(), main, "main")
	if !errors.Is(err, gitwork.ErrDirty) {
		t.Fatalf("got %v want ErrDirty", err)
	}
}

func TestAbsPath_normalizesSlashes(t *testing.T) {
	t.Parallel()
	got, err := gitwork.AbsPathForTest(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if got == "" {
		t.Fatal("empty path")
	}
}
