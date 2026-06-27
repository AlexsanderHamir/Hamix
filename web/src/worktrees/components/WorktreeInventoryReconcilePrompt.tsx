import { MutationErrorBanner } from "@/shared/MutationErrorBanner";
import { gitReconcileErrorMessage } from "../gitReconcileErrors";
import { worktreeGitCopy } from "../worktreeGitCopy";

type Props = {
  storedPath: string;
  pending: boolean;
  reconcileError?: unknown;
  onReconcile: () => void;
};

export function WorktreeInventoryReconcilePrompt({
  storedPath,
  pending,
  reconcileError,
  onReconcile,
}: Props) {
  const reconcileErrorMessage =
    reconcileError != null ? gitReconcileErrorMessage(reconcileError) : null;

  return (
    <div className="worktrees-form-modal__inventory-prompt" role="alert">
      <p className="worktrees-form-modal__inventory-prompt-lead">
        {worktreeGitCopy.liveInventoryReconcileLead}
      </p>
      {storedPath.trim() !== "" ? (
        <p className="worktrees-form-modal__stored-path">
          <span className="worktrees-form-modal__stored-path-label">
            {worktreeGitCopy.relocateModalStoredPathLabel}
          </span>
          <code>{storedPath}</code>
        </p>
      ) : null}
      <button type="button" disabled={pending} onClick={onReconcile}>
        {pending ? worktreeGitCopy.reconciling : worktreeGitCopy.liveInventoryReconcileAction}
      </button>
      {reconcileErrorMessage ? (
        <MutationErrorBanner error={reconcileErrorMessage} className="worktrees-form-modal__error" />
      ) : null}
    </div>
  );
}
