import type { CommitStatus } from "@/types";

export type GitContextFields = {
  repo: string;
  worktree: string;
  branch: string;
};

export type GitContextItem = {
  label: string;
  value: string;
  title?: string;
};

/** Normalize paths so Windows separators compare equal to git output. */
export function normalizeGitPath(path: string): string {
  return path.trim().replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

export function pathTail(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const parts = normalized.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : path;
}

export function shortSha(sha: string): string {
  const trimmed = sha.trim();
  return trimmed.length > 7 ? trimmed.slice(0, 7) : trimmed;
}

/** Matches GET /repo/diff SHA validation (7–40 hex). */
export const commitShaParamPattern = /^[0-9a-fA-F]{7,40}$/;

export function taskCommitDiffPath(taskId: string, sha: string): string {
  return `/tasks/${encodeURIComponent(taskId)}/commits/${encodeURIComponent(sha)}`;
}

/** Labeled repo context for the commits panel (avoids ambiguous breadcrumbs). */
export function buildGitContextItems(ctx: GitContextFields): GitContextItem[] {
  const branch = ctx.branch.trim() || "detached";
  const repo = ctx.repo.trim();
  const worktree = ctx.worktree.trim();
  const repoNorm = normalizeGitPath(repo);
  const worktreeNorm = normalizeGitPath(worktree);
  const items: GitContextItem[] = [{ label: "Branch", value: branch }];

  if (worktreeNorm !== "" && worktreeNorm !== repoNorm) {
    items.push({
      label: "Worktree",
      value: pathTail(worktree),
      title: worktree,
    });
    if (repoNorm !== "") {
      items.push({
        label: "Repo root",
        value: pathTail(repo),
        title: repo,
      });
    }
  } else {
    const primary = worktree || repo;
    if (primary !== "") {
      items.push({
        label: "Worktree",
        value: pathTail(primary),
        title: primary,
      });
    }
  }

  return items;
}

export function commitStatusLabel(status: CommitStatus): string {
  switch (status) {
    case "eligible":
      return "Eligible";
    case "observed":
      return "Observed";
    case "inherited":
      return "Inherited";
    case "superseded":
      return "Superseded";
    default:
      return status;
  }
}

const GATE_REASON_LABELS: Record<string, string> = {
  execute_uncommitted_work: "Uncommitted changes remained in the worktree",
  execute_no_commits: "No new commits were recorded in this attempt",
  execute_invalid_commit: "Commit is not valid for this cycle's history",
  execute_rewritten_history: "Git history was rewritten during the run",
};

export function commitStatusDescription(status: CommitStatus): string {
  switch (status) {
    case "eligible":
      return "Passed execute checks and counts toward verify.";
    case "observed":
      return "Recorded from the agent run but excluded from verify.";
    case "inherited":
      return "Carried over from a prior attempt; promoted when execute gates pass.";
    case "superseded":
      return "No longer part of this attempt's git history.";
    default:
      return "";
  }
}

export function gateReasonLabel(reason: string | undefined): string | undefined {
  const trimmed = reason?.trim();
  if (!trimmed) {
    return undefined;
  }
  return GATE_REASON_LABELS[trimmed] ?? trimmed;
}

export type CommitStatusTooltipInput = {
  status: CommitStatus;
  gateReason?: string;
  sourceCycleId?: string;
};

export function commitStatusTooltip(input: CommitStatusTooltipInput): string {
  const parts: string[] = [commitStatusDescription(input.status)];
  const reason = gateReasonLabel(input.gateReason);
  if (reason && input.status === "observed") {
    parts.push(`Reason: ${reason}`);
  }
  const source = input.sourceCycleId?.trim();
  if (source && input.status === "inherited") {
    parts.push(`From cycle ${source}`);
  }
  return parts.filter(Boolean).join(" ");
}

export function commitStatusPillClass(status: CommitStatus): string {
  switch (status) {
    case "eligible":
      return "cell-pill cell-pill--commit-eligible";
    case "observed":
      return "cell-pill cell-pill--commit-observed";
    case "inherited":
      return "cell-pill cell-pill--commit-inherited";
    case "superseded":
      return "cell-pill cell-pill--commit-superseded";
    default:
      return "cell-pill";
  }
}
