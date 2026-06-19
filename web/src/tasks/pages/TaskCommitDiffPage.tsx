import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { maxRepoShaQueryBytes } from "@/api/repo";
import { errorMessage } from "@/lib/errorMessage";
import { formatRelativeTime } from "@/shared/time/relativeTime";
import { useDocumentTitle } from "@/shared/useDocumentTitle";
import { useNow } from "@/shared/useNow";
import { CommitDiffPanel } from "../components/task-detail/commits/CommitDiffPanel";
import { CommitStatusBadge } from "../components/task-detail/commits/CommitStatusBadge";
import {
  commitShaParamPattern,
  shortSha,
} from "../components/task-detail/commits/commitDisplay";
import { useTaskCommits } from "../hooks/useTaskCommits";

export function TaskCommitDiffPage() {
  const now = useNow();
  const { taskId = "", sha: shaParam = "" } = useParams<{
    taskId: string;
    sha: string;
  }>();
  const sha = decodeURIComponent(shaParam).trim();
  const shaValid =
    sha.length > 0 &&
    sha.length <= maxRepoShaQueryBytes &&
    commitShaParamPattern.test(sha);

  const commitsQuery = useTaskCommits(taskId, { enabled: Boolean(taskId) && shaValid });
  const commit = useMemo(
    () => commitsQuery.data?.commits.find((c) => c.sha === sha),
    [commitsQuery.data?.commits, sha],
  );

  const pageTitle = shaValid
    ? commit?.message
      ? `${shortSha(sha)}: ${commit.message}`
      : `Commit ${shortSha(sha)}`
    : "Invalid commit";
  useDocumentTitle(pageTitle);

  if (!taskId) {
    return (
      <p className="muted" role="status">
        Missing task id.
      </p>
    );
  }

  if (!shaValid) {
    return (
      <section className="panel task-detail-panel task-detail-content--enter">
        <div className="err" role="alert">
          <p>Invalid commit SHA in the URL.</p>
          <div className="task-detail-error-actions">
            <Link
              to={`/tasks/${encodeURIComponent(taskId)}`}
              className="pd__back project-context-back-link"
            >
              <span aria-hidden="true">&#8249;</span>
              Back to task
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const backTo = `/tasks/${encodeURIComponent(taskId)}`;

  return (
    <section
      className="panel task-detail-panel task-commit-diff-page task-detail-content--enter"
      data-testid="task-commit-diff-page"
    >
      <header className="task-commit-diff-page-head">
        <Link to={backTo} className="pd__back project-context-back-link">
          <span aria-hidden="true">&#8249;</span>
          Back to task
        </Link>
        <p className="task-commit-diff-page-eyebrow">Commit diff</p>
        <div className="task-commit-diff-page-title-row">
          <code className="task-commit-sha" title={sha}>
            {shortSha(sha)}
          </code>
          {commit ? (
            <CommitStatusBadge
              status={commit.status}
              gateReason={commit.gate_reason}
            />
          ) : null}
        </div>
        {commit?.message ? (
          <h1 className="task-commit-diff-page-message">{commit.message}</h1>
        ) : (
          <h1 className="task-commit-diff-page-message muted">
            {shortSha(sha)}
          </h1>
        )}
        {commit ? (
          <p className="task-commit-diff-page-meta muted">
            {formatRelativeTime(commit.committed_at, new Date(now))}
          </p>
        ) : commitsQuery.isError ? (
          <p className="task-commit-diff-page-meta muted" role="status">
            {errorMessage(commitsQuery.error, "Could not load commit metadata.")}
          </p>
        ) : null}
      </header>
      <CommitDiffPanel
        sha={sha}
        viewClassName="task-commit-diff-view task-commit-diff-view--page"
      />
    </section>
  );
}