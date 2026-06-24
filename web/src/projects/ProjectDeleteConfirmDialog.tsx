import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";

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
  return (
    <ConfirmDialog
      title="Delete this project?"
      description={
        <>
          <strong>{projectName}</strong> and its project memory will be removed. You
          cannot delete a project while tasks still reference it — move or clear those
          tasks first.
        </>
      }
      footnote="This action cannot be undone."
      confirmLabel="Delete project"
      confirmVariant="danger"
      busy={deletePending}
      cancelDisabled={deletePending}
      confirmDisabled={deletePending}
      error={error}
      onCancel={onCancel}
      onConfirm={onConfirm}
      titleId="project-delete-dialog-title"
      descriptionId="project-delete-dialog-description"
    />
  );
}
