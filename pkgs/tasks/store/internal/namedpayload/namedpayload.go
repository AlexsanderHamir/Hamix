// Package namedpayload implements shared CRUD for named JSON-payload
// entities (task drafts and task templates).
package namedpayload

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/calltrace"
	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/domain"
	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/store/internal/kernel"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Summary is the listing-row shape for drafts and templates.
type Summary struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	UpdatedAt time.Time `json:"updated_at"`
	CreatedAt time.Time `json:"created_at"`
}

// Detail is the GET-by-id body shape for drafts and templates.
type Detail struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Payload   json.RawMessage `json:"payload"`
	UpdatedAt time.Time       `json:"updated_at"`
	CreatedAt time.Time       `json:"created_at"`
}

//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by the calling chokepoint."
func clampLimit(limit int) int {
	if limit <= 0 {
		return 50
	}
	if limit > 100 {
		return 100
	}
	return limit
}

func saveRow(
	ctx context.Context,
	db *gorm.DB,
	id, name string,
	payload json.RawMessage,
	nameRequiredMsg string,
	opSave string,
	logOp string,
	saveErr string,
	updateErr string,
	create func(string, string, datatypes.JSON, time.Time) any,
	model any,
) (*Summary, error) {
	defer kernel.DeferLatency(opSave)()
	slog.Debug("trace", "cmd", calltrace.LogCmd, "operation", logOp)
	id = strings.TrimSpace(id)
	if id == "" {
		id = uuid.NewString()
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("%w: %s", domain.ErrInvalidInput, nameRequiredMsg)
	}
	normalized, err := kernel.NormalizeJSONObject(payload, "payload")
	if err != nil {
		return nil, err
	}
	payload = normalized
	now := time.Now().UTC()
	row := create(id, name, datatypes.JSON(payload), now)
	if err := db.WithContext(ctx).Where("id = ?", id).FirstOrCreate(row).Error; err != nil {
		return nil, fmt.Errorf("%s: %w", saveErr, err)
	}
	if err := db.WithContext(ctx).Model(model).Where("id = ?", id).Updates(map[string]any{
		"name":         name,
		"payload_json": payload,
		"updated_at":   now,
	}).Error; err != nil {
		return nil, fmt.Errorf("%s: %w", updateErr, err)
	}
	createdAt := now
	switch r := row.(type) {
	case *domain.TaskDraft:
		createdAt = r.CreatedAt
	case *domain.TaskTemplate:
		createdAt = r.CreatedAt
	case domain.TaskDraft:
		createdAt = r.CreatedAt
	case domain.TaskTemplate:
		createdAt = r.CreatedAt
	}
	return &Summary{ID: id, Name: name, UpdatedAt: now, CreatedAt: createdAt}, nil
}

func SaveDraft(ctx context.Context, db *gorm.DB, id, name string, payload json.RawMessage) (*Summary, error) {
	return saveRow(ctx, db, id, name, payload,
		"draft name required",
		kernel.OpSaveDraft,
		"tasks.store.drafts.Save",
		"save draft", "update draft",
		func(id, name string, p datatypes.JSON, now time.Time) any {
			return &domain.TaskDraft{ID: id, Name: name, PayloadJSON: p, CreatedAt: now, UpdatedAt: now}
		},
		&domain.TaskDraft{},
	)
}

func SaveTemplate(ctx context.Context, db *gorm.DB, id, name string, payload json.RawMessage) (*Summary, error) {
	return saveRow(ctx, db, id, name, payload,
		"template name required",
		kernel.OpSaveTemplate,
		"tasks.store.templates.Save",
		"save template", "update template",
		func(id, name string, p datatypes.JSON, now time.Time) any {
			return &domain.TaskTemplate{ID: id, Name: name, PayloadJSON: p, CreatedAt: now, UpdatedAt: now}
		},
		&domain.TaskTemplate{},
	)
}

func ListDrafts(ctx context.Context, db *gorm.DB, limit int) ([]Summary, error) {
	defer kernel.DeferLatency(kernel.OpListDrafts)()
	slog.Debug("trace", "cmd", calltrace.LogCmd, "operation", "tasks.store.drafts.List")
	limit = clampLimit(limit)
	var rows []domain.TaskDraft
	if err := db.WithContext(ctx).Order("updated_at DESC").Limit(limit).Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("list drafts: %w", err)
	}
	return summariesFromDrafts(rows), nil
}

