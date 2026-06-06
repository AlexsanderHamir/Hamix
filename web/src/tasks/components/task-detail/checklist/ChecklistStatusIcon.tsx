/**
 * Three-state visual vocabulary for checklist criteria:
 *  - "passed":  outlined circle with a check, success-toned
 *  - "failed":  outlined circle with an x, danger-toned
 *  - "pending": faint outlined circle, neutral-toned
 *
 * Today the data model only emits passed / pending (binary `done` flag).
 * `failed` is reserved so the same component can render a verifier-rejected
 * state once the backend surfaces it without another visual revision.
 */
export type ChecklistStatus = "passed" | "failed" | "pending";

type ChecklistStatusIconProps = {
  /** Back-compat with the original `done: boolean` callers. */
  done?: boolean;
  status?: ChecklistStatus;
};

const STATUS_LABEL: Record<ChecklistStatus, string> = {
  passed: "Satisfied",
  failed: "Not satisfied — failed verification",
  pending: "Not satisfied yet",
};

export function ChecklistStatusIcon({
  done,
  status,
}: ChecklistStatusIconProps) {
  const resolved: ChecklistStatus =
    status ?? (done ? "passed" : "pending");
  return (
    <span
      className={`task-checklist-status task-checklist-status--${resolved}`}
      role="img"
      aria-label={STATUS_LABEL[resolved]}
    >
      <svg
        className="task-checklist-status__glyph"
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <circle
          cx={12}
          cy={12}
          r={10}
          stroke="currentColor"
          strokeWidth={1.75}
        />
        {resolved === "passed" ? (
          <path
            d="M8 12.5 10.8 15.2 16 9.8"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {resolved === "failed" ? (
          <path
            d="m9 9 6 6M15 9l-6 6"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
          />
        ) : null}
      </svg>
    </span>
  );
}
