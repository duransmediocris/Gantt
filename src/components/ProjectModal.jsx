import React, { useEffect, useState } from 'react';

export function ProjectModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
  });

  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setForm({
      name: '',
      start_date: '',
      end_date: '',
    });

    setError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (new Date(form.end_date) < new Date(form.start_date)) {
      setError('Дата окончания не может быть раньше даты начала');
      return;
    }

    setSaving(true);

    try {
      await onSave({
        name: form.name.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
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
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.titleRow}>
          <h2 style={{ margin: 0 }}>Новый проект</h2>

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
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
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
                  setForm((prev) => ({
                    ...prev,
                    start_date: event.target.value,
                  }))
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
                  setForm((prev) => ({
                    ...prev,
                    end_date: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.secondaryButton}
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={saving}
              style={styles.primaryButton}
            >
              {saving ? 'Создание...' : 'Создать проект'}
            </button>
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
    maxWidth: 520,
    background: '#fff',
    borderRadius: 14,
    padding: 22,
    boxShadow: '0 18px 60px rgba(0,0,0,0.18)',
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
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
  },
  row: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
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
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 18,
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
};
