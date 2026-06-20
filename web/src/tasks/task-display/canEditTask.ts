import type { Status } from "@/types";

/** Task metadata (title, prompt, model, etc.) must not change while the agent is executing. */
export function canEditTask(status: Status): boolean {
  return status !== "running";
}
