import type { CommitStatus } from "@/types";
import {
  commitStatusLabel,
  commitStatusPillClass,
  commitStatusTooltip,
} from "./commitDisplay";

export function CommitStatusBadge({
  status,
  gateReason,
  sourceCycleId,
}: {
  status: CommitStatus;
  gateReason?: string;
  sourceCycleId?: string;
}) {
  const tooltip = commitStatusTooltip({ status, gateReason, sourceCycleId });
  return (
    <span
      className={commitStatusPillClass(status)}
      title={tooltip}
      aria-label={tooltip}
      data-testid="task-commit-status"
    >
      {commitStatusLabel(status)}
    </span>
  );
}
