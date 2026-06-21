import type { TaskWithDepth } from "../../../task-tree";

/**
 * Merges the previous visible row order with an updated filtered list.
 * Rows that were already on screen keep their relative order so filter
 * exits and SSE field updates do not shuffle the table. Tasks that were
 * not in the previous order are placed at their index in `filteredTasks`
 * (newest-first) rather than appended at the bottom.
 */
export function computeTaskListDisplayOrder(
  prevOrder: TaskWithDepth[],
  filteredTasks: TaskWithDepth[],
  filterExitingIds: ReadonlySet<string>,
  filterExitingById: ReadonlyMap<string, TaskWithDepth>,
): TaskWithDepth[] {
  const filteredById = new Map(filteredTasks.map((t) => [t.id, t]));
  const prevIds = new Set(prevOrder.map((t) => t.id));

  const prevVisible: TaskWithDepth[] = [];
  for (const t of prevOrder) {
    const visible = filteredById.get(t.id);
    if (visible) {
      prevVisible.push(visible);
    } else if (filterExitingIds.has(t.id)) {
      prevVisible.push(filterExitingById.get(t.id)!);
    }
  }

  const prevVisibleIds = new Set(
    prevVisible.filter((t) => filteredById.has(t.id)).map((t) => t.id),
  );
  const prevQueue = prevVisible.filter((t) => filteredById.has(t.id));

  const merged: TaskWithDepth[] = [];
  for (const t of filteredTasks) {
    if (!prevIds.has(t.id)) {
      merged.push(t);
      continue;
    }
    if (!prevVisibleIds.has(t.id)) {
      continue;
    }
    while (prevQueue.length > 0 && prevQueue[0].id !== t.id) {
      prevQueue.shift();
    }
    if (prevQueue.length > 0 && prevQueue[0].id === t.id) {
      merged.push(prevQueue.shift()!);
    }
  }

  for (const t of prevVisible) {
    if (filterExitingIds.has(t.id) && !merged.some((row) => row.id === t.id)) {
      merged.push(t);
    }
  }

  return merged;
}
