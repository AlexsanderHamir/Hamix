import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";

export type TaskBulkDeleteRow = {
  id: string;
  title: string;
};

type Props = {
  tasks: readonly TaskBulkDeleteRow[];
  busy: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function TaskBulkDeleteConfirmModal({
  tasks,
  busy,
  error = null,
  onCancel,
  onConfirm,
}: Props) {
  const count = tasks.length;
  const noun = count === 1 ? "task" : "tasks";

  return (
    <ConfirmDialog
      title={`Delete ${count} ${noun}?`}
      description={
        count === 1 ? (
          <>
            <strong>{tasks[0]?.title ?? "This task"}</strong> will be permanently
            deleted.
          </>
        ) : (
          <>The {count} selected tasks will be permanently deleted.</>
        )
      }
      footnote="This action cannot be undone."
      confirmLabel={busy ? "Deleting…" : `Delete ${count}`}
      confirmVariant="danger"
      busy={busy}
      busyLabel="Deleting tasks…"
      cancelDisabled={busy}
      confirmDisabled={busy}
      error={error}
      onCancel={onCancel}
      onConfirm={onConfirm}
      titleId="task-bulk-delete-title"
      descriptionId="task-bulk-delete-description"
      confirmTestId="task-bulk-delete-confirm"
    />
  );
}
