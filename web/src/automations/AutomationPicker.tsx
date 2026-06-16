import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Automation, AutomationSelection } from "@/types";
import { Modal } from "@/shared/Modal";
import { useAutomations } from "./hooks";
import {
  automationToggleValue,
  selectedAutomationIds,
  setAutomationToggle,
  type AutomationToggleValue,
} from "./automationSelection";
import { AutomationToggleRow } from "./AutomationToggleRow";

interface AutomationPickerProps {
  selections: AutomationSelection[];
  disabled?: boolean;
  compact?: boolean;
  onChange: (selections: AutomationSelection[]) => void;
}

export function AutomationPicker({
  selections,
  disabled,
  compact = false,
  onChange,
}: AutomationPickerProps) {
  const [browseOpen, setBrowseOpen] = useState(false);
  const [search, setSearch] = useState("");
  const automationsQuery = useAutomations({
    enabled: browseOpen || selections.length > 0,
    limit: 200,
  });
  const automations = useMemo(
    () => automationsQuery.data?.automations ?? [],
    [automationsQuery.data?.automations],
  );

  const selectedIds = useMemo(
    () => new Set(selectedAutomationIds(selections)),
    [selections],
  );

  const selectedRows = useMemo(() => {
    const byId = new Map(automations.map((a) => [a.id, a]));
    return selections
      .map((sel) => {
        const row = byId.get(sel.automation_id);
        return row ? { automation: row, state: sel.state } : null;
      })
      .filter((row): row is { automation: Automation; state: "yes" | "no" } =>
        row !== null,
      );
  }, [automations, selections]);

  const filteredAutomations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return automations;
    return automations.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q),
    );
  }, [automations, search]);

  const handleToggle = useCallback(
    (automationId: string, value: AutomationToggleValue) => {
      if (disabled) return;
      onChange(setAutomationToggle(selections, automationId, value));
    },
    [disabled, onChange, selections],
  );

  const selectedCountLabel =
    selections.length === 1
      ? "1 behavior selected"
      : `${selections.length} behaviors selected`;

  return (
    <section
      className={[
        "automation-picker",
        compact ? "automation-picker--compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="task-automation-picker-title"
    >
      <div className="automation-picker__head">
        <div>
          <h3 id="task-automation-picker-title">
            {compact ? "Agent behaviors" : "Prompt automations"}
          </h3>
          {compact ? (
            <p className="automation-picker__lede">
              Reusable yes/no instructions injected at run time.
            </p>
          ) : (
            <p>
              Choose global behaviors the harness injects into the agent prompt.
              Yes enables a behavior; No explicitly forbids it; Omit leaves it
              out entirely.
            </p>
          )}
        </div>
        <button
          type="button"
          className="pc__btn-secondary automation-picker__button"
          disabled={disabled}
          onClick={() => setBrowseOpen(true)}
        >
          {compact ? "Browse" : "Browse automations"}
        </button>
      </div>

      <div className="automation-picker__summary" aria-live="polite">
        <strong>{selectedCountLabel}</strong>
        {selections.length === 0 ? (
          <span>{compact ? "None selected" : "Open browse to pick behaviors."}</span>
        ) : selectedRows.length > 0 ? (
          <ul className="automation-picker__chips">
            {selectedRows.map(({ automation, state }) => (
              <li
                key={automation.id}
                className="automation-picker__chip"
                data-automation-id={automation.id}
              >
                <span className="automation-picker__chip-title">
                  {automation.title || "(untitled)"}
                </span>
                <span className="automation-picker__chip-state muted">
                  · {state}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="muted">
            Selected behaviors will appear after the library loads.
          </span>
        )}
      </div>

      {browseOpen ? (
        <Modal
          onClose={() => setBrowseOpen(false)}
          labelledBy="automation-chooser-title"
          describedBy="automation-chooser-desc"
          size="wide"
        >
          <section className="panel modal-sheet modal-sheet--edit automation-chooser pc">
            <div className="automation-chooser__header">
              <div>
                <h2 id="automation-chooser-title">Choose agent behaviors</h2>
                <p id="automation-chooser-desc" className="muted">
                  Set Yes to inject a behavior, No to forbid it, or Omit to
                  leave it out of the prompt.
                </p>
              </div>
              <button
                type="button"
                className="pc__btn-ghost"
                onClick={() => setBrowseOpen(false)}
              >
                Done
              </button>
            </div>

            <div className="automation-chooser__search">
              <label htmlFor="automation-chooser-search" className="visually-hidden">
                Search automations
              </label>
              <input
                id="automation-chooser-search"
                type="search"
                className="input"
                placeholder="Search by title or description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="automation-chooser__body">
              {automationsQuery.isLoading ? (
                <div className="pc__skeleton" aria-hidden="true">
                  <div className="pd__shimmer pd__shimmer--card" />
                </div>
              ) : automationsQuery.error ? (
                <div className="pd__inline-error" role="alert">
                  {automationsQuery.error.message}
                </div>
              ) : automations.length === 0 ? (
                <div className="pc__empty">
                  <p>No automations yet</p>
                  <span>
                    Add reusable behaviors on the{" "}
                    <Link to="/automations">Automations</Link> page first.
                  </span>
                </div>
              ) : filteredAutomations.length === 0 ? (
                <div className="pc__empty">
                  <p>No matches</p>
                  <span>Try a different search term.</span>
                </div>
              ) : (
                <ul className="automation-chooser__list">
                  {filteredAutomations.map((automation) => {
                    const titleId = `automation-row-title-${automation.id}`;
                    const value = automationToggleValue(selections, automation.id);
                    return (
                      <li
                        key={automation.id}
                        className="automation-chooser__row"
                        data-selected={selectedIds.has(automation.id) ? "true" : "false"}
                      >
                        <div className="automation-chooser__row-text">
                          <strong id={titleId}>{automation.title}</strong>
                          <p className="muted">{automation.description}</p>
                        </div>
                        <AutomationToggleRow
                          value={value}
                          disabled={disabled}
                          labelledBy={titleId}
                          onChange={(next) => handleToggle(automation.id, next)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="automation-chooser__footer">
              <button
                type="button"
                className="pc__btn-secondary"
                disabled={disabled || selections.length === 0}
                onClick={() => onChange([])}
              >
                Clear selection
              </button>
              <button
                type="button"
                className="pc__btn-primary"
                onClick={() => setBrowseOpen(false)}
              >
                Done
              </button>
            </div>
          </section>
        </Modal>
      ) : null}
    </section>
  );
}
