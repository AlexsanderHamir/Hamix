import { fetchWithTimeout, jsonHeaders } from "./shared";

export const RUM_ENDPOINT = "/v1/rum";

/**
 * RUM event `type` values the server promotes to Prometheus metrics
 * (`validRUMTypes` in pkgs/tasks/handler/handler_rum.go).
 */
export const RUM_PROMOTED_TYPES = [
  "mutation_started",
  "mutation_optimistic_applied",
  "mutation_settled",
  "mutation_rolled_back",
  "sse_reconnected",
  "sse_resync_received",
  "web_vitals",
] as const;

export type RUMPromotedType = (typeof RUM_PROMOTED_TYPES)[number];

/**
 * SPA types accepted on the wire but intentionally not promoted yet.
 * Server drops them without 400 (forward-compat). See ADR-0026 Phase 2
 * for `navigation_timing` (task-detail shell gate measurement).
 */
export const RUM_FORWARD_COMPAT_TYPES = ["navigation_timing"] as const;

export function sendRUMPayload(
  payload: string,
  options?: { keepalive?: boolean },
): Promise<Response> {
  return fetchWithTimeout(RUM_ENDPOINT, {
    method: "POST",
    headers: jsonHeaders,
    body: payload,
    keepalive: options?.keepalive,
  });
}
