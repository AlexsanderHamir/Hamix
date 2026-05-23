package domain

import (
	"time"

	"gorm.io/datatypes"
)

// AppSettings is the singleton row (id=1) holding all UI-configurable
// app-level settings. There is intentionally only one row: every PATCH
// upserts onto id=1 and every GET reads id=1, optionally creating it
// with defaults on first read.
//
// This row replaces the historical T2A_AGENT_WORKER_* env vars and the
// REPO_ROOT env var. Env vars are no longer read at runtime — the row
// is the only source of truth and is "saved until changed".
//
// Field semantics:
//   - WorkerEnabled: master switch for the in-process agent worker.
//     Default true.
//   - AgentPaused: operator-facing soft pause. Distinct from
//     WorkerEnabled in intent, even though both keep the worker idle:
//     WorkerEnabled is the "configured to run at all" flag (defaults
//     to true; flipping it off is a deliberate teardown), AgentPaused
//     is the "stop dequeuing for now, I'll resume in a minute"
//     flag (defaults to false; the SPA exposes a toggle in the
//     header). The supervisor honors either by going idle with a
//     distinct reason ("disabled_by_settings" vs "paused_by_operator")
//     so the observability page can tell them apart.
//   - Runner: id of the runner registered in pkgs/agents/runner/registry
//     (today only "cursor"). Default "cursor".
//   - RepoRoot: absolute or process-relative path used for both the
//     agent worker WorkingDir and the global repo file picker / @-mention
//     autocomplete. Empty means "not configured": worker stays idle and
//     repo endpoints respond 409 repo_root_not_configured.
//   - CursorBin: cursor binary path. Empty means "auto-detect from PATH"
//     (the supervisor probes `cursor --version` at boot).
//   - CursorModel: optional `cursor-agent --model` value. Empty means omit
//     the flag so Cursor picks its default model for the account.
//   - MaxRunDurationSeconds: per-run wall-clock cap in seconds. 0 means
//     "no limit" — the worker does not wrap runner.Run with a timeout.
//   - AgentPickupDelaySeconds: new ready tasks get pickup_not_before (see tasks
//     model) deferred by this many seconds so the worker does not dequeue them
//     immediately (smoother UX right after create). Default 5. Set to 0 to
//     disable the delay.
//   - ProjectStepGateGraceSeconds: after every task in a project step is done,
//     the step enters pending_release for this many seconds before auto-releasing
//     the gate (unless the operator holds or releases early). 0 means release
//     immediately when the last task reaches done. Capped server-side (see store).
//   - ProjectGoalGateGraceSeconds: same semantics for project goals when every
//     goal criterion is satisfied while the goal gate is active.
//   - GoalGateNotifyEmailEnabled / GoalGateNotifySmsEnabled / StepGateNotifyEmailEnabled /
//     StepGateNotifySmsEnabled: reserved toggles for future outbound notifications
//     during grace windows; the server does not send mail or SMS yet (no-op hooks).
//   - DisplayTimezone: IANA timezone identifier (e.g. "America/New_York")
//     used by the SPA to render every operator-facing timestamp
//     (scheduled pickup time, "last updated", etc.). Validated server-side
//     via time.LoadLocation on PATCH; stored as the canonical name returned
//     by the lookup. Default "" — empty string is the "auto-detect" sentinel
//     that tells the SPA to fall back to the operator's browser timezone
//     (Intl.DateTimeFormat().resolvedOptions().timeZone). Setting this to
//     any non-empty IANA zone (including "UTC") is a deliberate override
//     that wins over auto-detect. The wire format for every timestamp
//     stays RFC3339 UTC — this column governs PRESENTATION only.
//   - OptimisticMutationsEnabled: when true, the SPA uses optimistic
//     mutations for PATCH, DELETE, checklist, requeue, and subtask
//     create. Stored for API compatibility; always true for new rows
//     and no longer exposed in Settings (not user-configurable).
//   - SSEReplayEnabled: retained for API/DB compatibility. Lossless
//     SSE replay is always active in the `/events` handler; this column
//     is migrated to true on read for older databases.
type AppSettings struct {
	ID                          uint   `gorm:"primaryKey;autoIncrement:false;check:chk_app_settings_singleton,id = 1"`
	WorkerEnabled               bool   `gorm:"not null;default:true"`
	AgentPaused                 bool   `gorm:"not null;default:false"`
	Runner                      string `gorm:"not null;default:'cursor'"`
	RepoRoot                    string `gorm:"not null;default:''"`
	CursorBin                   string `gorm:"not null;default:''"`
	CursorModel                 string `gorm:"not null;default:''"`
	MaxRunDurationSeconds       int    `gorm:"not null;default:0;check:chk_app_settings_max_run_duration_seconds,max_run_duration_seconds >= 0"`
	AgentPickupDelaySeconds     int    `gorm:"not null;default:5;check:chk_app_settings_agent_pickup_delay_seconds,agent_pickup_delay_seconds >= 0"`
	ProjectStepGateGraceSeconds int    `gorm:"column:project_step_gate_grace_seconds;not null;default:300;check:chk_app_settings_project_step_gate_grace_seconds,project_step_gate_grace_seconds >= 0 AND project_step_gate_grace_seconds <= 604800"`
	ProjectGoalGateGraceSeconds int    `gorm:"column:project_goal_gate_grace_seconds;not null;default:300;check:chk_app_settings_project_goal_gate_grace_seconds,project_goal_gate_grace_seconds >= 0 AND project_goal_gate_grace_seconds <= 604800"`
	GoalGateNotifyEmailEnabled  bool   `gorm:"column:goal_gate_notify_email_enabled;not null;default:false"`
	GoalGateNotifySmsEnabled    bool   `gorm:"column:goal_gate_notify_sms_enabled;not null;default:false"`
	StepGateNotifyEmailEnabled  bool   `gorm:"column:step_gate_notify_email_enabled;not null;default:false"`
	StepGateNotifySmsEnabled    bool   `gorm:"column:step_gate_notify_sms_enabled;not null;default:false"`
	DisplayTimezone             string `gorm:"not null;default:''"`
	OptimisticMutationsEnabled  bool   `gorm:"not null;default:true"`
	SSEReplayEnabled            bool   `gorm:"not null;default:true"`
	// RunnerConfigs stores per-runner config blobs keyed by runner ID.
	// Example: {"cursor":{"binary_path":"...","default_model":"opus"}}.
	// Dual-written alongside the legacy CursorBin/CursorModel columns
	// during the migration to pluggable runners.
	RunnerConfigs datatypes.JSON `gorm:"column:runner_configs;type:jsonb;not null;default:'{}'"`
	// VerifyEnabled gates the execute→verify checklist guardrail (see docs/CHECKLIST.md).
	VerifyEnabled bool `gorm:"not null;default:true"`
	// VerifyMaxRetries is the corrective execute retries after verify failure (hard cap 10).
	VerifyMaxRetries int `gorm:"not null;default:2;check:chk_app_settings_verify_max_retries,verify_max_retries >= 0 AND verify_max_retries <= 10"`
	// VerifyRunnerName empty means use the execute runner id.
	VerifyRunnerName string `gorm:"not null;default:''"`
	// VerifyRunnerModel empty means use the verify runner's default model.
	VerifyRunnerModel string `gorm:"not null;default:''"`
	// CheckCommandTimeoutSeconds caps each criterion check subprocess.
	CheckCommandTimeoutSeconds int       `gorm:"not null;default:120;check:chk_app_settings_check_timeout,check_command_timeout_seconds >= 1 AND check_command_timeout_seconds <= 600"`
	UpdatedAt                  time.Time `gorm:"not null"`
}

