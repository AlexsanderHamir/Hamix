package handler

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/AlexsanderHamir/Hamix/pkgs/repo"
	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/calltrace"
	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/domain"
)

//funclogmeasure:skip category=hot-path reason="Pure helper without I/O; operation trace is emitted by the calling chokepoint."
func trimmedOptionalID(id *string) string {
	if id == nil {
		return ""
	}
	return strings.TrimSpace(*id)
}

func (h *Handler) validateTaskGitBindingV2(
	ctx context.Context,
	projectID *string,
	worktreeBranchID *string,
) error {
	slog.Debug("trace", "cmd", calltrace.LogCmd, "operation", "handler.Handler.validateTaskGitBindingV2")
	wbID := trimmedOptionalID(worktreeBranchID)
	if wbID == "" {
		return nil
	}
	if err := h.store.ValidateTaskWorktreeBranchBinding(ctx, projectID, wbID); err != nil {
		return err
	}
	assoc, err := h.store.GetWorktreeBranchByID(ctx, wbID)
	if err != nil {
		return err
	}
	return h.store.GuardBranchNotActiveElsewhere(ctx, assoc.WorktreeID, assoc.BranchID)
}

func (h *Handler) validatePromptMentionsForWorktreeBranch(ctx context.Context, worktreeBranchID *string, prompt string) error {
	slog.Debug("trace", "cmd", calltrace.LogCmd, "operation", "handler.Handler.validatePromptMentionsForWorktreeBranch")
	wbID := trimmedOptionalID(worktreeBranchID)
	if wbID == "" {
		if len(repo.ParseFileMentions(prompt)) > 0 {
			return fmt.Errorf("%w: worktree_branch_id required for @-mentions", domain.ErrInvalidInput)
		}
		return nil
	}
	assoc, err := h.store.GetWorktreeBranchByID(ctx, wbID)
	if err != nil {
		return err
	}
	return h.validatePromptMentionsForWorktree(ctx, assoc.WorktreeID, prompt)
}

func (h *Handler) validatePromptMentionsForWorktree(ctx context.Context, worktreeID, prompt string) error {
	slog.Debug("trace", "cmd", calltrace.LogCmd, "operation", "handler.Handler.validatePromptMentionsForWorktree")
	if h.repoProv == nil {
		return nil
	}
	worktreeID = strings.TrimSpace(worktreeID)
	if worktreeID == "" {
		if len(repo.ParseFileMentions(prompt)) > 0 {
			return fmt.Errorf("%w: worktree_branch_id required for @-mentions", domain.ErrInvalidInput)
		}
		return nil
	}
	root, reason, err := h.repoProv.OpenWorktreeRoot(ctx, worktreeID)
	if err != nil {
		return err
	}
	if root == nil {
		if reason == RepoReasonWorktreeNotFound {
			return fmt.Errorf("%w: worktree not found", domain.ErrNotFound)
		}
		return fmt.Errorf("%w: %s", domain.ErrInvalidInput, reason)
	}
	return root.ValidatePromptMentions(prompt)
}
