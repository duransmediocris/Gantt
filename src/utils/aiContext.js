import { durationDays, effectiveStatus } from './projectAnalytics';

export function buildAIProjectContext({
  project,
  tasks = [],
  dependencies = [],
  users = [],
  criticalPath,
  projectProgress = 0,
}) {
  const usersById = new Map(users.map((user) => [String(user.id), user.name]));
  const taskNamesById = new Map(tasks.map((task) => [String(task.id), task.name]));
  const predecessorsByTask = new Map();

  for (const dependency of dependencies) {
    const successorId = String(dependency.successor_id);
    const predecessorId = String(dependency.predecessor_id);

    if (!predecessorsByTask.has(successorId)) {
      predecessorsByTask.set(successorId, []);
    }

    predecessorsByTask.get(successorId).push(
      taskNamesById.get(predecessorId) || `Задача #${predecessorId}`
    );
  }

  return {
    project: {
      id: project?.id ?? null,
      name: project?.name || 'Без названия',
      start_date: project?.start_date || null,
      end_date: project?.end_date || null,
      progress: Math.round(Number(projectProgress) || 0),
    },

    critical_path: {
      total_days: criticalPath?.totalDays || 0,
      tasks: criticalPath?.names || [],
    },

    tasks: tasks.map((task) => ({
      id: task.id,
      name: task.name,
      start_date: task.start_date,
      end_date: task.end_date,
      duration_days: durationDays(task),
      status: effectiveStatus(task),
      progress: Number(task.progress || 0),
      assignee:
        task.assignee_id == null
          ? null
          : usersById.get(String(task.assignee_id)) || `ID ${task.assignee_id}`,
      predecessors: predecessorsByTask.get(String(task.id)) || [],
      is_critical: (criticalPath?.ids || []).includes(String(task.id)),
    })),
  };
}
