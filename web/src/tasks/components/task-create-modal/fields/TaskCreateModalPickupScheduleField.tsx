import { FieldLabel } from "@/shared/FieldLabel";
import { SchedulePicker } from "@/shared/time/SchedulePicker";
import { formatInAppTimezone } from "@/shared/time/appTimezone";
import { canEditTaskPickupSchedule } from "@/tasks/task-pickup/canEditTaskPickupSchedule";
import type { Status } from "@/types";

type Props = {
  status: Status;
  value: string | null;
  onChange: (next: string | null) => void;
  appTimezone: string;
  disabled: boolean;
  idPrefix?: string;
};

export function TaskCreateModalPickupScheduleField({
  status,
  value,
  onChange,
  appTimezone,
  disabled,
  idPrefix = "task-edit",
}: Props) {
  const scheduleEditable = canEditTaskPickupSchedule(status);
  const formattedPickup =
    value != null ? formatInAppTimezone(value, appTimezone) : null;

  return (
    <div className="field grow stack-tight">
      <FieldLabel htmlFor={`${idPrefix}-pickup-schedule`}>
        Agent pickup
      </FieldLabel>
      {scheduleEditable ? (
        <>
          <SchedulePicker
            value={value}
            onChange={onChange}
            appTimezone={appTimezone}
            disabled={disabled}
            idPrefix={idPrefix}
          />
          <p className="hint muted stack-tight-zero">
            Leave empty for immediate pickup when the worker is free. Times are
            shown in <strong>{appTimezone}</strong>.
          </p>
        </>
      ) : (
        <p
          className="muted stack-tight-zero"
          id={`${idPrefix}-pickup-schedule`}
        >
          {formattedPickup
            ? `Scheduled for ${formattedPickup}. Pickup time cannot be changed while the task is ${status}.`
            : `Pickup schedule cannot be changed while the task is ${status}.`}
        </p>
      )}
    </div>
  );
}
