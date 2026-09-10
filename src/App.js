import React, { useCallback, useEffect, useState } from 'react';
import GanttChart from './GanttChart';
import { TaskModal } from './components/TaskModal';
import { ProjectModal } from './components/ProjectModal';
import { createProject, createTask, getProject, linkTasks, updateTask } from './api/tasksApi';

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function App() {
  const [projectId, setProjectId] = useState(1);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const applyProjectData = useCallback((data) => {
    setProject(data.project || null);
    setTasks(data.tasks || []);
    setDependencies(data.dependencies || []);
  }, []);

  const loadProject = useCallback(async (id = projectId) => {
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
  }, [projectId, applyProjectData]);

  useEffect(() => {
    loadProject(projectId);
  }, [projectId, loadProject]);

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
      const data = await updateTask(ganttTask.id, { progress: Number(ganttTask.progress) });
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
    const original = tasks.find((t) => String(t.id) === String(task.id)) || task;
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

    // POST /api/tasks backend сохраняет базовые поля. Статус/прогресс дописываем через PUT.
    if (payload.status !== 'todo' || payload.progress !== 0) {
      await updateTask(created.id, {
        status: payload.status,
        progress: payload.progress,
        assignee_id: payload.assignee_id,
      });
    }

    for (const predecessorId of selectedDependencies || []) {
      await linkTasks(predecessorId, created.id);
    }

    await loadProject();
  };

  const handleSaveProject = async (formData) => {
    const created = await createProject(formData);
    setProjectId(created.id);
  };

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={{ margin: 0 }}>Проект под контролем</h1>
            <div style={styles.subtle}>Frontend подключён к Render backend</div>
          </div>
          <div style={styles.headerActions}>
            <label style={styles.projectIdLabel}>Проект ID
              <input
                style={styles.projectIdInput}
                type="number"
                min="1"
                value={projectId}
                onChange={(e) => setProjectId(Number(e.target.value) || 1)}
              />
            </label>
            <button onClick={() => loadProject()} style={styles.secondaryButton}>Обновить</button>
            <button onClick={() => setProjectModalOpen(true)} style={styles.secondaryButton}>+ Проект</button>
            <button onClick={openCreateTask} style={styles.primaryButton} disabled={!project}>+ Задача</button>
          </div>
        </div>

        {loading && <div style={styles.card}>Загрузка проекта...</div>}

        {!loading && error && (
          <div style={{ ...styles.card, ...styles.errorCard }}>
            <b>Не удалось загрузить проект #{projectId}</b>
            <div style={{ marginTop: 6 }}>{error}</div>
            <div style={{ marginTop: 10 }}>Можно указать другой ID или создать новый проект.</div>
          </div>
        )}

        {!loading && project && (
          <>
            <div style={styles.projectCard}>
              <div>
                <h2 style={{ margin: '0 0 6px' }}>{project.name}</h2>
                <div style={styles.subtle}>{String(project.start_date).slice(0, 10)} → {String(project.end_date).slice(0, 10)}</div>
              </div>
              <div style={styles.badge}>Задач: {tasks.length}</div>
            </div>

            <GanttChart
              tasks={tasks}
              dependencies={dependencies}
              onTaskDateChange={handleTaskDateChange}
              onTaskProgressChange={handleTaskProgressChange}
              onTaskOpen={openEditTask}
            />

            <div style={{ ...styles.card, marginTop: 16 }}>
              <b>Подсказка:</b> перетаскивай задачи на диаграмме — backend пересчитает каскадный сдвиг зависимых задач. Двойной клик по задаче открывает редактирование.
            </div>
          </>
        )}
      </div>

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setEditingTask(null); }}
        task={editingTask}
        allTasks={tasks}
        dependencies={dependencies}
        onSave={handleSaveTask}
      />

      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSave={handleSaveProject}
      />
    </main>
  );
}

const styles = {
  page: { minHeight: '100vh', padding: 24 },
  container: { maxWidth: 1500, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' },
  headerActions: { display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' },
  subtle: { color: '#6b7280', fontSize: 13 },
  projectIdLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#6b7280' },
  projectIdInput: { width: 90, padding: '8px 9px', border: '1px solid #d1d5db', borderRadius: 6 },
  primaryButton: { padding: '9px 14px', background: '#2563eb', color: '#fff', border: 0, borderRadius: 6 },
  secondaryButton: { padding: '9px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 },
  errorCard: { borderColor: '#fecaca', background: '#fff7f7', color: '#991b1b' },
  projectCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 14 },
  badge: { background: '#eef2ff', padding: '6px 10px', borderRadius: 999, fontSize: 13 },
};

export default App;
