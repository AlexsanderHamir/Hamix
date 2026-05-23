package worker

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
)

const maxCheckOutputBytes = 4 * 1024

type checkOutcome struct {
	passed   bool
	timedOut bool
	stdout   string
	stderr   string
}

func runDeterministicCheck(ctx context.Context, workingDir, command string, timeout time.Duration) checkOutcome {
	command = strings.TrimSpace(command)
	if command == "" {
		return checkOutcome{passed: true}
	}
	if timeout <= 0 {
		timeout = time.Duration(domain.DefaultCheckCommandTimeoutSeconds) * time.Second
	}
	runCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.CommandContext(runCtx, "cmd", "/C", command)
	} else {
		cmd = exec.CommandContext(runCtx, "sh", "-c", command)
	}
	cmd.Dir = workingDir
	cmd.Env = os.Environ()
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	out := checkOutcome{
		passed: err == nil,
		stdout: truncateBytes(stdout.Bytes(), maxCheckOutputBytes),
		stderr: truncateBytes(stderr.Bytes(), maxCheckOutputBytes),
	}
	if runCtx.Err() == context.DeadlineExceeded {
		out.timedOut = true
		out.passed = false
	}
	return out
}

func truncateBytes(b []byte, max int) string {
	if len(b) <= max {
		return string(b)
	}
	return string(b[:max]) + "…(truncated)"
}
