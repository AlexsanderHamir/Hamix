package tasks

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
	"github.com/AlexsanderHamir/T2A/pkgs/tasks/store/internal/kernel"
	"gorm.io/gorm"
)

// ListFlat returns tasks ordered by id ASC with limit/offset over all
// rows. limit is clamped to [1, 200] (default 50) and offset to [0, +inf).
func ListFlat(ctx context.Context, db *gorm.DB, limit, offset int, filter *ListFilter) ([]domain.Task, error) {
	defer kernel.DeferLatency(kernel.OpListFlat)()
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.tasks.ListFlat")
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}
	q := db.WithContext(ctx).Model(&domain.Task{})
	q = applyListFilter(q, db, filter)
	var out []domain.Task
	err := q.Order("id ASC").
		Limit(limit).
		Offset(offset).
		Find(&out).Error
	if err != nil {
		return nil, fmt.Errorf("list tasks: %w", err)
	}
	for i := range out {
		if err := hydrateDependsOn(ctx, db, &out[i]); err != nil {
			return nil, err
		}
	}
	return out, nil
}

// ListFlatAfter is the keyset variant of ListFlat: returns tasks with
// id strictly greater than afterID (same ordering).
func ListFlatAfter(ctx context.Context, db *gorm.DB, limit int, afterID string) ([]domain.Task, bool, error) {
	defer kernel.DeferLatency(kernel.OpListFlatAfter)()
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.tasks.ListFlatAfter")
	afterID = strings.TrimSpace(afterID)
	if afterID == "" {
		return nil, false, fmt.Errorf("%w: after_id", domain.ErrInvalidInput)
	}
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	q := db.WithContext(ctx).Model(&domain.Task{}).Where("id > ?", afterID)
	var rows []domain.Task
	err := q.Order("id ASC").Limit(limit + 1).Find(&rows).Error
	if err != nil {
		return nil, false, fmt.Errorf("list tasks after id: %w", err)
	}
	hasMore := len(rows) > limit
	if hasMore {
		rows = rows[:limit]
	}
	for i := range rows {
		if err := hydrateDependsOn(ctx, db, &rows[i]); err != nil {
			return nil, false, err
		}
	}
	return rows, hasMore, nil
}

// ListFlatPage returns a flat page with hasMore using limit+1 fetch.
func ListFlatPage(ctx context.Context, db *gorm.DB, limit, offset int, filter *ListFilter) ([]domain.Task, bool, error) {
	slog.Debug("trace", "cmd", logCmd, "operation", "tasks.store.tasks.ListFlatPage")
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}
	q := db.WithContext(ctx).Model(&domain.Task{})
	q = applyListFilter(q, db, filter)
	var rows []domain.Task
	err := q.Order("id ASC").Limit(limit + 1).Offset(offset).Find(&rows).Error
	if err != nil {
		return nil, false, fmt.Errorf("list tasks: %w", err)
	}
	hasMore := len(rows) > limit
	if hasMore {
		rows = rows[:limit]
	}
	for i := range rows {
		if err := hydrateDependsOn(ctx, db, &rows[i]); err != nil {
			return nil, false, err
		}
	}
	return rows, hasMore, nil
}
