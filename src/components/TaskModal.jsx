import React, { useEffect, useMemo, useRef, useState } from 'react';

const STATUSES = [
  { value: 'planned', label: 'К выполнению' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Выполнено' },
];

function dateValue(value) {
  return value ? String(value).slice(0, 10) : '';
}

function progressStorageKey(taskId) {
  return taskId ? `deti_indigo:last_progress:${taskId}` : null;
}

function readStoredProgress(taskId) {
  const key = progressStorageKey(taskId);
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.min(99, Math.max(0, value)) : null;
  } catch {
    return null;
  }
}

function storeProgress(taskId, progress) {
  const key = progressStorageKey(taskId);
  if (!key) return;
  try {
    window.localStorage.setItem(key, String(Math.min(99, Math.max(0, Number(progress) || 0))));
  } catch {
    // localStorage может быть недоступен в приватном режиме; форма всё равно продолжит работать.
  }
}

export function TaskModal({
  isOpen,
  onClose,
  task = null,
  allTasks = [],
  dependencies = [],
  users = [],
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState({
    name: '', start_date: '', end_date: '', assignee_id: '', status: 'planned', progress: 0, dependencies: [], comments: '',
  });
  const [progressBeforeDone, setProgressBeforeDone] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [dependencyQuery, setDependencyQuery] = useState('');

  const initializedRef = useRef({ open: false, taskKey: null });

  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = { open: false, taskKey: null };
      return;
    }

    const taskKey = task ? String(task.id) : 'new';

    // Автосинхронизация может обновить tasks/dependencies, пока модалка открыта.
    // Не переинициализируем форму повторно, иначе введённые пользователем данные сотрутся.
    if (initializedRef.current.open && initializedRef.current.taskKey === taskKey) return;

    const storedProgress = task ? readStoredProgress(task.id) : null;
    const currentProgress = Number(task?.progress ?? 0);
    const lastNonDoneProgress = task?.status === 'done'
      ? (storedProgress ?? 0)
      : Math.min(99, Math.max(0, currentProgress));

    setProgressBeforeDone(lastNonDoneProgress);

    if (task && task.status !== 'done') {
      storeProgress(task.id, currentProgress);
    }

    setForm(task ? {
      name: task.name || '',
      start_date: dateValue(task.start_date),
      end_date: dateValue(task.end_date),
      assignee_id: task.assignee_id ?? '',
      status: task.status || 'planned',
      progress: currentProgress,
      comments: task.comments || '',
      dependencies: dependencies
        .filter((dep) => Number(dep.successor_id) === Number(task.id))
        .map((dep) => String(dep.predecessor_id)),
    } : {
      name: '', start_date: '', end_date: '', assignee_id: '', status: 'planned', progress: 0, dependencies: [], comments: '',
    });

    setDependencyQuery('');
    setError(null);
    setSaving(false);
    setDeleting(false);
    initializedRef.current = { open: true, taskKey };
  }, [isOpen, task, dependencies]);

  const candidates = useMemo(() => {
    const query = dependencyQuery.trim().toLowerCase();
    return allTasks.filter((candidate) => {
      if (task && String(candidate.id) === String(task.id)) return false;
      return !query || String(candidate.name).toLowerCase().includes(query);
    });
  }, [allTasks, task, dependencyQuery]);

  if (!isOpen) return null;

  const setField = (field, value) => {
    if (field === 'status') {
      setForm((prev) => {
        if (value === 'done' && prev.status !== 'done') {
          const previousProgress = Math.min(99, Math.max(0, Number(prev.progress) || 0));
          setProgressBeforeDone(previousProgress);
          if (task?.id) storeProgress(task.id, previousProgress);
          return { ...prev, status: 'done', progress: 100 };
        }

        if (prev.status === 'done' && value !== 'done') {
          const restored = Math.min(99, Math.max(0, Number(progressBeforeDone) || 0));
          if (task?.id) storeProgress(task.id, restored);
          return { ...prev, status: value, progress: restored };
        }

        return { ...prev, status: value };
      });
      return;
    }

    if (field === 'progress') {
      const progress = Math.min(100, Math.max(0, Number(value) || 0));

      setForm((prev) => {
        if (progress >= 100 && prev.status !== 'done') {
          const previousProgress = Math.min(99, Math.max(0, Number(prev.progress) || 0));
          setProgressBeforeDone(previousProgress);
          if (task?.id) storeProgress(task.id, previousProgress);
          return { ...prev, progress: 100, status: 'done' };
        }

        return { ...prev, progress };
      });

      if (progress < 100) {
        setProgressBeforeDone(progress);
        if (task?.id) storeProgress(task.id, progress);
      }
      return;
    }

    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleDependency = (id) => {
    setForm((prev) => {
      const value = String(id);
      const exists = prev.dependencies.includes(value);
      return {
        ...prev,
        dependencies: exists
          ? prev.dependencies.filter((item) => item !== value)
          : [...prev.dependencies, value],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!form.name.trim()) throw new Error('Введите название задачи');
      if (!form.start_date || !form.end_date) throw new Error('Укажите даты задачи');
      if (new Date(form.end_date) < new Date(form.start_date)) throw new Error('Дата окончания не может быть раньше даты начала');

      const progress = form.status === 'done' ? 100 : Number(form.progress);
      if (task?.id && form.status !== 'done') storeProgress(task.id, progress);

      await onSave({
        name: form.name.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        assignee_id: form.assignee_id === '' ? null : Number(form.assignee_id),
        status: form.status,
        progress,
        dependencies: form.dependencies,
        comments: form.comments.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;
    if (!window.confirm(`Удалить задачу «${task.name}»?`)) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(task.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={saving || deleting ? undefined : onClose}>
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.titleRow}>
          <h2 style={{ margin: 0 }}>{task ? 'Редактировать задачу' : 'Новая задача'}</h2>
          <button type="button" onClick={onClose} disabled={saving || deleting} style={styles.closeButton}>×</button>
        </div>
        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Название *
            <input style={styles.input} required value={form.name} onChange={(e) => setField('name', e.target.value)} />
          </label>

          <div style={styles.row}>
            <label style={styles.label}>Начало *
              <input style={styles.input} type="date" required value={form.start_date} onChange={(e) => setField('start_date', e.target.value)} />
            </label>
            <label style={styles.label}>Конец *
              <input style={styles.input} type="date" required value={form.end_date} onChange={(e) => setField('end_date', e.target.value)} />
            </label>
          </div>

          <div style={styles.row}>
            <label style={styles.label}>Ответственный
              <select style={styles.input} value={form.assignee_id} onChange={(e) => setField('assignee_id', e.target.value)}>
                <option value="">Не назначен</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
            <label style={styles.label}>Статус
              <select style={styles.input} value={form.status} onChange={(e) => setField('status', e.target.value)}>
                {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </label>
          </div>

          <label style={styles.label}>Прогресс: {form.progress}%
            <input
              style={styles.range}
              type="range" min="0" max="100" value={form.progress}
              disabled={form.status === 'done'}
              onChange={(e) => setField('progress', Number(e.target.value))}
            />
          </label>

          {form.status === 'done' && (
            <div style={styles.progressHint}>
              При возврате задачи в работу прогресс восстановится до {progressBeforeDone}%.
            </div>
          )}

          <label style={styles.label}>Комментарий
            <textarea
              style={{ ...styles.input, minHeight: 84, resize: 'vertical' }}
              value={form.comments}
              onChange={(e) => setField('comments', e.target.value)}
              placeholder="Контекст, договорённости, результат задачи..."
            />
          </label>

          <div style={styles.label}>Зависит от задач</div>
          <div style={styles.dependencyBox}>
            <input
              style={styles.input}
              value={dependencyQuery}
              onChange={(e) => setDependencyQuery(e.target.value)}
              placeholder="Найти задачу..."
            />
            <div style={styles.dependencyList}>
              {candidates.length ? candidates.map((candidate) => {
                const checked = form.dependencies.includes(String(candidate.id));
                return (
                  <label key={candidate.id} style={{ ...styles.dependencyItem, ...(checked ? styles.dependencyItemActive : {}) }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleDependency(candidate.id)} />
                    <span>{candidate.name}</span>
                  </label>
                );
              }) : <div style={styles.emptyDeps}>Подходящих задач нет.</div>}
            </div>
          </div>
          <div style={styles.depHint}>Можно выбрать несколько задач и снять любую зависимость одним кликом.</div>

          <div style={styles.actions}>
            <div>{task && <button type="button" onClick={handleDelete} disabled={deleting || saving} style={styles.deleteButton}>{deleting ? 'Удаление...' : 'Удалить'}</button>}</div>
            <div style={styles.rightActions}>
              <button type="button" onClick={onClose} disabled={saving || deleting} style={styles.secondaryButton}>Отмена</button>
              <button type="submit" disabled={saving || deleting} style={styles.primaryButton}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.58)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, zIndex: 1000 },
  modal: { width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 24px 80px rgba(15,23,42,.24)', border: '1px solid #e2e8f0' },
  titleRow: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 20 },
  closeButton: { border: 0, background: '#f1f5f9', width: 34, height: 34, borderRadius: 10, fontSize: 24, cursor: 'pointer', lineHeight: 1 },
  label: { display: 'block', marginBottom: 15, fontSize: 13, fontWeight: 700, flex: 1, color: '#334155' },
  input: { width: '100%', marginTop: 7, padding: '10px 11px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', outline: 'none' },
  range: { width: '100%', marginTop: 10, accentColor: '#2563eb' },
  row: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  error: { padding: 11, marginBottom: 14, borderRadius: 10, background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c' },
  progressHint: { marginTop: -7, marginBottom: 15, padding: '8px 10px', borderRadius: 9, background: '#f8fafc', color: '#64748b', fontSize: 12 },
  dependencyBox: { border: '1px solid #dbe3ee', borderRadius: 12, padding: 10, background: '#f8fafc' },
  dependencyList: { display: 'grid', gap: 7, maxHeight: 190, overflowY: 'auto', marginTop: 8 },
  dependencyItem: { display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', border: '1px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', fontSize: 13 },
  dependencyItemActive: { borderColor: '#93c5fd', background: '#eff6ff' },
  emptyDeps: { color: '#64748b', fontSize: 13, padding: 8 },
  depHint: { color: '#64748b', fontSize: 12, marginTop: 7, marginBottom: 14 },
  actions: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 20 },
  rightActions: { display: 'flex', gap: 8 },
  primaryButton: { padding: '10px 16px', border: 0, borderRadius: 10, background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 5px 15px rgba(37,99,235,.2)' },
  secondaryButton: { padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', cursor: 'pointer' },
  deleteButton: { padding: '10px 16px', border: '1px solid #fecdd3', borderRadius: 10, background: '#fff1f2', color: '#be123c', cursor: 'pointer' },
};
