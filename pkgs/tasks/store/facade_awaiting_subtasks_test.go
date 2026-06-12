package store_test

import (
	"context"
	"testing"

	"github.com/AlexsanderHamir/T2A/internal/tasktestdb"
	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
	"github.com/AlexsanderHamir/T2A/pkgs/tasks/store"
)

func TestStore_Update_rejectsUserAwaitingSubtasksStatus(t *testing.T) {
	t.Parallel()
	db := tasktestdb.OpenSQLite(t)
	st := store.NewStore(db)
	ctx := context.Background()

	tsk, err := st.Create(ctx, store.CreateTaskInput{
		Title: "t", InitialPrompt: "p", Status: domain.StatusReady, Priority: domain.PriorityMedium,
	}, domain.ActorUser)
	if err != nil {
		t.Fatal(err)
	}

	awaiting := domain.StatusAwaitingSubtasks
	_, err = st.Update(ctx, tsk.ID, store.UpdateTaskInput{Status: &awaiting}, domain.ActorUser)
	if err == nil {
		t.Fatal("expected user PATCH awaiting_subtasks to fail")
	}
}

func TestStore_Create_rejectsAwaitingSubtasksStatus(t *testing.T) {
	t.Parallel()
	db := tasktestdb.OpenSQLite(t)
	st := store.NewStore(db)
	ctx := context.Background()

	_, err := st.Create(ctx, store.CreateTaskInput{
		Title: "t", InitialPrompt: "p", Status: domain.StatusAwaitingSubtasks, Priority: domain.PriorityMedium,
	}, domain.ActorUser)
	if err == nil {
		t.Fatal("expected POST awaiting_subtasks to fail")
	}
}
