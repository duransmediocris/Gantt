const BASE_URL = 'https://gantt-backend-tt9m.onrender.com/api';

async function request(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.message || `Ошибка запроса: ${res.status}`);
  }

  return data;
}

export const getProjects = () => request(`${BASE_URL}/projects`);
export const getProject = (projectId) => request(`${BASE_URL}/projects/${projectId}`);

export const createProject = (projectData) =>
  request(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projectData),
  });

export const updateProject = (projectId, projectData) =>
  request(`${BASE_URL}/projects/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projectData),
  });

export const deleteProject = (projectId) =>
  request(`${BASE_URL}/projects/${projectId}`, { method: 'DELETE' });

export const getUsers = () => request(`${BASE_URL}/users`);

export const createUser = (name) =>
  request(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

export const deleteUser = (userId) =>
  request(`${BASE_URL}/users/${userId}`, { method: 'DELETE' });

export const replaceTaskDependencies = (taskId, predecessorIds) =>
  request(`${BASE_URL}/tasks/${taskId}/dependencies`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ predecessor_ids: predecessorIds.map(Number) }),
  });

export const createTask = (taskData) =>
  request(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData),
  });

export const updateTask = (taskId, taskData) =>
  request(`${BASE_URL}/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData),
  });

export const deleteTask = (taskId) =>
  request(`${BASE_URL}/tasks/${taskId}`, { method: 'DELETE' });

export const linkTasks = (predecessorId, successorId) =>
  request(`${BASE_URL}/tasks/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      predecessor_id: Number(predecessorId),
      successor_id: Number(successorId),
    }),
  });
