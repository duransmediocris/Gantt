import React, { useMemo, useState } from 'react';
import { durationDays, effectiveStatus, toLocalDate } from '../utils/projectAnalytics';

const STATUS_LABELS = {
  planned: 'К выполнению',
  todo: 'К выполнению',
  in_progress: 'В работе',
  done: 'Выполнено',
  overdue: 'Просрочено',
};

export function TaskTable({
  tasks,
  allTasks = tasks,
  users,
  dependencies,
  criticalTaskIds = [],
  onTaskOpen,
}) {
  const [sort, setSort] = useState({ field: 'start_date', direction: 'asc' });

  const userNames = useMemo(
    () => new Map(users.map((user) => [Number(user.id), user.name])),
    [users]
  );

  const taskNames = useMemo(
    () => new Map(allTasks.map((task) => [Number(task.id), task.name])),
    [allTasks]
  );

  const predecessorsByTask = useMemo(() => {
    const map = new Map();
    for (const dep of dependencies) {
      const successorId = Number(dep.successor_id);
      if (!map.has(successorId)) map.set(successorId, []);
      map.get(successorId).push(
        taskNames.get(Number(dep.predecessor_id)) || `#${dep.predecessor_id}`
      );
    }
    return map;
  }, [dependencies, taskNames]);

  const critical = useMemo(
    () => new Set(criticalTaskIds.map(String)),
    [criticalTaskIds]
  );

  const sortedTasks = useMemo(() => {
    const copy = [...tasks];
    const direction = sort.direction === 'asc' ? 1 : -1;

    copy.sort((a, b) => {
      let av;
      let bv;

      if (sort.field === 'name') {
        av = String(a.name || '').toLowerCase();
        bv = String(b.name || '').toLowerCase();
        return av.localeCompare(bv, 'ru') * direction;
      }

      if (sort.field === 'progress') {
        return (Number(a.progress || 0) - Number(b.progress || 0)) * direction;
      }

      if (sort.field === 'status') {
        av = STATUS_LABELS[effectiveStatus(a)] || effectiveStatus(a);
        bv = STATUS_LABELS[effectiveStatus(b)] || effectiveStatus(b);
        return av.localeCompare(bv, 'ru') * direction;
      }

      av = toLocalDate(a[sort.field])?.getTime() || 0;
      bv = toLocalDate(b[sort.field])?.getTime() || 0;
      return (av - bv) * direction;
    });

    return copy;
  }, [tasks, sort]);

  const toggleSort = (field) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortMark = (field) => {
    if (sort.field !== field) return '';
    return sort.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const sortableTh = (label, field) => (
    <th style={styles.th}>
      <button type="button" style={styles.sortButton} onClick={() => toggleSort(field)}>
        {label}{sortMark(field)}
      </button>
    </th>
  );

  return (
    <section style={styles.card}>
      <div style={styles.header}>
        <div>
          <h3 style={{ margin: 0 }}>Задачи проекта</h3>
          <div style={styles.subtle}>
            Нажми на заголовок столбца, чтобы отсортировать
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={styles.empty}>По выбранным фильтрам задач нет.</div>
      ) : (
        <div style={styles.scroll}>
          <table style={styles.table}>
            <thead>
              <tr>
                {sortableTh('Задача', 'name')}
                <th style={styles.th}>Ответственный</th>
                {sortableTh('Начало', 'start_date')}
                {sortableTh('Конец', 'end_date')}
                <th style={styles.th}>Длительность</th>
                {sortableTh('Статус', 'status')}
                {sortableTh('Прогресс', 'progress')}
                <th style={styles.th}>Зависит от</th>
                <th style={styles.th}></th>
              </tr>
            </thead>

            <tbody>
              {sortedTasks.map((task) => {
                const status = effectiveStatus(task);
                const depNames = predecessorsByTask.get(Number(task.id)) || [];
                const isCritical = critical.has(String(task.id));

                return (
                  <tr key={task.id} style={isCritical ? styles.criticalRow : undefined}>
                    <td style={styles.td}>
                      <strong>{isCritical ? '⚡ ' : ''}{task.name}</strong>
                    </td>

                    <td style={styles.td}>
                      {task.assignee_id
                        ? userNames.get(Number(task.assignee_id)) || `ID ${task.assignee_id}`
                        : 'Не назначен'}
                    </td>

                    <td style={styles.td}>{String(task.start_date).slice(0, 10)}</td>
                    <td style={styles.td}>{String(task.end_date).slice(0, 10)}</td>
                    <td style={styles.td}>{durationDays(task)} дн.</td>

                    <td style={styles.td}>
                      <span style={{ ...styles.status, ...styles[status] }}>
                        {STATUS_LABELS[status] || status}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.progressWrap}>
                        <div style={styles.progressTrack}>
                          <div
                            style={{
                              ...styles.progressFill,
                              width: `${Math.min(100, Math.max(0, Number(task.progress || 0)))}%`,
                            }}
                          />
                        </div>
                        <span>{Number(task.progress || 0)}%</span>
                      </div>
                    </td>

                    <td style={styles.td}>{depNames.length ? depNames.join(', ') : '—'}</td>

                    <td style={styles.td}>
                      <button type="button" onClick={() => onTaskOpen(task)} style={styles.editButton}>
                        Изменить
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const styles = {
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  header: { padding: 16, borderBottom: '1px solid #e5e7eb' },
  subtle: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  scroll: { overflowX: 'auto' },
  table: { width: '100%', minWidth: 1040, fontSize: 13 },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    background: '#f9fafb',
    color: '#4b5563',
    borderBottom: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
  },
  sortButton: {
    padding: 0,
    border: 0,
    background: 'transparent',
    color: 'inherit',
    fontWeight: 700,
    cursor: 'pointer',
  },
  td: {
    padding: '11px 12px',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'middle',
  },
  criticalRow: { background: '#fffaf0' },
  status: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  planned: { background: '#f3f4f6', color: '#4b5563' },
  todo: { background: '#f3f4f6', color: '#4b5563' },
  in_progress: { background: '#eff6ff', color: '#1d4ed8' },
  done: { background: '#ecfdf5', color: '#047857' },
  overdue: { background: '#fff1f2', color: '#be123c' },
  progressWrap: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 105 },
  progressTrack: {
    width: 68,
    height: 6,
    background: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', background: '#2563eb', borderRadius: 999 },
  editButton: {
    padding: '6px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 7,
    background: '#fff',
    cursor: 'pointer',
  },
  empty: { padding: 22, color: '#6b7280' },
};
