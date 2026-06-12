import type { Priority, TaskType } from "@/types";

/** Child task queued while creating a parent on the home page (POST after parent exists). */
export type PendingSubtaskDraft = {
  title: string;
  initial_prompt: string;
  priority: Priority;
  task_type: TaskType;
  checklistItems: string[];
  checklist_inherit: boolean;
  /** Draft-local indices of other pending subtasks that must complete first. */
  depends_on_sibling_indices: number[];
};

export function createEmptyPendingSubtaskDraft(
  overrides: Partial<PendingSubtaskDraft> = {},
): PendingSubtaskDraft {
  return {
    title: "",
    initial_prompt: "",
    priority: "medium",
    task_type: "general",
    checklistItems: [],
    checklist_inherit: false,
    depends_on_sibling_indices: [],
    ...overrides,
  };
}
