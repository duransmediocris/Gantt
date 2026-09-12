import React, { useEffect, useState } from 'react';

const PROJECT_STATUSES = [
  { value: 'planned', label: 'Планируется' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'paused', label: 'На паузе' },
  { value: 'done', label: 'Завершён' },
];

function dateValue(value) {
  return value ? String(value).slice(0, 10) : '';
}

export function ProjectModal({ isOpen, onClose, onSave, onDelete = null, project = null }) {
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', status: 'planned' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(project ? {
      name: project.name || '',
      start_date: dateValue(project.start_date),
      end_date: dateValue(project.end_date),
      status: project.status || 'planned',
    } : { name: '', start_date: '', end_date: '', status: 'planned' });
    setError(null);
    setSaving(false);
    setDeleting(false);
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError('Введите название проекта');
    if (new Date(form.end_date) < new Date(form.start_date)) return setError('Дата окончания не может быть раньше даты начала');
    setSaving(true);
    try {
      await onSave({ ...form, name: form.name.trim() });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project || !onDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err.message || 'Не удалось удалить проект');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={saving || deleting ? undefined : onClose}>
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.titleRow}>
          <div>
            <h2 style={{ margin: 0 }}>{project ? 'Настройки проекта' : 'Новый проект'}</h2>
            {project && <div style={styles.subtitle}>Название, статус и сроки проекта</div>}
          </div>
          <button type="button" onClick={onClose} disabled={saving || deleting} style={styles.closeButton}>×</button>
        </div>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Название *
            <input style={styles.input} required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </label>

          <label style={styles.label}>Статус проекта
            <select style={styles.input} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              {PROJECT_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <div style={styles.row}>
            <label style={styles.label}>Начало *
              <input style={styles.input} type="date" required value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} />
            </label>
            <label style={styles.label}>Конец *
              <input style={styles.input} type="date" required value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} />
            </label>
          </div>

          <div style={styles.actions}>
            <div>
              {project && onDelete && (
                <button type="button" onClick={handleDelete} disabled={saving || deleting} style={styles.deleteButton}>
                  {deleting ? 'Удаление...' : 'Удалить проект'}
                </button>
              )}
            </div>
            <div style={styles.rightActions}>
              <button type="button" disabled={saving || deleting} onClick={onClose} style={styles.secondaryButton}>Отмена</button>
              <button type="submit" disabled={saving || deleting} style={styles.primaryButton}>{saving ? 'Сохранение...' : project ? 'Сохранить' : 'Создать проект'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.58)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, zIndex: 1000 },
  modal: { width: '100%', maxWidth: 540, background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 24px 80px rgba(15,23,42,.24)', border: '1px solid #e2e8f0' },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
  subtitle: { color: '#64748b', fontSize: 12, marginTop: 5 },
  closeButton: { border: 0, background: '#f1f5f9', width: 34, height: 34, borderRadius: 10, fontSize: 24, cursor: 'pointer', lineHeight: 1 },
  label: { display: 'block', marginBottom: 15, fontSize: 13, fontWeight: 700, flex: 1, color: '#334155' },
  input: { width: '100%', marginTop: 7, padding: '10px 11px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff' },
  row: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  error: { padding: 11, marginBottom: 14, borderRadius: 10, background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c' },
  actions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 22 },
  rightActions: { display: 'flex', gap: 8 },
  primaryButton: { padding: '10px 16px', border: 0, borderRadius: 10, background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', cursor: 'pointer' },
  deleteButton: { padding: '10px 14px', border: '1px solid #fecaca', borderRadius: 10, background: '#fff7f7', color: '#b91c1c', cursor: 'pointer', fontWeight: 700 },
};
