import React, { useMemo, useState } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { effectiveStatus, isTaskOverdue, toLocalDate } from './utils/projectAnalytics';

function formatRuDate(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getDurationFromDates(start, end) {
  if (!start || !end) return 1;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
}

function buildGanttTasks(tasks, dependencies, criticalTaskIds, milestones) {
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

  const taskRows = tasks.map((task) => {
    const status = effectiveStatus(task);
    const isCritical = critical.has(String(task.id));
    const overdue = isTaskOverdue(task);

    let taskStyles = {
      progressColor: '#2563eb',
      progressSelectedColor: '#1d4ed8',
      backgroundColor: '#93c5fd',
      backgroundSelectedColor: '#60a5fa',
    };

    if (status === 'done') {
      taskStyles = {
        progressColor: '#15803d',
        progressSelectedColor: '#166534',
        backgroundColor: '#86efac',
        backgroundSelectedColor: '#4ade80',
      };
    } else if (overdue) {
      taskStyles = {
        progressColor: '#dc2626',
        progressSelectedColor: '#b91c1c',
        backgroundColor: '#fca5a5',
        backgroundSelectedColor: '#f87171',
      };
    } else if (isCritical) {
      taskStyles = {
        progressColor: '#ea580c',
        progressSelectedColor: '#c2410c',
        backgroundColor: '#fdba74',
        backgroundSelectedColor: '#fb923c',
      };
    } else if (status === 'in_progress') {
      taskStyles = {
        progressColor: '#2563eb',
        progressSelectedColor: '#1d4ed8',
        backgroundColor: '#60a5fa',
        backgroundSelectedColor: '#3b82f6',
      };
    }

    return {
      id: String(task.id),
      name: `${isCritical ? '⚡ ' : ''}${overdue ? '⏰ ' : ''}${task.name}`,
      start: toLocalDate(task.start_date),
      end: toLocalDate(task.end_date),
      progress: Number(task.progress || 0),
      type: 'task',
      dependencies: dependenciesBySuccessor.get(String(task.id)) || [],
      isDisabled: false,
      styles: taskStyles,
      sourceType: 'task',
    };
  });

  const milestoneRows = (milestones || [])
    .filter((item) => item?.date)
    .map((item) => {
      const date = toLocalDate(item.date);
      return {
        id: `milestone:${item.id}`,
        name: `◆ ${item.name}`,
        start: date,
        end: date,
        progress: 0,
        type: 'milestone',
        dependencies: [],
        isDisabled: true,
        styles: {
          backgroundColor: '#4f46e5',
          backgroundSelectedColor: '#4338ca',
          progressColor: '#4f46e5',
          progressSelectedColor: '#4338ca',
        },
        sourceType: 'milestone',
        milestoneName: item.name,
      };
    });

  return [...taskRows, ...milestoneRows].sort((a, b) => {
    const byDate = a.start.getTime() - b.start.getTime();
    if (byDate !== 0) return byDate;
    if (a.sourceType === b.sourceType) return a.name.localeCompare(b.name, 'ru');
    return a.sourceType === 'milestone' ? 1 : -1;
  });
}

function RussianTooltip({ task, fontFamily }) {
  const isMilestone = task.sourceType === 'milestone' || task.type === 'milestone';

  return (
    <div
      style={{
        fontFamily,
        position: 'relative',
        top: 48,
        zIndex: 50,
        padding: '14px 16px',
        minWidth: 245,
        background: '#fff',
        border: '1px solid #dbe3ee',
        borderRadius: 12,
        boxShadow: '0 14px 35px rgba(15,23,42,.18)',
        color: '#0f172a',
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 9, fontSize: 15 }}>
        {isMilestone ? `◆ ${task.milestoneName || task.name.replace(/^◆\s*/, '')}` : task.name}
      </div>

      {isMilestone ? (
        <div style={{ color: '#64748b', fontSize: 12 }}>
          Контрольная точка · {formatRuDate(task.start)}
        </div>
      ) : (
        <>
          <div style={{ color: '#64748b', fontSize: 12, marginBottom: 7 }}>
            {formatRuDate(task.start)} — {formatRuDate(task.end)}
          </div>
          <div style={{ fontSize: 12 }}>
            Длительность: <strong>{getDurationFromDates(task.start, task.end)} дн.</strong>
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            Прогресс: <strong>{task.progress}%</strong>
          </div>
        </>
      )}
    </div>
  );
}

const NAME_WIDTH = 160;
const DATE_WIDTH = 100;

function RussianTaskListHeader({ headerHeight, fontFamily, fontSize }) {
  const cell = {
    display: 'flex',
    alignItems: 'center',
    height: headerHeight,
    borderRight: '1px solid #e2e8f0',
    padding: '0 9px',
    fontWeight: 700,
    color: '#334155',
    flexShrink: 0,
  };
  const width = (value) => ({ width: value, minWidth: value, maxWidth: value });

  return (
    <div style={{ display: 'flex', fontFamily, fontSize, background: '#f8fafc' }}>
      <div style={{ ...cell, ...width(NAME_WIDTH) }}>Название</div>
      <div style={{ ...cell, ...width(DATE_WIDTH) }}>Начало</div>
      <div style={{ ...cell, ...width(DATE_WIDTH), borderRight: 0 }}>Конец</div>
    </div>
  );
}

function RussianTaskListTable({
  rowHeight,
  fontFamily,
  fontSize,
  tasks,
  selectedTaskId,
  setSelectedTask,
}) {
  const cell = {
    height: rowHeight,
    display: 'flex',
    alignItems: 'center',
    padding: '0 9px',
    borderRight: '1px solid #e2e8f0',
    borderBottom: '1px solid #f1f5f9',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    flexShrink: 0,
  };
  const width = (value) => ({ width: value, minWidth: value, maxWidth: value });

  return (
    <div style={{ fontFamily, fontSize }}>
      {tasks.map((task) => {
        const isMilestone = task.sourceType === 'milestone' || task.type === 'milestone';
        return (
          <div
            key={task.id}
            onClick={() => setSelectedTask(task.id)}
            style={{
              display: 'flex',
              cursor: isMilestone ? 'default' : 'pointer',
              background: selectedTaskId === task.id ? '#eff6ff' : '#fff',
              color: isMilestone ? '#4338ca' : '#0f172a',
            }}
          >
            <div style={{ ...cell, ...width(NAME_WIDTH), fontWeight: 600 }}>{task.name}</div>
            <div style={{ ...cell, ...width(DATE_WIDTH) }}>{formatRuDate(task.start)}</div>
            <div style={{ ...cell, ...width(DATE_WIDTH), borderRight: 0 }}>
              {isMilestone ? '—' : formatRuDate(task.end)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function GanttChart({
  tasks,
  dependencies,
  criticalTaskIds = [],
  milestones = [],
  onTaskDateChange,
  onTaskProgressChange,
  onTaskOpen,
}) {
  const [view, setView] = useState(ViewMode.Day);

  const ganttTasks = useMemo(
    () => buildGanttTasks(tasks, dependencies, criticalTaskIds, milestones),
    [tasks, dependencies, criticalTaskIds, milestones]
  );

  const ganttKey = useMemo(
    () =>
      ganttTasks
        .map((task) => `${task.id}:${task.start.getTime()}:${task.end.getTime()}:${task.type}`)
        .join('|'),
    [ganttTasks]
  );

  if (!ganttTasks.length) {
    return <div style={styles.empty}>Задач и контрольных точек пока нет</div>;
  }

  const columnWidth = view === ViewMode.Month ? 180 : view === ViewMode.Week ? 110 : 60;

  const handleDateChange = (task) => {
    if (task.sourceType === 'milestone' || task.type === 'milestone') return;
    onTaskDateChange?.(task);
  };

  const handleProgressChange = (task) => {
    if (task.sourceType === 'milestone' || task.type === 'milestone') return;
    onTaskProgressChange?.(task);
  };

  const handleDoubleClick = (task) => {
    if (task.sourceType === 'milestone' || task.type === 'milestone') return;
    onTaskOpen?.(task);
  };

  return (
    <section style={styles.wrapper}>
      <div style={styles.toolbar}>
        <div>
          <strong style={styles.title}>Диаграмма Ганта</strong>
          <div style={styles.hint}>
            Двойной клик по задаче — редактирование. Контрольные точки отмечены ромбами ◆.
          </div>
        </div>

        <div style={styles.buttons}>
          {[
            [ViewMode.Day, 'День'],
            [ViewMode.Week, 'Неделя'],
            [ViewMode.Month, 'Месяц'],
          ].map(([mode, label]) => (
            <button
              key={label}
              type="button"
              style={view === mode ? styles.activeButton : styles.button}
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
          onDateChange={handleDateChange}
          onProgressChange={handleProgressChange}
          onDoubleClick={handleDoubleClick}
          listCellWidth="120px"
          columnWidth={columnWidth}
          barFill={64}
          barCornerRadius={7}
          fontSize="13px"
          fontFamily="Inter, system-ui, sans-serif"
          TooltipContent={RussianTooltip}
          TaskListHeader={RussianTaskListHeader}
          TaskListTable={RussianTaskListTable}
          arrowColor="#64748b"
          todayColor="rgba(37,99,235,.08)"
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
    overflow: 'visible',
    marginBottom: 18,
    boxShadow: '0 8px 30px rgba(15,23,42,.05)',
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
  title: { fontSize: 18 },
  hint: { color: '#64748b', fontSize: 12, marginTop: 4 },
  buttons: { display: 'flex', gap: 8 },
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
    boxShadow: '0 4px 12px rgba(37,99,235,.22)',
  },
  scroll: { overflowX: 'auto' },
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
