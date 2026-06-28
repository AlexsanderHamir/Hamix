import type { ReactNode } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import type { GitDeleteTarget } from "../gitDeleteErrors";
import { gitDeleteBlocked, gitDeleteErrorMessage } from "../gitDeleteErrors";

type Props = {
  target: GitDeleteTarget | null;
  pending: boolean;
  error: unknown;
  onClose: () => void;
  onConfirm: () => void;
};

function targetNoun(kind: GitDeleteTarget["kind"]): string {
  switch (kind) {
    case "repository":
      return "repository";
    case "worktree":
      return "worktree";
  }
}

function dialogTitle(kind: GitDeleteTarget["kind"]): string {
  if (kind === "worktree") {
    return "Unregister worktree?";
  }
  return `Delete ${targetNoun(kind)}?`;
}

function dialogDescription(target: GitDeleteTarget): ReactNode {
  if (target.kind === "worktree") {
    return (
      <>
        <strong>{target.label}</strong> will be removed from Hamix. Your checkout directory and git
        worktree stay on disk — register it again anytime from the live inventory.
      </>
    );
  }
  return (
    <>
      <strong>{target.label}</strong> will be removed from Hamix. Repository files on disk are not
      deleted.
    </>
  );
}

function confirmLabel(kind: GitDeleteTarget["kind"], pending: boolean): string {
  if (kind === "worktree") {
    return pending ? "Unregistering…" : "Unregister";
  }
  return pending ? "Deleting…" : "Delete";
}

export function DeleteConfirmDialog({
  target,
  pending,
  error,
  onClose,
  onConfirm,
}: Props) {
  if (!target) return null;

  const blocked = error != null && gitDeleteBlocked(error);
  const errorMessage = error != null ? gitDeleteErrorMessage(error) : null;

  return (
    <ConfirmDialog
      title={dialogTitle(target.kind)}
      description={dialogDescription(target)}
      footnote={
        target.kind === "worktree"
          ? "To remove the directory from git, run git worktree remove outside Hamix."
          : "This action cannot be undone."
      }
      confirmLabel={confirmLabel(target.kind, pending)}
      confirmVariant="danger"
      busy={pending}
      cancelDisabled={pending}
      confirmDisabled={pending || blocked}
      error={errorMessage}
      onCancel={onClose}
      onConfirm={onConfirm}
      titleId="git-delete-dialog-title"
      descriptionId="git-delete-dialog-description"
      sectionClassName="worktrees-delete-dialog"
      focusCancelOnOpen={false}
    />
  );
}
