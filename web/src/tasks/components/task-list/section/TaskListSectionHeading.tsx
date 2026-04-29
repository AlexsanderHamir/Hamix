import type { ReactNode } from "react";

type Props = {
  /** Optional toolbar on the title row (e.g. home “New task”). */
  actions?: ReactNode;
};

export function TaskListSectionHeading({ actions }: Props) {
  // Keep the heading text "All tasks" verbatim — region tests
  // (TaskListSection.test.tsx) match the accessible name strictly
  // and the `term-prompt` class adds the "$" glyph as a CSS
  // pseudo-element, which jsdom does not include in the
  // accessible-name computation.
  return (
    <div className="task-list-section-head">
      <div className="task-list-section-head__text">
        <h2 id="task-list-heading" className="term-prompt">
          <span>All tasks</span>
        </h2>
        {/* One-line lede in the existing terminal aesthetic — matches the
            create modal's "$ compose --next-up" pattern so the two surfaces
            read as siblings instead of unrelated pages. */}
        <p
          className="task-list-section-lede term-prompt muted"
          aria-hidden="true"
        >
          <span>query --next-up --filter --review</span>
        </p>
      </div>
      {actions ? (
        <div className="task-list-section-actions">{actions}</div>
      ) : null}
    </div>
  );
}
