import { useMemo } from "react";
import type { ViewType } from "react-diff-view";
import type { RepoDiffResult } from "@/api/repo";
import { commitDiffStats, type CommitDiffStats } from "./diffStats";
import { useCopyToClipboard } from "./useCopyToClipboard";

type Props = {
  patch: string;
  truncated: boolean;
  viewMode: ViewType;
  onViewModeChange: (mode: ViewType) => void;
  serverStats?: Pick<
    RepoDiffResult,
    "files_changed" | "insertions" | "deletions"
  >;
  fileCount?: number;
  expandedCount?: number;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
};

export function CommitDiffToolbar({
  patch,
  truncated,
  viewMode,
  onViewModeChange,
  serverStats,
  fileCount: fileCountProp,
  expandedCount,
  onExpandAll,
  onCollapseAll,
}: Props) {
  const patchCopy = useCopyToClipboard("Copy patch");

  const stats: CommitDiffStats = useMemo(
    () => commitDiffStats(patch),
    [patch],
  );

  const fileCount = serverStats?.files_changed ?? fileCountProp ?? stats.fileCount;
  const additions = serverStats?.insertions ?? stats.additions;
  const deletions = serverStats?.deletions ?? stats.deletions;
  const showFileBulkActions =
    fileCount > 1 && onExpandAll !== undefined && onCollapseAll !== undefined;

  return (
    <div className="task-commit-diff-toolbar" data-testid="task-commit-diff-toolbar">
      <p className="task-commit-diff-summary" role="status">
        <span className="task-commit-diff-summary-files">
          {fileCount} {fileCount === 1 ? "file" : "files"} changed
        </span>
        {showFileBulkActions && expandedCount !== undefined ? (
          <span className="task-commit-diff-summary-expanded muted">
            {expandedCount} expanded
          </span>
        ) : null}
        {additions > 0 ? (
          <span className="task-commit-diff-summary-add">+{additions}</span>
        ) : null}
        {deletions > 0 ? (
          <span className="task-commit-diff-summary-del">−{deletions}</span>
        ) : null}
        {truncated ? (
          <span className="task-commit-diff-summary-truncated">Truncated</span>
        ) : null}
      </p>
      <div className="task-commit-diff-toolbar-actions">
        {showFileBulkActions ? (
          <div
            className="task-commit-diff-file-bulk"
            role="group"
            aria-label="Expand or collapse all files"
          >
            <button
              type="button"
              className="btn-utility task-commit-diff-expand-all"
              onClick={onExpandAll}
            >
              Expand all
            </button>
            <button
              type="button"
              className="btn-utility task-commit-diff-collapse-all"
              onClick={onCollapseAll}
            >
              Collapse all
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className="btn-utility task-commit-diff-copy-patch"
          onClick={() => patchCopy.copy(patch)}
        >
          {patchCopy.copyLabel}
        </button>
        <div
          className="task-commit-diff-view-toggle"
          role="group"
          aria-label="Diff view mode"
        >
          <ViewModeButton
            active={viewMode === "unified"}
            label="Unified"
            onClick={() => onViewModeChange("unified")}
          />
          <ViewModeButton
            active={viewMode === "split"}
            label="Split"
            onClick={() => onViewModeChange("split")}
          />
        </div>
      </div>
    </div>
  );
}

function ViewModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? "task-commit-diff-view-btn task-commit-diff-view-btn--active"
          : "task-commit-diff-view-btn"
      }
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
