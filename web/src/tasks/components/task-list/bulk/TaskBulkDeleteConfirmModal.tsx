import { useEffect, useRef } from "react";
import { Modal } from "@/shared/Modal";
import { MutationErrorBanner } from "@/shared/MutationErrorBanner";

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
  const cancelRef = useRef<HTMLButtonElement>(null);
  const count = tasks.length;
  const noun = count === 1 ? "task" : "tasks";

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <Modal
      onClose={onCancel}
      labelledBy="task-bulk-delete-title"
      describedBy="task-bulk-delete-description"
      busy={busy}
      busyLabel="Deleting tasks…"
      dismissibleWhileBusy
    >
      <section className="panel confirm-dialog modal-sheet">
        <h2 id="task-bulk-delete-title">Delete {count} {noun}?</h2>
        <p
          className="confirm-dialog__statement"
          id="task-bulk-delete-description"
        >
          {count === 1 ? (
            <>
              <strong>{tasks[0]?.title ?? "This task"}</strong> will be
              permanently deleted.
            </>
          ) : (
            <>
              The {count} selected tasks will be permanently deleted.
            </>
          )}
        </p>
        <p className="confirm-dialog__footnote">This action cannot be undone.</p>
        <MutationErrorBanner error={error} className="confirm-dialog__err" />
        <div className="row stack-row-actions">
          <button
            ref={cancelRef}
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="danger"
            disabled={busy}
            onClick={() => void onConfirm()}
            data-testid="task-bulk-delete-confirm"
          >
            {busy ? "Deleting…" : `Delete ${count}`}
          </button>
        </div>
      </section>
    </Modal>
  );
}
