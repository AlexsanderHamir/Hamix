package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func moduleRoot(t *testing.T) string {
	t.Helper()
	dir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatal("go.mod not found")
		}
		dir = parent
	}
}

func runDevconfig(t *testing.T, extraEnv ...string) string {
	t.Helper()
	root := moduleRoot(t)
	cmd := exec.Command("go", "run", "./cmd/devconfig", "-readiness-timeout-sec")
	cmd.Dir = root
	cmd.Env = append(os.Environ(), extraEnv...)
	out, err := cmd.Output()
	if err != nil {
		t.Fatal(err)
	}
	return strings.TrimSpace(string(out))
}

func TestReadinessTimeoutSec_default(t *testing.T) {
	if got := runDevconfig(t); got != "150" {
		t.Fatalf("got %q want 150", got)
	}
}

func TestReadinessTimeoutSec_envOverride(t *testing.T) {
	got := runDevconfig(t, "DEV_TASKAPI_STARTUP_TIMEOUT_SEC=200")
	if got != "200" {
		t.Fatalf("got %q want 200", got)
	}
}
