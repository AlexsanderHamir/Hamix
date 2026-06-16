import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  createAutomation,
  deleteAutomation,
  patchAutomation,
} from "@/api";
import { EmptyState } from "@/shared/EmptyState";
import { Modal } from "@/shared/Modal";
import { useDocumentTitle } from "@/shared/useDocumentTitle";
import type { Automation } from "@/types";
import { useAutomations } from "./hooks";
import { automationQueryKeys } from "./queryKeys";

type FormState = {
  title: string;
  description: string;
};

function emptyForm(): FormState {
  return { title: "", description: "" };
}

function AutomationFormDialog({
  title,
  initial,
  saving,
  error,
  onCancel,
  onSubmit,
}: {
  title: string;
  initial: FormState;
  saving: boolean;
  error: Error | null;
  onCancel: () => void;
  onSubmit: (values: FormState) => void;
}) {
  const [values, setValues] = useState(initial);

  return (
    <Modal
      onClose={onCancel}
      labelledBy="automation-form-title"
      size="default"
      busy={saving}
    >
      <section className="panel modal-sheet modal-sheet--edit">
        <h2 id="automation-form-title">{title}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(values);
          }}
        >
          <label htmlFor="automation-form-title-field">Title</label>
          <input
            id="automation-form-title-field"
            className="input"
            value={values.title}
            onChange={(e) =>
              setValues((v) => ({ ...v, title: e.target.value }))
            }
            required
            maxLength={200}
          />
          <label htmlFor="automation-form-description">Description</label>
          <textarea
            id="automation-form-description"
            className="input"
            rows={5}
            value={values.description}
            onChange={(e) =>
              setValues((v) => ({ ...v, description: e.target.value }))
            }
            required
            maxLength={2000}
          />
          {error ? (
            <div className="pd__inline-error" role="alert">
              {error.message}
            </div>
          ) : null}
          <div className="modal-sheet__actions">
            <button
              type="button"
              className="pc__btn-secondary"
              disabled={saving}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button type="submit" className="pc__btn-primary" disabled={saving}>
              Save
            </button>
          </div>
        </form>
      </section>
    </Modal>
  );
}

export function AutomationsPage() {
  useDocumentTitle("Automations");
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAutomations({ limit: 200 });
  const automations = data?.automations ?? [];
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: automationQueryKeys.all });
  };

  const createMutation = useMutation({
    mutationFn: createAutomation,
    onSuccess: async () => {
      setCreateOpen(false);
      await invalidate();
    },
  });

  const patchMutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: { title?: string; description?: string };
    }) => patchAutomation(id, patch),
    onSuccess: async () => {
      setEditing(null);
      await invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAutomation,
    onSuccess: invalidate,
  });

  return (
    <section className="panel task-detail-panel pl">
      <header className="pl__head">
        <div className="pl__head-text">
          <h2 className="task-list-section-title">Automations</h2>
          <p className="pl__subtitle">
            Global prompt behaviors operators can toggle per task at create time.
          </p>
        </div>
        <div className="pl__head-actions">
          <button
            type="button"
            className="pl__new-btn"
            onClick={() => {
              createMutation.reset();
              setCreateOpen(true);
            }}
          >
            New automation
          </button>
        </div>
      </header>

      {createOpen ? (
        <AutomationFormDialog
          title="New automation"
          initial={emptyForm()}
          saving={createMutation.isPending}
          error={createMutation.error}
          onCancel={() => {
            if (createMutation.isPending) return;
            setCreateOpen(false);
          }}
          onSubmit={(values) =>
            createMutation.mutate({
              title: values.title.trim(),
              description: values.description.trim(),
            })
          }
        />
      ) : null}

      {editing ? (
        <AutomationFormDialog
          title="Edit automation"
          initial={{
            title: editing.title,
            description: editing.description,
          }}
          saving={patchMutation.isPending}
          error={patchMutation.error}
          onCancel={() => {
            if (patchMutation.isPending) return;
            setEditing(null);
          }}
          onSubmit={(values) =>
            patchMutation.mutate({
              id: editing.id,
              patch: {
                title: values.title.trim(),
                description: values.description.trim(),
              },
            })
          }
        />
      ) : null}

      <div className="pl__list-section">
        {isLoading ? <p className="muted">Loading automations…</p> : null}
        {error ? (
          <div className="pd__inline-error" role="alert">
            {error.message}
          </div>
        ) : null}
        {!isLoading && !error && automations.length === 0 ? (
          <EmptyState
            title="No automations yet"
            description="Create reusable agent behaviors to toggle when composing tasks."
            density="compact"
            hideIcon
          />
        ) : null}
        {!isLoading && !error && automations.length > 0 ? (
          <ul className="automation-library-list">
            {automations.map((row) => (
              <li key={row.id} className="automation-library-list__item">
                <div>
                  <strong>{row.title}</strong>
                  <p className="muted">{row.description}</p>
                </div>
                <div className="automation-library-list__actions">
                  <button
                    type="button"
                    className="pc__btn-secondary"
                    onClick={() => {
                      patchMutation.reset();
                      setEditing(row);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="pc__btn-secondary"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(row.id)}
                  >
                    Archive
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
