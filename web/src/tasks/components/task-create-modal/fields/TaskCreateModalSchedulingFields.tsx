import { FieldLabel } from "@/shared/FieldLabel";

type Props = {
  disabled: boolean;
  tagsCsv: string;
  milestone: string;
  dependsOnCsv: string;
  onTagsCsvChange: (value: string) => void;
  onMilestoneChange: (value: string) => void;
  onDependsOnCsvChange: (value: string) => void;
};

export function TaskCreateModalSchedulingFields({
  disabled,
  tagsCsv,
  milestone,
  dependsOnCsv,
  onTagsCsvChange,
  onMilestoneChange,
  onDependsOnCsvChange,
}: Props) {
  return (
    <fieldset className="task-create-scheduling" disabled={disabled}>
      <legend className="task-create-scheduling__legend">Scheduling</legend>
      <div className="task-create-scheduling__field">
        <FieldLabel htmlFor="create-tags">Tags</FieldLabel>
        <input
          id="create-tags"
          className="input"
          value={tagsCsv}
          onChange={(e) => onTagsCsvChange(e.target.value)}
          placeholder="e.g. backend, api"
        />
        <p className="hint">Comma-separated labels (max 32 tags).</p>
      </div>
      <div className="task-create-scheduling__field">
        <FieldLabel htmlFor="create-milestone">Milestone</FieldLabel>
        <input
          id="create-milestone"
          className="input"
          value={milestone}
          onChange={(e) => onMilestoneChange(e.target.value)}
          placeholder="e.g. M1 — auth"
        />
      </div>
      <div className="task-create-scheduling__field">
        <FieldLabel htmlFor="create-deps">Depends on (task ids)</FieldLabel>
        <input
          id="create-deps"
          className="input"
          value={dependsOnCsv}
          onChange={(e) => onDependsOnCsvChange(e.target.value)}
          placeholder="Comma-separated upstream task ids"
        />
      </div>
    </fieldset>
  );
}
