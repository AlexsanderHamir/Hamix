package handler

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/calltrace"
	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/domain"
	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/store"
)

func toGitBranchJSON(b domain.GitBranch) gitBranchJSON {
	return gitBranchJSON{
		ID:           b.ID,
		RepositoryID: b.RepositoryID,
		Name:         b.Name,
		HeadSHA:      b.HeadSHA,
		CreatedAt:    b.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func (h *Handler) listGitBranches(w http.ResponseWriter, r *http.Request) {
	const op = "git.branches.list"
	r = calltrace.WithRequestRoot(r, op)
	projectID, err := parseGitProjectID(r)
	if err != nil {
		writeGitStoreError(w, r, op, err)
		return
	}
	rows, err := h.store.ListGitBranches(r.Context(), projectID, r.PathValue("repoId"))
	if err != nil {
		writeGitStoreError(w, r, op, err)
		return
	}
	out := make([]gitBranchJSON, 0, len(rows))
	for _, row := range rows {
		out = append(out, toGitBranchJSON(row))
	}
	writeJSON(w, r, op, http.StatusOK, gitBranchesListResponse{Branches: out})
}

func (h *Handler) createGitBranch(w http.ResponseWriter, r *http.Request) {
	const op = "git.branches.create"
	r = calltrace.WithRequestRoot(r, op)
	projectID, err := parseGitProjectID(r)
	if err != nil {
		writeGitStoreError(w, r, op, err)
		return
	}
	var body gitBranchCreateJSON
	if err := decodeJSON(r.Context(), r.Body, &body); err != nil {
		writeError(w, r, op, err, http.StatusBadRequest)
		return
	}
	branch, err := h.store.CreateGitBranch(r.Context(), projectID, r.PathValue("repoId"), store.CreateGitBranchInput{
		Name:       body.Name,
		StartPoint: body.StartPoint,
	}, h.gitService())
	if err != nil {
		writeGitStoreError(w, r, op, err)
		return
	}
	writeJSON(w, r, op, http.StatusCreated, toGitBranchJSON(branch))
}

func (h *Handler) deleteGitBranch(w http.ResponseWriter, r *http.Request) {
	const op = "git.branches.delete"
	slog.Debug("trace", "cmd", calltrace.LogCmd, "operation", "handler.deleteGitBranch")
	r = calltrace.WithRequestRoot(r, op)
	projectID, err := parseGitProjectID(r)
	if err != nil {
		writeGitStoreError(w, r, op, err)
		return
	}
	force := r.URL.Query().Get("force") == "true" || r.URL.Query().Get("force") == "1"
	if err := h.store.DeleteGitBranch(r.Context(), projectID, r.PathValue("branchId"), force, h.gitService()); err != nil {
		writeGitStoreError(w, r, op, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
