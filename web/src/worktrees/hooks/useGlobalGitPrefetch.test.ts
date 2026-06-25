import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { gitQueryKeys } from "../queryKeys";
import { prefetchWorktreesPageShell } from "./useGlobalGitPrefetch";

describe("prefetchWorktreesPageShell", () => {
  it("prefetches worktrees and branches for at most five repositories", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const prefetchQuery = vi.spyOn(queryClient, "prefetchQuery").mockResolvedValue(undefined);

    const repositoryIds = Array.from({ length: 8 }, (_, index) => `repo-${index}`);
    prefetchWorktreesPageShell(queryClient, repositoryIds);

    expect(prefetchQuery).toHaveBeenCalledTimes(10);
    expect(prefetchQuery.mock.calls.map((call) => call[0]?.queryKey)).toEqual([
      gitQueryKeys.globalWorktrees("repo-0"),
      gitQueryKeys.globalBranches("repo-0"),
      gitQueryKeys.globalWorktrees("repo-1"),
      gitQueryKeys.globalBranches("repo-1"),
      gitQueryKeys.globalWorktrees("repo-2"),
      gitQueryKeys.globalBranches("repo-2"),
      gitQueryKeys.globalWorktrees("repo-3"),
      gitQueryKeys.globalBranches("repo-3"),
      gitQueryKeys.globalWorktrees("repo-4"),
      gitQueryKeys.globalBranches("repo-4"),
    ]);
  });
});
