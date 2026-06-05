import { Link } from "react-router-dom";
import type { TaskEvent } from "@/types";
import {
  awaitingUserReply,
  eventTypeLabel,
  eventTypeNeedsUserInput,
  formatEventSummaryCompact,
} from "../../../task-events";

export function AttemptAuditTimeline({
  events,
  taskId,
  ariaLabelledBy,
}: {
  events: TaskEvent[];
  taskId: string;
  ariaLabelledBy: string;
}) {
  return (
    <ol className="attempt-audit-timeline" aria-labelledby={ariaLabelledBy}>
      {events.map((ev) => (
        <AttemptAuditRow key={ev.seq} ev={ev} taskId={taskId} />
      ))}
    </ol>
  );
}

function AttemptAuditRow({ ev, taskId }: { ev: TaskEvent; taskId: string }) {
  const needsUser = eventTypeNeedsUserInput(ev.type);
  const summary = formatEventSummaryCompact(ev);
  const eventHref = `/tasks/${encodeURIComponent(taskId)}/events/${ev.seq}`;
  const label = eventTypeLabel(ev.type);

  return (
    <li
      className={
        needsUser
          ? "attempt-audit-row attempt-audit-row--needs-user"
          : "attempt-audit-row"
      }
      data-needs-user={needsUser ? "true" : undefined}
    >
      <Link
        className="attempt-audit-row-hit"
        to={eventHref}
        aria-label={
          needsUser
            ? awaitingUserReply(ev)
              ? `${label} — needs your input`
              : `${label} — waiting on agent`
            : undefined
        }
      >
        <AttemptAuditRowHead ev={ev} label={label} summary={summary} />
      </Link>
      <AttemptAuditThread ev={ev} />
    </li>
  );
}

function AttemptAuditRowHead({
  ev,
  label,
  summary,
}: {
  ev: TaskEvent;
  label: string;
  summary: string | null;
}) {
  const needsUser = eventTypeNeedsUserInput(ev.type);
  return (
    <>
      <time className="attempt-audit-time" dateTime={ev.at}>
        {new Date(ev.at).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
      </time>
      <span className="attempt-audit-label">{label}</span>
      {summary ? (
        <span className="attempt-audit-preview">{summary}</span>
      ) : null}
      {needsUser && awaitingUserReply(ev) ? (
        <span className="attempt-audit-needs-user">Needs your input</span>
      ) : null}
    </>
  );
}

function AttemptAuditThread({ ev }: { ev: TaskEvent }) {
  if (ev.response_thread && ev.response_thread.length > 0) {
    return (
      <ul className="attempt-audit-thread">
        {ev.response_thread.map((m, i) => (
          <li
            key={`${m.at}-${i}`}
            className={`attempt-audit-thread-msg attempt-audit-thread-msg--${m.by}`}
          >
            <span className="attempt-audit-thread-meta">
              <strong>{m.by === "agent" ? "Agent" : "You"}</strong>
              <time dateTime={m.at}>
                {new Date(m.at).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
            </span>
            <span className="attempt-audit-thread-body">{m.body}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (ev.user_response) {
    return (
      <div className="attempt-audit-reply">
        <span className="attempt-audit-reply-label">Your reply</span>
        <p className="attempt-audit-reply-body">{ev.user_response}</p>
      </div>
    );
  }

  return null;
}
