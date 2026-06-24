//go:build windows

package repo

import (
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/sys/windows"
)

// resolveKnownBrowseSubdirPath returns the shell-known folder path for profile
// subdirectories (Documents, Desktop, …) when OneDrive or folder redirection
// points them somewhere other than filepath.Join(home, name).
func resolveKnownBrowseSubdirPath(parentDir, name string) string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	if filepath.Clean(parentDir) != filepath.Clean(home) {
		return ""
	}
	folderID, ok := windowsKnownFolderForName(name)
	if !ok {
		return ""
	}
	known, err := windows.KnownFolderPath(folderID, 0)
	if err != nil {
		return ""
	}
	known = filepath.Clean(known)
	defaultJoin := filepath.Clean(filepath.Join(parentDir, name))
	if known == defaultJoin {
		return ""
	}
	fi, err := os.Stat(known)
	if err != nil || !fi.IsDir() {
		return ""
	}
	return known
}

func windowsKnownFolderForName(name string) (*windows.KNOWNFOLDERID, bool) {
	switch strings.ToLower(name) {
	case "desktop":
		return windows.FOLDERID_Desktop, true
	case "documents":
		return windows.FOLDERID_Documents, true
	case "downloads":
		return windows.FOLDERID_Downloads, true
	case "music":
		return windows.FOLDERID_Music, true
	case "pictures":
		return windows.FOLDERID_Pictures, true
	case "videos":
		return windows.FOLDERID_Videos, true
	default:
		return nil, false
	}
}
