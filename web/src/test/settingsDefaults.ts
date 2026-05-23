import type { AppSettings } from "@/api/settings";

/**
 * Full AppSettings fixture with all required fields. Tests override
 * individual fields via the spread operator.
 */
export const APP_SETTINGS_DEFAULTS: AppSettings = {
  worker_enabled: true,
  agent_paused: false,
  runner: "cursor",
  repo_root: "",
  cursor_bin: "",
  cursor_model: "",
  max_run_duration_seconds: 0,
  agent_pickup_delay_seconds: 5,
  project_step_gate_grace_seconds: 300,
  project_goal_gate_grace_seconds: 300,
  goal_gate_notify_email_enabled: false,
  goal_gate_notify_sms_enabled: false,
  step_gate_notify_email_enabled: false,
  step_gate_notify_sms_enabled: false,
  display_timezone: "UTC",
  optimistic_mutations_enabled: true,
  sse_replay_enabled: false,
};
