import { useState, type FormEvent } from "react";
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
  /** Satisfied criteria open in read-only view — no edits or saves. */
  readOnly?: boolean;
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

type ModalCopy = {
  titleId: string;
  title: string;
  lead: string;
  busyLabel: string;
  defaultErrorFallback: string;
};

function verifyCommandsHint(count: number): string {
  if (count === 0) return "Optional";
  if (count === 1) return "1 command";
  return `${count} commands`;
}

function resolveChecklistCriterionModalCopy(
  mode: "add" | "edit",
  readOnly: boolean,
): ModalCopy {
  const busyLabel = mode === "add" ? "Adding criterion…" : "Saving changes…";
  const defaultErrorFallback =
    mode === "add" ? "Could not add criterion." : "Could not save changes.";

  if (readOnly) {
    return {
      titleId: "checklist-criterion-view-modal-title",
      title: "View criterion",
      lead:
        "This criterion is satisfied and locked. You can review the wording and verify commands, but not change them.",
      busyLabel,
      defaultErrorFallback,
    };
  }
  if (mode === "add") {
    return {
      titleId: "checklist-criterion-modal-title",
      title: "New criterion",
      lead: "One clear, testable requirement for done.",
      busyLabel,
      defaultErrorFallback,
    };
  }
  return {
    titleId: "checklist-criterion-edit-modal-title",
    title: "Edit criterion",
    lead: "Update the wording or verification commands.",
    busyLabel,
    defaultErrorFallback,
  };
}

function handleChecklistCriterionFormSubmit(
  e: FormEvent,
  readOnly: boolean,
  onSubmit: (e: FormEvent) => void,
): void {
  e.stopPropagation();
  if (readOnly) {
    e.preventDefault();
    return;
  }
  onSubmit(e);
}

type VerifyCommandHandlers = {
  updateCommand: (
    index: number,
    patch: Partial<ChecklistVerifyCommandInput>,
  ) => void;
  addCommandRow: () => void;
  ensureVerifySectionReady: (open: boolean) => void;
  removeCommandRow: (index: number) => void;
  setVerifySectionOpen: (open: boolean) => void;
};

function createVerifyCommandHandlers(
  verifyCommands: ChecklistVerifyCommandInput[],
  onVerifyCommandsChange: (cmds: ChecklistVerifyCommandInput[]) => void,
  setVerifySectionOpen: (open: boolean) => void,
): VerifyCommandHandlers {
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
    setVerifySectionOpen(true);
    onVerifyCommandsChange([...verifyCommands, emptyVerifyCommandRow()]);
  };

  const ensureVerifySectionReady = (open: boolean) => {
    setVerifySectionOpen(open);
    if (open && verifyCommands.length === 0) {
      onVerifyCommandsChange([emptyVerifyCommandRow()]);
    }
  };

  const removeCommandRow = (index: number) => {
    onVerifyCommandsChange(verifyCommands.filter((_, i) => i !== index));
  };

  return {
    updateCommand,
    addCommandRow,
    ensureVerifySectionReady,
    removeCommandRow,
    setVerifySectionOpen,
  };
}

type ChecklistCriterionModalHeaderProps = {
  titleId: string;
  title: string;
  lead: string;
};

function ChecklistCriterionModalHeader({
  titleId,
  title,
  lead,
}: ChecklistCriterionModalHeaderProps) {
  return (
    <>
      <h2 id={titleId}>{title}</h2>
      <p
        className="muted task-checklist-criterion-modal-lead"
        id="checklist-criterion-modal-description"
      >
        {lead}
      </p>
    </>
  );
}

type ChecklistCriterionTextFieldProps = {
  text: string;
  readOnly: boolean;
  controlsDisabled: boolean;
  onTextChange: (v: string) => void;
};

function ChecklistCriterionTextField({
  text,
  readOnly,
  controlsDisabled,
  onTextChange,
}: ChecklistCriterionTextFieldProps) {
  return (
    <div className="field">
      <FieldLabel
        htmlFor="checklist-criterion-text"
        requirement={readOnly ? undefined : "required"}
      >
        Criterion
      </FieldLabel>
      <textarea
        id="checklist-criterion-text"
        className="task-checklist-criterion-text-input"
        value={text}
        onChange={(ev) => onTextChange(ev.target.value)}
        placeholder="e.g. All subtasks marked done"
        disabled={controlsDisabled}
        readOnly={readOnly}
        autoFocus={!readOnly}
        required={!readOnly}
        aria-required={readOnly ? undefined : "true"}
        rows={3}
      />
    </div>
  );
}

type ChecklistVerifyCommandRowProps = {
  row: ChecklistVerifyCommandInput;
  index: number;
  readOnly: boolean;
  controlsDisabled: boolean;
  onUpdate: (
    index: number,
    patch: Partial<ChecklistVerifyCommandInput>,
  ) => void;
  onRemove: (index: number) => void;
};

