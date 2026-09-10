# Gantt frontend

Готовый React-фронтенд для backend:
`https://gantt-backend-tt9m.onrender.com`

## Запуск

Открой терминал в этой папке и выполни:

```powershell
npm install
npm start
```

Если порт 3000 занят, React предложит другой порт — соглашайся.

## Что подключено

- GET `/api/projects/:id`
- POST `/api/projects`
- POST `/api/tasks`
- PUT `/api/tasks/:id`
- POST `/api/tasks/link`
- Диаграмма Gantt
- Перетаскивание дат с каскадным сдвигом на backend
- Изменение прогресса
- Создание/редактирование задач
- Создание проекта
- Создание зависимостей при создании задачи

## Ограничение backend

В текущем backend нет DELETE для задач и нет удаления существующей зависимости, поэтому эти действия во frontend специально не добавлены.
