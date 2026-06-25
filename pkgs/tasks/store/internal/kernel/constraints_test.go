package kernel

import (
	"errors"
	"testing"

	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/domain"
	"gorm.io/gorm"
)

func TestIsDuplicateKey(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want bool
	}{
		{"nil", nil, false},
		{"gorm sentinel", gorm.ErrDuplicatedKey, true},
		{"sqlite unique", errors.New("UNIQUE constraint failed: git_branches.id"), true},
		{"postgres unique", errors.New(`ERROR: duplicate key value violates unique constraint "git_branches_pkey" (SQLSTATE 23505)`), true},
		{"random", errors.New("connection refused"), false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsDuplicateKey(tt.err); got != tt.want {
				t.Fatalf("got %v want %v for %v", got, tt.want, tt.err)
			}
		})
	}
}

func TestIsDuplicatePrimaryKey(t *testing.T) {
	tests := []struct {
		name      string
		err       error
		tableName string
		want      bool
	}{
		{"nil", nil, "tasks", false},
		{"gorm sentinel", gorm.ErrDuplicatedKey, "tasks", true},
		{"sqlite tasks.id", errors.New("UNIQUE constraint failed: tasks.id"), "tasks", true},
		{"sqlite wrong table", errors.New("UNIQUE constraint failed: other.id"), "tasks", false},
		{"postgres pkey", errors.New(`ERROR: duplicate key value violates unique constraint "tasks_pkey" (SQLSTATE 23505)`), "tasks", true},
		{"postgres other table pkey", errors.New(`ERROR: duplicate key value violates unique constraint "foo_pkey" (SQLSTATE 23505)`), "tasks", false},
		{"random", errors.New("connection refused"), "tasks", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsDuplicatePrimaryKey(tt.err, tt.tableName); got != tt.want {
				t.Fatalf("got %v want %v for %v", got, tt.want, tt.err)
			}
		})
	}
}

func TestMapWriteError(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name    string
		err     error
		wantIs  error
		wantNil bool
	}{
		{"nil", nil, nil, true},
		{"duplicate", errors.New("duplicate project row"), domain.ErrConflict, false},
		{"unique", errors.New("UNIQUE constraint failed: projects.id"), domain.ErrConflict, false},
		{"foreign key", errors.New("foreign key constraint failed"), domain.ErrInvalidInput, false},
		{"other", errors.New("connection refused"), nil, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := MapWriteError(tt.err, "duplicate project row")
			if tt.wantNil {
				if got != nil {
					t.Fatalf("got %v want nil", got)
				}
				return
			}
			if tt.wantIs != nil && !errors.Is(got, tt.wantIs) {
				t.Fatalf("got %v want errors.Is(..., %v)", got, tt.wantIs)
			}
		})
	}
}
