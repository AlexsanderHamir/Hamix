import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  listGlobalGitBranches,
  listGlobalGitLiveBranches,
  listGlobalGitRepositories,
  listGlobalGitWorktrees,
} from "@/api/gitGlobal";
import { QUERY_POLICY } from "@/tasks/queryPolicy";
import { gitQueryKeys } from "../queryKeys";

const MAX_REPOSITORY_CARD_PREFETCH = 5;

export function globalRepositoriesQueryOptions() {
  return queryOptions({
    queryKey: gitQueryKeys.globalRepositories(),
    queryFn: ({ signal }) => listGlobalGitRepositories({ signal }),
    staleTime: QUERY_POLICY.shellStaleTimeMs,
  });
}

export function globalWorktreesQueryOptions(repositoryId: string) {
  const trimmed = repositoryId.trim();
  return queryOptions({
    queryKey: gitQueryKeys.globalWorktrees(trimmed),
    queryFn: ({ signal }) => listGlobalGitWorktrees(trimmed, { signal }),
    staleTime: QUERY_POLICY.shellStaleTimeMs,
  });
}

export function globalBranchesQueryOptions(repositoryId: string) {
  const trimmed = repositoryId.trim();
  return queryOptions({
    queryKey: gitQueryKeys.globalBranches(trimmed),
    queryFn: ({ signal }) => listGlobalGitBranches(trimmed, { signal }),
    staleTime: QUERY_POLICY.shellStaleTimeMs,
  });
}

export function globalLiveBranchesQueryOptions(repositoryId: string) {
  const trimmed = repositoryId.trim();
  return queryOptions({
    queryKey: gitQueryKeys.globalLiveBranches(trimmed),
    queryFn: ({ signal }) => listGlobalGitLiveBranches(trimmed, { signal }),
    staleTime: QUERY_POLICY.shellStaleTimeMs,
  });
}

export function prefetchRepositoryCardData(
  queryClient: QueryClient,
  repositoryId: string,
): void {
  if (repositoryId.trim() === "") return;
  void queryClient.prefetchQuery(globalWorktreesQueryOptions(repositoryId));
  void queryClient.prefetchQuery(globalBranchesQueryOptions(repositoryId));
}

export function prefetchLiveBranches(
  queryClient: QueryClient,
  repositoryId: string,
): void {
  if (repositoryId.trim() === "") return;
  void queryClient.prefetchQuery(globalLiveBranchesQueryOptions(repositoryId));
}

export function prefetchWorktreesPageShell(
  queryClient: QueryClient,
  repositoryIds: readonly string[],
): void {
  for (const repositoryId of repositoryIds.slice(0, MAX_REPOSITORY_CARD_PREFETCH)) {
    prefetchRepositoryCardData(queryClient, repositoryId);
  }
}

export function prefetchWorktreesRoute(queryClient: QueryClient): void {
  void import("@/worktrees");
  void queryClient.prefetchQuery(globalRepositoriesQueryOptions());
}
