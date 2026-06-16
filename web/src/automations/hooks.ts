import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { listAutomations } from "@/api";
import type { AutomationListResponse } from "@/types";
import { automationQueryKeys } from "./queryKeys";

export function useAutomations(options?: {
  includeArchived?: boolean;
  limit?: number;
  enabled?: boolean;
}): UseQueryResult<AutomationListResponse, Error> {
  const includeArchived = options?.includeArchived ?? false;
  const limit = options?.limit ?? 200;
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: automationQueryKeys.list(includeArchived, limit),
    queryFn: ({ signal }) =>
      listAutomations({
        signal,
        includeArchived,
        limit,
      }),
    enabled,
  });
}
