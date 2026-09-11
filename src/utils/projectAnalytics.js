export function toLocalDate(value) {
  if (!value) return null;

  const [year, month, day] = String(value)
    .slice(0, 10)
    .split('-')
    .map(Number);

  return new Date(year, month - 1, day);
}

export function effectiveStatus(task) {
  return task.status || 'planned';
}

export function durationDays(task) {
  const start = toLocalDate(task.start_date);
  const end = toLocalDate(task.end_date);

  if (!start || !end) return 1;

  const diff = Math.round(
    (end.getTime() - start.getTime()) / 86400000
  );

  return Math.max(1, diff);
}

export function calculateCriticalPath(tasks, dependencies) {
  if (!tasks.length) {
    return {
      ids: [],
      totalDays: 0,
      names: [],
    };
  }

  const byId = new Map(
    tasks.map((task) => [String(task.id), task])
  );

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

    if (!byId.has(from) || !byId.has(to)) {
      continue;
    }

    outgoing.get(from).push(to);
    incoming.get(to).push(from);
  }

  const indegree = new Map(
    [...incoming.entries()].map(
      ([id, preds]) => [id, preds.length]
    )
  );

  const queue = [...indegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([id]) => id);

  const order = [];

  while (queue.length) {
    const id = queue.shift();

    order.push(id);

    for (const next of outgoing.get(id) || []) {
      indegree.set(next, indegree.get(next) - 1);

      if (indegree.get(next) === 0) {
        queue.push(next);
      }
    }
  }

  if (order.length !== tasks.length) {
    return {
      ids: [],
      totalDays: 0,
      names: [],
      hasCycle: true,
    };
  }

  const longest = new Map();
  const previous = new Map();

  for (const id of order) {
    const ownDuration = durationDays(byId.get(id));
    const preds = incoming.get(id) || [];

    if (!preds.length) {
      longest.set(id, ownDuration);
      previous.set(id, null);
      continue;
    }

    let bestPred = preds[0];

    for (const pred of preds) {
      if (
        (longest.get(pred) || 0) >
        (longest.get(bestPred) || 0)
      ) {
        bestPred = pred;
      }
    }

    longest.set(
      id,
      (longest.get(bestPred) || 0) + ownDuration
    );

    previous.set(id, bestPred);
  }

  let endId = order[0];

  for (const id of order) {
    if (
      (longest.get(id) || 0) >
      (longest.get(endId) || 0)
    ) {
      endId = id;
    }
  }

  const ids = [];
  let cursor = endId;

  while (cursor) {
    ids.unshift(cursor);
    cursor = previous.get(cursor);
  }

  return {
    ids,
    totalDays: longest.get(endId) || 0,
    names: ids
      .map((id) => byId.get(id)?.name)
      .filter(Boolean),
    hasCycle: false,
  };
}

export function getUpcomingTasks(tasks, days = 3) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);

  return tasks
    .filter((task) => {
      if (effectiveStatus(task) === 'done') {
        return false;
      }

      const end = toLocalDate(task.end_date);

      return end && end >= today && end <= limit;
    })
    .sort(
      (a, b) =>
        toLocalDate(a.end_date) -
        toLocalDate(b.end_date)
    );
}

export function getProjectHealth({
  overdueCount,
  riskyCount,
  upcomingCount,
}) {
  if (overdueCount > 0 || riskyCount > 0) {
    return {
      label: 'Риск',
      tone: 'danger',
      text: 'Есть задачи, требующие внимания.',
    };
  }

  if (upcomingCount > 0) {
    return {
      label: 'Внимание',
      tone: 'warning',
      text: 'Скоро наступают сроки задач.',
    };
  }

  return {
    label: 'В норме',
    tone: 'success',
    text: 'Критичных проблем по срокам не найдено.',
  };
}
