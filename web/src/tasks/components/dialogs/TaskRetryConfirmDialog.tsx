import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";

export type TaskRetryMode = "fresh" | "resume";

type Props = {
  mode: TaskRetryMode;
  taskTitle: string;
  saving: boolean;
  pending: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function TaskRetryConfirmDialog({
  mode,
  taskTitle,
  saving,
  pending,
  error = null,
  onCancel,
  onConfirm,
}: Props) {
  const isFresh = mode === "fresh";
  const title = isFresh ? "Start over?" : "Resume from failure?";
  const body = isFresh
    ? "This discards this attempt's git changes and untracked files in the repo, then queues a new run from a clean tree."
    : "This starts a new attempt and continues from the failed attempt's checkpoint. Git history is kept.";
  const confirmLabel = isFresh ? "Start over" : "Resume from failure";

  return (
    <ConfirmDialog
      title={title}
      description={<strong>{taskTitle}</strong>}
      footnote={body}
      confirmLabel={confirmLabel}
      confirmVariant={isFresh ? "primary" : "secondary"}
      busy={pending}
      cancelDisabled={saving}
      confirmDisabled={saving}
      error={error}
      onCancel={onCancel}
      onConfirm={onConfirm}
      titleId="task-retry-dialog-title"
      descriptionId="task-retry-dialog-description"
    />
  );
}
