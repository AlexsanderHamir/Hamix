import type { AutomationToggleValue } from "./automationSelection";

type Props = {
  value: AutomationToggleValue;
  disabled?: boolean;
  labelledBy: string;
  onChange: (value: AutomationToggleValue) => void;
};

const OPTIONS: { value: AutomationToggleValue; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "omit", label: "Omit" },
  { value: "no", label: "No" },
];

export function AutomationToggleRow({
  value,
  disabled,
  labelledBy,
  onChange,
}: Props) {
  return (
    <div
      className="automation-toggle-row"
      role="group"
      aria-labelledby={labelledBy}
    >
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className={[
              "automation-toggle-row__btn",
              selected ? "automation-toggle-row__btn--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
