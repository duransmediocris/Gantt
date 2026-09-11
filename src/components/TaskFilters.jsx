import React from 'react';

export function TaskFilters({
  filters,
  setFilters,
  users,
  visibleCount,
  totalCount,
  onReset,
  onExport,
}) {
  const set = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <section style={styles.card}>
      <div style={styles.topRow}>
        <h3 style={{ margin: 0 }}>Поиск и фильтры</h3>

        <div style={styles.actions}>
          <button type="button" onClick={onReset} style={styles.secondaryButton}>
            Сбросить
          </button>
          <button type="button" onClick={onExport} style={styles.secondaryButton}>
            Экспорт CSV
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        <label style={styles.label}>
          Поиск
          <input
            style={styles.input}
            value={filters.query}
            onChange={(event) => set('query', event.target.value)}
            placeholder="Название задачи..."
          />
        </label>

        <label style={styles.label}>
          Статус
          <select
            style={styles.input}
            value={filters.status}
            onChange={(event) => set('status', event.target.value)}
          >
            <option value="all">Все статусы</option>
            <option value="planned">К выполнению</option>
            <option value="in_progress">В работе</option>
            <option value="done">Выполнено</option>
            <option value="overdue">Просрочено</option>
          </select>
        </label>

        <label style={styles.label}>
          Ответственный
          <select
            style={styles.input}
            value={filters.assignee}
            onChange={(event) => set('assignee', event.target.value)}
          >
            <option value="all">Все</option>
            <option value="unassigned">Не назначен</option>
            {users.map((user) => (
              <option key={user.id} value={String(user.id)}>
                {user.name}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={filters.criticalOnly}
            onChange={(event) => set('criticalOnly', event.target.checked)}
          />
          Только критический путь
        </label>
      </div>
    </section>
  );
}

const styles = {
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 2fr) repeat(2, minmax(160px, 1fr)) minmax(190px, 1fr)',
    gap: 12,
    alignItems: 'end',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 12,
    color: '#6b7280',
  },
  checkboxLabel: {
    minHeight: 39,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
  },
  input: {
    width: '100%',
    padding: '9px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    background: '#fff',
  },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  secondaryButton: {
    padding: '8px 12px',
    background: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: 7,
    cursor: 'pointer',
  },
  subtle: { color: '#6b7280', fontSize: 12, marginTop: 3 },
};
