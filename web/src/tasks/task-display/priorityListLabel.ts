import type { Priority } from "@/types";

/** Human-readable priority copy for lists and filters. */
export function priorityListLabel(priority: Priority): string {
  switch (priority) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    case "critical":
      return "Critical";
  }
}
