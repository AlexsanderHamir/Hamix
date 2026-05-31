import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Modal } from "@/shared/Modal";
import { MutationErrorBanner } from "@/shared/MutationErrorBanner";

type Props = {
  saving: boolean;
  error?: unknown;
  onCancel: () => void;
  onSubmit: (input: { name: string; description: string }) => void;
};

export function ProjectCreateDialog({
  saving,
  error = null,
  onCancel,
  onSubmit,
}: Props) {
  const titleId = useId();
  const nameId = useId();
  const descriptionId = useId();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && !saving;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({ name: trimmedName, description: description.trim() });
  }

  return (
    <Modal
      onClose={onCancel}
      labelledBy={titleId}
      busy={saving}
      busyLabel="Creating project…"
      dismissibleWhileBusy
    >
      <section className="panel modal-sheet pl__create-dialog">
        <header className="pl__create-dialog-head">
          <h2 id={titleId}>New project</h2>
          <p className="pl__create-dialog-help">
            A project groups related tasks and the shared context that informs
            them.
          </p>
        </header>

        <form
          className="pl__create-dialog-form"
          onSubmit={handleSubmit}
          aria-label="Create project"
        >
          <div className="field">
            <label htmlFor={nameId}>Name</label>
            <input
              ref={nameRef}
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Billing platform"
              required
              disabled={saving}
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label htmlFor={descriptionId}>
              Description <span className="pl__create-dialog-optional">— optional</span>
            </label>
            <textarea
              id={descriptionId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One line of context that helps your team and agents understand what this project is for."
              rows={3}
              disabled={saving}
            />
          </div>

          <MutationErrorBanner
            error={error}
            fallback="Could not create project."
            className="pl__create-dialog-err"
          />

          <div className="row stack-row-actions pl__create-dialog-actions">
            <button
              type="button"
              className="secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" disabled={!canSubmit}>
              {saving ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </section>
    </Modal>
  );
}
