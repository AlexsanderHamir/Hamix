import type {
  Automation,
  AutomationListResponse,
  AutomationSelection,
  AutomationState,
} from "@/types";
import { fetchWithTimeout, jsonHeaders, apiErrorFromResponse } from "./shared";
import {
  isRecord,
  parseFiniteNumber,
  parseISO8601Required,
  parseNonEmptyString,
  parseString,
} from "./parseTaskApiCore";
import { assertListIntQuery, assertOptionalTaskPathId, assertTaskPathId } from "./taskRequestBounds";

const AUTOMATION_STATES = ["yes", "no"] as const;

function parseAutomationState(value: unknown): AutomationState {
  if (
    typeof value !== "string" ||
    !(AUTOMATION_STATES as readonly string[]).includes(value)
  ) {
    throw new Error("Invalid API response: automation state must be yes or no");
  }
  return value as AutomationState;
}

export function parseAutomation(value: unknown): Automation {
  if (!isRecord(value)) {
    throw new Error("Invalid API response: automation must be an object");
  }
  const row: Automation = {
    id: parseNonEmptyString(value.id, "id"),
    title: parseString(value.title, "title"),
    description: parseString(value.description, "description"),
    created_at: parseISO8601Required(value.created_at, "created_at"),
    updated_at: parseISO8601Required(value.updated_at, "updated_at"),
  };
  if (value.archived_at !== undefined && value.archived_at !== null) {
    row.archived_at = parseISO8601Required(value.archived_at, "archived_at");
  }
  return row;
}

export function parseAutomationSelection(value: unknown): AutomationSelection {
  if (!isRecord(value)) {
    throw new Error("Invalid API response: automation selection must be an object");
  }
  return {
    automation_id: parseNonEmptyString(value.automation_id, "automation_id"),
    state: parseAutomationState(value.state),
  };
}

export function parseAutomationListResponse(
  value: unknown,
): AutomationListResponse {
  if (!isRecord(value)) {
    throw new Error("Invalid API response: automation list must be an object");
  }
  const raw = value.automations;
  if (!Array.isArray(raw)) {
    throw new Error("Invalid API response: automations must be an array");
  }
  return {
    automations: raw.map(parseAutomation),
    limit: parseFiniteNumber(value.limit, "limit"),
  };
}

export async function listAutomations(options?: {
  signal?: AbortSignal;
  limit?: number;
  includeArchived?: boolean;
}): Promise<AutomationListResponse> {
  const q = new URLSearchParams({
    limit:
      options?.limit === undefined
        ? "100"
        : assertListIntQuery("limit", options.limit, 0, 200),
  });
  if (options?.includeArchived) q.set("include_archived", "true");
  const res = await fetchWithTimeout(`/automations?${q}`, {
    headers: { Accept: "application/json" },
    signal: options?.signal,
  });
  if (!res.ok) throw await apiErrorFromResponse(res);
  return parseAutomationListResponse((await res.json()) as unknown);
}

export async function getAutomation(
  id: string,
  options?: { signal?: AbortSignal },
): Promise<Automation> {
  const automationID = assertTaskPathId(id, "automation id");
  const res = await fetchWithTimeout(
    `/automations/${encodeURIComponent(automationID)}`,
    {
      headers: { Accept: "application/json" },
      signal: options?.signal,
    },
  );
  if (!res.ok) throw await apiErrorFromResponse(res);
  return parseAutomation((await res.json()) as unknown);
}

export async function createAutomation(input: {
  title: string;
  description: string;
  id?: string;
}): Promise<Automation> {
  const body: Record<string, unknown> = {
    title: input.title,
    description: input.description,
  };
  const id = assertOptionalTaskPathId(input.id, "id");
  if (id !== undefined) {
    body.id = id;
  }
  const res = await fetchWithTimeout("/automations", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await apiErrorFromResponse(res);
  return parseAutomation((await res.json()) as unknown);
}

export async function patchAutomation(
  id: string,
  patch: { title?: string; description?: string },
): Promise<Automation> {
  const automationID = assertTaskPathId(id, "automation id");
  const res = await fetchWithTimeout(
    `/automations/${encodeURIComponent(automationID)}`,
    {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify(patch),
    },
  );
  if (!res.ok) throw await apiErrorFromResponse(res);
  return parseAutomation((await res.json()) as unknown);
}

export async function deleteAutomation(id: string): Promise<void> {
  const automationID = assertTaskPathId(id, "automation id");
  const res = await fetchWithTimeout(
    `/automations/${encodeURIComponent(automationID)}`,
    {
      method: "DELETE",
      headers: { Accept: "application/json" },
    },
  );
  if (!res.ok) throw await apiErrorFromResponse(res);
}
