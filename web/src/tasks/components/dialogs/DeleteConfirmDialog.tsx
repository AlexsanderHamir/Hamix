import { useEffect, useRef } from "react";
import { Modal } from "../../../shared/Modal";
import { MutationErrorBanner } from "../../../shared/MutationErrorBanner";

type Props = {
  taskTitle: string;
  saving: boolean;
  deletePending: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmDialog({
  taskTitle,
  saving,
  deletePending,
  error = null,
  onCancel,
  onConfirm,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <Modal
      onClose={onCancel}
      labelledBy="delete-dialog-title"
      describedBy="delete-dialog-description"
      busy={deletePending}
      dismissibleWhileBusy
    >
      <section className="panel confirm-dialog modal-sheet">
        <h2 id="delete-dialog-title">Delete this task?</h2>
        <p
          className="confirm-dialog__statement"
          id="delete-dialog-description"
        >
          <strong>{taskTitle}</strong> will be permanently deleted.
        </p>
        <p className="confirm-dialog__footnote">
          This action cannot be undone.
        </p>
        <MutationErrorBanner error={error} className="confirm-dialog__err" />
        <div className="row stack-row-actions">
          <button
            ref={cancelRef}
            type="button"
            className="secondary"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="danger"
            disabled={saving}
            onClick={() => void onConfirm()}
          >
            Delete
          </button>
        </div>
      </section>
    </Modal>
  );
}
