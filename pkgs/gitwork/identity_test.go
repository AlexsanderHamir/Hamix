package gitwork_test

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/AlexsanderHamir/Hamix/pkgs/gitwork"
)

func TestResolveRegistration_fromMainCheckout(t *testing.T) {
	main := initRepo(t)
	mainRoot, commonDir, err := svc().ResolveRegistration(context.Background(), main)
	if err != nil {
		t.Fatalf("ResolveRegistration: %v", err)
	}
	wantRoot, _ := filepath.Abs(main)
	wantRoot = filepath.ToSlash(wantRoot)
	if mainRoot != wantRoot {
		t.Fatalf("mainRoot=%q want %q", mainRoot, wantRoot)
	}
	if commonDir == "" {
		t.Fatal("commonDir empty")
	}
}

func TestResolveRegistration_fromLinkedWorktree(t *testing.T) {
	main := initRepo(t)
	repo := openRepo(t, main)
	wtPath := filepath.Join(filepath.Dir(main), "wt-linked")
	if _, err := svc().AddWorktree(context.Background(), repo, wtPath, gitwork.AddWorktreeOptions{
		Branch:       "linked",
		CreateBranch: true,
	}); err != nil {
		t.Fatalf("AddWorktree: %v", err)
	}
	mainRoot, commonDir, err := svc().ResolveRegistration(context.Background(), wtPath)
	if err != nil {
		t.Fatalf("ResolveRegistration from linked: %v", err)
	}
	wantMain, _ := filepath.Abs(main)
	wantMain = filepath.ToSlash(wantMain)
	if mainRoot != wantMain {
		t.Fatalf("mainRoot=%q want main %q", mainRoot, wantMain)
	}
	_, commonFromMain, err := svc().ResolveRegistration(context.Background(), main)
	if err != nil {
		t.Fatal(err)
	}
	if commonDir != commonFromMain {
		t.Fatalf("commonDir mismatch: linked=%q main=%q", commonDir, commonFromMain)
	}
}

func TestBelongsToRepository_sameRepoDifferentWorktree(t *testing.T) {
	main := initRepo(t)
	repo := openRepo(t, main)
	wtPath := filepath.Join(filepath.Dir(main), "wt-belongs")
	if _, err := svc().AddWorktree(context.Background(), repo, wtPath, gitwork.AddWorktreeOptions{
		Branch:       "belongs",
		CreateBranch: true,
	}); err != nil {
		t.Fatalf("AddWorktree: %v", err)
	}
	ok, err := svc().BelongsToRepository(context.Background(), wtPath, main)
	if err != nil || !ok {
		t.Fatalf("BelongsToRepository same repo: ok=%v err=%v", ok, err)
	}
}

func TestBelongsToRepository_differentRepo(t *testing.T) {
	mainA := initRepo(t)
	mainB := initRepo(t)
	ok, err := svc().BelongsToRepository(context.Background(), mainB, mainA)
	if err != nil {
		t.Fatalf("BelongsToRepository: %v", err)
	}
	if ok {
		t.Fatal("expected false for unrelated repositories")
	}
}

func TestBelongsToRepository_notARepository(t *testing.T) {
	main := initRepo(t)
	ok, err := svc().BelongsToRepository(context.Background(), t.TempDir(), main)
	if err != nil {
		t.Fatalf("BelongsToRepository: %v", err)
	}
	if ok {
		t.Fatal("expected false for non-git path")
	}
}