function ChecklistVerifyCommandRow({
  row,
  index,
  readOnly,
  controlsDisabled,
  onUpdate,
  onRemove,
}: ChecklistVerifyCommandRowProps) {
  return (
    <div
      className="task-checklist-verify-commands__row"
      role="row"
    >
      <div
        className="task-checklist-verify-commands__cell task-checklist-verify-commands__cell--command"
        role="cell"
      >
        <label
          htmlFor={`checklist-verify-cmd-${index}`}
          className="visually-hidden"
        >
          Shell command {index + 1}
        </label>
        <input
          id={`checklist-verify-cmd-${index}`}
          className="task-checklist-verify-command-input"
          value={row.command}
          onChange={(ev) =>
            onUpdate(index, {
              command: ev.target.value,
            })
          }
          placeholder="go test ./pkgs/foo/..."
          disabled={controlsDisabled}
          readOnly={readOnly}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <div
        className="task-checklist-verify-commands__cell task-checklist-verify-commands__cell--outcome"
        role="cell"
      >
        <label
          htmlFor={`checklist-verify-outcome-${index}`}
          className="visually-hidden"
        >
          Expected outcome for command {index + 1}
        </label>
        <input
          id={`checklist-verify-outcome-${index}`}
          className="task-checklist-verify-command-outcome-input"
          value={row.expected_outcome ?? ""}
          onChange={(ev) =>
            onUpdate(index, {
              expected_outcome: ev.target.value,
            })
          }
          placeholder="All tests pass"
          disabled={controlsDisabled}
          readOnly={readOnly}
        />
      </div>
      {!readOnly ? (
        <div
          className="task-checklist-verify-commands__cell task-checklist-verify-commands__cell--action"
          role="cell"
        >
          <button
            type="button"
            className="task-checklist-verify-command-card__remove"
            disabled={controlsDisabled}
            aria-label={`Remove command ${index + 1}`}
            onClick={() => onRemove(index)}
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}

type ChecklistVerifyCommandsTableProps = {
  verifyCommands: ChecklistVerifyCommandInput[];
  readOnly: boolean;
  controlsDisabled: boolean;
  onUpdate: (
    index: number,
    patch: Partial<ChecklistVerifyCommandInput>,
  ) => void;
  onRemove: (index: number) => void;
};

function ChecklistVerifyCommandsTable({
  verifyCommands,
  readOnly,
  controlsDisabled,
  onUpdate,
  onRemove,
}: ChecklistVerifyCommandsTableProps) {
  if (verifyCommands.length === 0) return null;

  return (
    <div
      className="task-checklist-verify-commands__table"
      role="table"
      aria-label="Verify commands"
    >
      <div
        className="task-checklist-verify-commands__row task-checklist-verify-commands__row--head"
        role="row"
      >
        <span
          className="task-checklist-verify-commands__cell task-checklist-verify-commands__cell--command"
          role="columnheader"
        >
          Shell command
        </span>
        <span
          className="task-checklist-verify-commands__cell task-checklist-verify-commands__cell--outcome"
          role="columnheader"
        >
          Expected outcome
        </span>
        <span
          className="task-checklist-verify-commands__cell task-checklist-verify-commands__cell--action visually-hidden"
          role="columnheader"
        >
          Remove
        </span>
      </div>
      {verifyCommands.map((row, index) => (
        <ChecklistVerifyCommandRow
          key={index}
          row={row}
          index={index}
          readOnly={readOnly}
          controlsDisabled={controlsDisabled}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

type ChecklistVerifyCommandsSectionProps = {
  readOnly: boolean;
  controlsDisabled: boolean;
  verifyCommands: ChecklistVerifyCommandInput[];
  verifySectionOpen: boolean;
  handlers: VerifyCommandHandlers;
};

function ChecklistVerifyCommandsSection({
  readOnly,
  controlsDisabled,
  verifyCommands,
  verifySectionOpen,
  handlers,
}: ChecklistVerifyCommandsSectionProps) {
  const {
    updateCommand,
    addCommandRow,
    ensureVerifySectionReady,
    removeCommandRow,
    setVerifySectionOpen,
  } = handlers;

  return (
    <details
      className="task-create-advanced task-checklist-verify-commands"
      open={verifySectionOpen}
      onToggle={(e) => {
        const open = (e.currentTarget as HTMLDetailsElement).open;
        if (readOnly) {
          setVerifySectionOpen(open);
          return;
        }
        ensureVerifySectionReady(open);
      }}
    >
      <summary
        className="task-create-advanced__summary"
        data-testid="checklist-verify-commands-toggle"
      >
        <span
          className="task-create-advanced__chevron"
          aria-hidden="true"
        />
        <span className="task-create-advanced__label">Verify commands</span>
        <span className="task-create-advanced__hint">
          {verifyCommandsHint(verifyCommands.length)}
        </span>
      </summary>
      <div className="task-checklist-verify-commands__body">
        <p className="task-checklist-verify-commands__note">
          Shell commands run in the repo during the verify phase. The verify agent
          interprets stdout/stderr against each expected outcome — exit code alone
          does not pass the criterion.
        </p>
        <ChecklistVerifyCommandsTable
          verifyCommands={verifyCommands}
          readOnly={readOnly}
          controlsDisabled={controlsDisabled}
          onUpdate={updateCommand}
          onRemove={removeCommandRow}
        />
        {!readOnly ? (
          <button
            type="button"
            className="secondary task-checklist-verify-command-add"
            disabled={
              controlsDisabled ||
              verifyCommands.length >= MAX_VERIFY_COMMANDS_PER_ITEM
            }
            onClick={addCommandRow}
          >
            Add command
          </button>
        ) : null}
      </div>
    </details>
  );
}

type ChecklistCriterionModalActionsProps = {
  readOnly: boolean;
  mode: "add" | "edit";
  text: string;
  controlsDisabled: boolean;
  onClose: () => void;
};

function ChecklistCriterionModalActions({
  readOnly,
  mode,
  text,
  controlsDisabled,
  onClose,
}: ChecklistCriterionModalActionsProps) {
  return (
    <div className="row stack-row-actions task-checklist-criterion-modal-actions">
      {readOnly ? (
        <button type="button" className="secondary" onClick={onClose}>
          Close
        </button>
      ) : (
        <>
          <button
            type="button"
            className="secondary"
            disabled={controlsDisabled}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="task-create-submit"
            disabled={!text.trim() || controlsDisabled}
          >
            {mode === "add" ? "Add criterion" : "Save changes"}
          </button>
        </>
      )}
    </div>
  );
}

function checklistCriterionModalSheetClass(readOnly: boolean): string {
  return readOnly
    ? "panel modal-sheet task-checklist-criterion-modal-sheet task-checklist-criterion-modal-sheet--read-only"
    : "panel modal-sheet task-checklist-criterion-modal-sheet";
}

type ChecklistCriterionModalFormProps = {
  copy: ModalCopy;
  readOnly: boolean;
  mode: "add" | "edit";
  text: string;
  controlsDisabled: boolean;
  verifyCommands: ChecklistVerifyCommandInput[];
  verifySectionOpen: boolean;
  verifyHandlers: VerifyCommandHandlers;
  error: unknown;
  errorFallback?: string;
  onTextChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
};

function ChecklistCriterionModalForm({
  copy,
  readOnly,
  mode,
  text,
  controlsDisabled,
  verifyCommands,
  verifySectionOpen,
  verifyHandlers,
  error,
  errorFallback,
  onTextChange,
  onSubmit,
  onClose,
}: ChecklistCriterionModalFormProps) {
  return (
    <>
      <ChecklistCriterionModalHeader
        titleId={copy.titleId}
        title={copy.title}
        lead={copy.lead}
      />
      <form
        className="task-checklist-criterion-modal-form task-create-form"
        onSubmit={(e) =>
          handleChecklistCriterionFormSubmit(e, readOnly, onSubmit)
        }
      >
        <ChecklistCriterionTextField
          text={text}
          readOnly={readOnly}
          controlsDisabled={controlsDisabled}
          onTextChange={onTextChange}
        />
        <ChecklistVerifyCommandsSection
          readOnly={readOnly}
          controlsDisabled={controlsDisabled}
          verifyCommands={verifyCommands}
          verifySectionOpen={verifySectionOpen}
          handlers={verifyHandlers}
        />
        <MutationErrorBanner
          error={error}
          fallback={errorFallback ?? copy.defaultErrorFallback}
          className="task-checklist-criterion-modal-err"
        />
        <ChecklistCriterionModalActions
          readOnly={readOnly}
          mode={mode}
          text={text}
          controlsDisabled={controlsDisabled}
          onClose={onClose}
        />
      </form>
    </>
  );
}

export function ChecklistCriterionModal({
  mode,
  readOnly = false,
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
  const controlsDisabled = pending || saving;
  const copy = resolveChecklistCriterionModalCopy(mode, readOnly);
  const [verifySectionOpen, setVerifySectionOpen] = useState(
    () => readOnly || verifyCommands.length > 0,
  );

  const verifyHandlers = createVerifyCommandHandlers(
    verifyCommands,
    onVerifyCommandsChange,
    setVerifySectionOpen,
  );

  return (
    <Modal
      onClose={onClose}
      labelledBy={copy.titleId}
      describedBy="checklist-criterion-modal-description"
      busy={pending}
      busyLabel={copy.busyLabel}
      stack={modalStack}
      lockBodyScroll={lockBodyScroll}
      dismissibleWhileBusy={dismissibleWhileBusy}
    >
      <section className={checklistCriterionModalSheetClass(readOnly)}>
        <ChecklistCriterionModalForm
          copy={copy}
          readOnly={readOnly}
          mode={mode}
          text={text}
          controlsDisabled={controlsDisabled}
          verifyCommands={verifyCommands}
          verifySectionOpen={verifySectionOpen}
          verifyHandlers={verifyHandlers}
          error={error}
          errorFallback={errorFallback}
          onTextChange={onTextChange}
          onSubmit={onSubmit}
          onClose={onClose}
        />
      </section>
    </Modal>
  );
}
