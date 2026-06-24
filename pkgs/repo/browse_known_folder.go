//go:build !windows

package repo

// resolveKnownBrowseSubdirPath returns the OS-resolved path for a well-known
// profile subdirectory when it differs from filepath.Join(parentDir, name).
// Non-Windows hosts have no shell known-folder layer; callers use the default join.
func resolveKnownBrowseSubdirPath(parentDir, name string) string {
	_ = parentDir
	_ = name
	return ""
}
