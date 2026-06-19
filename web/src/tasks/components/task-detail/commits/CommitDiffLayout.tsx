import { useEffect, useMemo, useState } from "react";
import "react-diff-view/style/index.css";
import type { RepoDiffResult } from "@/api/repo";
import { CommitDiffFile } from "./CommitDiffFile";
import { CommitDiffNavigator } from "./CommitDiffNavigator";
import { CommitDiffToolbar } from "./CommitDiffToolbar";
import { isPatchLikelyIncomplete } from "./diffPatchIntegrity";
import {
  commitDiffStats,
  fileAnchorId,
  fileDisplayPath,
  initialFileExpandedState,
  parseDiffFiles,
} from "./diffStats";
import { useDiffViewMode } from "./useDiffViewMode";

type Props = {
  patch: string;
  truncated: boolean;
  serverStats?: Pick<
    RepoDiffResult,
    "files_changed" | "insertions" | "deletions"
  >;
  viewClassName?: string;
};

function initialExpandedState(files: ReturnType<typeof parseDiffFiles>): Record<string, boolean> {
  return initialFileExpandedState(files);
}

export function CommitDiffLayout({
  patch,
  truncated,
  serverStats,
  viewClassName,
}: Props) {
  const { viewMode, setViewMode } = useDiffViewMode();
  const files = useMemo(() => parseDiffFiles(patch), [patch]);
  const [expandedByPath, setExpandedByPath] = useState<Record<string, boolean>>(
    () => initialExpandedState(files),
  );
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);

  useEffect(() => {
    setExpandedByPath(initialExpandedState(files));
  }, [patch, files]);

  useEffect(() => {
    if (files.length <= 1) {
      setActiveAnchor(null);
      return undefined;
    }
    const anchors = files.map((f) => fileAnchorId(fileDisplayPath(f)));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.id;
        if (top) {
          setActiveAnchor(top);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    for (const id of anchors) {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
      }
    }
    return () => observer.disconnect();
  }, [files]);

  const incomplete = truncated && isPatchLikelyIncomplete(patch);
  const stats = useMemo(() => commitDiffStats(patch), [patch]);
  const expandedCount = useMemo(
    () =>
      files.filter((file) => expandedByPath[fileDisplayPath(file)] ?? true).length,
    [expandedByPath, files],
  );

  const expandAllFiles = () => {
    setExpandedByPath(
      Object.fromEntries(files.map((file) => [fileDisplayPath(file), true])),
    );
  };

  const collapseAllFiles = () => {
    setExpandedByPath(
      Object.fromEntries(files.map((file) => [fileDisplayPath(file), false])),
    );
  };

  if (files.length === 0) {
    return (
      <p className="task-commit-diff-empty muted">No file changes in this commit.</p>
    );
  }

  return (
    <div className="task-commit-diff-layout">
      {truncated ? (
        <p
          className={
            incomplete
              ? "task-commit-diff-truncation task-commit-diff-truncation--severe"
              : "task-commit-diff-truncation muted"
          }
          role="alert"
        >
          {incomplete
            ? "This patch was truncated mid-hunk. The diff below may be incomplete."
            : "This patch was truncated at the server limit. The view shows the available portion only."}
        </p>
      ) : null}
      <CommitDiffToolbar
        patch={patch}
        truncated={truncated}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        serverStats={serverStats}
        fileCount={files.length}
        expandedCount={expandedCount}
        onExpandAll={files.length > 1 ? expandAllFiles : undefined}
        onCollapseAll={files.length > 1 ? collapseAllFiles : undefined}
      />
      <div
        className={
          files.length <= 1
            ? "task-commit-diff-layout-body task-commit-diff-layout-body--single"
            : "task-commit-diff-layout-body"
        }
      >
        <CommitDiffNavigator
          files={files}
          activeAnchor={activeAnchor}
          onSelect={setActiveAnchor}
        />
        <div className={viewClassName ?? "task-commit-diff-view"}>
          {files.map((file) => {
            const path = fileDisplayPath(file);
            return (
              <CommitDiffFile
                key={`${file.oldRevision}-${file.newRevision}-${path}`}
                file={file}
                viewMode={viewMode}
                expanded={expandedByPath[path] ?? true}
                onToggleExpanded={() => {
                  setExpandedByPath((prev) => ({
                    ...prev,
                    [path]: !(prev[path] ?? true),
                  }));
                }}
              />
            );
          })}
        </div>
      </div>
      {stats.fileCount > 0 ? (
        <p className="sr-only" role="status">
          Showing {stats.fileCount} changed {stats.fileCount === 1 ? "file" : "files"}.
        </p>
      ) : null}
    </div>
  );
}

export { countDiffFiles } from "./diffStats";
