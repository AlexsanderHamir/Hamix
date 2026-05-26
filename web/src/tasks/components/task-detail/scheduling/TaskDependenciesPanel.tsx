import { Link } from "react-router-dom";
import type { TaskDependencySummary } from "../../../task-query/resolveTaskDependencySummaries";
import { statusPillClass } from "../../../task-display";

type Props = {
  taskId: string;
  dependencies: TaskDependencySummary[];
  editable?: boolean;
  addValue?: string;
  onAddValueChange?: (value: string) => void;
  onAdd?: () => void;
  onRemove?: (dependsOnTaskId: string) => void;
  addPending?: boolean;
  removePendingId?: string | null;
  error?: string | null;
};

export function TaskDependenciesPanel({
  taskId,
  dependencies,
  editable = false,
  addValue = "",
  onAddValueChange,
  onAdd,
  onRemove,
  addPending = false,
  removePendingId = null,
  error = null,
}: Props) {
  return (
    <section
      className="task-detail-section"
      id="task-detail-dependencies"
      aria-labelledby="task-detail-dependencies-title"
    >
      <h3 id="task-detail-dependencies-title" className="task-detail-section-title">
        Dependencies
      </h3>
      {dependencies.length === 0 ? (
        <p className="task-detail-empty-hint" data-testid="task-deps-empty">
          No upstream tasks. This task can start when its gate allows pickup.
        </p>
      ) : (
        <ul className="task-deps-list" data-testid="task-deps-list">
          {dependencies.map((dep) => (
            <li key={dep.id} className="task-deps-list__item">
              <Link
                to={`/tasks/${encodeURIComponent(dep.id)}`}
                className="task-deps-list__link"
              >
                {dep.title}
              </Link>
              <span className={statusPillClass(dep.status)}>{dep.status}</span>
              {editable && dep.id !== taskId && onRemove ? (
                <button
                  type="button"
                  className="secondary task-deps-list__remove"
                  disabled={removePendingId === dep.id}
                  onClick={() => onRemove(dep.id)}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {editable && onAdd && onAddValueChange ? (
        <div className="task-deps-add">
          <label className="task-deps-add__label" htmlFor="task-deps-add-input">
            Add dependency (task id)
          </label>
          <div className="task-deps-add__row">
            <input
              id="task-deps-add-input"
              className="input"
              value={addValue}
              onChange={(e) => onAddValueChange(e.target.value)}
              placeholder="Paste upstream task id"
              disabled={addPending}
            />
            <button
              type="button"
              className="primary"
              disabled={addPending || addValue.trim() === ""}
              onClick={onAdd}
            >
              Add
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p className="err" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
