package harness

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Harness *_test.go files must use storefake instead of importing tasktestdb
// directly so the contract tier stays behind harness.Store.
func TestHarnessTestsDoNotImportTasktestdb(t *testing.T) {
	t.Parallel()
	var offenders []string
	err := filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
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
		b, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if strings.Contains(string(b), `"github.com/AlexsanderHamir/Hamix/internal/tasktestdb"`) {
			offenders = append(offenders, path)
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
