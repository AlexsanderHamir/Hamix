package handler

import "testing"

func TestPathMap_TranslateToHost(t *testing.T) {
	pm := testPathMap(
		pathMapPair{container: "/host-home", host: "/Users/me"},
		pathMapPair{container: "/host-home/code", host: "/Users/me/dev"},
		pathMapPair{container: "/host-cli", host: "/opt/homebrew/bin"},
	)

	tests := []struct {
		name   string
		pm     *PathMap
		in     string
		want   string
		wantOK bool
	}{
		{name: "empty map passthrough", pm: &PathMap{}, in: "/host-home/foo", want: "/host-home/foo", wantOK: false},
		{name: "nil map passthrough", pm: nil, in: "/host-home/foo", want: "/host-home/foo", wantOK: false},
		{name: "longest prefix wins", pm: pm, in: "/host-home/code/myapp", want: "/Users/me/dev/myapp", wantOK: true},
		{name: "shorter prefix", pm: pm, in: "/host-home/docs", want: "/Users/me/docs", wantOK: true},
		{name: "exact prefix", pm: pm, in: "/host-home", want: "/Users/me", wantOK: true},
		{name: "cli mount", pm: pm, in: "/host-cli/cursor", want: "/opt/homebrew/bin/cursor", wantOK: true},
		{name: "no match", pm: pm, in: "/app/web", want: "/app/web", wantOK: false},
		{name: "no partial segment match", pm: pm, in: "/host-home2/x", want: "/host-home2/x", wantOK: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := tt.pm.TranslateToHost(tt.in)
			if got != tt.want || ok != tt.wantOK {
				t.Fatalf("TranslateToHost(%q) = (%q, %v), want (%q, %v)", tt.in, got, ok, tt.want, tt.wantOK)
			}
		})
	}
}

func TestPathMap_DisplayHostPath(t *testing.T) {
	pm := testPathMap(pathMapPair{container: "/host-home", host: "/Users/me"})
	if got := pm.DisplayHostPath("/host-home/repo"); got != "/Users/me/repo" {
		t.Fatalf("DisplayHostPath mapped = %q", got)
	}
	if got := pm.DisplayHostPath("/app"); got != "/app" {
		t.Fatalf("DisplayHostPath passthrough = %q", got)
	}
}

func TestNewPathMapFromEnv_invalidJSON(t *testing.T) {
	t.Setenv("HAMIX_PATH_MAP", "{not json")
	pm := NewPathMapFromEnv()
	if len(pm.pairs) != 0 {
		t.Fatalf("expected empty map, got %+v", pm.pairs)
	}
}

func TestNewPathMapFromEnv_validJSON(t *testing.T) {
	t.Setenv("HAMIX_PATH_MAP", `{"\/host-home":"/Users/me"}`)
	pm := NewPathMapFromEnv()
	host, ok := pm.TranslateToHost("/host-home/proj")
	if !ok || host != "/Users/me/proj" {
		t.Fatalf("TranslateToHost = (%q, %v)", host, ok)
	}
}

func testPathMap(pairs ...pathMapPair) *PathMap {
	out := append([]pathMapPair(nil), pairs...)
	sortPathMapPairs(out)
	return &PathMap{pairs: out}
}