func ListTemplates(ctx context.Context, db *gorm.DB, limit int, q string) ([]Summary, error) {
	defer kernel.DeferLatency(kernel.OpListTemplates)()
	slog.Debug("trace", "cmd", calltrace.LogCmd, "operation", "tasks.store.templates.List")
	limit = clampLimit(limit)
	query := db.WithContext(ctx).Model(&domain.TaskTemplate{}).Order("updated_at DESC").Limit(limit)
	q = strings.TrimSpace(q)
	if q != "" {
		like := "%" + escapeLike(strings.ToLower(q)) + "%"
		query = query.Where("LOWER(name) LIKE ?", like)
	}
	var rows []domain.TaskTemplate
	if err := query.Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("list templates: %w", err)
	}
	return summariesFromTemplates(rows), nil
}

func GetDraft(ctx context.Context, db *gorm.DB, id string) (*Detail, error) {
	return getByID(ctx, db, id, kernel.OpGetDraft, "tasks.store.drafts.Get", &domain.TaskDraft{})
}

func GetTemplate(ctx context.Context, db *gorm.DB, id string) (*Detail, error) {
	return getByID(ctx, db, id, kernel.OpGetTemplate, "tasks.store.templates.Get", &domain.TaskTemplate{})
}

func getByID(ctx context.Context, db *gorm.DB, id string, op string, logOp string, model any) (*Detail, error) {
	defer kernel.DeferLatency(op)()
	slog.Debug("trace", "cmd", calltrace.LogCmd, "operation", logOp)
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, fmt.Errorf("%w: id", domain.ErrInvalidInput)
	}
	switch m := model.(type) {
	case *domain.TaskDraft:
		if err := db.WithContext(ctx).Where("id = ?", id).First(m).Error; err != nil {
			return nil, kernel.MapNotFound(err)
		}
		return &Detail{
			ID: m.ID, Name: m.Name, Payload: json.RawMessage(m.PayloadJSON),
			UpdatedAt: m.UpdatedAt, CreatedAt: m.CreatedAt,
		}, nil
	case *domain.TaskTemplate:
		if err := db.WithContext(ctx).Where("id = ?", id).First(m).Error; err != nil {
			return nil, kernel.MapNotFound(err)
		}
		return &Detail{
			ID: m.ID, Name: m.Name, Payload: json.RawMessage(m.PayloadJSON),
			UpdatedAt: m.UpdatedAt, CreatedAt: m.CreatedAt,
		}, nil
	default:
		return nil, fmt.Errorf("db: unsupported entity type")
	}
}

func DeleteDraft(ctx context.Context, db *gorm.DB, id string) error {
	return deleteByID(ctx, db, id, kernel.OpDeleteDraft, "tasks.store.drafts.Delete", "delete draft", &domain.TaskDraft{})
}

func DeleteTemplate(ctx context.Context, db *gorm.DB, id string) error {
	return deleteByID(ctx, db, id, kernel.OpDeleteTemplate, "tasks.store.templates.Delete", "delete template", &domain.TaskTemplate{})
}

func deleteByID(ctx context.Context, db *gorm.DB, id string, op string, logOp, deleteErr string, model any) error {
	defer kernel.DeferLatency(op)()
	slog.Debug("trace", "cmd", calltrace.LogCmd, "operation", logOp)
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("%w: id", domain.ErrInvalidInput)
	}
	res := db.WithContext(ctx).Where("id = ?", id).Delete(model)
	if res.Error != nil {
		return fmt.Errorf("%s: %w", deleteErr, res.Error)
	}
	if res.RowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}

//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by ListDrafts."
func summariesFromDrafts(rows []domain.TaskDraft) []Summary {
	out := make([]Summary, 0, len(rows))
	for _, r := range rows {
		out = append(out, Summary{ID: r.ID, Name: r.Name, UpdatedAt: r.UpdatedAt, CreatedAt: r.CreatedAt})
	}
	return out
}

//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by ListTemplates."
func summariesFromTemplates(rows []domain.TaskTemplate) []Summary {
	out := make([]Summary, 0, len(rows))
	for _, r := range rows {
		out = append(out, Summary{ID: r.ID, Name: r.Name, UpdatedAt: r.UpdatedAt, CreatedAt: r.CreatedAt})
	}
	return out
}

//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by ListTemplates."
func escapeLike(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `%`, `\%`)
	s = strings.ReplaceAll(s, `_`, `\_`)
	return s
}
