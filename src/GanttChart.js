import React, { useMemo, useState } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { effectiveStatus, toLocalDate } from './utils/projectAnalytics';

function buildGanttTasks(tasks, dependencies, criticalTaskIds) {
  const dependenciesBySuccessor = new Map();
  const critical = new Set((criticalTaskIds || []).map(String));

  for (const dep of dependencies) {
    const successorId = String(dep.successor_id);
    const predecessorId = String(dep.predecessor_id);
    if (!dependenciesBySuccessor.has(successorId)) dependenciesBySuccessor.set(successorId, []);
    dependenciesBySuccessor.get(successorId).push(predecessorId);
  }

  return tasks.map((task) => {
    const status = effectiveStatus(task);
    const isCritical = critical.has(String(task.id));

    let taskStyles;
    if (status === 'overdue') {
      taskStyles = {
        progressColor: '#dc2626',
        progressSelectedColor: '#b91c1c',
        backgroundColor: '#fecaca',
        backgroundSelectedColor: '#fca5a5',
      };
    } else if (isCritical) {
      taskStyles = {
        progressColor: '#ea580c',
        progressSelectedColor: '#c2410c',
        backgroundColor: '#fed7aa',
        backgroundSelectedColor: '#fdba74',
      };
    }

    return {
      id: String(task.id),
      name: isCritical ? `⚡ ${task.name}` : task.name,
      start: toLocalDate(task.start_date),
      end: toLocalDate(task.end_date),
      progress: Number(task.progress || 0),
      type: 'task',
      dependencies: dependenciesBySuccessor.get(String(task.id)) || [],
      isDisabled: false,
      styles: taskStyles,
    };
  });
}

export default function GanttChart({
  tasks,
  dependencies,
  criticalTaskIds = [],
  onTaskDateChange,
  onTaskProgressChange,
  onTaskOpen,
}) {
  const [view, setView] = useState(ViewMode.Day);

  const ganttTasks = useMemo(
    () => buildGanttTasks(tasks, dependencies, criticalTaskIds),
    [tasks, dependencies, criticalTaskIds]
  );

  if (ganttTasks.length === 0) {
    return <div style={styles.empty}>По выбранным фильтрам задач нет.</div>;
  }

  const columnWidth = view === ViewMode.Month ? 180 : view === ViewMode.Week ? 110 : 60;

  return (
    <section style={styles.wrapper}>
      <div style={styles.toolbar}>
        <div>
          <strong>Диаграмма Ганта</strong>
          <div style={styles.legend}>⚡ критический путь · красный — просрочено</div>
        </div>

        <div style={styles.buttons}>
          <button type="button" style={view === ViewMode.Day ? styles.activeButton : styles.button} onClick={() => setView(ViewMode.Day)}>
            День
          </button>
          <button type="button" style={view === ViewMode.Week ? styles.activeButton : styles.button} onClick={() => setView(ViewMode.Week)}>
            Неделя
          </button>
          <button type="button" style={view === ViewMode.Month ? styles.activeButton : styles.button} onClick={() => setView(ViewMode.Month)}>
            Месяц
          </button>
        </div>
      </div>

      <div style={styles.scroll}>
        <Gantt
          tasks={ganttTasks}
          viewMode={view}
          onDateChange={onTaskDateChange}
          onProgressChange={onTaskProgressChange}
          onDoubleClick={onTaskOpen}
          listCellWidth="210px"
          columnWidth={columnWidth}
          barFill={60}
          barCornerRadius={4}
          fontSize="13px"
        />
      </div>

      <div style={styles.hint}>
        Перетаскивай задачи, чтобы менять сроки. Двойной клик открывает редактирование.
      </div>
    </section>
  );
}

const styles = {
  wrapper: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderBottom: '1px solid #e5e7eb',
    flexWrap: 'wrap',
  },
  legend: { color: '#6b7280', fontSize: 11, marginTop: 4 },
  buttons: { display: 'flex', gap: 8 },
  button: {
    padding: '7px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 7,
    background: '#fff',
    cursor: 'pointer',
  },
  activeButton: {
    padding: '7px 12px',
    border: '1px solid #2563eb',
    borderRadius: 7,
    background: '#eff6ff',
    color: '#1d4ed8',
    cursor: 'pointer',
  },
  scroll: { overflowX: 'auto' },
  hint: {
    padding: '10px 14px',
    color: '#6b7280',
    fontSize: 12,
    borderTop: '1px solid #e5e7eb',
  },
  empty: {
    background: '#fff',
    border: '1px dashed #d1d5db',
    borderRadius: 12,
    padding: 28,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 16,
  },
};
