package harness

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// Harness *_test.go files must use storefake instead of importing tasktestdb
// directly so the contract tier stays behind harness.Store.
func TestHarnessTestsDoNotImportTasktestdb(t *testing.T) {
	t.Parallel()
	root := harnessRoot(t)
	var offenders []string
	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			if info.Name() == "storefake" {
				return filepath.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(path, "_test.go") {
			return nil
		}
		if filepath.Base(path) == "import_guard_test.go" {
			return nil
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		b, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if strings.Contains(string(b), `"github.com/AlexsanderHamir/Hamix/internal/tasktestdb"`) {
			offenders = append(offenders, rel)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(offenders) > 0 {
		t.Fatalf("harness tests must not import tasktestdb directly; use storefake:\n%s", strings.Join(offenders, "\n"))
	}
}

func harnessRoot(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	dir := filepath.Dir(file)
	for {
		if filepath.Base(dir) == "harness" && filepath.Base(filepath.Dir(dir)) == "agents" {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatal("harness package root not found")
		}
		dir = parent
	}
}
