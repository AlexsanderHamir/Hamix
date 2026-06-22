package gitwork

import "path/filepath"

// ParseWorktreePorcelainForTest exposes porcelain parsing for unit tests without git I/O.
func ParseWorktreePorcelainForTest(out, mainRoot string) ([]Worktree, error) {
	mainRoot = filepath.ToSlash(mainRoot)
	return parseWorktreePorcelain(out, mainRoot)
}

// AbsPathForTest exposes absPath for unit tests.
func AbsPathForTest(path string) (string, error) {
	return absPath(path)
}
