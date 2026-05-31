import { Link } from "react-router-dom";
import { Modal } from "@/shared/Modal";

type Props = {
  taskTitle: string;
  /** Disables the "Change model" CTA while a parent mutation is in flight. */
  saving?: boolean;
  /** Opens the per-task change-model modal (replaces this one). */
  onChangeModel: () => void;
  onClose: () => void;
};

export function TaskModelConfigModal({
  taskTitle,
  saving = false,
  onChangeModel,
  onClose,
}: Props) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="task-model-config-title"
      describedBy="task-model-config-desc"
    >
      <section className="panel modal-sheet task-model-config-modal">
        <h2 id="task-model-config-title" className="task-model-config-title">
          Model configuration
        </h2>
        <p
          id="task-model-config-desc"
          className="task-model-config-lede muted"
        >
          Choose where this task picks its model. Per-task overrides take
          precedence over the workspace default.
        </p>

        <div className="task-model-config-body">
          <div className="task-model-config-row">
            <div className="task-model-config-copy">
              <span className="task-model-config-row-title">Global model</span>
              <span className="task-model-config-row-hint">
                Used by every task unless overridden. Lives in workspace
                settings.
              </span>
            </div>
            <div className="task-model-config-actions">
              <Link
                to="/settings#cursor-agent"
                className="task-model-config-cta"
                onClick={onClose}
              >
                Open settings
              </Link>
            </div>
          </div>

          <div className="task-model-config-divider" role="presentation" />

          <div className="task-model-config-row">
            <div className="task-model-config-copy">
              <span className="task-model-config-row-title">
                Per-task model
              </span>
              <span className="task-model-config-row-hint">
                Override the global default for{" "}
                <strong>{taskTitle}</strong> only.
              </span>
            </div>
            <div className="task-model-config-actions">
              <button
                type="button"
                className="task-model-config-cta"
                onClick={() => {
                  onClose();
                  onChangeModel();
                }}
                disabled={saving}
              >
                Change model
              </button>
            </div>
          </div>
        </div>

        <div className="row stack-row-actions task-model-config-footer">
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </Modal>
  );
}
