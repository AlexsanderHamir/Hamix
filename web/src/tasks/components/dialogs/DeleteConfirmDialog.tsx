import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";

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
  return (
    <ConfirmDialog
      title="Delete this task?"
      description={
        <>
          <strong>{taskTitle}</strong> will be permanently deleted.
        </>
      }
      footnote="This action cannot be undone."
      confirmLabel="Delete"
      confirmVariant="danger"
      busy={deletePending}
      cancelDisabled={saving}
      confirmDisabled={saving}
      error={error}
      onCancel={onCancel}
      onConfirm={onConfirm}
      titleId="delete-dialog-title"
      descriptionId="delete-dialog-description"
    />
  );
}
