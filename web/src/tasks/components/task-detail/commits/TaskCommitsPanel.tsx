import { useMemo } from "react";
import { useTaskCommits } from "@/tasks/hooks/useTaskCommits";
import type { CommitStatus, TaskCommit } from "@/types";
import { formatRelativeTime } from "@/shared/time/relativeTime";
import { useNow } from "@/shared/useNow";

type Props = {
  taskId: string;
  enabled?: boolean;
};

export function TaskCommitsPanel({ taskId, enabled = true }: Props) {
  const commitsQuery = useTaskCommits(taskId, { enabled });
  const commits = commitsQuery.data?.commits ?? [];
  const now = useNow();

  const gitContext = useMemo(() => {
    if (commits.length === 0) return null;
    const first = commits[0];
    const last = commits[commits.length - 1];
    return {
      repo: first.repo,
      worktree: first.worktree,
      branch: last.branch || first.branch,
    };
  }, [commits]);

  return (
    <section
      className="task-detail-section"
      data-testid="task-commits-panel"
      aria-labelledby="task-commits-heading"
    >
      <h2 id="task-commits-heading" className="task-detail-section-heading">
        Git commits
      </h2>
      {commitsQuery.isLoading ? (
        <p className="muted">Loading commits…</p>
      ) : commits.length === 0 ? (
        <p className="muted">No commits indexed yet.</p>
      ) : (
        <>
          {gitContext ? (
            <p className="task-cycle-commits-breadcrumb muted">
              {formatGitBreadcrumb(gitContext)}
            </p>
          ) : null}
          <ul className="task-cycle-commits-list">
            {commits.map((commit) => (
              <li key={commit.sha} className="task-cycle-commit-row">
                <CommitStatusBadge status={commit.status} gateReason={commit.gate_reason} />
                <span className="task-cycle-commit-sha">{shortSha(commit.sha)}</span>
                <span className="task-cycle-commit-sep" aria-hidden="true">
                  ·
                </span>
                <span className="task-cycle-commit-message">{commit.message}</span>
                <span className="task-cycle-commit-sep" aria-hidden="true">
                  ·
                </span>
                <span className="task-cycle-commit-time muted">
                  Attempt #{commit.attempt_seq} ·{" "}
                  {formatRelativeTime(commit.committed_at, new Date(now))}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function CommitStatusBadge({
  status,
  gateReason,
}: {
  status: CommitStatus;
  gateReason?: string;
}) {
  const label =
    status === "eligible"
      ? "Eligible"
      : status === "observed"
        ? "Observed"
        : status === "inherited"
          ? "Inherited"
          : "Superseded";
  const title = gateReason?.trim() ? gateReason : undefined;
  return (
    <span
      className={`task-commit-status task-commit-status--${status}`}
      title={title}
    >
      {label}
    </span>
  );
}

function shortSha(sha: string): string {
  const trimmed = sha.trim();
  return trimmed.length > 7 ? trimmed.slice(0, 7) : trimmed;
}

function pathTail(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const parts = normalized.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : path;
}

function formatGitBreadcrumb(ctx: {
  repo: string;
  worktree: string;
  branch: string;
}): string {
  const repo = ctx.repo.trim();
  const worktree = ctx.worktree.trim();
  const branch = ctx.branch.trim() || "detached";
  const segments = [pathTail(repo || "repo")];
  if (worktree !== "" && worktree !== repo) {
    segments.push(pathTail(worktree));
  }
  segments.push(branch);
  return segments.join(" › ");
}
