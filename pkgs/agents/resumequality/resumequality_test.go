package resumequality

import (
	"testing"
)

func TestRun_requiresEnv(t *testing.T) {
	t.Setenv("T2A_TEST_RESUME_QUALITY", "")
	_, err := Run("http://127.0.0.1:8080", "all", t.TempDir()+"/out.json")
	if err == nil {
		t.Fatal("expected error without T2A_TEST_RESUME_QUALITY")
	}
}

func TestRun_stubWhenEnabled(t *testing.T) {
	t.Setenv("T2A_TEST_RESUME_QUALITY", "1")
	out := t.TempDir() + "/score.json"
	got, err := Run("http://127.0.0.1:8080", "all", out)
	if err != nil {
		t.Fatal(err)
	}
	if !got.Passed || got.OverallPercent < 70 {
		t.Fatalf("got %+v", got)
	}
}
