import { errorMessage } from "@/lib/errorMessage";
import { useCommitDiff } from "@/tasks/hooks/useCommitDiff";
import { CommitDiffView } from "./CommitDiffView";

type Props = {
  sha: string;
  viewClassName?: string;
};

export function CommitDiffPanel({ sha, viewClassName }: Props) {
  const diffQuery = useCommitDiff(sha);

  if (diffQuery.isPending) {
    return (
      <div
        className="task-commit-diff-panel task-commit-diff-panel--loading"
        aria-busy="true"
        aria-label="Loading commit diff"
      >
        <div className="task-commit-diff-skeleton" />
        <div className="task-commit-diff-skeleton" />
        <div className="task-commit-diff-skeleton" />
      </div>
    );
  }

  if (diffQuery.isError) {
    return (
      <div className="task-commit-diff-panel" role="alert">
        <p className="task-commit-diff-error">
          {errorMessage(diffQuery.error, "Could not load diff.")}
        </p>
        <button
          type="button"
          className="secondary task-commit-diff-retry"
          onClick={() => {
            void diffQuery.refetch();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (diffQuery.data === null) {
    return (
      <div className="task-commit-diff-panel">
        <p className="task-commit-diff-empty muted">
          Workspace repo is not configured. Set repo root in Settings to view diffs.
        </p>
      </div>
    );
  }

  const { patch, truncated } = diffQuery.data;

  return (
    <div className="task-commit-diff-panel">
      {truncated ? (
        <p className="task-commit-diff-truncation muted" role="status">
          This patch was truncated at the server limit. The view shows the available
          portion only.
        </p>
      ) : null}
      <CommitDiffView
        patch={patch}
        className={viewClassName ?? "task-commit-diff-view"}
      />
    </div>
  );
}