// AppSettingsRowID is the singleton primary key. Every read/write of
// app_settings uses this id; alternative ids are not allowed (the CHECK
// constraint above enforces it at the DB level).
const AppSettingsRowID uint = 1

// DefaultRunner is the seed value for AppSettings.Runner on first boot.
// Mirrors the only registered runner today (pkgs/agents/runner/cursor).
const DefaultRunner = "cursor"

// DefaultAgentPickupDelaySeconds is the seed value for AgentPickupDelaySeconds
// on first boot (seconds before the worker may dequeue a newly created ready task).
const DefaultAgentPickupDelaySeconds = 5

// DefaultProjectStepGateGraceSeconds is the seed value for ProjectStepGateGraceSeconds
// on first boot (seconds of operator review window after all step tasks are done).
const DefaultProjectStepGateGraceSeconds = 300

// DefaultProjectGoalGateGraceSeconds is the seed value for ProjectGoalGateGraceSeconds
// on first boot (operator review window after all goal criteria are satisfied).
const DefaultProjectGoalGateGraceSeconds = 300

// DefaultVerifyMaxRetries is the seed value for VerifyMaxRetries on first boot.
const DefaultVerifyMaxRetries = 2

// DefaultCheckCommandTimeoutSeconds is the seed value for CheckCommandTimeoutSeconds.
const DefaultCheckCommandTimeoutSeconds = 120

