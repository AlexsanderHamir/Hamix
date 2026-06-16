import type { AutomationSelection, AutomationState } from "@/types";

export type AutomationToggleValue = AutomationState | "omit";

export function automationToggleValue(
  selections: AutomationSelection[],
  automationId: string,
): AutomationToggleValue {
  const row = selections.find((s) => s.automation_id === automationId);
  return row?.state ?? "omit";
}

export function setAutomationToggle(
  selections: AutomationSelection[],
  automationId: string,
  value: AutomationToggleValue,
): AutomationSelection[] {
  const without = selections.filter((s) => s.automation_id !== automationId);
  if (value === "omit") {
    return without;
  }
  return [...without, { automation_id: automationId, state: value }];
}

export function selectedAutomationIds(
  selections: AutomationSelection[],
): string[] {
  return selections.map((s) => s.automation_id);
}
