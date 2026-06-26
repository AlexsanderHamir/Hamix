import { useQuery } from "@tanstack/react-query";
import { getGlobalGitRepository } from "@/api/gitGlobal";
import { gitQueryKeys } from "../queryKeys";

export function useGlobalRepository(
  repositoryId: string,
  options?: { enabled?: boolean },
) {
  const enabled = (options?.enabled ?? true) && Boolean(repositoryId);
  return useQuery({
    queryKey: gitQueryKeys.globalRepository(repositoryId),
    queryFn: ({ signal }) => getGlobalGitRepository(repositoryId, { signal }),
    enabled,
  });
}
