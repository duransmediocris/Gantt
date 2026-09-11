import React, { useState } from 'react';

export function TeamModal({ isOpen, onClose, users, onCreateUser, onDeleteUser }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const addUser = async (event) => {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    setBusy(true);
    setError('');
    try {
      await onCreateUser(value);
      setName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async (user) => {
    if (!window.confirm(`Удалить участника «${user.name}»? В его задачах ответственный будет снят.`)) return;
    setBusy(true);
    setError('');
    try {
      await onDeleteUser(user.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.titleRow}>
          <div>
            <h2 style={{ margin: 0 }}>Команда</h2>
            <div style={styles.subtle}>Добавляй и удаляй ответственных прямо здесь.</div>
          </div>
          <button type="button" onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={addUser} style={styles.addRow}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя участника"
            style={styles.input}
          />
          <button disabled={busy || !name.trim()} style={styles.primaryButton}>Добавить</button>
        </form>

        <div style={styles.list}>
          {users.length ? users.map((user) => (
            <div key={user.id} style={styles.userRow}>
              <span>{user.name}</span>
              <button type="button" disabled={busy} onClick={() => removeUser(user)} style={styles.deleteButton}>Удалить</button>
            </div>
          )) : <div style={styles.empty}>Участников пока нет.</div>}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.58)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, zIndex: 1100 },
  modal: { width: '100%', maxWidth: 520, background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 24px 80px rgba(15,23,42,.24)', border: '1px solid #e2e8f0' },
  titleRow: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 18 },
  subtle: { color: '#64748b', fontSize: 13, marginTop: 5 },
  closeButton: { border: 0, background: '#f1f5f9', width: 34, height: 34, borderRadius: 10, fontSize: 24, cursor: 'pointer', lineHeight: 1 },
  addRow: { display: 'flex', gap: 8, marginBottom: 16 },
  input: { flex: 1, minWidth: 0, padding: '10px 11px', border: '1px solid #cbd5e1', borderRadius: 10 },
  primaryButton: { padding: '10px 16px', border: 0, borderRadius: 10, background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  list: { display: 'grid', gap: 8, maxHeight: 340, overflowY: 'auto' },
  userRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc' },
  deleteButton: { padding: '6px 10px', border: '1px solid #fecaca', borderRadius: 8, background: '#fff', color: '#b91c1c', cursor: 'pointer' },
  error: { padding: 11, marginBottom: 14, borderRadius: 10, background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c' },
  empty: { padding: 20, textAlign: 'center', color: '#64748b' },
};
