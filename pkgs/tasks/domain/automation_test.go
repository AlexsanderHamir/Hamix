package domain

import (
	"errors"
	"testing"
)

func TestValidateAutomationFields(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name    string
		title   string
		desc    string
		wantErr error
	}{
		{name: "valid", title: "Run tests", desc: "Run the full test suite before claiming done"},
		{name: "empty title", title: " ", desc: "x", wantErr: ErrInvalidInput},
		{name: "empty description", title: "x", desc: " ", wantErr: ErrInvalidInput},
		{name: "do not prefix", title: "Comments", desc: "Do not add inline comments", wantErr: ErrInvalidInput},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			_, _, err := ValidateAutomationFields(tt.title, tt.desc)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("got %v want %v", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected: %v", err)
			}
		})
	}
}

func TestValidateAutomationSelections(t *testing.T) {
	t.Parallel()
	_, err := ValidateAutomationSelections([]AutomationSelection{
		{AutomationID: "a", State: AutomationStateYes},
		{AutomationID: "a", State: AutomationStateNo},
	})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("duplicate: got %v", err)
	}
	out, err := ValidateAutomationSelections([]AutomationSelection{
		{AutomationID: "a", State: "yes"},
		{AutomationID: "b", State: "no"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 2 || out[0].State != AutomationStateYes {
		t.Fatalf("got %+v", out)
	}
}
