package worker

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

var (
	ErrCriteriaReportMissing = errors.New("criteria report missing")
	ErrCriteriaReportInvalid = errors.New("criteria report invalid")
	ErrVerifyReportMissing   = errors.New("verify report missing")
	ErrVerifyReportInvalid   = errors.New("verify report invalid")
)

const maxReportFileBytes = 256 * 1024
const maxFieldBytes = 16 * 1024
const minVerifyReasoning = 40

type criteriaReport struct {
	Criteria []criteriaReportEntry `json:"criteria"`
}

type criteriaReportEntry struct {
	ID          string `json:"id"`
	ClaimedDone bool   `json:"claimed_done"`
	Evidence    string `json:"evidence"`
}

type verifyReport struct {
	Criteria []verifyReportEntry `json:"criteria"`
}

type verifyReportEntry struct {
	ID        string `json:"id"`
	Verified  bool   `json:"verified"`
	Reasoning string `json:"reasoning"`
}

func criteriaReportPath(workingDir, cycleID string) string {
	return filepath.Join(workingDir, ".t2a", cycleID, "criteria-report.json")
}

func verifyReportPath(workingDir, cycleID string) string {
	return filepath.Join(workingDir, ".t2a", cycleID, "verify-report.json")
}

func ensureT2ADir(workingDir string) error {
	dir := filepath.Join(workingDir, ".t2a")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	gitignore := filepath.Join(dir, ".gitignore")
	if _, err := os.Stat(gitignore); os.IsNotExist(err) {
		return os.WriteFile(gitignore, []byte("*\n"), 0o644)
	}
	return nil
}

func scrubCycleArtifacts(workingDir, cycleID string) error {
	return os.RemoveAll(filepath.Join(workingDir, ".t2a", cycleID))
}

func readJSONFile(path string, dest any) error {
	info, err := os.Lstat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return ErrCriteriaReportMissing
		}
		return err
	}
	if info.Mode()&os.ModeSymlink != 0 {
		return fmt.Errorf("%w: symlink not permitted", ErrCriteriaReportInvalid)
	}
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	dec := json.NewDecoder(io.LimitReader(f, maxReportFileBytes))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dest); err != nil {
		return fmt.Errorf("%w: %v", ErrCriteriaReportInvalid, err)
	}
	return nil
}

func parseCriteriaReport(workingDir, cycleID string, expectedIDs map[string]struct{}) (map[string]criteriaReportEntry, error) {
	path := criteriaReportPath(workingDir, cycleID)
	var rep criteriaReport
	if err := readJSONFile(path, &rep); err != nil {
		return nil, err
	}
	out := make(map[string]criteriaReportEntry, len(rep.Criteria))
	for _, e := range rep.Criteria {
		id := strings.TrimSpace(e.ID)
		if id == "" {
			return nil, fmt.Errorf("%w: empty criterion id", ErrCriteriaReportInvalid)
		}
		if _, dup := out[id]; dup {
			return nil, fmt.Errorf("%w: duplicate criterion id %s", ErrCriteriaReportInvalid, id)
		}
		if len(e.Evidence) > maxFieldBytes {
			return nil, fmt.Errorf("%w: evidence too long", ErrCriteriaReportInvalid)
		}
		out[id] = e
	}
	for id := range expectedIDs {
		if _, ok := out[id]; !ok {
			return nil, fmt.Errorf("%w: missing criterion %s", ErrCriteriaReportInvalid, id)
		}
	}
	return out, nil
}

func parseVerifyReport(workingDir, cycleID string, expectedIDs map[string]struct{}) (map[string]verifyReportEntry, error) {
	path := verifyReportPath(workingDir, cycleID)
	var rep verifyReport
	if err := readJSONFile(path, &rep); err != nil {
		if errors.Is(err, ErrCriteriaReportMissing) {
			return nil, ErrVerifyReportMissing
		}
		return nil, err
	}
	out := make(map[string]verifyReportEntry, len(rep.Criteria))
	for _, e := range rep.Criteria {
		id := strings.TrimSpace(e.ID)
		if id == "" {
			return nil, fmt.Errorf("%w: empty criterion id", ErrVerifyReportInvalid)
		}
		if _, dup := out[id]; dup {
			return nil, fmt.Errorf("%w: duplicate criterion id %s", ErrVerifyReportInvalid, id)
		}
		if e.Verified && len(strings.TrimSpace(e.Reasoning)) < minVerifyReasoning {
			return nil, fmt.Errorf("%w: reasoning too short for verified criterion %s", ErrVerifyReportInvalid, id)
		}
		if len(e.Reasoning) > maxFieldBytes {
			return nil, fmt.Errorf("%w: reasoning too long", ErrVerifyReportInvalid)
		}
		out[id] = e
	}
	for id := range expectedIDs {
		if _, ok := out[id]; !ok {
			return nil, fmt.Errorf("%w: missing criterion %s", ErrVerifyReportInvalid, id)
		}
	}
	return out, nil
}
