// Package storefake provides a harness.Store test double backed by in-memory
// SQLite so harness contract tests exercise real store semantics without a
// worker loop or external database.
package storefake

import (
	"testing"

	"github.com/AlexsanderHamir/Hamix/internal/tasktestdb"
	"github.com/AlexsanderHamir/Hamix/pkgs/agents/harness"
	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/store"
)

// Fake satisfies harness.Store using the same SQLite-backed store as integration
// tests, isolated per test via t.TempDir-backed DB.
type Fake struct {
	*store.Store
}

// New returns a Fake that implements harness.Store.
func New(t *testing.T) *Fake {
	t.Helper()
	st := store.NewStore(tasktestdb.OpenSQLite(t))
	return &Fake{Store: st}
}

var _ harness.Store = (*Fake)(nil)
