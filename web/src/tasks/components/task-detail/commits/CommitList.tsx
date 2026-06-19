import type { CycleCommit } from "@/types";
import { CommitRow } from "./CommitRow";

type Props = {
  taskId: string;
  commits: ReadonlyArray<CycleCommit>;
  /** When true, show attempt number in each row (task-wide panel). */
  showAttempt?: boolean;
};

export function CommitList({ taskId, commits, showAttempt = false }: Props) {
  return (
    <ul className="task-commits-list" data-testid="task-commits-list">
      {commits.map((commit) => (
        <CommitRow
          key={commit.sha}
          taskId={taskId}
          commit={commit}
          showAttempt={showAttempt}
        />
      ))}
    </ul>
  );
}
