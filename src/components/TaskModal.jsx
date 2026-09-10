import React, { useEffect, useState } from 'react';

const STATUSES = [
  { value: 'todo', label: 'К выполнению' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Выполнено' },
  { value: 'overdue', label: 'Просрочено' },
];

const dateValue = (value) => value ? String(value).slice(0, 10) : '';

export const TaskModal = ({ isOpen, onClose, task = null, allTasks = [], dependencies = [], onSave }) => {
  const [form, setForm] = useState({
    name: '', start: '', end: '', assignee_id: '', status: 'todo', progress: 0, dependencies: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    if (task) {
      setForm({
        name: task.name || '',
        start: dateValue(task.start_date),
        end: dateValue(task.end_date),
        assignee_id: task.assignee_id ?? '',
        status: task.status || 'todo',
        progress: Number(task.progress ?? 0),
        dependencies: dependencies
          .filter((dep) => Number(dep.successor_id) === Number(task.id))
          .map((dep) => String(dep.predecessor_id)),
      });
    } else {
      setForm({ name: '', start: '', end: '', assignee_id: '', status: 'todo', progress: 0, dependencies: [] });
    }
    setError(null);
  }, [task, isOpen, dependencies]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (new Date(form.end) < new Date(form.start)) {
        throw new Error('Дата окончания не может быть раньше даты начала');
      }
      await onSave({
        name: form.name.trim(),
        start_date: form.start,
        end_date: form.end,
        assignee_id: form.assignee_id === '' ? null : Number(form.assignee_id),
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

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>{task ? 'Редактировать задачу' : 'Новая задача'}</h2>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Название *
            <input style={styles.input} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>

          <div style={styles.row}>
            <label style={styles.label}>Начало *
              <input style={styles.input} type="date" required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </label>
            <label style={styles.label}>Конец *
              <input style={styles.input} type="date" required value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </label>
          </div>

          <div style={styles.row}>
            <label style={styles.label}>ID ответственного
              <input style={styles.input} type="number" min="1" value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })} placeholder="необязательно" />
            </label>
            <label style={styles.label}>Статус
              <select style={styles.input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>

          <label style={styles.label}>Прогресс: {form.progress}%
            <input style={{ width: '100%' }} type="range" min="0" max="100" value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} />
          </label>

          {!task ? (
            <label style={styles.label}>Зависит от задач
              <select
                multiple
                style={{ ...styles.input, height: 90 }}
                value={form.dependencies}
                onChange={(e) => setForm({ ...form, dependencies: Array.from(e.target.selectedOptions, (o) => o.value) })}
              >
                {allTasks.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
              </select>
              <small style={styles.hint}>Для нескольких зависимостей удерживай Ctrl при выборе.</small>
            </label>
          ) : (
            <div style={styles.hintBox}>Зависимости существующей задачи сейчас не редактируются: в backend нет удаления связи. Новые связи задаются при создании задачи.</div>
          )}

          <div style={styles.actions}>
            <button type="button" onClick={onClose}>Отмена</button>
            <button type="submit" disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { background: '#fff', padding: 24, borderRadius: 10, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' },
  label: { display: 'block', marginBottom: 12, fontSize: 14, fontWeight: 600, flex: 1 },
  input: { width: '100%', padding: 9, marginTop: 5, border: '1px solid #d1d5db', borderRadius: 6 },
  row: { display: 'flex', gap: 12 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
  error: { background: '#fee2e2', color: '#991b1b', padding: 10, borderRadius: 6, marginBottom: 12 },
  hint: { display: 'block', marginTop: 6, color: '#6b7280', fontWeight: 400 },
  hintBox: { background: '#f3f4f6', padding: 10, borderRadius: 6, color: '#4b5563', fontSize: 13, marginBottom: 12 },
};
