const BASE_URL = 'https://gantt-backend-tt9m.onrender.com/api';

export async function analyzeProjectWithAI({ question, context }) {
  const response = await fetch(`${BASE_URL}/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, context }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      `AI-сервис временно недоступен (${response.status})`
    );
  }

  if (!data.answer) {
    throw new Error('AI-сервис вернул пустой ответ');
  }

  return data.answer;
}