// MaxVerifyMaxRetries is the hard ceiling for VerifyMaxRetries (DB CHECK and PATCH validation).
const MaxVerifyMaxRetries = 10

// MaxCheckCommandTimeoutSeconds is the hard ceiling for CheckCommandTimeoutSeconds.
const MaxCheckCommandTimeoutSeconds = 600

// MinCheckCommandTimeoutSeconds is the minimum allowed check command timeout.
const MinCheckCommandTimeoutSeconds = 1

// DefaultDisplayTimezone is the seed value for DisplayTimezone on first
// boot. Empty string is the "auto-detect" sentinel: the SPA reads it as
// "no explicit operator choice yet" and falls back to the browser's own
// IANA zone (Intl.DateTimeFormat().resolvedOptions().timeZone), so a
// freshly-installed T2A renders timestamps in the operator's local time
// without anyone touching the SettingsPage. Setting the column to any
// non-empty zone (including literal "UTC") via PATCH /settings is a
// deliberate override that pins every operator to that zone, regardless
// of where their browser is.
const DefaultDisplayTimezone = ""

// DefaultAppSettings returns the hard-coded first-boot defaults. Used
// by the store's Get path when the row doesn't exist yet, so callers
// always observe a fully populated value. Skip-listed in
// cmd/funclogmeasure/analyze.go: pure struct constructor; the calling
// store.GetAppSettings already logs the seed-on-first-read decision.
func DefaultAppSettings() AppSettings {
	return AppSettings{
		ID:                          AppSettingsRowID,
		WorkerEnabled:               true,
		AgentPaused:                 false,
		Runner:                      DefaultRunner,
		RepoRoot:                    "",
		CursorBin:                   "",
		MaxRunDurationSeconds:       0,
		AgentPickupDelaySeconds:     DefaultAgentPickupDelaySeconds,
		ProjectStepGateGraceSeconds: DefaultProjectStepGateGraceSeconds,
		ProjectGoalGateGraceSeconds: DefaultProjectGoalGateGraceSeconds,
		GoalGateNotifyEmailEnabled:  false,
		GoalGateNotifySmsEnabled:    false,
		StepGateNotifyEmailEnabled:  false,
		StepGateNotifySmsEnabled:    false,
		DisplayTimezone:             DefaultDisplayTimezone,
		OptimisticMutationsEnabled:  true,
		SSEReplayEnabled:            true,
		VerifyEnabled:               true,
		VerifyMaxRetries:            DefaultVerifyMaxRetries,
		VerifyRunnerName:            "",
		VerifyRunnerModel:           "",
		CheckCommandTimeoutSeconds:  DefaultCheckCommandTimeoutSeconds,
	}
}

// TableName pins the table name so Postgres migrations match between
// dialects. Skip-listed in cmd/funclogmeasure/analyze.go for the same
// reason as TaskChecklistItem.TableName.
func (AppSettings) TableName() string { return "app_settings" }
