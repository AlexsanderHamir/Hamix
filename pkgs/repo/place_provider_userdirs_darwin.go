//go:build darwin

package repo

import (
	"os"
	"path/filepath"
)

func resolveUserDirPlaces() ([]Place, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, nil
	}
	specs := []struct {
		category PlaceCategory
		dir      string
		label    string
		id       string
	}{
		{PlaceCategoryDesktop, "Desktop", "Desktop", "desktop"},
		{PlaceCategoryDocuments, "Documents", "Documents", "documents"},
		{PlaceCategoryDownloads, "Downloads", "Downloads", "downloads"},
		{PlaceCategoryPictures, "Pictures", "Pictures", "pictures"},
		{PlaceCategoryMusic, "Music", "Music", "music"},
		{PlaceCategoryVideos, "Movies", "Videos", "videos"},
	}
	out := make([]Place, 0, len(specs))
	for _, spec := range specs {
		path := filepath.Join(home, spec.dir)
		fi, err := os.Stat(path)
		if err != nil || !fi.IsDir() {
			continue
		}
		out = append(out, Place{
			ID:        spec.id,
			Path:      filepath.Clean(path),
			Label:     spec.label,
			Category:  spec.category,
			Available: true,
		})
	}
	return out, nil
}
