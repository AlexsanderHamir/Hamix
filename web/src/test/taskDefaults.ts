import type { Task } from "@/types/task";

/** Required `Task` fields commonly reused in unit tests; align with API wire shape. */
export const TASK_TEST_DEFAULTS: Pick<Task, "runner" | "cursor_model"> = {
  runner: "cursor",
  cursor_model: "",
};

const BASE_TASK: Pick<
  Task,
  "id" | "title" | "initial_prompt" | "status" | "priority" | "runner" | "cursor_model"
> = {
  id: "t1",
  title: "Some task",
  initial_prompt: "<p>do it</p>",
  status: "ready",
  priority: "low",
  ...TASK_TEST_DEFAULTS,
};

/** Builds a minimal Task for unit tests; override any field via partial. */
export function makeTask(overrides: Partial<Task> = {}): Task {
  return { ...BASE_TASK, ...overrides };
}

/** Builds a Task with id and created_at set (list sort / display tests). */
export function makeTaskWithCreatedAt(
  id: string,
  created_at: string,
  overrides: Partial<Task> = {},
): Task {
  return makeTask({ id, title: id, initial_prompt: "", created_at, ...overrides });
}
