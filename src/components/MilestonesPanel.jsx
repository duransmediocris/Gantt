import React, { useMemo, useState } from 'react';

export function MilestonesPanel({ project, items = [], onChange }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  const sorted = useMemo(
    () => [...items].sort((a, b) => String(a.date).localeCompare(String(b.date))),
    [items]
  );

  const add = (event) => {
    event.preventDefault();
    if (!name.trim() || !date) return;

    onChange?.([
      ...items,
      {
        id: `${Date.now()}-${Math.random()}`,
        name: name.trim(),
        date,
      },
    ]);

    setName('');
    setDate('');
  };

  const remove = (id) => {
    onChange?.(items.filter((item) => item.id !== id));
  };

  return (
    <section style={styles.card}>
      <div style={styles.head}>
        <div>
          <h3 style={styles.title}>Контрольные точки</h3>
          <div style={styles.subtle}>
            Важные даты проекта. На диаграмме Ганта они отмечены ромбами ◆
          </div>
        </div>
        <span style={styles.badge}>{items.length}</span>
      </div>

      <form onSubmit={add} style={styles.form}>
        <input
          style={styles.input}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Например, демо"
          aria-label="Название контрольной точки"
        />
        <input
          style={styles.date}
          type="date"
          min={String(project?.start_date || '').slice(0, 10)}
          max={String(project?.end_date || '').slice(0, 10)}
          value={date}
          onChange={(event) => setDate(event.target.value)}
          aria-label="Дата контрольной точки"
        />
        <button
          style={{ ...styles.add, opacity: !name.trim() || !date ? 0.55 : 1 }}
          type="submit"
          disabled={!name.trim() || !date}
        >
          Добавить
        </button>
      </form>

      {sorted.length ? (
        <div style={styles.list}>
          {sorted.map((item) => (
            <div key={item.id} style={styles.row}>
              <span style={styles.diamond}>◆</span>
              <div style={{ flex: 1 }}>
                <strong>{item.name}</strong>
                <div style={styles.subtle}>{item.date}</div>
              </div>
              <button
                type="button"
                style={styles.remove}
                onClick={() => remove(item.id)}
                aria-label={`Удалить ${item.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.empty}>
          Добавь демо, релиз или другую важную дату — она сразу появится на Ганте.
        </div>
      )}

      <div style={styles.localNote}>
        Пока контрольные точки сохраняются только в этом браузере. Серверную синхронизацию добавим вместе с backend.
      </div>
    </section>
  );
}

const styles = {
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 16,
    margin: '-2px 0 16px',
    boxShadow: '0 6px 20px rgba(15,23,42,.035)',
  },
  head: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  title: { margin: 0, fontSize: 15 },
  subtle: { color: '#64748b', fontSize: 12, marginTop: 3 },
  badge: {
    background: '#eef2ff',
    color: '#4338ca',
    borderRadius: 999,
    padding: '4px 9px',
    fontSize: 12,
    fontWeight: 800,
  },
  form: {
    display: 'grid',
    gridTemplateColumns: 'minmax(180px,1fr) 150px auto',
    gap: 8,
  },
  input: {
    padding: '9px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 9,
  },
  date: {
    padding: '9px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 9,
  },
  add: {
    padding: '9px 13px',
    border: 0,
    borderRadius: 9,
    background: '#4f46e5',
    color: '#fff',
    fontWeight: 750,
    cursor: 'pointer',
  },
  list: { display: 'grid', gap: 7, marginTop: 12 },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 10px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    fontSize: 12,
  },
  diamond: { color: '#4f46e5', fontSize: 15 },
  remove: {
    width: 28,
    height: 28,
    border: '1px solid #e2e8f0',
    background: '#fff',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 18,
    color: '#64748b',
  },
  empty: { color: '#64748b', fontSize: 12, padding: '10px 0 2px' },
  localNote: { color: '#94a3b8', fontSize: 10, marginTop: 10 },
};
