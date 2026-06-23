package gitwork

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const logCmd = "taskapi"

const stderrCap = 200

type execError struct {
	err    error
	stderr string
}

func (e *execError) Error() string {
	msg := e.err.Error()
	if e.stderr == "" {
		return msg
	}
	trimmed := e.stderr
	if len(trimmed) > stderrCap {
		trimmed = trimmed[:stderrCap] + "..."
	}
	return msg + ": " + trimmed
}

func (e *execError) Unwrap() error { return e.err }

func (s *DefaultService) runGit(ctx context.Context, dir string, args ...string) (string, error) {
	start := time.Now()
	dir = filepath.Clean(dir)
	all := append([]string{"-C", dir}, args...)
	cmd := exec.CommandContext(ctx, "git", all...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	slog.DebugContext(ctx, "git command",
		"cmd", logCmd,
		"operation", "gitwork.runGit",
		"dir", dir,
		"args", args,
		"duration_ms", time.Since(start).Milliseconds(),
	)
	if err != nil {
		if errors.Is(err, exec.ErrNotFound) {
			return "", fmt.Errorf("%w: %v", ErrGitMissing, err)
		}
		return "", &execError{err: err, stderr: strings.TrimSpace(stderr.String())}
	}
	return strings.TrimSpace(stdout.String()), nil
}

//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by the calling chokepoint."
func execStderr(err error) string {
	var ee *execError
	if errors.As(err, &ee) {
		return ee.stderr
	}
	return ""
}

//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by the calling chokepoint."
func stderrContains(err error, substr string) bool {
	return strings.Contains(strings.ToLower(execStderr(err)), strings.ToLower(substr))
}

//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by the calling chokepoint."
func mapNotARepository(err error) error {
	if err == nil {
		return nil
	}
	if stderrContains(err, "not a git repository") {
		return ErrNotARepository
	}
	return err
}

//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by the calling chokepoint."
func mapWorktreeAddErr(err error) error {
	if err == nil {
		return nil
	}
	if stderrContains(err, "is already checked out") ||
		stderrContains(err, "already used by worktree") {
		return ErrBranchCheckedOut
	}
	if stderrContains(err, "already exists") {
		return ErrWorktreeExists
	}
	return err
}

//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by the calling chokepoint."
func mapBranchCreateErr(err error) error {
	if err == nil {
		return nil
	}
	if stderrContains(err, "already exists") {
		return ErrBranchExists
	}
	return err
}

//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by the calling chokepoint."
func mapBranchDeleteErr(err error) error {
	if err == nil {
		return nil
	}
	if stderrContains(err, "checked out") ||
		stderrContains(err, "used by worktree") {
		return ErrBranchCheckedOut
	}
	return err
}

//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by the calling chokepoint."
func mapWorktreeRemoveErr(err error) error {
	if err == nil {
		return nil
	}
	if stderrContains(err, "modified or untracked files") ||
		strings.Contains(strings.ToLower(execStderr(err)), "contains modified") {
		return ErrDirty
	}
	return err
}

//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by the calling chokepoint."
func mapCheckoutErr(err error) error {
	if err == nil {
		return nil
	}
	if stderrContains(err, "already checked out") ||
		stderrContains(err, "used by worktree") {
		return ErrBranchCheckedOut
	}
	if stderrContains(err, "local changes") ||
		stderrContains(err, "would be overwritten") {
		return ErrDirty
	}
	return err
}

//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by the calling chokepoint."
func absPath(p string) (string, error) {
	p = filepath.Clean(p)
	abs, err := filepath.Abs(p)
	if err != nil {
		return "", err
	}
	return filepath.ToSlash(abs), nil
}
