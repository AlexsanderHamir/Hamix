import type { FormEvent } from "react";
import type { ChecklistVerifyCommandInput } from "@/types";
import { FieldLabel } from "@/shared/FieldLabel";
import { Modal } from "../../../../shared/Modal";
import { MutationErrorBanner } from "../../../../shared/MutationErrorBanner";
import {
  emptyVerifyCommandRow,
  MAX_VERIFY_COMMANDS_PER_ITEM,
} from "@/tasks/task-compose/checklistRequirement";

type Props = {
  mode: "add" | "edit";
  pending: boolean;
  saving: boolean;
  onClose: () => void;
  text: string;
  onTextChange: (v: string) => void;
  verifyCommands: ChecklistVerifyCommandInput[];
  onVerifyCommandsChange: (cmds: ChecklistVerifyCommandInput[]) => void;
  onSubmit: (e: FormEvent) => void;
  modalStack?: "default" | "nested";
  lockBodyScroll?: boolean;
  dismissibleWhileBusy?: boolean;
  error?: unknown;
  errorFallback?: string;
};

export function ChecklistCriterionModal({
  mode,
  pending,
  saving,
  onClose,
  text,
  onTextChange,
  verifyCommands,
  onVerifyCommandsChange,
  onSubmit,
  modalStack = "default",
  lockBodyScroll = true,
  dismissibleWhileBusy = false,
  error = null,
  errorFallback,
}: Props) {
  const disabled = pending || saving;
  const titleId =
    mode === "add"
      ? "checklist-criterion-modal-title"
      : "checklist-criterion-edit-modal-title";
  const busyLabel =
    mode === "add" ? "Adding criterion…" : "Saving changes…";
  const commandsOpen = verifyCommands.length > 0;

  const updateCommand = (
    index: number,
    patch: Partial<ChecklistVerifyCommandInput>,
  ) => {
    onVerifyCommandsChange(
      verifyCommands.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addCommandRow = () => {
    if (verifyCommands.length >= MAX_VERIFY_COMMANDS_PER_ITEM) return;
    onVerifyCommandsChange([...verifyCommands, emptyVerifyCommandRow()]);
  };

  const removeCommandRow = (index: number) => {
    onVerifyCommandsChange(verifyCommands.filter((_, i) => i !== index));
  };

  return (
    <Modal
      onClose={onClose}
      labelledBy={titleId}
      describedBy="checklist-criterion-modal-description"
      busy={pending}
      busyLabel={busyLabel}
      stack={modalStack}
      lockBodyScroll={lockBodyScroll}
      dismissibleWhileBusy={dismissibleWhileBusy}
    >
      <section className="panel modal-sheet task-checklist-criterion-modal-sheet">
        <h2 id={titleId}>
          {mode === "add" ? "New criterion" : "Edit criterion"}
        </h2>
        <p
          className="muted task-checklist-criterion-modal-lead"
          id="checklist-criterion-modal-description"
        >
          {mode === "add" ? (
            <>
              Add one clear, testable requirement. Optional shell checks run
              during verify and feed the verifier as evidence.
            </>
          ) : (
            <>Update the wording or verification commands for this requirement.</>
          )}
        </p>
        <form
          className="task-checklist-criterion-modal-form task-create-form"
          onSubmit={(e) => {
            e.stopPropagation();
            onSubmit(e);
          }}
        >
          <div className="field">
            <FieldLabel htmlFor="checklist-criterion-text" requirement="required">
              Criterion
            </FieldLabel>
            <input
              id="checklist-criterion-text"
              value={text}
              onChange={(ev) => onTextChange(ev.target.value)}
              placeholder="e.g. All subtasks marked done"
              disabled={disabled}
              autoFocus
              required
              aria-required="true"
            />
          </div>

          <details
            className="task-checklist-verify-commands"
            open={commandsOpen}
          >
            <summary className="task-checklist-verify-commands-summary">
              Verification commands (optional)
            </summary>
            <p className="muted task-checklist-verify-commands-lead">
              The worker runs these in the repo during verify. Output is saved
              to temp files for the verifier — exit code alone does not auto-pass.
            </p>
            {verifyCommands.length > 0 ? (
              <ul className="task-checklist-verify-commands-list">
                {verifyCommands.map((row, index) => (
                  <li key={index} className="task-checklist-verify-command-row">
                    <div className="field">
                      <FieldLabel htmlFor={`checklist-verify-cmd-${index}`}>
                        Command
                      </FieldLabel>
                      <input
                        id={`checklist-verify-cmd-${index}`}
                        value={row.command}
                        onChange={(ev) =>
                          updateCommand(index, { command: ev.target.value })
                        }
                        placeholder="e.g. go test ./..."
                        disabled={disabled}
                      />
                    </div>
                    <div className="field">
                      <FieldLabel htmlFor={`checklist-verify-outcome-${index}`}>
                        Expected outcome
                      </FieldLabel>
                      <input
                        id={`checklist-verify-outcome-${index}`}
                        value={row.expected_outcome ?? ""}
                        onChange={(ev) =>
                          updateCommand(index, {
                            expected_outcome: ev.target.value,
                          })
                        }
                        placeholder="e.g. all tests pass"
                        disabled={disabled}
                      />
                    </div>
                    <button
                      type="button"
                      className="secondary task-checklist-verify-command-remove"
                      disabled={disabled}
                      onClick={() => removeCommandRow(index)}
                    >
                      Remove command
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              className="secondary task-checklist-verify-command-add"
              disabled={
                disabled || verifyCommands.length >= MAX_VERIFY_COMMANDS_PER_ITEM
              }
              onClick={addCommandRow}
            >
              Add command
            </button>
          </details>

          <MutationErrorBanner
            error={error}
            fallback={
              errorFallback ??
              (mode === "add"
                ? "Could not add criterion."
                : "Could not save changes.")
            }
            className="task-checklist-criterion-modal-err"
          />
          <div className="row stack-row-actions task-checklist-criterion-modal-actions">
            <button
              type="button"
              className="secondary"
              disabled={disabled}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="task-create-submit"
              disabled={!text.trim() || disabled}
            >
              {mode === "add" ? "Add criterion" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </Modal>
  );
}
