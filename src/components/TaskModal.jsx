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
    name: '', start_date: '', end_date: '', assignee_id: '', status: 'planned', progress: 0, dependencies: [],
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(task ? {
      name: task.name || '',
      start_date: dateValue(task.start_date),
      end_date: dateValue(task.end_date),
      assignee_id: task.assignee_id ?? '',
      status: task.status || 'planned',
      progress: Number(task.progress ?? 0),
      dependencies: dependencies
        .filter((dep) => Number(dep.successor_id) === Number(task.id))
        .map((dep) => String(dep.predecessor_id)),
    } : {
      name: '', start_date: '', end_date: '', assignee_id: '', status: 'planned', progress: 0, dependencies: [],
    });
    setError(null);
  }, [isOpen, task, dependencies]);

  if (!isOpen) return null;

  const setField = (field, value) => {
    setForm((prev) => {
      if (field === 'status' && value === 'done') return { ...prev, status: value, progress: 100 };
      return { ...prev, [field]: value };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!form.name.trim()) throw new Error('Введите название задачи');
      if (new Date(form.end_date) < new Date(form.start_date)) throw new Error('Дата окончания не может быть раньше даты начала');
      await onSave({
        name: form.name.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        assignee_id: form.assignee_id === '' ? null : Number(form.assignee_id),
        status: form.status,
        progress: form.status === 'done' ? 100 : Number(form.progress),
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
    if (!window.confirm(`Удалить задачу «${task.name}»?`)) return;
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

  const candidates = allTasks.filter((candidate) => !task || String(candidate.id) !== String(task.id));

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.titleRow}>
          <h2 style={{ margin: 0 }}>{task ? 'Редактировать задачу' : 'Новая задача'}</h2>
          <button type="button" onClick={onClose} style={styles.closeButton}>×</button>
        </div>
        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Название *
            <input style={styles.input} required value={form.name} onChange={(e) => setField('name', e.target.value)} />
          </label>

          <div style={styles.row}>
            <label style={styles.label}>Начало *
              <input style={styles.input} type="date" required value={form.start_date} onChange={(e) => setField('start_date', e.target.value)} />
            </label>
            <label style={styles.label}>Конец *
              <input style={styles.input} type="date" required value={form.end_date} onChange={(e) => setField('end_date', e.target.value)} />
            </label>
          </div>

          <div style={styles.row}>
            <label style={styles.label}>Ответственный
              <select style={styles.input} value={form.assignee_id} onChange={(e) => setField('assignee_id', e.target.value)}>
                <option value="">Не назначен</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
            <label style={styles.label}>Статус
              <select style={styles.input} value={form.status} onChange={(e) => setField('status', e.target.value)}>
                {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </label>
          </div>

          <label style={styles.label}>Прогресс: {form.progress}%
            <input
              style={{ width: '100%', marginTop: 10, accentColor: '#2563eb' }}
              type="range" min="0" max="100" value={form.progress}
              disabled={form.status === 'done'}
              onChange={(e) => setField('progress', Number(e.target.value))}
            />
          </label>

          <label style={styles.label}>Зависит от задач
            <select
              multiple
              style={{ ...styles.input, minHeight: 112 }}
              value={form.dependencies}
              onChange={(e) => setField('dependencies', Array.from(e.target.selectedOptions, (option) => option.value))}
            >
              {candidates.map((candidate) => <option key={candidate.id} value={String(candidate.id)}>{candidate.name}</option>)}
            </select>
          </label>

          <div style={styles.actions}>
            <div>{task && <button type="button" onClick={handleDelete} disabled={deleting || saving} style={styles.deleteButton}>{deleting ? 'Удаление...' : 'Удалить'}</button>}</div>
            <div style={styles.rightActions}>
              <button type="button" onClick={onClose} style={styles.secondaryButton}>Отмена</button>
              <button type="submit" disabled={saving || deleting} style={styles.primaryButton}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.58)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, zIndex: 1000 },
  modal: { width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 24px 80px rgba(15,23,42,.24)', border: '1px solid #e2e8f0' },
  titleRow: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 20 },
  closeButton: { border: 0, background: '#f1f5f9', width: 34, height: 34, borderRadius: 10, fontSize: 24, cursor: 'pointer', lineHeight: 1 },
  label: { display: 'block', marginBottom: 15, fontSize: 13, fontWeight: 700, flex: 1, color: '#334155' },
  input: { width: '100%', marginTop: 7, padding: '10px 11px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', outline: 'none' },
  row: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  error: { padding: 11, marginBottom: 14, borderRadius: 10, background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c' },
  actions: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 20 },
  rightActions: { display: 'flex', gap: 8 },
  primaryButton: { padding: '10px 16px', border: 0, borderRadius: 10, background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 5px 15px rgba(37,99,235,.2)' },
  secondaryButton: { padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', cursor: 'pointer' },
  deleteButton: { padding: '10px 16px', border: '1px solid #fecdd3', borderRadius: 10, background: '#fff1f2', color: '#be123c', cursor: 'pointer' },
};
