import React, { useCallback, useEffect, useMemo, useState } from 'react';
import GanttChart from './GanttChart';
import { TaskModal } from './components/TaskModal';
import { ProjectModal } from './components/ProjectModal';
import { TeamModal } from './components/TeamModal';
import { TaskTable } from './components/TaskTable';
import { TaskFilters } from './components/TaskFilters';
import { ProjectInsights } from './components/ProjectInsights';
import AIProjectAssistant from './components/AIProjectAssistant';
import {
  calculateCriticalPath,
  effectiveStatus,
  getProjectHealth,
  getProjectRiskAnalysis,
  getUpcomingTasks,
  isTaskOverdue,
  toLocalDate,
} from './utils/projectAnalytics';
import {
  createProject,
  createTask,
  createUser,
  deleteProject,
  deleteTask,
  deleteUser,
  getProject,
  getProjects,
  getUsers,
  linkTasks,
  replaceTaskDependencies,
  updateProject,
  updateTask,
} from './api/tasksApi';

const PROJECT_STATUS_LABELS = {
  planned: 'Планируется',
  in_progress: 'В работе',
  paused: 'На паузе',
  done: 'Завершён',
};

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
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [filters, setFilters] = useState({ query: '', status: 'all', assignee: 'all', criticalOnly: false });

  const applyProjectData = useCallback((data) => {
    setProject(data.project || null);
    setTasks(data.tasks || []);
    setDependencies(data.dependencies || []);
    setLastSync(new Date());
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const list = await getProjects();
      const normalized = Array.isArray(list) ? list : [];
      setProjects(normalized);
      return normalized;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  const loadProject = useCallback(async (id = projectId, { silent = false } = {}) => {
    if (!id) {
      setProject(null);
      setTasks([]);
      setDependencies([]);
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await getProject(id);
      applyProjectData(data);
    } catch (err) {
      if (!silent) {
        setProject(null);
        setTasks([]);
        setDependencies([]);
        setError(err.message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [projectId, applyProjectData]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('Пользователи недоступны:', err.message);
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const list = await loadProjects();
      await loadUsers();
      if (list.length) setProjectId(String(list[0].id));
      else setLoading(false);
    })();
  }, [loadProjects, loadUsers]);

  useEffect(() => {
    if (projectId) loadProject(projectId);
  }, [projectId, loadProject]);

  // Базовая совместная работа: изменения других пользователей подтягиваются автоматически.
  useEffect(() => {
    if (!projectId) return undefined;
    const timer = setInterval(() => loadProject(projectId, { silent: true }), 20000);
    return () => clearInterval(timer);
  }, [projectId, loadProject]);

  const overdueTasks = useMemo(() => tasks.filter(isTaskOverdue), [tasks]);

  const statistics = useMemo(() => {
    const result = { total: tasks.length, planned: 0, inProgress: 0, done: 0, overdue: overdueTasks.length };
    for (const task of tasks) {
      const status = effectiveStatus(task);
      if (status === 'done') result.done += 1;
      else if (status === 'in_progress') result.inProgress += 1;
      else result.planned += 1;
    }
    return result;
  }, [tasks, overdueTasks.length]);

  const projectProgress = useMemo(() => {
    if (!tasks.length) return 0;
    return Math.round(tasks.reduce((sum, task) => sum + Number(task.progress || 0), 0) / tasks.length);
  }, [tasks]);

  const riskyTasks = useMemo(() => {
    if (!project?.end_date) return [];
    const projectEnd = toLocalDate(project.end_date);
    return tasks.filter((task) => effectiveStatus(task) !== 'done' && toLocalDate(task.end_date) > projectEnd);
  }, [project, tasks]);

  const criticalPath = useMemo(() => calculateCriticalPath(tasks, dependencies), [tasks, dependencies]);
  const criticalIds = useMemo(() => new Set(criticalPath.ids.map(String)), [criticalPath]);
  const upcomingTasks = useMemo(() => getUpcomingTasks(tasks, 3), [tasks]);

  const workload = useMemo(() => {
    const names = new Map(users.map((user) => [Number(user.id), user.name]));
    const counts = new Map(users.map((user) => [user.name, 0]));
    for (const task of tasks) {
      if (!task.assignee_id || effectiveStatus(task) === 'done') continue;
      const name = names.get(Number(task.assignee_id)) || `ID ${task.assignee_id}`;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [tasks, users]);

  const health = useMemo(() => getProjectHealth({
    overdueCount: overdueTasks.length,
    riskyCount: riskyTasks.length,
    upcomingCount: upcomingTasks.length,
  }), [overdueTasks.length, riskyTasks.length, upcomingTasks.length]);

  const riskItems = useMemo(() => getProjectRiskAnalysis({ project, tasks, criticalPath }), [project, tasks, criticalPath]);

  const filteredTasks = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return tasks.filter((task) => {
      const searchable = `${task.name || ''} ${task.comments || ''}`.toLowerCase();
      if (query && !searchable.includes(query)) return false;
      if (filters.status === 'overdue') {
        if (!isTaskOverdue(task)) return false;
      } else if (filters.status !== 'all' && effectiveStatus(task) !== filters.status) {
        return false;
      }
      if (filters.assignee === 'unassigned' && task.assignee_id) return false;
      if (filters.assignee !== 'all' && filters.assignee !== 'unassigned' && String(task.assignee_id ?? '') !== filters.assignee) return false;
      if (filters.criticalOnly && !criticalIds.has(String(task.id))) return false;
      return true;
    });
  }, [tasks, filters, criticalIds]);

  const filteredDependencies = useMemo(() => {
    const visible = new Set(filteredTasks.map((task) => String(task.id)));
    return dependencies.filter((dep) => visible.has(String(dep.predecessor_id)) && visible.has(String(dep.successor_id)));
  }, [dependencies, filteredTasks]);

  const handleTaskDateChange = async (ganttTask) => {
    try {
      const data = await updateTask(ganttTask.id, { start_date: formatDate(ganttTask.start), end_date: formatDate(ganttTask.end) });
      applyProjectData(data);
    } catch (err) {
      alert(`Не удалось изменить даты: ${err.message}`);
      await loadProject();
    }
  };

  const handleTaskProgressChange = async (ganttTask) => {
    try {
      const data = await updateTask(ganttTask.id, { progress: Number(ganttTask.progress) });
      applyProjectData(data);
    } catch (err) {
      alert(`Не удалось изменить прогресс: ${err.message}`);
      await loadProject();
    }
  };

  const openCreateTask = () => { setEditingTask(null); setTaskModalOpen(true); };
  const openEditTask = (task) => {
    const original = tasks.find((item) => String(item.id) === String(task.id)) || task;
    setEditingTask(original);
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (formData) => {
    const { dependencies: selectedDependencies, ...payload } = formData;

    if (editingTask) {
      await updateTask(editingTask.id, payload);
      await replaceTaskDependencies(editingTask.id, selectedDependencies || []);
      await loadProject();
      return;
    }

    const created = await createTask({ project_id: Number(projectId), ...payload });
    for (const predecessorId of selectedDependencies || []) await linkTasks(predecessorId, created.id);
    await loadProject();
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
      await loadProject();
    } catch (err) {
      throw new Error(`Не удалось удалить задачу: ${err.message}`);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (!window.confirm(`Удалить проект «${project.name}» вместе со всеми его задачами?`)) return;

    try {
      await deleteProject(project.id);
      const list = await loadProjects();
      setProject(null);
      setTasks([]);
      setDependencies([]);
      setProjectId(list.length ? String(list[0].id) : '');
    } catch (err) {
      alert(`Не удалось удалить проект: ${err.message}`);
    }
  };

  const handleSaveProject = async (formData) => {
    if (editingProject && project) {
      const data = await updateProject(project.id, formData);
      applyProjectData(data);
      setEditingProject(false);
      await loadProjects();
      return;
    }

    const created = await createProject(formData);
    await loadProjects();
    setProjectId(String(created.id));
  };

  const handleCreateUser = async (name) => {
    await createUser(name);
    await loadUsers();
  };

  const handleDeleteUser = async (id) => {
    await deleteUser(id);
    await Promise.all([loadUsers(), loadProject(projectId, { silent: true })]);
  };

  const resetFilters = () => setFilters({ query: '', status: 'all', assignee: 'all', criticalOnly: false });

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
      ['Задача', 'Ответственный', 'Начало', 'Конец', 'Статус', 'Просрочено', 'Прогресс', 'Зависит от', 'Комментарий'],
      ...filteredTasks.map((task) => [
        task.name,
        task.assignee_id ? userNames.get(Number(task.assignee_id)) || `ID ${task.assignee_id}` : 'Не назначен',
        String(task.start_date).slice(0, 10),
        String(task.end_date).slice(0, 10),
        effectiveStatus(task),
        isTaskOverdue(task) ? 'Да' : 'Нет',
        `${Number(task.progress || 0)}%`,
        (preds.get(Number(task.id)) || []).join(', '),
        task.comments || '',
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
            <div style={styles.brand}>DETI_INDIGO</div>
            <h1 style={styles.h1}>Управление проектами</h1>
            <div style={styles.headerSub}>План, зависимости, риски и контроль сроков в одном месте.</div>
          </div>

          <div style={styles.headerActions}>
            <label style={styles.projectSelectLabel}>
              <span>Текущий проект</span>
              <select style={styles.projectSelect} value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                {!projects.length && <option value="">Проектов пока нет</option>}
                {projects.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => loadProject()} style={styles.secondaryButton} disabled={!projectId}>Обновить</button>
            <button type="button" onClick={() => setTeamModalOpen(true)} style={styles.secondaryButton}>Команда</button>
            <button type="button" onClick={() => { setEditingProject(false); setProjectModalOpen(true); }} style={styles.secondaryButton}>+ Проект</button>
            <button type="button" onClick={openCreateTask} style={styles.primaryButton} disabled={!project}>+ Задача</button>
          </div>
        </header>

        {lastSync && project && <div style={styles.syncLine}>Автосинхронизация включена · последнее обновление {lastSync.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>}

        {loading && <div style={styles.card}>Загрузка проекта...</div>}

        {!loading && error && <div style={{ ...styles.card, ...styles.errorCard }}><strong>Не удалось загрузить данные</strong><div style={{ marginTop: 6 }}>{error}</div></div>}

        {!loading && !project && !error && (
          <section style={styles.emptyState}>
            <h2 style={{ marginTop: 0 }}>Создай первый проект</h2>
            <div style={styles.subtle}>После создания здесь появятся задачи, диаграмма Ганта и аналитика.</div>
            <button type="button" style={{ ...styles.primaryButton, marginTop: 16 }} onClick={() => setProjectModalOpen(true)}>+ Создать проект</button>
          </section>
        )}

        {!loading && project && (
          <>
            <section style={styles.projectCard}>
              <div>
                <div style={styles.projectTitleRow}>
                  <h2 style={{ margin: 0 }}>{project.name}</h2>
                  <span style={{ ...styles.projectStatus, ...styles[`project_${project.status || 'planned'}`] }}>{PROJECT_STATUS_LABELS[project.status || 'planned']}</span>
                </div>
                <div style={styles.subtle}>Срок проекта: {String(project.start_date).slice(0, 10)} → {String(project.end_date).slice(0, 10)}</div>
              </div>
              <div style={styles.projectActions}>
                <button type="button" style={styles.secondaryButton} onClick={() => { setEditingProject(true); setProjectModalOpen(true); }}>Изменить проект</button>
                <button type="button" style={styles.dangerButton} onClick={handleDeleteProject}>Удалить проект</button>
                <div style={styles.progressBadge}>Выполнено: {projectProgress}%</div>
              </div>
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
              overdueTasks={overdueTasks}
              workload={workload}
              health={health}
              riskItems={riskItems}
            />

            <AIProjectAssistant project={project} tasks={tasks} dependencies={dependencies} users={users} criticalPath={criticalPath} projectProgress={projectProgress} />

            <TaskFilters filters={filters} setFilters={setFilters} users={users} visibleCount={filteredTasks.length} totalCount={tasks.length} onReset={resetFilters} onExport={exportCsv} />

            <GanttChart tasks={filteredTasks} dependencies={filteredDependencies} criticalTaskIds={criticalPath.ids} onTaskDateChange={handleTaskDateChange} onTaskProgressChange={handleTaskProgressChange} onTaskOpen={openEditTask} />

            <TaskTable tasks={filteredTasks} allTasks={tasks} users={users} dependencies={dependencies} criticalTaskIds={criticalPath.ids} onTaskOpen={openEditTask} />
          </>
        )}
      </div>

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setEditingTask(null); }}
        task={editingTask}
        allTasks={tasks}
        dependencies={dependencies}
        users={users}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => { setProjectModalOpen(false); setEditingProject(false); }}
        onSave={handleSaveProject}
        project={editingProject ? project : null}
      />

      <TeamModal isOpen={teamModalOpen} onClose={() => setTeamModalOpen(false)} users={users} onCreateUser={handleCreateUser} onDeleteUser={handleDeleteUser} />
    </main>
  );
}

function StatCard({ number, label, danger = false }) {
  return (
    <article style={{ ...styles.statCard, ...(danger ? styles.statCardDanger : {}) }}>
      <div style={{ ...styles.statNumber, ...(danger ? styles.statNumberDanger : {}) }}>{number}</div>
      <div style={styles.statLabel}>{label}</div>
    </article>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f4f7fb', padding: '26px 18px 44px', color: '#0f172a' },
  container: { width: '100%', maxWidth: 1500, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 },
  brand: { fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: '#4f46e5', marginBottom: 5 },
  h1: { margin: 0, fontSize: 30, letterSpacing: '-.02em' },
  headerSub: { color: '#64748b', marginTop: 5, fontSize: 13 },
  headerActions: { display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' },
  projectSelectLabel: { display: 'grid', gap: 5, fontSize: 11, color: '#64748b', minWidth: 240 },
  projectSelect: { padding: '9px 34px 9px 11px', border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', color: '#0f172a', fontWeight: 650 },
  syncLine: { textAlign: 'right', color: '#64748b', fontSize: 11, marginBottom: 12 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18 },
  errorCard: { background: '#fff7ed', borderColor: '#fed7aa', color: '#9a3412' },
  emptyState: { background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 18, padding: 34, textAlign: 'center', marginTop: 26 },
  projectCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, marginBottom: 14, boxShadow: '0 8px 26px rgba(15,23,42,.04)' },
  projectTitleRow: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 7 },
  projectActions: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  projectStatus: { padding: '4px 9px', borderRadius: 999, fontSize: 12, fontWeight: 800 },
  project_planned: { background: '#e2e8f0', color: '#334155' },
  project_in_progress: { background: '#dbeafe', color: '#1d4ed8' },
  project_paused: { background: '#fef3c7', color: '#92400e' },
  project_done: { background: '#dcfce7', color: '#166534' },
  subtle: { color: '#64748b', fontSize: 13 },
  progressBadge: { padding: '9px 12px', borderRadius: 10, background: '#eef2ff', color: '#4338ca', fontWeight: 800, fontSize: 13 },
  primaryButton: { padding: '9px 14px', background: '#2563eb', color: '#fff', border: '1px solid #2563eb', borderRadius: 9, cursor: 'pointer', fontWeight: 750 },
  secondaryButton: { padding: '9px 14px', background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 9, cursor: 'pointer', fontWeight: 650 },
  dangerButton: { padding: '9px 14px', background: '#fff', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 9, cursor: 'pointer', fontWeight: 700 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(125px, 1fr))', gap: 10, marginBottom: 14 },
  statCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 16px', boxShadow: '0 6px 18px rgba(15,23,42,.03)' },
  statCardDanger: { background: '#fff7f7', borderColor: '#fecaca' },
  statNumber: { fontSize: 25, fontWeight: 850, lineHeight: 1 },
  statNumberDanger: { color: '#b91c1c' },
  statLabel: { color: '#64748b', fontSize: 12, marginTop: 6 },
};

export default App;
