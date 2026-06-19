import { describe, expect, it } from "vitest";
import {
  commitDiffStats,
  fileDiffStats,
  fileStatusLabel,
  initialFileExpandedState,
  parseDiffFiles,
  shouldCollapseFileByDefault,
  shouldExpandFileByDefault,
} from "./diffStats";

const samplePatch = [
  "diff --git a/note.txt b/note.txt",
  "index 83db48f..f00f10f 100644",
  "--- a/note.txt",
  "+++ b/note.txt",
  "@@ -1 +1 @@",
  "-hello",
  "+world",
].join("\n");

describe("diffStats", () => {
  it("parses files and counts insertions and deletions", () => {
    const stats = commitDiffStats(samplePatch);
    expect(stats.fileCount).toBe(1);
    expect(stats.additions).toBe(1);
    expect(stats.deletions).toBe(1);
  });

  it("labels file status from diff type", () => {
    const files = parseDiffFiles(samplePatch);
    expect(fileStatusLabel(files[0].type)).toBe("Modified");
    expect(fileDiffStats(files[0]).changedLines).toBe(2);
  });

  it("collapses files with many hunks or changed lines by default", () => {
    const files = parseDiffFiles(samplePatch);
    expect(shouldCollapseFileByDefault(files[0])).toBe(false);
  });

  it("collapses large files in commits with many changed files", () => {
    const files = parseDiffFiles(samplePatch);
    expect(shouldExpandFileByDefault(files[0], 1)).toBe(true);
    expect(shouldExpandFileByDefault(files[0], 8)).toBe(true);
  });

  it("initial expanded state keys files by display path", () => {
    const files = parseDiffFiles(samplePatch);
    const state = initialFileExpandedState(files);
    expect(state["note.txt"]).toBe(true);
  });
});
