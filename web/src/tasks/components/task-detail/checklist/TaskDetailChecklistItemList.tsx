import type { TaskChecklistItemView } from "@/types";
import { CHECKLIST_EVIDENCE_DISPLAY_CAP } from "@/types/task";

type Props = {
  items: TaskChecklistItemView[];
  checklistInherit: boolean;
  editCriterionPending: boolean;
  removeItemPending: boolean;
  addCriterionPending: boolean;
  onOpenEditCriterionModal: (itemId: string, text: string) => void;
  onRemoveChecklistItem: (itemId: string) => void;
};

export function TaskDetailChecklistItemList({
  items,
  checklistInherit,
  editCriterionPending,
  removeItemPending,
  addCriterionPending,
  onOpenEditCriterionModal,
  onRemoveChecklistItem,
}: Props) {
  return (
    <div className="task-checklist-surface">
      <ul className="task-checklist-list task-checklist-list--grouped">
        {items.map((item) => (
          <li key={item.id} className="task-checklist-row">
            <div className="task-checklist-row-main">
              <span
                className={
                  item.done
                    ? "task-checklist-status task-checklist-status--done"
                    : "task-checklist-status task-checklist-status--pending"
                }
                role="img"
                aria-label={item.done ? "Satisfied" : "Not satisfied yet"}
              >
                {item.done ? "✓" : null}
              </span>
              <div className="task-checklist-text-block">
                <span className="task-checklist-text">{item.text}</span>
                {item.check ? (
                  <code className="task-checklist-check">{item.check}</code>
                ) : null}
                {item.done && item.verified_by ? (
                  <span className="task-checklist-verified-badge">
                    Verified ({item.verified_by})
                  </span>
                ) : null}
                {item.done && item.evidence ? (
                  <details className="task-checklist-evidence">
                    <summary>Evidence</summary>
                    <pre>{item.evidence.slice(0, CHECKLIST_EVIDENCE_DISPLAY_CAP)}</pre>
                  </details>
                ) : null}
                {item.done && item.verifier_reasoning ? (
                  <details className="task-checklist-reasoning">
                    <summary>Verifier reasoning</summary>
                    <pre>{item.verifier_reasoning}</pre>
                  </details>
                ) : null}
              </div>
            </div>
            {!checklistInherit ? (
              <div className="task-checklist-row-actions">
                <button
                  type="button"
                  className="task-detail-checklist-edit"
                  // Done criteria are locked: editing the text after the
                  // agent has accepted the criterion as satisfied would
                  // silently rewrite history (the
                  // checklist_item_toggled audit row would now point at
                  // text that didn't exist at completion time). The
                  // backend rejects this with ErrInvalidInput as well —
                  // disabling here just keeps the affordance honest.
                  disabled={
                    item.done ||
                    editCriterionPending ||
                    removeItemPending ||
                    addCriterionPending
                  }
                  title={
                    item.done
                      ? "Already marked done — cannot edit a satisfied criterion."
                      : undefined
                  }
                  aria-label={
                    item.done
                      ? `Edit criterion (locked: already marked done): ${item.text}`
                      : undefined
                  }
                  onClick={() => onOpenEditCriterionModal(item.id, item.text)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="task-detail-checklist-remove"
                  // Symmetric with the Edit lock above: removing a done
                  // criterion would orphan the persisted
                  // checklist_item_toggled (done=true) audit row and
                  // erase the historical fact that the task ever
                  // satisfied this requirement. The backend rejects
                  // this with ErrInvalidInput; disabling here keeps the
                  // affordance honest so users don't trigger a bogus
                  // 400 round-trip.
                  disabled={item.done || removeItemPending}
                  title={
                    item.done
                      ? "Already marked done — cannot remove a satisfied criterion."
                      : undefined
                  }
                  aria-label={
                    item.done
                      ? `Remove criterion (locked: already marked done): ${item.text}`
                      : undefined
                  }
                  onClick={() => onRemoveChecklistItem(item.id)}
                >
                  Remove
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
