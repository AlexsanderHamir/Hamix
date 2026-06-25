import { useQuery } from "@tanstack/react-query";
import { fetchGitRepositoryProbe } from "@/api/settingsBrowse";
import { settingsQueryKeys } from "@/settings/queryKeys";

export function useGitRepositoryProbe(path: string, options?: { enabled?: boolean }) {
  const trimmed = path.trim();
  return useQuery({
    queryKey: settingsQueryKeys.gitProbe(trimmed),
    queryFn: ({ signal }) => fetchGitRepositoryProbe(trimmed, { signal }),
    enabled: options?.enabled !== false && trimmed !== "",
  });
}
