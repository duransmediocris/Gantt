import React, { useCallback, useEffect, useMemo, useState } from 'react';
import GanttChart from './GanttChart';
import { TaskModal } from './components/TaskModal';
import { ProjectModal } from './components/ProjectModal';
import { TaskTable } from './components/TaskTable';
import { TaskFilters } from './components/TaskFilters';
import { ProjectInsights } from './components/ProjectInsights';
import AIProjectAssistant from './components/AIProjectAssistant';
import {
  calculateCriticalPath,
  effectiveStatus,
  getProjectHealth,
  getUpcomingTasks,
  toLocalDate,
} from './utils/projectAnalytics';
import {
  createProject,
  createTask,
  deleteTask,
  getProject,
  getUsers,
  linkTasks,
  updateTask,
} from './api/tasksApi';

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function csvEscape(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function App() {
  const [projectId, setProjectId] = useState(1);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [filters, setFilters] = useState({
    query: '',
    status: 'all',
    assignee: 'all',
    criticalOnly: false,
  });

  const applyProjectData = useCallback((data) => {
    setProject(data.project || null);
    setTasks(data.tasks || []);
    setDependencies(data.dependencies || []);
  }, []);

  const loadProject = useCallback(
    async (id = projectId) => {
      setLoading(true);
      setError(null);

      try {
        const data = await getProject(id);
        applyProjectData(data);
      } catch (err) {
        setProject(null);
        setTasks([]);
        setDependencies([]);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [projectId, applyProjectData]
  );

  const loadUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('Пользователи пока недоступны:', err.message);
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    loadProject(projectId);
  }, [projectId, loadProject]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const statistics = useMemo(() => {
    const result = {
      total: tasks.length,
      planned: 0,
      inProgress: 0,
      done: 0,
      overdue: 0,
    };

    for (const task of tasks) {
      const status = effectiveStatus(task);
      if (status === 'done') result.done += 1;
      else if (status === 'in_progress') result.inProgress += 1;
      else if (status === 'overdue') result.overdue += 1;
      else result.planned += 1;
    }

    return result;
  }, [tasks]);

  const projectProgress = useMemo(() => {
    if (!tasks.length) return 0;
    return Math.round(
      tasks.reduce((sum, task) => sum + Number(task.progress || 0), 0) /
        tasks.length
    );
  }, [tasks]);

  const riskyTasks = useMemo(() => {
    if (!project?.end_date) return [];
    const projectEnd = toLocalDate(project.end_date);

    return tasks.filter((task) => {
      const taskEnd = toLocalDate(task.end_date);
      return taskEnd && projectEnd && taskEnd > projectEnd;
    });
  }, [project, tasks]);

  const criticalPath = useMemo(
    () => calculateCriticalPath(tasks, dependencies),
    [tasks, dependencies]
  );

  const criticalIds = useMemo(
    () => new Set(criticalPath.ids.map(String)),
    [criticalPath]
  );

  const upcomingTasks = useMemo(() => getUpcomingTasks(tasks, 3), [tasks]);

  const workload = useMemo(() => {
    const names = new Map(users.map((user) => [Number(user.id), user.name]));
    const counts = new Map();

    for (const task of tasks) {
      if (!task.assignee_id || effectiveStatus(task) === 'done') continue;
      const name = names.get(Number(task.assignee_id)) || `ID ${task.assignee_id}`;
      counts.set(name, (counts.get(name) || 0) + 1);
    }

    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [tasks, users]);

  const health = useMemo(
    () =>
      getProjectHealth({
        overdueCount: statistics.overdue,
        riskyCount: riskyTasks.length,
        upcomingCount: upcomingTasks.length,
      }),
    [statistics.overdue, riskyTasks.length, upcomingTasks.length]
  );

  const filteredTasks = useMemo(() => {
    const query = filters.query.trim().toLowerCase();

    return tasks.filter((task) => {
      if (query && !String(task.name).toLowerCase().includes(query)) return false;

      if (filters.status !== 'all' && effectiveStatus(task) !== filters.status) {
        return false;
      }

      if (filters.assignee === 'unassigned' && task.assignee_id) return false;
      if (
        filters.assignee !== 'all' &&
        filters.assignee !== 'unassigned' &&
        String(task.assignee_id ?? '') !== filters.assignee
      ) {
        return false;
      }

      if (filters.criticalOnly && !criticalIds.has(String(task.id))) return false;
      return true;
    });
  }, [tasks, filters, criticalIds]);

  const filteredDependencies = useMemo(() => {
    const visible = new Set(filteredTasks.map((task) => String(task.id)));
    return dependencies.filter(
      (dep) =>
        visible.has(String(dep.predecessor_id)) &&
        visible.has(String(dep.successor_id))
    );
  }, [dependencies, filteredTasks]);

  const handleTaskDateChange = async (ganttTask) => {
    try {
      const data = await updateTask(ganttTask.id, {
        start_date: formatDate(ganttTask.start),
        end_date: formatDate(ganttTask.end),
      });
      applyProjectData(data);
    } catch (err) {
      alert(`Не удалось изменить даты: ${err.message}`);
      await loadProject();
    }
  };

  const handleTaskProgressChange = async (ganttTask) => {
    try {
      const data = await updateTask(ganttTask.id, {
        progress: Number(ganttTask.progress),
      });
      applyProjectData(data);
    } catch (err) {
      alert(`Не удалось изменить прогресс: ${err.message}`);
      await loadProject();
    }
  };

  const openCreateTask = () => {
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const openEditTask = (task) => {
    const original =
      tasks.find((item) => String(item.id) === String(task.id)) || task;
    setEditingTask(original);
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (formData) => {
    const { dependencies: selectedDependencies, ...payload } = formData;

    if (editingTask) {
      const data = await updateTask(editingTask.id, payload);
      applyProjectData(data);
      return;
    }

    const created = await createTask({
      project_id: projectId,
      name: payload.name,
      start_date: payload.start_date,
      end_date: payload.end_date,
      assignee_id: payload.assignee_id,
    });

    await updateTask(created.id, {
      status: payload.status,
      progress: payload.progress,
      assignee_id: payload.assignee_id,
    });

    for (const predecessorId of selectedDependencies || []) {
      await linkTasks(predecessorId, created.id);
    }

    await loadProject();
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
      await loadProject();
    } catch (err) {
      throw new Error(
        `Не удалось удалить задачу: ${err.message}. ` +
          'Для удаления backend должен поддерживать DELETE /api/tasks/:id.'
      );
    }
  };

  const handleSaveProject = async (formData) => {
    const created = await createProject(formData);
    setProjectId(created.id);
  };

  const resetFilters = () => {
    setFilters({ query: '', status: 'all', assignee: 'all', criticalOnly: false });
  };

  const exportCsv = () => {
    const userNames = new Map(users.map((user) => [Number(user.id), user.name]));
    const taskNames = new Map(tasks.map((task) => [Number(task.id), task.name]));
    const preds = new Map();

    for (const dep of dependencies) {
      const id = Number(dep.successor_id);
      if (!preds.has(id)) preds.set(id, []);
      preds.get(id).push(taskNames.get(Number(dep.predecessor_id)) || `#${dep.predecessor_id}`);
    }

    const rows = [
      ['Задача', 'Ответственный', 'Начало', 'Конец', 'Статус', 'Прогресс', 'Зависит от'],
      ...filteredTasks.map((task) => [
        task.name,
        task.assignee_id
          ? userNames.get(Number(task.assignee_id)) || `ID ${task.assignee_id}`
          : 'Не назначен',
        String(task.start_date).slice(0, 10),
        String(task.end_date).slice(0, 10),
        effectiveStatus(task),
        `${Number(task.progress || 0)}%`,
        (preds.get(Number(task.id)) || []).join(', '),
      ]),
    ];

    const csv = '\uFEFF' + rows.map((row) => row.map(csvEscape).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `project-${projectId}-tasks.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={{ margin: 0 }}>Проект под контролем</h1>
            <div style={styles.subtle}>
              Планирование задач и контроль сроков с диаграммой Ганта
            </div>
          </div>

          <div style={styles.headerActions}>
            <label style={styles.projectIdLabel}>
              Проект ID
              <input
                style={styles.projectIdInput}
                type="number"
                min="1"
                value={projectId}
                onChange={(event) => setProjectId(Number(event.target.value) || 1)}
              />
            </label>

            <button type="button" onClick={() => loadProject()} style={styles.secondaryButton}>
              Обновить
            </button>
            <button type="button" onClick={() => setProjectModalOpen(true)} style={styles.secondaryButton}>
              + Проект
            </button>
            <button type="button" onClick={openCreateTask} style={styles.primaryButton} disabled={!project}>
              + Задача
            </button>
          </div>
        </header>

        {loading && <div style={styles.card}>Загрузка проекта...</div>}

        {!loading && error && (
          <div style={{ ...styles.card, ...styles.errorCard }}>
            <strong>Не удалось загрузить проект #{projectId}</strong>
            <div style={{ marginTop: 6 }}>{error}</div>
            <div style={{ marginTop: 10 }}>Укажи другой ID или создай новый проект.</div>
          </div>
        )}

        {!loading && project && (
          <>
            <section style={styles.projectCard}>
              <div>
                <h2 style={{ margin: '0 0 6px' }}>{project.name}</h2>
                <div style={styles.subtle}>
                  Срок проекта: {String(project.start_date).slice(0, 10)} →{' '}
                  {String(project.end_date).slice(0, 10)}
                </div>
              </div>
              <div style={styles.progressBadge}>Выполнено: {projectProgress}%</div>
            </section>

            <section style={styles.statsGrid}>
              <StatCard number={statistics.total} label="Всего задач" />
              <StatCard number={statistics.planned} label="К выполнению" />
              <StatCard number={statistics.inProgress} label="В работе" />
              <StatCard number={statistics.done} label="Выполнено" />
              <StatCard number={statistics.overdue} label="Просрочено" danger={statistics.overdue > 0} />
            </section>

            <ProjectInsights
              criticalPath={criticalPath}
              upcomingTasks={upcomingTasks}
              workload={workload}
              health={health}
            />

            <AIProjectAssistant
              project={project}
              tasks={tasks}
              dependencies={dependencies}
              users={users}
              criticalPath={criticalPath}
              projectProgress={projectProgress}
            />

            {riskyTasks.length > 0 && (
              <section style={styles.riskCard}>
                <strong>Есть риск нарушения срока проекта</strong>
                <div style={{ marginTop: 6 }}>
                  {riskyTasks.length === 1
                    ? '1 задача заканчивается позже общего срока проекта.'
                    : `${riskyTasks.length} задач заканчиваются позже общего срока проекта.`}
                </div>
                <div style={{ marginTop: 8 }}>
                  {riskyTasks.map((task) => (
                    <div key={task.id}>
                      • {task.name} — до {String(task.end_date).slice(0, 10)}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <TaskFilters
              filters={filters}
              setFilters={setFilters}
              users={users}
              visibleCount={filteredTasks.length}
              totalCount={tasks.length}
              onReset={resetFilters}
              onExport={exportCsv}
            />

            <GanttChart
              tasks={filteredTasks}
              dependencies={filteredDependencies}
              criticalTaskIds={criticalPath.ids}
              onTaskDateChange={handleTaskDateChange}
              onTaskProgressChange={handleTaskProgressChange}
              onTaskOpen={openEditTask}
            />

            <TaskTable
              tasks={filteredTasks}
              allTasks={tasks}
              users={users}
              dependencies={dependencies}
              criticalTaskIds={criticalPath.ids}
              onTaskOpen={openEditTask}
            />
          </>
        )}
      </div>

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        allTasks={tasks}
        dependencies={dependencies}
        users={users}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSave={handleSaveProject}
      />
    </main>
  );
}

function StatCard({ number, label, danger = false }) {
  return (
    <div style={{ ...styles.statCard, ...(danger ? styles.dangerStatCard : {}) }}>
      <div style={styles.statNumber}>{number}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', padding: 24 },
  container: { maxWidth: 1500, margin: '0 auto' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'center',
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  headerActions: { display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' },
  subtle: { color: '#6b7280', fontSize: 13 },
  projectIdLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  projectIdInput: {
    width: 90,
    padding: '8px 9px',
    border: '1px solid #d1d5db',
    borderRadius: 7,
    background: '#fff',
  },
  primaryButton: {
    padding: '9px 14px',
    background: '#2563eb',
    color: '#fff',
    border: 0,
    borderRadius: 7,
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '9px 14px',
    background: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: 7,
    cursor: 'pointer',
  },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 },
  errorCard: { borderColor: '#fecaca', background: '#fff7f7', color: '#991b1b' },
  projectCard: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'center',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  progressBadge: {
    background: '#eef2ff',
    color: '#3730a3',
    padding: '7px 11px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  statCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 },
  dangerStatCard: { background: '#fff7f7', borderColor: '#fecaca' },
  statNumber: { fontSize: 27, fontWeight: 800, marginBottom: 4 },
  statLabel: { color: '#6b7280', fontSize: 13 },
  riskCard: {
    background: '#fff7f7',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
};

export default App;
