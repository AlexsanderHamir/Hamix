import type { GateStatus } from "@/types";

export function taskGateStatusLabel(status: GateStatus): string {
  switch (status) {
    case "locked":
      return "Locked";
    case "active":
      return "Active";
    case "pending_release":
      return "Pending release";
    case "released":
      return "Released";
    default:
      return status;
  }
}
