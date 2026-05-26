import type { GateCriterion, ProjectStepGateStatus } from "@/types";
import {
  isRecord,
  parseBooleanField,
  parseFiniteNumber,
  parseISO8601Required,
  parseNonEmptyString,
  parseString,
} from "./parseTaskApiCore";

const GATE_STATUSES: readonly ProjectStepGateStatus[] = [
  "locked",
  "active",
  "pending_release",
  "released",
];

function parseGateStatus(value: unknown): ProjectStepGateStatus {
  const s = parseString(value, "status");
  if (!(GATE_STATUSES as readonly string[]).includes(s)) {
    throw new Error(`Invalid API response: gate status ${JSON.stringify(s)}`);
  }
  return s as ProjectStepGateStatus;
}

export function parseGateCriterion(value: unknown, index: number): GateCriterion {
  if (!isRecord(value)) {
    throw new Error(`Invalid API response: criteria[${index}] must be an object`);
  }
  return {
    id: parseNonEmptyString(value.id, "id"),
    text: parseString(value.text, "text"),
    done: parseBooleanField(value.done, "done"),
    sort_order: parseFiniteNumber(value.sort_order, "sort_order"),
  };
}

export function parseTaskGate(value: unknown): import("@/types").TaskGate {
  if (!isRecord(value)) {
    throw new Error("Invalid API response: gate must be an object");
  }
  const kind = parseString(value.kind, "kind");
  if (kind !== "manual_approval") {
    throw new Error(`Invalid API response: gate kind ${JSON.stringify(kind)}`);
  }
  const critRaw = value.criteria;
  let criteria: GateCriterion[] = [];
  if (critRaw !== undefined && critRaw !== null) {
    if (!Array.isArray(critRaw)) {
      throw new Error("Invalid API response: gate criteria must be an array");
    }
    criteria = critRaw.map((row, i) => parseGateCriterion(row, i));
  }
  let pending_release_deadline: string | undefined;
  if (value.pending_release_deadline !== undefined && value.pending_release_deadline !== null) {
    pending_release_deadline = parseISO8601Required(
      value.pending_release_deadline,
      "pending_release_deadline",
    );
  }
  return {
    kind: "manual_approval",
    status: parseGateStatus(value.status),
    hold: parseBooleanField(value.hold, "hold"),
    pending_release_deadline,
    criteria,
  };
}
