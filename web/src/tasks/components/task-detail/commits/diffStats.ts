import { parseDiff, type FileData } from "react-diff-view";

export type FileDiffStats = {
  additions: number;
  deletions: number;
  changedLines: number;
};

export type CommitDiffStats = {
  fileCount: number;
  additions: number;
  deletions: number;
  files: FileData[];
};

export function parseDiffFiles(patch: string): FileData[] {
  const trimmed = patch.trim();
  if (!trimmed) {
    return [];
  }
  try {
    return parseDiff(patch);
  } catch {
    return [];
  }
}

export function fileDiffStats(file: FileData): FileDiffStats {
  let additions = 0;
  let deletions = 0;
  for (const hunk of file.hunks) {
    for (const change of hunk.changes) {
      if (change.type === "insert") {
        additions += 1;
      } else if (change.type === "delete") {
        deletions += 1;
      }
    }
  }
  return { additions, deletions, changedLines: additions + deletions };
}

export function commitDiffStats(patch: string): CommitDiffStats {
  const files = parseDiffFiles(patch);
  let additions = 0;
  let deletions = 0;
  for (const file of files) {
    const stats = fileDiffStats(file);
    additions += stats.additions;
    deletions += stats.deletions;
  }
  return { fileCount: files.length, additions, deletions, files };
}

export function countDiffFiles(patch: string): number {
  return parseDiffFiles(patch).length;
}

export function fileDisplayPath(file: FileData): string {
  return file.newPath ?? file.oldPath ?? "unknown";
}

export function fileStatusLabel(type: FileData["type"]): string {
  switch (type) {
    case "add":
      return "Added";
    case "delete":
      return "Deleted";
    case "rename":
      return "Renamed";
    case "copy":
      return "Copied";
    default:
      return "Modified";
  }
}

export function fileAnchorId(path: string): string {
  let hash = 0;
  for (let i = 0; i < path.length; i += 1) {
    hash = (hash * 31 + path.charCodeAt(i)) | 0;
  }
  return `file-${Math.abs(hash).toString(36)}`;
}

const maxDefaultExpandedHunks = 3;
const maxDefaultExpandedChangedLines = 300;
/** Above this file count, default-collapse every file unless it is a tiny diff. */
const manyFilesCollapseThreshold = 6;
const manyFilesMaxAutoExpandChangedLines = 40;
const manyFilesMaxAutoExpandHunks = 1;

export function shouldCollapseFileByDefault(file: FileData): boolean {
  const stats = fileDiffStats(file);
  return (
    file.hunks.length > maxDefaultExpandedHunks ||
    stats.changedLines > maxDefaultExpandedChangedLines
  );
}

export function shouldExpandFileByDefault(
  file: FileData,
  fileCount: number,
): boolean {
  const path = fileDisplayPath(file);
  if (isGeneratedLockfile(path)) {
    return false;
  }
  if (shouldCollapseFileByDefault(file)) {
    return false;
  }
  if (fileCount >= manyFilesCollapseThreshold) {
    const stats = fileDiffStats(file);
    return (
      file.hunks.length <= manyFilesMaxAutoExpandHunks &&
      stats.changedLines <= manyFilesMaxAutoExpandChangedLines
    );
  }
  return true;
}

export function initialFileExpandedState(
  files: ReadonlyArray<FileData>,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  const fileCount = files.length;
  for (const file of files) {
    const path = fileDisplayPath(file);
    out[path] = shouldExpandFileByDefault(file, fileCount);
  }
  return out;
}

export function isBinaryDiffFile(file: FileData): boolean {
  const body = file.hunks.map((h) => h.content).join("\n");
  return /Binary files/i.test(body);
}

export function isGeneratedLockfile(path: string): boolean {
  const base = path.replace(/\\/g, "/").split("/").pop()?.toLowerCase() ?? "";
  return (
    base === "package-lock.json" ||
    base === "yarn.lock" ||
    base === "pnpm-lock.yaml" ||
    base === "go.sum" ||
    base === "cargo.lock"
  );
}
