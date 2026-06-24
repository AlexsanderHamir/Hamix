//go:build windows

package repo

import (
	"os"
	"path/filepath"

	"golang.org/x/sys/windows"
)

//funclogmeasure:skip category=hot-path reason="Browse sub-step; operation trace is emitted by ResolveBrowseRoots."
func resolveUserDirPlaces() ([]Place, error) {
	specs := []struct {
		category PlaceCategory
		folderID *windows.KNOWNFOLDERID
		label    string
		id       string
	}{
		{PlaceCategoryDesktop, windows.FOLDERID_Desktop, "Desktop", "desktop"},
		{PlaceCategoryDocuments, windows.FOLDERID_Documents, "Documents", "documents"},
		{PlaceCategoryDownloads, windows.FOLDERID_Downloads, "Downloads", "downloads"},
		{PlaceCategoryPictures, windows.FOLDERID_Pictures, "Pictures", "pictures"},
		{PlaceCategoryMusic, windows.FOLDERID_Music, "Music", "music"},
		{PlaceCategoryVideos, windows.FOLDERID_Videos, "Videos", "videos"},
	}
	out := make([]Place, 0, len(specs))
	for _, spec := range specs {
		path, err := windows.KnownFolderPath(spec.folderID, 0)
		if err != nil {
			continue
		}
		path = filepath.Clean(path)
		fi, err := os.Stat(path)
		if err != nil || !fi.IsDir() {
			continue
		}
		out = append(out, Place{
			ID:        spec.id,
			Path:      path,
			Label:     spec.label,
			Category:  spec.category,
			Available: true,
		})
	}
	return out, nil
}
