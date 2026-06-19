import type { FileData } from "react-diff-view";
import {
  fileAnchorId,
  fileDiffStats,
  fileDisplayPath,
  fileStatusLabel,
} from "./diffStats";

type Props = {
  files: ReadonlyArray<FileData>;
  activeAnchor: string | null;
  onSelect: (anchorId: string) => void;
};

export function CommitDiffNavigator({ files, activeAnchor, onSelect }: Props) {
  if (files.length <= 1) {
    return null;
  }

  return (
    <nav
      className="task-commit-diff-nav"
      aria-label="Changed files"
      data-testid="task-commit-diff-nav"
    >
      <p className="task-commit-diff-nav-label">Files</p>
      <ul className="task-commit-diff-nav-list">
        {files.map((file) => {
          const path = fileDisplayPath(file);
          const anchor = fileAnchorId(path);
          const stats = fileDiffStats(file);
          const tail = path.replace(/\\/g, "/").split("/").pop() ?? path;
          return (
            <li key={`${file.oldRevision}-${file.newRevision}-${path}`}>
              <button
                type="button"
                className={
                  activeAnchor === anchor
                    ? "task-commit-diff-nav-item task-commit-diff-nav-item--active"
                    : "task-commit-diff-nav-item"
                }
                onClick={() => {
                  onSelect(anchor);
                  document.getElementById(anchor)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                <span
                  className={`task-commit-diff-nav-dot task-commit-diff-nav-dot--${file.type}`}
                  aria-hidden="true"
                />
                <span className="task-commit-diff-nav-path" title={path}>
                  {tail}
                </span>
                <span className="task-commit-diff-nav-meta muted">
                  {fileStatusLabel(file.type)}
                  {stats.additions > 0 ? ` +${stats.additions}` : ""}
                  {stats.deletions > 0 ? ` −${stats.deletions}` : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
