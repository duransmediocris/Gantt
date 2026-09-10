import React, { useEffect, useState } from 'react';

const STATUSES = [
  { value: 'todo', label: 'К выполнению' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Выполнено' },
  { value: 'overdue', label: 'Просрочено' },
];

export const TaskModal = ({
  isOpen,
  onClose,
  task = null,
  allTasks = [],
  users = [],
  onSave,
}) => {
  const [form, setForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    assignee_id: '',
    status: 'todo',
    progress: 0,
    dependencies: [],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    if (task) {
      setForm({
        name: task.name || '',
        start_date: task.start_date
          ? String(task.start_date).slice(0, 10)
          : '',
        end_date: task.end_date
          ? String(task.end_date).slice(0, 10)
          : '',
        assignee_id:
          task.assignee_id === null ||
          task.assignee_id === undefined
            ? ''
            : String(task.assignee_id),
        status: task.status || 'todo',
        progress: Number(task.progress ?? 0),
        dependencies: task.dependencies || [],
      });
    } else {
      setForm({
        name: '',
        start_date: '',
        end_date: '',
        assignee_id: '',
        status: 'todo',
        progress: 0,
        dependencies: [],
      });
    }

    setError(null);
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDependenciesChange = (event) => {
    const values = Array.from(
      event.target.selectedOptions,
      (option) => option.value
    );

    handleChange('dependencies', values);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError(null);

    try {
      if (
        new Date(form.end_date) <
        new Date(form.start_date)
      ) {
        throw new Error(
          'Дата окончания не может быть раньше даты начала'
        );
      }

      await onSave({
        name: form.name.trim(),
        start_date: form.start_date,
        end_date: form.end_date,

        assignee_id:
          form.assignee_id === ''
            ? null
            : Number(form.assignee_id),

        status: form.status,
        progress: Number(form.progress),
        dependencies: form.dependencies,
      });

      onClose();
    } catch (err) {
      setError(
        err.message || 'Не удалось сохранить задачу'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
    >
      <div
        style={styles.modal}
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <h2 style={styles.title}>
          {task
            ? 'Редактировать задачу'
            : 'Новая задача'}
        </h2>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>
            Название *

            <input
              style={styles.input}
              required
              value={form.name}
              onChange={(event) =>
                handleChange(
                  'name',
                  event.target.value
                )
              }
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
                onChange={(event) =>
                  handleChange(
                    'start_date',
                    event.target.value
                  )
                }
              />
            </label>

            <label style={styles.label}>
              Конец *

              <input
                style={styles.input}
                type="date"
                required
                value={form.end_date}
                onChange={(event) =>
                  handleChange(
                    'end_date',
                    event.target.value
                  )
                }
              />
            </label>
          </div>

          <label style={styles.label}>
            Ответственный

            <select
              style={styles.input}
              value={form.assignee_id}
              onChange={(event) =>
                handleChange(
                  'assignee_id',
                  event.target.value
                )
              }
            >
              <option value="">
                Не назначен
              </option>

              {users.map((user) => (
                <option
                  key={user.id}
                  value={user.id}
                >
                  {user.name}
                </option>
              ))}
            </select>
          </label>

          {users.length === 0 && (
            <div style={styles.hint}>
              Список ответственных пока пуст.
              Это нормально, если backend ещё
              не обновлён.
            </div>
          )}

          <label style={styles.label}>
            Статус

            <select
              style={styles.input}
              value={form.status}
              onChange={(event) =>
                handleChange(
                  'status',
                  event.target.value
                )
              }
            >
              {STATUSES.map((status) => (
                <option
                  key={status.value}
                  value={status.value}
                >
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Прогресс: {form.progress}%

            <input
              style={styles.range}
              type="range"
              min="0"
              max="100"
              step="5"
              value={form.progress}
              onChange={(event) =>
                handleChange(
                  'progress',
                  Number(event.target.value)
                )
              }
            />
          </label>

          {!task && (
            <label style={styles.label}>
              Зависит от задач

              <select
                style={{
                  ...styles.input,
                  minHeight: 110,
                }}
                multiple
                value={form.dependencies}
                onChange={
                  handleDependenciesChange
                }
              >
                {allTasks.length === 0 && (
                  <option disabled>
                    Других задач пока нет
                  </option>
                )}

                {allTasks.map((item) => (
                  <option
                    key={item.id}
                    value={String(item.id)}
                  >
                    {item.name}
                  </option>
                ))}
              </select>

              <div style={styles.smallHint}>
                Можно выбрать несколько задач.
                На Windows удерживай Ctrl.
              </div>
            </label>
          )}

          {task && (
            <div style={styles.hint}>
              Зависимости существующей задачи
              пока нельзя менять: backend ещё
              не имеет endpoint для удаления
              связей.
            </div>
          )}

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={styles.secondaryButton}
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={saving}
              style={styles.primaryButton}
            >
              {saving
                ? 'Сохранение...'
                : task
                ? 'Сохранить'
                : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },

  modal: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#ffffff',
    borderRadius: 12,
    padding: 24,
    boxShadow:
      '0 20px 50px rgba(0, 0, 0, 0.2)',
  },

  title: {
    marginTop: 0,
    marginBottom: 20,
  },

  label: {
    display: 'block',
    marginBottom: 16,
    fontSize: 14,
    fontWeight: 600,
  },

  input: {
    width: '100%',
    marginTop: 6,
    padding: '9px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    fontSize: 14,
  },

  row: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(2, minmax(0, 1fr))',
    gap: 12,
  },

  range: {
    width: '100%',
    marginTop: 8,
  },

  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 22,
  },

  primaryButton: {
    padding: '9px 16px',
    background: '#2563eb',
    color: '#ffffff',
    border: 0,
    borderRadius: 6,
    cursor: 'pointer',
  },

  secondaryButton: {
    padding: '9px 16px',
    background: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    cursor: 'pointer',
  },

  error: {
    marginBottom: 16,
    padding: 10,
    borderRadius: 6,
    background: '#fff1f2',
    color: '#b91c1c',
    fontSize: 14,
  },

  hint: {
    marginTop: -7,
    marginBottom: 15,
    padding: 9,
    borderRadius: 6,
    background: '#f3f4f6',
    color: '#6b7280',
    fontSize: 12,
  },

  smallHint: {
    marginTop: 5,
    color: '#6b7280',
    fontWeight: 400,
    fontSize: 12,
  },
};