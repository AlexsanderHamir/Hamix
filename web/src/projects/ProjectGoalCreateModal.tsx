import { useEffect, useRef, type FormEvent } from "react";
import { Modal } from "@/shared/Modal";
import { MutationErrorBanner } from "@/shared/MutationErrorBanner";

export type ProjectGoalCreateModalProps = {
  open: boolean;
  onDismiss: () => void;
  draftTitle: string;
  onDraftTitleChange: (value: string) => void;
  draftDescription: string;
  onDraftDescriptionChange: (value: string) => void;
  depsDraft: string;
  onDepsDraftChange: (value: string) => void;
  criterionDrafts: string[];
  onCriterionDraftsChange: (rows: string[]) => void;
  createPending: boolean;
  createError: unknown;
  onCreate: () => Promise<unknown>;
};

export function ProjectGoalCreateModal({
  open,
  onDismiss,
  draftTitle,
  onDraftTitleChange,
  draftDescription,
  onDraftDescriptionChange,
  depsDraft,
  onDepsDraftChange,
  criterionDrafts,
  onCriterionDraftsChange,
  createPending,
  createError,
  onCreate,
}: ProjectGoalCreateModalProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => titleInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draftTitle.trim()) return;
    try {
      await onCreate();
    } catch {
      /* mutation surfaces error state */
    }
  }

  if (!open) {
    return null;
  }

  return (
    <Modal
      onClose={onDismiss}
      labelledBy="pg-create-goal-modal-title"
      describedBy="pg-create-goal-modal-desc"
      size="wide"
      busy={createPending}
      busyLabel="Creating goal…"
      dismissibleWhileBusy
    >
      <form
        className="panel modal-sheet ps__create-modal ps__create-form"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="ps__create-modal__head">
          <h2 id="pg-create-goal-modal-title">New goal</h2>
          <p id="pg-create-goal-modal-desc" className="muted">
            Add a goal for this project. Prerequisites and criteria are optional; criteria become
            checklist items before the gate advances.
          </p>
        </div>
        <label className="field grow">
          <span className="settings-field-label">Title</span>
          <input
            ref={titleInputRef}
            value={draftTitle}
            onChange={(ev) => onDraftTitleChange(ev.target.value)}
            placeholder="e.g. Ship auth hardening"
            disabled={createPending}
            required
            autoComplete="off"
          />
        </label>
        <label className="field grow">
          <span className="settings-field-label">Description</span>
          <textarea
            value={draftDescription}
            onChange={(ev) => onDraftDescriptionChange(ev.target.value)}
            placeholder="What this goal covers"
            rows={2}
            disabled={createPending}
          />
        </label>
        <label className="field grow">
          <span className="settings-field-label">Prerequisite goal ids (comma-separated, optional)</span>
          <input
            value={depsDraft}
            onChange={(ev) => onDepsDraftChange(ev.target.value)}
            placeholder="uuid-of-prereq, another-uuid"
            disabled={createPending}
            autoComplete="off"
          />
        </label>
        <fieldset className="ps__criteria-fieldset">
          <legend className="settings-field-label">Criteria (optional)</legend>
          <p className="muted ps__criteria-help">
            Checklist items that must be satisfied before the goal gate advances.
          </p>
          {criterionDrafts.map((line, idx) => (
            <div key={idx} className="ps__criteria-row">
              <input
                value={line}
                onChange={(ev) => {
                  const next = [...criterionDrafts];
                  next[idx] = ev.target.value;
                  onCriterionDraftsChange(next);
                }}
                placeholder="Criterion text"
                disabled={createPending}
              />
              {criterionDrafts.length > 1 ? (
                <button
                  type="button"
                  className="secondary ps__criteria-remove"
                  disabled={createPending}
                  onClick={() => onCriterionDraftsChange(criterionDrafts.filter((_, j) => j !== idx))}
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            className="secondary ps__criteria-add"
            disabled={createPending}
            onClick={() => onCriterionDraftsChange([...criterionDrafts, ""])}
          >
            Add criterion line
          </button>
        </fieldset>
        <MutationErrorBanner error={createError} className="ps__create-modal__err" />
        <div className="row stack-row-actions">
          <button type="button" className="secondary" disabled={createPending} onClick={onDismiss}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={createPending || !draftTitle.trim()}>
            Add goal
          </button>
        </div>
      </form>
    </Modal>
  );
}
