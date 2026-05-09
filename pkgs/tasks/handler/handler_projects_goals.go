package handler

import (
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/calltrace"
	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
	"github.com/AlexsanderHamir/T2A/pkgs/tasks/store"
)

func (h *Handler) listProjectGoals(w http.ResponseWriter, r *http.Request) {
	slog.Debug("trace", "cmd", calltrace.LogCmd, "operation", "handler.Handler.listProjectGoals")
	const op = "projects.goals.list"
	r = calltrace.WithRequestRoot(r, op)
	projectID, err := parseTaskPathID(r.PathValue("id"))
	if err != nil {
		writeStoreError(w, r, op, err)
		return
	}
	goals, err := h.store.ListProjectGoals(r.Context(), projectID)
	if err != nil {
		writeStoreError(w, r, op, err)
		return
	}
	writeJSON(w, r, op, http.StatusOK, projectGoalsListResponse{Goals: goals})
}

func (h *Handler) getProjectGoal(w http.ResponseWriter, r *http.Request) {
	slog.Debug("trace", "cmd", calltrace.LogCmd, "operation", "handler.Handler.getProjectGoal")
	const op = "projects.goals.get"
	r = calltrace.WithRequestRoot(r, op)
	projectID, err := parseTaskPathID(r.PathValue("id"))
	if err != nil {
		writeStoreError(w, r, op, err)
		return
	}
	goalID, err := parseTaskPathID(r.PathValue("goalId"))
	if err != nil {
		writeStoreError(w, r, op, err)
		return
	}
	goal, err := h.store.GetProjectGoal(r.Context(), projectID, goalID)
	if err != nil {
		writeStoreError(w, r, op, err)
		return
	}
	writeJSON(w, r, op, http.StatusOK, goal)
}

func (h *Handler) createProjectGoal(w http.ResponseWriter, r *http.Request) {
	slog.Debug("trace", "cmd", calltrace.LogCmd, "operation", "handler.Handler.createProjectGoal")
	const op = "projects.goals.create"
	r = calltrace.WithRequestRoot(r, op)
	projectID, err := parseTaskPathID(r.PathValue("id"))
	if err != nil {
		writeStoreError(w, r, op, err)
		return
	}
	var body projectGoalCreateJSON
	if err := decodeJSON(r.Context(), r.Body, &body); err != nil {
		writeError(w, r, op, err, http.StatusBadRequest)
		return
	}
	goal, err := h.store.CreateProjectGoal(r.Context(), projectID, store.CreateProjectGoalInput{
		ID:               body.ID,
		Title:            body.Title,
		Description:      body.Description,
		DependsOnGoalIDs: body.DependsOnGoalIDs,
		Criteria:         body.Criteria,
	})
	if err != nil {
		writeStoreError(w, r, op, err)
		return
	}
	h.notifyChange(ProjectGoalCreated, projectID)
	writeJSON(w, r, op, http.StatusCreated, goal)
}

func (h *Handler) patchProjectGoal(w http.ResponseWriter, r *http.Request) {
	slog.Debug("trace", "cmd", calltrace.LogCmd, "operation", "handler.Handler.patchProjectGoal")
	const op = "projects.goals.patch"
	r = calltrace.WithRequestRoot(r, op)
	projectID, err := parseTaskPathID(r.PathValue("id"))
	if err != nil {
		writeStoreError(w, r, op, err)
		return
	}
	goalID, err := parseTaskPathID(r.PathValue("goalId"))
	if err != nil {
		writeStoreError(w, r, op, err)
		return
	}
	var body projectGoalPatchJSON
	if err := decodeJSON(r.Context(), r.Body, &body); err != nil {
		writeError(w, r, op, err, http.StatusBadRequest)
		return
	}
	if body.isEmpty() {
		writeStoreError(w, r, op, fmt.Errorf("%w: no fields to update", domain.ErrInvalidInput))
		return
	}
	var gateAction *string
	if body.GateAction != nil {
		ga := strings.TrimSpace(*body.GateAction)
		if ga != "" {
			gateAction = &ga
		}
	}
	goal, err := h.store.UpdateProjectGoal(r.Context(), projectID, goalID, store.UpdateProjectGoalInput{
		Title:            body.Title,
		Description:      body.Description,
		DependsOnGoalIDs: body.DependsOnGoalIDs,
		GateAction:       gateAction,
		Criteria:         body.Criteria,
	})
	if err != nil {
		writeStoreError(w, r, op, err)
		return
	}
	h.notifyChange(ProjectGoalUpdated, projectID)
	writeJSON(w, r, op, http.StatusOK, goal)
}

func (h *Handler) deleteProjectGoal(w http.ResponseWriter, r *http.Request) {
	slog.Debug("trace", "cmd", calltrace.LogCmd, "operation", "handler.Handler.deleteProjectGoal")
	const op = "projects.goals.delete"
	r = calltrace.WithRequestRoot(r, op)
	projectID, err := parseTaskPathID(r.PathValue("id"))
	if err != nil {
		writeStoreError(w, r, op, err)
		return
	}
	goalID, err := parseTaskPathID(r.PathValue("goalId"))
	if err != nil {
		writeStoreError(w, r, op, err)
		return
	}
	if err := h.store.DeleteProjectGoal(r.Context(), projectID, goalID); err != nil {
		writeStoreError(w, r, op, err)
		return
	}
	h.notifyChange(ProjectGoalDeleted, projectID)
	w.WriteHeader(http.StatusNoContent)
}
