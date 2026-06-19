import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { listTaskCommits } from "@/api";
import type { TaskCommitsResponse } from "@/types";
import { taskQueryKeys } from "../task-query";

/** Task-wide git commits indexed across all execution attempts. */
export function useTaskCommits(
  taskId: string,
  options?: { enabled?: boolean },
): UseQueryResult<TaskCommitsResponse, Error> {
  const enabled = (options?.enabled ?? true) && Boolean(taskId);
  return useQuery({
    queryKey: taskQueryKeys.commits(taskId),
    queryFn: ({ signal }) => listTaskCommits(taskId, { signal }),
    enabled,
  });
}
