import type { TaskEvent, TaskEventType } from "@/types";
import {
  normalizePhaseSummaryMarkdown,
  parseCycleTerminalOverview,
  parsePhaseEventOverview,
} from "./parsePhaseEventOverview";

const TRANSITION_TYPES = new Set<TaskEventType>([
  "status_changed",
  "priority_changed",
  "message_added",
  "prompt_appended",
]);

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/** Strips markdown noise for inline UI; prefers the first substantive line. */
function phaseSummaryPlainLine(raw: string): string {
  const normalized = normalizePhaseSummaryMarkdown(raw);
  const firstLine =
    normalized
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? normalized;

  return firstLine
    .replace(/^#{1,6}\s+/, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Short plain-text preview for phase.summary in compact UI (steppers, lists).
 * Full markdown remains on the event detail page.
 */
export function formatPhaseSummaryCompact(
  summary: string | undefined | null,
  max = 120,
): string | null {
  if (!summary?.trim()) return null;
  const plain = phaseSummaryPlainLine(summary);
  if (!plain) return null;
  return truncate(plain, max);
}

/**
 * One-line human summary for compact timelines. Omits raw JSON and internal
 * ids — callers link to the full event page for payload inspection.
 */
export function formatEventSummaryCompact(ev: TaskEvent): string | null {
  const cycleOverview = parseCycleTerminalOverview(ev.type, ev.data);
  if (cycleOverview) {
    if (cycleOverview.failureSummary) {
      return truncate(cycleOverview.failureSummary, 140);
    }
    if (cycleOverview.reason) return truncate(cycleOverview.reason, 140);
    return null;
  }

  const phaseOverview = parsePhaseEventOverview(ev.type, ev.data);
  if (phaseOverview) {
    if (phaseOverview.standardizedMessage) {
      return truncate(phaseOverview.standardizedMessage, 140);
    }
    if (phaseOverview.summary) {
      return formatPhaseSummaryCompact(phaseOverview.summary, 140);
    }
    return null;
  }

  if (TRANSITION_TYPES.has(ev.type)) {
    const from = ev.data.from;
    const to = ev.data.to;
    if (typeof from === "string" && typeof to === "string") {
      return `${from} → ${to}`;
    }
  }

  if (ev.type === "checklist_inherit_changed") {
    const from = ev.data.from;
    const to = ev.data.to;
    if (typeof from === "boolean" && typeof to === "boolean") {
      return `${String(from)} → ${String(to)}`;
    }
  }

  if (ev.type === "checklist_item_removed") {
    const text = ev.data.text;
    if (typeof text === "string") return truncate(text, 140);
  }

  if (ev.type === "subtask_added" || ev.type === "subtask_removed") {
    const title = ev.data.title;
    if (typeof title === "string") return truncate(title, 140);
  }

  return null;
}
