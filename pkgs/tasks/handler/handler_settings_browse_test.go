package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"testing"

	"github.com/AlexsanderHamir/Hamix/internal/tasktestdb"
	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/store"
)

func TestHTTP_workspaceRoots_returnsBrowseRoots(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "go.mod"), []byte("module test\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("HAMIX_BROWSE_ROOTS", root)

	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(root); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chdir(wd) })

	db := tasktestdb.OpenSQLite(t)
	st := store.NewStore(db)
	h := NewHandler(st, NewSSEHub(), nil)
	srv := httptest.NewServer(h)
	defer srv.Close()

	res, err := http.Get(srv.URL + "/settings/workspace-roots")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(res.Body)
		t.Fatalf("status %d body=%s", res.StatusCode, b)
	}
	var body workspaceRootsResponse
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body.Environment != "native" {
		t.Fatalf("environment=%q", body.Environment)
	}
	if len(body.Roots) != 1 || body.Roots[0].Path != root {
		t.Fatalf("roots=%+v", body.Roots)
	}
}

func TestHTTP_browseDirs_listsProjectFolder(t *testing.T) {
	root := t.TempDir()
	project := filepath.Join(root, "my-app")
	if err := os.MkdirAll(project, 0o755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("HAMIX_BROWSE_ROOTS", root)

	db := tasktestdb.OpenSQLite(t)
	st := store.NewStore(db)
	h := NewHandler(st, NewSSEHub(), nil)
	srv := httptest.NewServer(h)
	defer srv.Close()

	res, err := http.Get(srv.URL + "/settings/browse-dirs?path=" + url.QueryEscape(root))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(res.Body)
		t.Fatalf("status %d body=%s", res.StatusCode, b)
	}
	var body browseDirsResponse
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if len(body.Entries) != 1 || body.Entries[0].Name != "my-app" {
		t.Fatalf("entries=%+v", body.Entries)
	}
}

func TestHTTP_browseDirs_worksWithoutRepoRootConfigured(t *testing.T) {
	root := t.TempDir()
	t.Setenv("HAMIX_BROWSE_ROOTS", root)

	db := tasktestdb.OpenSQLite(t)
	st := store.NewStore(db)
	h := NewHandler(st, NewSSEHub(), nil, WithRepoProvider(NewSettingsRepoProvider(st)))
	srv := httptest.NewServer(h)
	defer srv.Close()

	res, err := http.Get(srv.URL + "/settings/browse-dirs")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(res.Body)
		t.Fatalf("status %d body=%s", res.StatusCode, b)
	}
}
