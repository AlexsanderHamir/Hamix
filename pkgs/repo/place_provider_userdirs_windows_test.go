//go:build windows

package repo

import (
	"os"
	"path/filepath"
	"testing"

	"golang.org/x/sys/windows"
)

func TestResolveBrowseRoots_includesRedirectedDocumentsOnWindows(t *testing.T) {
	t.Parallel()
	home, err := os.UserHomeDir()
	if err != nil {
		t.Fatal(err)
	}
	documentsKnown, err := windows.KnownFolderPath(windows.FOLDERID_Documents, 0)
	if err != nil {
		t.Fatal(err)
	}
	defaultDocuments := filepath.Join(home, "Documents")
	if filepath.Clean(documentsKnown) == filepath.Clean(defaultDocuments) {
		t.Skip("Documents is not redirected on this host")
	}

	roots, _, err := ResolveBrowseRoots(home)
	if err != nil {
		t.Fatal(err)
	}
	var documentsRoot *BrowseRoot
	for i := range roots {
		if roots[i].Category == PlaceCategoryDocuments {
			documentsRoot = &roots[i]
			break
		}
	}
	if documentsRoot == nil {
		t.Fatal("expected Documents root")
	}
	if filepath.Clean(documentsRoot.Path) != filepath.Clean(documentsKnown) {
		t.Fatalf("Documents path = %q want known folder %q", documentsRoot.Path, documentsKnown)
	}

	listing, err := ListBrowseDirs(roots, documentsRoot.Path)
	if err != nil {
		t.Fatal(err)
	}
	if len(listing.Entries) < 10 {
		t.Fatalf("expected many folders under redirected Documents, got %d", len(listing.Entries))
	}
}

func TestResolveBrowseRoots_customEnvSkipsUserDirs(t *testing.T) {
	custom := t.TempDir()
	t.Setenv("HAMIX_BROWSE_ROOTS", custom)
	roots, _, err := ResolveBrowseRoots(custom)
	if err != nil {
		t.Fatal(err)
	}
	for _, r := range roots {
		if r.Category == PlaceCategoryDocuments {
			t.Fatalf("custom override should not include user dirs, got %+v", r)
		}
	}
}
