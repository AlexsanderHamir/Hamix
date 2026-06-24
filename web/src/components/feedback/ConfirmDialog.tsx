import { useEffect, useRef, type ReactNode } from "react";
import { Modal } from "@/shared/Modal";
import { MutationErrorBanner } from "@/shared/MutationErrorBanner";

export type ConfirmVariant = "danger" | "primary" | "secondary";

type Props = {
  title: string;
  description: ReactNode;
  footnote?: ReactNode;
  confirmLabel: string;
  confirmVariant?: ConfirmVariant;
  cancelLabel?: string;
  busy?: boolean;
  busyLabel?: string;
  cancelDisabled?: boolean;
  confirmDisabled?: boolean;
  dismissibleWhileBusy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  titleId: string;
  descriptionId: string;
  sectionClassName?: string;
  confirmTestId?: string;
  focusCancelOnOpen?: boolean;
};

export function ConfirmDialog({
  title,
  description,
  footnote,
  confirmLabel,
  confirmVariant = "danger",
  cancelLabel = "Cancel",
  busy = false,
  busyLabel,
  cancelDisabled = false,
  confirmDisabled = false,
  dismissibleWhileBusy = true,
  error = null,
  onCancel,
  onConfirm,
  titleId,
  descriptionId,
  sectionClassName,
  confirmTestId,
  focusCancelOnOpen = true,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (focusCancelOnOpen) {
      cancelRef.current?.focus();
    }
  }, [focusCancelOnOpen]);

  const sectionClass = ["panel", "confirm-dialog", "modal-sheet", sectionClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <Modal
      onClose={onCancel}
      labelledBy={titleId}
      describedBy={descriptionId}
      busy={busy}
      busyLabel={busyLabel}
      dismissibleWhileBusy={dismissibleWhileBusy}
    >
      <section className={sectionClass}>
        <h2 id={titleId}>{title}</h2>
        <p className="confirm-dialog__statement" id={descriptionId}>
          {description}
        </p>
        {footnote ? (
          <p className="confirm-dialog__footnote">{footnote}</p>
        ) : null}
        <MutationErrorBanner error={error} className="confirm-dialog__err" />
        <div className="row stack-row-actions">
          <button
            ref={cancelRef}
            type="button"
            className="secondary"
            disabled={cancelDisabled}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmVariant}
            disabled={confirmDisabled}
            onClick={() => void onConfirm()}
            data-testid={confirmTestId}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </Modal>
  );
}
