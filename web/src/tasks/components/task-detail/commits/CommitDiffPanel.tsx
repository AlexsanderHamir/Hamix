import { errorMessage } from "@/lib/errorMessage";
import type { RepoDiffResult } from "@/api/repo";
import { useCommitDiff } from "@/tasks/hooks/useCommitDiff";
import { CommitDiffLayout } from "./CommitDiffLayout";

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

  return (
    <CommitDiffLayout
      patch={diffQuery.data.patch}
      truncated={diffQuery.data.truncated}
      serverStats={pickServerStats(diffQuery.data)}
      viewClassName={viewClassName}
    />
  );
}

function pickServerStats(
  data: RepoDiffResult,
): Pick<RepoDiffResult, "files_changed" | "insertions" | "deletions"> | undefined {
  if (
    data.files_changed == null &&
    data.insertions == null &&
    data.deletions == null
  ) {
    return undefined;
  }
  return {
    files_changed: data.files_changed,
    insertions: data.insertions,
    deletions: data.deletions,
  };
}
