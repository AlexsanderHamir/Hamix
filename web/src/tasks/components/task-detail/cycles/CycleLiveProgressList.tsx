import type { AgentRunProgressItem } from "@/tasks/hooks/useAgentRunProgress";
import {
  agentProgressKindLabel,
  agentProgressMessage,
  formatAgentProgressClockTime,
  formatAgentProgressElapsed,
} from "@/tasks/cycleDisplay/agentProgressDisplay";

export type CycleLiveProgressListProps = {
  items: ReadonlyArray<AgentRunProgressItem>;
  now: number;
  maxItems?: number;
  showPendingRow?: boolean;
  emptyMessage?: string;
  testId?: string;
  listAriaLabel?: string;
  timestampMode?: "relative" | "clock";
  pendingMessage?: string;
};

export function CycleLiveProgressList({
  items,
  now,
  maxItems = 3,
  showPendingRow,
  emptyMessage,
  testId = "task-cycle-progress-list",
  listAriaLabel = "Recent agent progress",
  timestampMode = "relative",
  pendingMessage = "Waiting…",
}: CycleLiveProgressListProps) {
  if (items.length === 0) {
    if (!emptyMessage) return null;
    return (
      <p
        className="task-cycle-progress-empty"
        data-testid="task-cycle-progress-empty"
      >
        {emptyMessage}
      </p>
    );
  }

  const newestFirst = [...items].sort((a, b) => b.receivedAt - a.receivedAt);
  const latest = newestFirst[0];
  const shouldShowPending = showPendingRow ?? true;

  function formatTimestamp(receivedAt: number): string {
    if (timestampMode === "clock") {
      return formatAgentProgressClockTime(receivedAt);
    }
    return formatAgentProgressElapsed(receivedAt, now);
  }

  return (
    <ol
      className="task-cycle-progress-list"
      aria-label={listAriaLabel}
      data-testid={testId}
    >
      {shouldShowPending ? (
        <li
          className="task-cycle-progress-item task-cycle-progress-item--pending"
          aria-label="Waiting for the next agent update"
        >
          <span className="task-cycle-progress-pulse" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="task-cycle-progress-message">{pendingMessage}</span>
          <span className="task-cycle-progress-time" aria-hidden="true">
            {latest ? `Last ${formatAgentProgressElapsed(latest.receivedAt, now)}` : ""}
          </span>
        </li>
      ) : null}
      {newestFirst.slice(0, maxItems).map((entry, index) => {
        const message = agentProgressMessage(entry);
        return (
          <li
            key={`${entry.receivedAt}:${index}:${entry.progress.kind}:${entry.progress.subtype ?? ""}`}
            className={`task-cycle-progress-item${index === 0 ? " task-cycle-progress-item--latest" : ""}`}
          >
            <span className="task-cycle-progress-kind">
              {agentProgressKindLabel(
                entry.progress.kind,
                entry.progress.subtype,
                entry.progress.tool,
              )}
            </span>
            <span
              className="task-cycle-progress-message"
              title={message}
            >
              {message}
            </span>
            {timestampMode === "clock" ? (
              <time
                className="task-cycle-progress-time"
                dateTime={new Date(entry.receivedAt).toISOString()}
              >
                {formatTimestamp(entry.receivedAt)}
              </time>
            ) : (
              <span className="task-cycle-progress-time" aria-hidden="true">
                {formatTimestamp(entry.receivedAt)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
