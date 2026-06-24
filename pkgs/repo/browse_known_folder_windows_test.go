//go:build windows

package repo

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"golang.org/x/sys/windows"
)

func TestListBrowseDirs_resolvesKnownProfileFoldersOnWindows(t *testing.T) {
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

	roots := []BrowseRoot{{ID: "home", Path: home, Label: "Home", Available: true}}
	listing, err := ListBrowseDirs(roots, home)
	if err != nil {
		t.Fatal(err)
	}
	var documentsEntry *BrowseDirEntry
	for i := range listing.Entries {
		if strings.EqualFold(listing.Entries[i].Name, "Documents") {
			documentsEntry = &listing.Entries[i]
			break
		}
	}
	if documentsEntry == nil {
		t.Fatal("expected Documents entry under home")
	}
	if filepath.Clean(documentsEntry.Path) != filepath.Clean(documentsKnown) {
		t.Fatalf("Documents path = %q want known folder %q", documentsEntry.Path, documentsKnown)
	}

	nested, err := ListBrowseDirs(roots, documentsEntry.Path)
	if err != nil {
		t.Fatal(err)
	}
	if len(nested.Entries) < 10 {
		t.Fatalf("expected many folders under redirected Documents, got %d", len(nested.Entries))
	}
}
