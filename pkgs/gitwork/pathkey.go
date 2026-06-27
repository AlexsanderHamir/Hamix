package gitwork

import (
	"path/filepath"
	"runtime"
	"strings"
)

// PathKey normalizes filesystem paths for Hamix ↔ git comparisons.
// Git paths use forward slashes; DB rows may use OS-native separators on Windows.
// Shared by reconcile (store/reconcile_git.go), inventory (store_git_inventory.go),
// and worktree probe — keep compare semantics identical across those call sites.
func PathKey(path string) string {
	key := filepath.ToSlash(filepath.Clean(strings.TrimSpace(path)))
	if runtime.GOOS == "windows" {
		key = strings.ToLower(key)
	}
	return key
}
