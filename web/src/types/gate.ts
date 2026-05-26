export type ProjectStepGateStatus =
  | "locked"
  | "active"
  | "pending_release"
  | "released";

export type GateCriterion = {
  id: string;
  text: string;
  done: boolean;
  sort_order: number;
};

export type TaskGate = {
  kind: "manual_approval";
  status: ProjectStepGateStatus;
  hold: boolean;
  pending_release_deadline?: string;
  criteria?: GateCriterion[];
};
