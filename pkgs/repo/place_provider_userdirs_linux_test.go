//go:build linux

package repo

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseXDGUserDirsFile_expandsHomeAndQuotes(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	config := filepath.Join(home, "user-dirs.dirs")
	content := `# user dirs
XDG_DOCUMENTS_DIR="$HOME/work/docs"
XDG_DOWNLOAD_DIR="$HOME/Downloads"
`
	if err := os.WriteFile(config, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	docs := filepath.Join(home, "work", "docs")
	downloads := filepath.Join(home, "Downloads")
	for _, dir := range []string{docs, downloads} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatal(err)
		}
	}
	got, err := parseXDGUserDirsFile(config, home)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 {
		t.Fatalf("got %d places want 2", len(got))
	}
	if got[0].Path != filepath.Clean(docs) || got[0].Category != PlaceCategoryDocuments {
		t.Fatalf("documents = %+v", got[0])
	}
	if got[1].Path != filepath.Clean(downloads) {
		t.Fatalf("downloads = %+v", got[1])
	}
}

func TestParseXDGUserDirsFile_missingFileUsesDefaults(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	docs := filepath.Join(home, "Documents")
	if err := os.MkdirAll(docs, 0o755); err != nil {
		t.Fatal(err)
	}
	got, err := parseXDGUserDirsFile(filepath.Join(home, "missing"), home)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].Category != PlaceCategoryDocuments {
		t.Fatalf("got %+v", got)
	}
}
