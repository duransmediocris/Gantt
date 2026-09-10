import React, { useEffect, useState } from 'react';

const STATUSES = [
  { value: 'planned', label: 'К выполнению' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Выполнено' },
  { value: 'overdue', label: 'Просрочено' },
];

function dateValue(value) {
  return value ? String(value).slice(0, 10) : '';
}

export function TaskModal({
  isOpen,
  onClose,
  task = null,
  allTasks = [],
  dependencies = [],
  users = [],
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    assignee_id: '',
    status: 'planned',
    progress: 0,
    dependencies: [],
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    if (task) {
      setForm({
        name: task.name || '',
        start_date: dateValue(task.start_date),
        end_date: dateValue(task.end_date),
        assignee_id: task.assignee_id ?? '',
        status: task.status || 'planned',
        progress: Number(task.progress ?? 0),
        dependencies: dependencies
          .filter((dep) => Number(dep.successor_id) === Number(task.id))
          .map((dep) => String(dep.predecessor_id)),
      });
    } else {
      setForm({
        name: '',
        start_date: '',
        end_date: '',
        assignee_id: '',
        status: 'planned',
        progress: 0,
        dependencies: [],
      });
    }

    setError(null);
  }, [isOpen, task, dependencies]);

  if (!isOpen) return null;

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!form.name.trim()) {
        throw new Error('Введите название задачи');
      }

      if (new Date(form.end_date) < new Date(form.start_date)) {
        throw new Error('Дата окончания не может быть раньше даты начала');
      }

      await onSave({
        name: form.name.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        assignee_id:
          form.assignee_id === '' ? null : Number(form.assignee_id),
        status: form.status,
        progress: Number(form.progress),
        dependencies: form.dependencies,
      });

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;

    const confirmed = window.confirm(
      `Удалить задачу «${task.name}»?`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      await onDelete(task.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.titleRow}>
          <h2 style={{ margin: 0 }}>
            {task ? 'Редактировать задачу' : 'Новая задача'}
          </h2>

          <button type="button" onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>
            Название *
            <input
              style={styles.input}
              required
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
            />
          </label>

          <div style={styles.row}>
            <label style={styles.label}>
              Начало *
              <input
                style={styles.input}
                type="date"
                required
                value={form.start_date}
                onChange={(event) => setField('start_date', event.target.value)}
              />
            </label>

            <label style={styles.label}>
              Конец *
              <input
                style={styles.input}
                type="date"
                required
                value={form.end_date}
                onChange={(event) => setField('end_date', event.target.value)}
              />
            </label>
          </div>

          <div style={styles.row}>
            <label style={styles.label}>
              Ответственный
              <select
                style={styles.input}
                value={form.assignee_id}
                onChange={(event) =>
                  setField('assignee_id', event.target.value)
                }
              >
                <option value="">Не назначен</option>

                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.label}>
              Статус
              <select
                style={styles.input}
                value={form.status}
                onChange={(event) => setField('status', event.target.value)}
              >
                {STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {users.length === 0 && (
            <div style={styles.hint}>
              Список пользователей появится после подключения GET /api/users.
            </div>
          )}

          <label style={styles.label}>
            Прогресс: {form.progress}%
            <input
              style={{ width: '100%', marginTop: 8 }}
              type="range"
              min="0"
              max="100"
              value={form.progress}
              onChange={(event) =>
                setField('progress', Number(event.target.value))
              }
            />
          </label>

          {!task ? (
            <label style={styles.label}>
              Зависит от задач
              <select
                multiple
                style={{ ...styles.input, minHeight: 96 }}
                value={form.dependencies}
                onChange={(event) =>
                  setField(
                    'dependencies',
                    Array.from(
                      event.target.selectedOptions,
                      (option) => option.value
                    )
                  )
                }
              >
                {allTasks.map((candidate) => (
                  <option key={candidate.id} value={String(candidate.id)}>
                    {candidate.name}
                  </option>
                ))}
              </select>

              <span style={styles.hint}>
                Для нескольких зависимостей удерживай Ctrl.
              </span>
            </label>
          ) : (
            <div style={styles.hintBox}>
              Существующие зависимости отображаются на диаграмме. Их удаление
              потребует отдельного backend-endpoint.
            </div>
          )}

          <div style={styles.actions}>
            <div>
              {task && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  style={styles.deleteButton}
                >
                  {deleting ? 'Удаление...' : 'Удалить'}
                </button>
              )}
            </div>

            <div style={styles.rightActions}>
              <button
                type="button"
                onClick={onClose}
                style={styles.secondaryButton}
              >
                Отмена
              </button>

              <button
                type="submit"
                disabled={saving || deleting}
                style={styles.primaryButton}
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(17, 24, 39, 0.48)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    zIndex: 1000,
  },
  modal: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '92vh',
    overflowY: 'auto',
    background: '#fff',
    borderRadius: 14,
    padding: 22,
    boxShadow: '0 18px 60px rgba(0,0,0,0.18)',
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 18,
  },
  closeButton: {
    border: 0,
    background: 'transparent',
    fontSize: 28,
    cursor: 'pointer',
    lineHeight: 1,
  },
  label: {
    display: 'block',
    marginBottom: 14,
    fontSize: 13,
    fontWeight: 600,
    flex: 1,
  },
  input: {
    width: '100%',
    marginTop: 6,
    padding: '9px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    background: '#fff',
  },
  row: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  hint: {
    display: 'block',
    color: '#6b7280',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 12,
  },
  hintBox: {
    padding: 11,
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 14,
  },
  error: {
    padding: 10,
    marginBottom: 14,
    borderRadius: 8,
    background: '#fff7f7',
    border: '1px solid #fecaca',
    color: '#991b1b',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  rightActions: {
    display: 'flex',
    gap: 8,
  },
  primaryButton: {
    padding: '9px 14px',
    border: 0,
    borderRadius: 8,
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '9px 14px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    background: '#fff',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '9px 14px',
    border: '1px solid #fecaca',
    borderRadius: 8,
    background: '#fff7f7',
    color: '#b91c1c',
    cursor: 'pointer',
  },
};
