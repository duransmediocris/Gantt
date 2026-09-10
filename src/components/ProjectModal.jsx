import React, { useEffect, useState } from 'react';

export const ProjectModal = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', start: '', end: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ name: '', start: '', end: '' });
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (new Date(form.end) < new Date(form.start)) {
      setError('Дата окончания не может быть раньше даты начала');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        start_date: form.start,
        end_date: form.end,
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
        <h2>Новый проект</h2>
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
          <div style={styles.actions}>
            <button type="button" onClick={onClose}>Отмена</button>
            <button type="submit" disabled={saving}>{saving ? 'Создание...' : 'Создать'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { background: '#fff', padding: 24, borderRadius: 10, width: '100%', maxWidth: 500 },
  label: { display: 'block', marginBottom: 12, fontSize: 14, fontWeight: 600, flex: 1 },
  input: { width: '100%', padding: 9, marginTop: 5, border: '1px solid #d1d5db', borderRadius: 6 },
  row: { display: 'flex', gap: 12 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
  error: { background: '#fee2e2', color: '#991b1b', padding: 10, borderRadius: 6, marginBottom: 12 },
};
