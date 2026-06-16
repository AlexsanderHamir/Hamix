type Props = {
  disabled: boolean;
  saveDisabled?: boolean;
  onClose: () => void;
};

export function TaskCreateModalEditFooterActions({
  disabled,
  saveDisabled = false,
  onClose,
}: Props) {
  return (
    <div className="task-create-modal-actions">
      <div className="task-create-modal-actions__start">
        <button
          type="button"
          className="secondary task-create-cancel-btn"
          disabled={disabled}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
      <div className="task-create-modal-actions__end">
        <button
          type="submit"
          className="task-create-submit"
          disabled={disabled || saveDisabled}
        >
          Save
        </button>
      </div>
    </div>
  );
}
