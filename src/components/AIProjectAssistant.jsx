import React, { useMemo, useState } from 'react';
import { analyzeProjectWithAI } from '../api/aiApi';
import { buildAIProjectContext } from '../utils/aiContext';

const QUICK_QUESTIONS = [
  'Какие риски есть прямо сейчас?',
  'Что делать в первую очередь?',
  'Какие задачи сильнее всего влияют на срок проекта?',
];

export default function AIProjectAssistant({ project, tasks, dependencies, users, criticalPath, projectProgress }) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const context = useMemo(() => buildAIProjectContext({ project, tasks, dependencies, users, criticalPath, projectProgress }), [project, tasks, dependencies, users, criticalPath, projectProgress]);

  const ask = async (value) => {
    const finalQuestion = String(value || question).trim();
    if (!finalQuestion) return setError('Напиши вопрос о проекте.');
    if (!tasks?.length) return setError('Сначала добавь хотя бы одну задачу.');

    setLoading(true);
    setError('');
    try {
      const result = await analyzeProjectWithAI({ question: finalQuestion, context, projectId: project?.id });
      setAnswer(result);
      setQuestion(finalQuestion);
    } catch (err) {
      setError(err.message || 'Не удалось получить ответ AI.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>✨ AI-АССИСТЕНТ</div>
          <h2 style={styles.title}>Анализ проекта</h2>
          <div style={styles.subtle}>AI использует свежие данные проекта с backend: сроки, просрочки, зависимости и критический путь.</div>
        </div>
        <button type="button" onClick={() => setIsOpen((value) => !value)} style={styles.primaryButton}>{isOpen ? 'Скрыть' : 'Открыть AI'}</button>
      </div>

      {isOpen && (
        <div style={styles.body}>
          <div style={styles.quickRow}>
            {QUICK_QUESTIONS.map((item) => <button key={item} type="button" disabled={loading} onClick={() => ask(item)} style={styles.quickButton}>{item}</button>)}
          </div>
          <div style={styles.askRow}>
            <input value={question} disabled={loading} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') ask(question); }} placeholder="Например: из-за чего мы можем не успеть к дедлайну?" style={styles.input} />
            <button type="button" disabled={loading} onClick={() => ask(question)} style={{ ...styles.askButton, opacity: loading ? .65 : 1 }}>{loading ? 'Анализ...' : 'Спросить'}</button>
          </div>
          {error && <div style={styles.error}>{error}</div>}
          {answer && <div style={styles.answer}><div style={styles.answerTitle}>Ответ AI</div><div style={styles.answerText}>{answer}</div></div>}
        </div>
      )}
    </section>
  );
}

const styles = {
  wrapper: { background: '#fff', border: '1px solid #dbe3ee', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 8px 30px rgba(24,39,75,.05)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  eyebrow: { fontSize: 12, fontWeight: 800, letterSpacing: 1, color: '#6366f1', marginBottom: 6 },
  title: { margin: 0, fontSize: 22 },
  subtle: { color: '#64748b', fontSize: 12, marginTop: 5, maxWidth: 680 },
  primaryButton: { border: 0, borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontWeight: 700, background: '#111827', color: '#fff' },
  body: { marginTop: 18, borderTop: '1px solid #eef0f4', paddingTop: 18 },
  quickRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  quickButton: { border: '1px solid #dfe3ea', background: '#f8fafc', borderRadius: 999, padding: '8px 12px', cursor: 'pointer', fontSize: 13 },
  askRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  input: { flex: '1 1 360px', minWidth: 0, border: '1px solid #d8dde6', borderRadius: 10, padding: '11px 12px', fontSize: 14 },
  askButton: { border: 0, borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontWeight: 700, background: '#2563eb', color: '#fff' },
  error: { marginTop: 12, padding: 12, borderRadius: 10, background: '#fff7ed', color: '#9a3412', fontSize: 14 },
  answer: { marginTop: 14, padding: 16, borderRadius: 12, background: '#f8fafc', border: '1px solid #e5e7eb' },
  answerTitle: { fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .7, marginBottom: 8, color: '#475569' },
  answerText: { whiteSpace: 'pre-wrap', lineHeight: 1.55, color: '#111827' },
};
