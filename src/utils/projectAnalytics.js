export function toLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function effectiveStatus(task) {
  return task.status || 'planned';
}

export function isTaskOverdue(task) {
  if (effectiveStatus(task) === 'done') return false;
  if (typeof task.is_overdue === 'boolean') return task.is_overdue;

  const end = toLocalDate(task.end_date);
  if (!end) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end < today;
}

export function overdueDays(task) {
  if (!isTaskOverdue(task)) return 0;
  if (Number.isFinite(Number(task.overdue_days))) return Number(task.overdue_days);

  const end = toLocalDate(task.end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((today - end) / 86400000));
}

export function durationDays(task) {
  const start = toLocalDate(task.start_date);
  const end = toLocalDate(task.end_date);
  if (!start || !end) return 1;
  return Math.max(1, Math.round((end - start) / 86400000));
}

/**
 * Критический путь считаем как самую длинную по календарю цепочку связанных задач.
 * В отличие от простого суммирования длительностей, учитываются реальные даты и разрывы
 * между задачами — это соответствует замечанию жюри про «длительность цепочки».
 */
export function calculateCriticalPath(tasks, dependencies) {
  if (!tasks.length) return { ids: [], totalDays: 0, names: [], hasCycle: false };

  const byId = new Map(tasks.map((task) => [String(task.id), task]));
  const incoming = new Map();
  const outgoing = new Map();

  for (const task of tasks) {
    const id = String(task.id);
    incoming.set(id, []);
    outgoing.set(id, []);
  }

  for (const dep of dependencies) {
    const from = String(dep.predecessor_id);
    const to = String(dep.successor_id);
    if (!byId.has(from) || !byId.has(to)) continue;
    outgoing.get(from).push(to);
    incoming.get(to).push(from);
  }

  const indegree = new Map([...incoming.entries()].map(([id, preds]) => [id, preds.length]));
  const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
  const order = [];

  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const next of outgoing.get(id) || []) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }

  if (order.length !== tasks.length) {
    return { ids: [], totalDays: 0, names: [], hasCycle: true };
  }

  const best = new Map();

  for (const id of order) {
    const task = byId.get(id);
    const taskStart = toLocalDate(task.start_date);
    const taskEnd = toLocalDate(task.end_date);

    let winner = {
      ids: [id],
      start: taskStart,
      end: taskEnd,
      span: Math.max(1, Math.round((taskEnd - taskStart) / 86400000)),
    };

    for (const predId of incoming.get(id) || []) {
      const pred = best.get(predId);
      if (!pred) continue;

      const pathStart = pred.start < taskStart ? pred.start : taskStart;
      const pathEnd = pred.end > taskEnd ? pred.end : taskEnd;
      const span = Math.max(1, Math.round((pathEnd - pathStart) / 86400000));

      if (span > winner.span || (span === winner.span && pred.ids.length + 1 > winner.ids.length)) {
        winner = {
          ids: [...pred.ids, id],
          start: pathStart,
          end: pathEnd,
          span,
        };
      }
    }

    best.set(id, winner);
  }

  let result = { ids: [], totalDays: 0, names: [], hasCycle: false };
  for (const value of best.values()) {
    if (value.span > result.totalDays || (value.span === result.totalDays && value.ids.length > result.ids.length)) {
      result = {
        ids: value.ids,
        totalDays: value.span,
        names: value.ids.map((id) => byId.get(id)?.name).filter(Boolean),
        hasCycle: false,
      };
    }
  }

  return result;
}

export function getUpcomingTasks(tasks, days = 3) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);

  return tasks
    .filter((task) => {
      if (effectiveStatus(task) === 'done' || isTaskOverdue(task)) return false;
      const end = toLocalDate(task.end_date);
      return end && end >= today && end <= limit;
    })
    .sort((a, b) => toLocalDate(a.end_date) - toLocalDate(b.end_date));
}

export function getProjectRiskAnalysis({ project, tasks, criticalPath }) {
  const items = [];
  const projectEnd = toLocalDate(project?.end_date);
  const overdue = tasks.filter(isTaskOverdue);
  const beyondDeadline = projectEnd
    ? tasks.filter((task) => effectiveStatus(task) !== 'done' && toLocalDate(task.end_date) > projectEnd)
    : [];
  const unassigned = tasks.filter((task) => effectiveStatus(task) !== 'done' && !task.assignee_id);

  if (overdue.length) {
    items.push({
      level: 'danger',
      title: `${overdue.length} просроченных задач`,
      text: overdue
        .slice(0, 3)
        .map((task) => `${task.name} (${overdueDays(task)} дн.)`)
        .join(', '),
    });
  }

  if (beyondDeadline.length) {
    items.push({
      level: 'danger',
      title: 'Есть задачи за дедлайном проекта',
      text: beyondDeadline.slice(0, 3).map((task) => task.name).join(', '),
    });
  }

  if (criticalPath?.ids?.length && criticalPath.totalDays > 0) {
    items.push({
      level: 'warning',
      title: `Критическая цепочка — ${criticalPath.totalDays} дн.`,
      text: criticalPath.names.join(' → '),
    });
  }

  if (unassigned.length) {
    items.push({
      level: 'warning',
      title: `${unassigned.length} активных задач без ответственного`,
      text: unassigned.slice(0, 3).map((task) => task.name).join(', '),
    });
  }

  if (!items.length) {
    items.push({
      level: 'success',
      title: 'Явных рисков не найдено',
      text: 'Нет просрочек, задач за дедлайном проекта и активных задач без ответственного.',
    });
  }

  return items;
}

export function getProjectHealth({ overdueCount, riskyCount, upcomingCount }) {
  if (overdueCount > 0) {
    return {
      label: 'Требует внимания',
      tone: 'danger',
      text: `${overdueCount} задач просрочено.`,
    };
  }

  if (riskyCount > 0) {
    return {
      label: 'Есть риск',
      tone: 'warning',
      text: `${riskyCount} задач выходят за срок проекта.`,
    };
  }

  if (upcomingCount > 0) {
    return {
      label: 'В норме',
      tone: 'success',
      text: `${upcomingCount} задач со сроком в ближайшие 3 дня.`,
    };
  }

  return {
    label: 'В норме',
    tone: 'success',
    text: 'Критичных проблем по срокам не найдено.',
  };
}
