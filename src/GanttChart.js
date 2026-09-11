import React, { useMemo, useState } from 'react';

import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';

import {
  effectiveStatus,
  toLocalDate,
} from './utils/projectAnalytics';

function formatRuDate(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getDurationFromDates(start, end) {
  if (!start || !end) return 1;

  const diff = Math.round(
    (end.getTime() - start.getTime()) / 86400000
  );

  return Math.max(1, diff);
}

function buildGanttTasks(tasks, dependencies, criticalTaskIds) {
  const dependenciesBySuccessor = new Map();
  const critical = new Set((criticalTaskIds || []).map(String));

  for (const dep of dependencies) {
    const successorId = String(dep.successor_id);
    const predecessorId = String(dep.predecessor_id);

    if (!dependenciesBySuccessor.has(successorId)) {
      dependenciesBySuccessor.set(successorId, []);
    }

    dependenciesBySuccessor.get(successorId).push(predecessorId);
  }

  return tasks.map((task) => {
    const status = effectiveStatus(task);
    const isCritical = critical.has(String(task.id));

    let taskStyles;

    if (status === 'overdue') {
      taskStyles = {
        progressColor: '#ef4444',
        progressSelectedColor: '#dc2626',
        backgroundColor: '#fee2e2',
        backgroundSelectedColor: '#fecaca',
      };
    } else if (isCritical) {
      taskStyles = {
        progressColor: '#f97316',
        progressSelectedColor: '#ea580c',
        backgroundColor: '#ffedd5',
        backgroundSelectedColor: '#fed7aa',
      };
    }

    return {
      id: String(task.id),
      name: isCritical ? `⚡ ${task.name}` : task.name,
      start: toLocalDate(task.start_date),
      end: toLocalDate(task.end_date),
      progress: Number(task.progress || 0),
      type: 'task',
      dependencies:
        dependenciesBySuccessor.get(String(task.id)) || [],
      isDisabled: false,
      styles: taskStyles,
    };
  });
}

function RussianTooltip({ task, fontFamily }) {
  const days = getDurationFromDates(task.start, task.end);

  return (
    <div
      style={{
        fontFamily,
        padding: '12px 14px',
        minWidth: 230,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          marginBottom: 10,
        }}
      >
        {task.name}
      </div>

      <div
        style={{
          color: '#64748b',
          fontSize: 12,
          marginBottom: 5,
        }}
      >
        {formatRuDate(task.start)} — {formatRuDate(task.end)}
      </div>

      <div style={{ fontSize: 12 }}>
        Длительность: {days} дн.
      </div>

      <div
        style={{
          fontSize: 12,
          marginTop: 4,
        }}
      >
        Прогресс: {task.progress}%
      </div>
    </div>
  );
}

function RussianTaskListHeader({
  headerHeight,
  rowWidth,
  fontFamily,
  fontSize,
}) {
  const cell = {
    display: 'flex',
    alignItems: 'center',
    height: headerHeight,
    borderRight: '1px solid #e2e8f0',
    padding: '0 10px',
    fontWeight: 700,
    color: '#475569',
  };

  return (
    <div
      style={{
        display: 'flex',
        fontFamily,
        fontSize,
        background: '#f8fafc',
      }}
    >
      <div style={{ ...cell, width: rowWidth }}>
        Название
      </div>

      <div style={{ ...cell, width: rowWidth }}>
        Начало
      </div>

      <div
        style={{
          ...cell,
          width: rowWidth,
          borderRight: 0,
        }}
      >
        Конец
      </div>
    </div>
  );
}

function RussianTaskListTable({
  rowHeight,
  rowWidth,
  fontFamily,
  fontSize,
  tasks,
  selectedTaskId,
  setSelectedTask,
}) {
  const cell = {
    width: rowWidth,
    minWidth: rowWidth,
    height: rowHeight,
    display: 'flex',
    alignItems: 'center',
    padding: '0 10px',
    borderRight: '1px solid #e2e8f0',
    borderBottom: '1px solid #f1f5f9',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  };

  return (
    <div
      style={{
        fontFamily,
        fontSize,
      }}
    >
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => setSelectedTask(task.id)}
          style={{
            display: 'flex',
            cursor: 'pointer',
            background:
              selectedTaskId === task.id
                ? '#eff6ff'
                : '#fff',
          }}
        >
          <div
            style={{
              ...cell,
              fontWeight: 600,
            }}
          >
            {task.name}
          </div>

          <div style={cell}>
            {formatRuDate(task.start)}
          </div>

          <div
            style={{
              ...cell,
              borderRight: 0,
            }}
          >
            {formatRuDate(task.end)}
          </div>
        </div>
      ))}
    </div>
  );
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
    () =>
      buildGanttTasks(
        tasks,
        dependencies,
        criticalTaskIds
      ),
    [tasks, dependencies, criticalTaskIds]
  );

  const ganttKey = useMemo(
    () =>
      ganttTasks
        .map(
          (task) =>
            `${task.id}:${task.start.getTime()}:${task.end.getTime()}`
        )
        .join('|'),
    [ganttTasks]
  );

  if (ganttTasks.length === 0) {
    return <div style={styles.empty}>Задач нет</div>;
  }

  const columnWidth =
    view === ViewMode.Month
      ? 180
      : view === ViewMode.Week
      ? 110
      : 60;

  return (
    <section style={styles.wrapper}>
      <div style={styles.toolbar}>
        <strong style={styles.title}>
          Диаграмма Ганта
        </strong>

        <div style={styles.buttons}>
          {[
            [ViewMode.Day, 'День'],
            [ViewMode.Week, 'Неделя'],
            [ViewMode.Month, 'Месяц'],
          ].map(([mode, label]) => (
            <button
              key={label}
              type="button"
              style={
                view === mode
                  ? styles.activeButton
                  : styles.button
              }
              onClick={() => setView(mode)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.scroll}>
        <Gantt
          key={`${view}-${ganttKey}`}
          tasks={ganttTasks}
          viewMode={view}
          locale="ru"
          onDateChange={onTaskDateChange}
          onProgressChange={onTaskProgressChange}
          onDoubleClick={onTaskOpen}
          listCellWidth="210px"
          columnWidth={columnWidth}
          barFill={64}
          barCornerRadius={7}
          fontSize="13px"
          fontFamily="Inter, system-ui, sans-serif"
          TooltipContent={RussianTooltip}
          TaskListHeader={RussianTaskListHeader}
          TaskListTable={RussianTaskListTable}
          arrowColor="#64748b"
          todayColor="rgba(37, 99, 235, 0.08)"
        />
      </div>
    </section>
  );
}

const styles = {
  wrapper: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 18,
    boxShadow: '0 8px 30px rgba(15, 23, 42, 0.05)',
  },

  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '16px 18px',
    borderBottom: '1px solid #e2e8f0',
    flexWrap: 'wrap',
  },

  title: {
    fontSize: 18,
  },

  buttons: {
    display: 'flex',
    gap: 8,
  },

  button: {
    padding: '8px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    background: '#fff',
    color: '#334155',
    cursor: 'pointer',
  },

  activeButton: {
    padding: '8px 14px',
    border: '1px solid #2563eb',
    borderRadius: 10,
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.22)',
  },

  scroll: {
    overflowX: 'auto',
  },

  empty: {
    background: '#fff',
    border: '1px dashed #cbd5e1',
    borderRadius: 18,
    padding: 28,
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 18,
  },
};
