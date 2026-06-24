package kernel

import (
	"errors"
	"fmt"

	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/domain"
	"gorm.io/gorm"
)

// MapNotFound translates gorm.ErrRecordNotFound into domain.ErrNotFound so
// handlers can use errors.Is without importing gorm.
//
//funclogmeasure:skip category=hot-path reason="Pure error mapper without I/O; callers emit operation trace."
func MapNotFound(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return domain.ErrNotFound
	}
	return fmt.Errorf("db: %w", err)
}
