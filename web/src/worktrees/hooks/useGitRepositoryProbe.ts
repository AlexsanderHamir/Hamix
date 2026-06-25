import { useQuery } from "@tanstack/react-query";
import { fetchGitRepositoryProbe } from "@/api/settingsBrowse";

export function useGitRepositoryProbe(path: string, options?: { enabled?: boolean }) {
  const trimmed = path.trim();
  return useQuery({
    queryKey: ["settings", "git-probe", trimmed],
    queryFn: ({ signal }) => fetchGitRepositoryProbe(trimmed, { signal }),
    enabled: options?.enabled !== false && trimmed !== "",
  });
}
