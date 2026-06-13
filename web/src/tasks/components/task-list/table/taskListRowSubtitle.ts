export { statusListLabel } from "../../../task-display/statusListLabel";

/**
 * Secondary line under the task title: a one-line prompt preview.
 * When `hasProject` is true, the project name lives in the Project column —
 * this string must not repeat it.
 */
export function taskListRowSubtitle(input: {
  /** True when `project_id` is set and the project label resolves (badge column). */
  hasProject: boolean;
  promptPreview: string;
}): string | undefined {
  const { hasProject, promptPreview } = input;
  const pv = promptPreview.replace(/\s+/g, " ").trim();
  const tail = pv.length > 80 ? `${pv.slice(0, 77)}…` : pv;

  if (hasProject) {
    return undefined;
  }
  if (tail) {
    return tail;
  }
  return undefined;
}
