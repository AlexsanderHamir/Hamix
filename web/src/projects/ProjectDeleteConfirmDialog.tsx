import { useEffect, useRef } from "react";
import { Modal } from "@/shared/Modal";
import { MutationErrorBanner } from "@/shared/MutationErrorBanner";

type Props = {
  projectName: string;
  deletePending: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ProjectDeleteConfirmDialog({
  projectName,
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
      labelledBy="project-delete-dialog-title"
      describedBy="project-delete-dialog-description"
      busy={deletePending}
      dismissibleWhileBusy
    >
      <section className="panel confirm-dialog modal-sheet">
        <h2 id="project-delete-dialog-title">Delete this project?</h2>
        <p className="confirm-dialog__statement" id="project-delete-dialog-description">
          <strong>{projectName}</strong> and its project memory will be removed. You cannot
          delete a project while tasks still reference it — move or clear those tasks first.
        </p>
        <p className="confirm-dialog__footnote">This action cannot be undone.</p>
        <MutationErrorBanner error={error} className="confirm-dialog__err" />
        <div className="row stack-row-actions">
          <button
            ref={cancelRef}
            type="button"
            className="secondary"
            disabled={deletePending}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="danger"
            disabled={deletePending}
            onClick={() => void onConfirm()}
          >
            Delete project
          </button>
        </div>
      </section>
    </Modal>
  );
}
