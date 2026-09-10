import React from 'react';

export function ProjectInsights({
  criticalPath,
  upcomingTasks,
  workload,
  health,
}) {
  return (
    <section style={styles.grid}>
      <article style={styles.card}>
        <div style={styles.titleRow}>
          <h3 style={styles.title}>Критический путь</h3>
          <span style={styles.badge}>{criticalPath.totalDays} дн.</span>
        </div>

        {criticalPath.ids.length ? (
          <>
            <div style={styles.path}>
              {criticalPath.names.map((name, index) => (
                <React.Fragment key={`${name}-${index}`}>
                  {index > 0 && <span style={styles.arrow}>→</span>}
                  <span style={styles.pathItem}>{name}</span>
                </React.Fragment>
              ))}
            </div>
            <div style={styles.subtle}>
              Самая длинная цепочка связанных задач по длительности.
            </div>
          </>
        ) : (
          <div style={styles.subtle}>Недостаточно данных для расчёта.</div>
        )}
      </article>

      <article style={styles.card}>
        <div style={styles.titleRow}>
          <h3 style={styles.title}>Состояние проекта</h3>
          <span style={{ ...styles.healthBadge, ...styles[health.tone] }}>
            {health.label}
          </span>
        </div>
        <div>{health.text}</div>
        <div style={{ ...styles.subtle, marginTop: 8 }}>
          Ближайшие 3 дня: {upcomingTasks.length} задач со сроком.
        </div>
      </article>

      <article style={styles.card}>
        <h3 style={styles.title}>Ближайшие дедлайны</h3>
        {upcomingTasks.length ? (
          <div style={styles.list}>
            {upcomingTasks.slice(0, 4).map((task) => (
              <div key={task.id} style={styles.listRow}>
                <span>{task.name}</span>
                <strong>{String(task.end_date).slice(0, 10)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.subtle}>На ближайшие 3 дня дедлайнов нет.</div>
        )}
      </article>

      <article style={styles.card}>
        <h3 style={styles.title}>Загрузка команды</h3>
        {workload.length ? (
          <div style={styles.list}>
            {workload.slice(0, 5).map((item) => (
              <div key={item.name} style={styles.listRow}>
                <span>{item.name}</span>
                <strong>{item.count} задач</strong>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.subtle}>Пока нет назначенных задач.</div>
        )}
      </article>
    </section>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 16,
    minHeight: 130,
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { margin: '0 0 10px', fontSize: 15 },
  badge: {
    background: '#fef2f2',
    color: '#b91c1c',
    borderRadius: 999,
    padding: '4px 8px',
    fontSize: 12,
    fontWeight: 700,
  },
  healthBadge: {
    borderRadius: 999,
    padding: '4px 8px',
    fontSize: 12,
    fontWeight: 700,
  },
  success: { background: '#ecfdf5', color: '#047857' },
  warning: { background: '#fffbeb', color: '#b45309' },
  danger: { background: '#fff1f2', color: '#be123c' },
  path: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 9,
  },
  pathItem: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 7,
    padding: '5px 7px',
    fontSize: 12,
  },
  arrow: { color: '#9ca3af' },
  subtle: { color: '#6b7280', fontSize: 12 },
  list: { display: 'grid', gap: 7 },
  listRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    fontSize: 12,
    borderBottom: '1px solid #f3f4f6',
    paddingBottom: 6,
  },
};
