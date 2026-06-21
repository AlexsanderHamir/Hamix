package repo

import (
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
)

// FindInstallRoot walks upward from startDir until go.mod is found.
func FindInstallRoot(startDir string) (string, error) {
	slog.Debug("trace", "operation", "repo.FindInstallRoot")
	dir, err := filepath.Abs(startDir)
	if err != nil {
		return "", fmt.Errorf("install root: %w", err)
	}
	for {
		mod := filepath.Join(dir, "go.mod")
		if _, err := os.Stat(mod); err == nil {
			return dir, nil
		} else if !errors.Is(err, os.ErrNotExist) {
			return "", fmt.Errorf("stat %s: %w", mod, err)
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", errors.New("go.mod not found")
		}
		dir = parent
	}
}
