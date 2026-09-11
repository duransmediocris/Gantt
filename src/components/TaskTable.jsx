import React, { useMemo, useState } from 'react';
import { durationDays, effectiveStatus, isTaskOverdue, overdueDays, toLocalDate } from '../utils/projectAnalytics';

const STATUS_LABELS = {
  planned: 'К выполнению',
  todo: 'К выполнению',
  in_progress: 'В работе',
  done: 'Выполнено',
};

export function TaskTable({ tasks, allTasks = tasks, users, dependencies, criticalTaskIds = [], onTaskOpen }) {
  const [sort, setSort] = useState({ field: 'start_date', direction: 'asc' });
  const userNames = useMemo(() => new Map(users.map((user) => [Number(user.id), user.name])), [users]);
  const taskNames = useMemo(() => new Map(allTasks.map((task) => [Number(task.id), task.name])), [allTasks]);

  const predecessorsByTask = useMemo(() => {
    const map = new Map();
    for (const dep of dependencies) {
      const successorId = Number(dep.successor_id);
      if (!map.has(successorId)) map.set(successorId, []);
      map.get(successorId).push(taskNames.get(Number(dep.predecessor_id)) || `#${dep.predecessor_id}`);
    }
    return map;
  }, [dependencies, taskNames]);

  const critical = useMemo(() => new Set(criticalTaskIds.map(String)), [criticalTaskIds]);

  const sortedTasks = useMemo(() => {
    const copy = [...tasks];
    const direction = sort.direction === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      if (sort.field === 'name') return String(a.name || '').localeCompare(String(b.name || ''), 'ru') * direction;
      if (sort.field === 'progress') return (Number(a.progress || 0) - Number(b.progress || 0)) * direction;
      if (sort.field === 'status') return (STATUS_LABELS[effectiveStatus(a)] || '').localeCompare(STATUS_LABELS[effectiveStatus(b)] || '', 'ru') * direction;
      return ((toLocalDate(a[sort.field])?.getTime() || 0) - (toLocalDate(b[sort.field])?.getTime() || 0)) * direction;
    });
    return copy;
  }, [tasks, sort]);

  const toggleSort = (field) => setSort((prev) => ({ field, direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc' }));
  const sortMark = (field) => sort.field !== field ? '' : sort.direction === 'asc' ? ' ↑' : ' ↓';
  const sortableTh = (label, field) => <th style={styles.th}><button type="button" style={styles.sortButton} onClick={() => toggleSort(field)}>{label}{sortMark(field)}</button></th>;

  return (
    <section style={styles.card}>
      <div style={styles.header}>
        <div>
          <h3 style={{ margin: 0 }}>Задачи проекта</h3>
          <div style={styles.subtle}>Нажми на задачу «Изменить», чтобы открыть подробности и комментарий.</div>
        </div>
      </div>

      {tasks.length === 0 ? <div style={styles.empty}>По выбранным фильтрам задач нет.</div> : (
        <div style={styles.scroll}>
          <table style={styles.table}>
            <thead><tr>
              {sortableTh('Задача', 'name')}
              <th style={styles.th}>Ответственный</th>
              {sortableTh('Начало', 'start_date')}
              {sortableTh('Конец', 'end_date')}
              <th style={styles.th}>Длительность</th>
              {sortableTh('Статус', 'status')}
              {sortableTh('Прогресс', 'progress')}
              <th style={styles.th}>Зависит от</th>
              <th style={styles.th}>Комментарий</th>
              <th style={styles.th}></th>
            </tr></thead>
            <tbody>
              {sortedTasks.map((task) => {
                const status = effectiveStatus(task);
                const overdue = isTaskOverdue(task);
                const depNames = predecessorsByTask.get(Number(task.id)) || [];
                const isCritical = critical.has(String(task.id));
                return (
                  <tr key={task.id} style={overdue ? styles.overdueRow : isCritical ? styles.criticalRow : undefined}>
                    <td style={styles.td}><strong>{isCritical ? '⚡ ' : ''}{task.name}</strong></td>
                    <td style={styles.td}>{task.assignee_id ? userNames.get(Number(task.assignee_id)) || `ID ${task.assignee_id}` : 'Не назначен'}</td>
                    <td style={styles.td}>{String(task.start_date).slice(0, 10)}</td>
                    <td style={styles.td}>{String(task.end_date).slice(0, 10)}</td>
                    <td style={styles.td}>{durationDays(task)} дн.</td>
                    <td style={styles.td}>
                      <div style={styles.badgeStack}>
                        <span style={{ ...styles.status, ...styles[status] }}>{STATUS_LABELS[status] || status}</span>
                        {overdue && <span style={styles.overdueBadge}>Просрочено +{overdueDays(task)} дн.</span>}
                      </div>
                    </td>
                    <td style={styles.td}><div style={styles.progressWrap}><div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${Math.min(100, Math.max(0, Number(task.progress || 0)))}%` }} /></div><span>{Number(task.progress || 0)}%</span></div></td>
                    <td style={styles.td}>{depNames.length ? depNames.join(', ') : '—'}</td>
                    <td style={{ ...styles.td, maxWidth: 220 }}><span title={task.comments || ''} style={styles.commentText}>{task.comments || '—'}</span></td>
                    <td style={styles.td}><button type="button" onClick={() => onTaskOpen(task)} style={styles.editButton}>Изменить</button></td>
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
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', marginTop: 16, boxShadow: '0 6px 24px rgba(15,23,42,.035)' },
  header: { padding: 16, borderBottom: '1px solid #e5e7eb' },
  subtle: { color: '#64748b', fontSize: 12, marginTop: 4 },
  scroll: { overflowX: 'auto' },
  table: { width: '100%', minWidth: 1300, fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  sortButton: { padding: 0, border: 0, background: 'transparent', color: 'inherit', fontWeight: 700, cursor: 'pointer' },
  td: { padding: '11px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  criticalRow: { background: '#fffaf0' },
  overdueRow: { background: '#fff7f7' },
  badgeStack: { display: 'grid', gap: 5, justifyItems: 'start' },
  status: { display: 'inline-block', padding: '4px 8px', borderRadius: 999, fontSize: 12, whiteSpace: 'nowrap' },
  planned: { background: '#e2e8f0', color: '#334155' },
  todo: { background: '#e2e8f0', color: '#334155' },
  in_progress: { background: '#dbeafe', color: '#1d4ed8' },
  done: { background: '#dcfce7', color: '#166534' },
  overdueBadge: { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 999, padding: '3px 7px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' },
  progressWrap: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 105 },
  progressTrack: { width: 68, height: 7, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#2563eb', borderRadius: 999 },
  editButton: { padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', cursor: 'pointer' },
  commentText: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' },
  empty: { padding: 22, color: '#64748b' },
};
