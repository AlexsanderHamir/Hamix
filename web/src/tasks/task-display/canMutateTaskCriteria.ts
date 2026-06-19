import type { Status } from "@/types";

/** User checklist mutations are blocked only while the agent is working the task. */
export function canMutateTaskCriteria(status: Status): boolean {
  return status !== "running";
}

/**
 * Whether a criterion row can be edited or removed in the task detail UI.
 * Done tasks allow post-completion edits even on satisfied criteria.
 */
export function canEditChecklistItem(taskStatus: Status, itemDone: boolean): boolean {
  if (taskStatus === "running") {
    return false;
  }
  if (taskStatus === "done") {
    return true;
  }
  return !itemDone;
}
