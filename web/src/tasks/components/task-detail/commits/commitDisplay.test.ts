import { describe, expect, it } from "vitest";
import {
  buildGitContextItems,
  commitStatusDescription,
  commitStatusTooltip,
  gateReasonLabel,
  normalizeGitPath,
  shortSha,
  taskCommitDiffPath,
} from "./commitDisplay";

describe("commitDisplay", () => {
  it("normalizes Windows and POSIX paths for comparison", () => {
    expect(normalizeGitPath("C:\\Users\\gomes\\T2A\\")).toBe(
      normalizeGitPath("C:/Users/gomes/T2A"),
    );
  });

  it("buildGitContextItems collapses duplicate repo and worktree", () => {
    const items = buildGitContextItems({
      repo: "C:\\Users\\gomes\\OneDrive\\Documents\\T2A",
      worktree: "C:/Users/gomes/OneDrive/Documents/T2A",
      branch: "main",
    });
    expect(items).toEqual([
      { label: "Branch", value: "main" },
      {
        label: "Worktree",
        value: "T2A",
        title: "C:/Users/gomes/OneDrive/Documents/T2A",
      },
    ]);
  });

  it("buildGitContextItems shows separate worktree and repo when they differ", () => {
    const items = buildGitContextItems({
      repo: "/workspace/monorepo",
      worktree: "/workspace/monorepo/apps/web",
      branch: "feature/commits",
    });
    expect(items.map((i) => i.label)).toEqual(["Branch", "Worktree", "Repo root"]);
  });

  it("shortSha trims to seven characters", () => {
    expect(shortSha("0fc23bf2d0b5d5e8fc0d3638df57ac4de38053c1")).toBe("0fc23bf");
  });

  it("taskCommitDiffPath encodes task and sha segments", () => {
    expect(taskCommitDiffPath("task 1", "abc1234")).toBe(
      "/tasks/task%201/commits/abc1234",
    );
  });

  it("commitStatusDescription returns operator copy for each status", () => {
    expect(commitStatusDescription("eligible")).toMatch(/verify/i);
    expect(commitStatusDescription("observed")).toMatch(/excluded/i);
    expect(commitStatusDescription("inherited")).toMatch(/prior attempt/i);
    expect(commitStatusDescription("superseded")).toMatch(/git history/i);
  });

  it("gateReasonLabel maps harness codes to plain English", () => {
    expect(gateReasonLabel("execute_uncommitted_work")).toBe(
      "Uncommitted changes remained in the worktree",
    );
    expect(gateReasonLabel("unknown_custom_reason")).toBe("unknown_custom_reason");
    expect(gateReasonLabel("  ")).toBeUndefined();
  });

  it("commitStatusTooltip combines description and translated gate reason", () => {
    const tooltip = commitStatusTooltip({
      status: "observed",
      gateReason: "execute_uncommitted_work",
    });
    expect(tooltip).toMatch(/excluded from verify/i);
    expect(tooltip).toMatch(/Uncommitted changes remained in the worktree/);
    expect(tooltip).not.toMatch(/execute_uncommitted_work/);
  });
});
