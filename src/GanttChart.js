import React, { useMemo, useState } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';

function parseBackendDate(value) {
  const clean = String(value).slice(0, 10);
  const [year, month, day] = clean.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function GanttChart({ tasks, dependencies, onTaskDateChange, onTaskProgressChange, onTaskOpen }) {
  const [view, setView] = useState(ViewMode.Day);

  const ganttTasks = useMemo(() => {
    return tasks.map((task) => ({
      ...task,
      id: String(task.id),
      name: task.name,
      start: parseBackendDate(task.start_date),
      end: parseBackendDate(task.end_date),
      progress: Number(task.progress ?? 0),
      type: 'task',
      dependencies: dependencies
        .filter((dep) => Number(dep.successor_id) === Number(task.id))
        .map((dep) => String(dep.predecessor_id)),
    }));
  }, [tasks, dependencies]);

  if (ganttTasks.length === 0) {
    return <div style={styles.empty}>В проекте пока нет задач.</div>;
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.toolbar}>
        <button onClick={() => setView(ViewMode.Day)}>День</button>
        <button onClick={() => setView(ViewMode.Week)}>Неделя</button>
        <button onClick={() => setView(ViewMode.Month)}>Месяц</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <Gantt
          tasks={ganttTasks}
          viewMode={view}
          onDateChange={onTaskDateChange}
          onProgressChange={onTaskProgressChange}
          onDoubleClick={onTaskOpen}
          listCellWidth="155px"
          columnWidth={view === ViewMode.Month ? 120 : view === ViewMode.Week ? 100 : 60}
          barFill={70}
          barCornerRadius={4}
          fontFamily="Arial, sans-serif"
          fontSize="13px"
        />
      </div>
    </div>
  );
}

const styles = {
  wrapper: { background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e5e7eb' },
  toolbar: { display: 'flex', gap: 8, marginBottom: 12 },
  empty: { padding: 24, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, color: '#6b7280' },
};
