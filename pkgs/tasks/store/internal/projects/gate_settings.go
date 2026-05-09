package projects

import (
	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
	"gorm.io/gorm"
)

type gateSettings struct {
	stepGraceSeconds int
	goalGraceSeconds int
	goalEmail        bool
	goalSMS          bool
	stepEmail        bool
	stepSMS          bool
}

func loadGateSettings(db *gorm.DB) gateSettings {
	var row domain.AppSettings
	if err := db.First(&row, "id = ?", domain.AppSettingsRowID).Error; err != nil {
		return gateSettings{
			stepGraceSeconds: domain.DefaultProjectStepGateGraceSeconds,
			goalGraceSeconds: domain.DefaultProjectGoalGateGraceSeconds,
		}
	}
	return gateSettings{
		stepGraceSeconds: row.ProjectStepGateGraceSeconds,
		goalGraceSeconds: row.ProjectGoalGateGraceSeconds,
		goalEmail:        row.GoalGateNotifyEmailEnabled,
		goalSMS:          row.GoalGateNotifySmsEnabled,
		stepEmail:        row.StepGateNotifyEmailEnabled,
		stepSMS:          row.StepGateNotifySmsEnabled,
	}
}
