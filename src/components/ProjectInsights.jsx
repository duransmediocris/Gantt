import React from 'react';

export function ProjectInsights({
  criticalPath,
  upcomingTasks,
  overdueTasks,
  workload,
  health,
  riskItems,
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
              Длительность считается по календарному промежутку всей зависимой цепочки, а не суммой длительностей отдельных задач.
            </div>
          </>
        ) : (
          <div style={styles.subtle}>Нет связанной цепочки для расчёта.</div>
        )}
      </article>

      <article style={styles.card}>
        <div style={styles.titleRow}>
          <h3 style={styles.title}>Состояние проекта</h3>
          <span style={{ ...styles.healthBadge, ...styles[health.tone] }}>{health.label}</span>
        </div>
        <div>{health.text}</div>
        <div style={{ ...styles.subtle, marginTop: 8 }}>
          Ближайшие 3 дня: {upcomingTasks.length} задач со сроком.
        </div>
      </article>

      <article style={overdueTasks.length ? styles.overdueCard : styles.card}>
        <div style={styles.titleRow}>
          <h3 style={styles.title}>Просроченные задачи</h3>
          <span style={overdueTasks.length ? styles.dangerBadge : styles.successBadge}>
            {overdueTasks.length}
          </span>
        </div>
        {overdueTasks.length ? (
          <div style={styles.list}>
            {overdueTasks.slice(0, 5).map((task) => (
              <div key={task.id} style={styles.listRow}>
                <span>{task.name}</span>
                <strong style={{ color: '#b91c1c' }}>+{task.overdue_days || 1} дн.</strong>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.subtle}>Просроченных задач нет.</div>
        )}
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
          <div style={styles.subtle}>Пока нет назначенных активных задач.</div>
        )}
      </article>

      <article style={styles.card}>
        <h3 style={styles.title}>Риски</h3>
        <div style={styles.riskList}>
          {riskItems.map((item, index) => (
            <div key={`${item.title}-${index}`} style={{ ...styles.riskItem, ...styles[`risk_${item.level}`] }}>
              <strong>{item.title}</strong>
              <div style={styles.riskText}>{item.text}</div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 16 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, minHeight: 138, boxShadow: '0 6px 20px rgba(15,23,42,.035)' },
  overdueCard: { background: '#fffafa', border: '1px solid #fecaca', borderRadius: 14, padding: 16, minHeight: 138, boxShadow: '0 6px 20px rgba(185,28,28,.04)' },
  titleRow: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 },
  title: { margin: '0 0 10px', fontSize: 15 },
  badge: { background: '#fff7ed', color: '#c2410c', borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 700 },
  dangerBadge: { background: '#fee2e2', color: '#b91c1c', borderRadius: 999, padding: '4px 9px', fontSize: 12, fontWeight: 800 },
  successBadge: { background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '4px 9px', fontSize: 12, fontWeight: 800 },
  healthBadge: { borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 700 },
  success: { background: '#ecfdf5', color: '#047857' },
  warning: { background: '#fffbeb', color: '#b45309' },
  danger: { background: '#fff1f2', color: '#be123c' },
  path: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 9 },
  pathItem: { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '5px 8px', fontSize: 12, fontWeight: 650 },
  arrow: { color: '#94a3b8' },
  subtle: { color: '#64748b', fontSize: 12, lineHeight: 1.45 },
  list: { display: 'grid', gap: 7 },
  listRow: { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 6 },
  riskList: { display: 'grid', gap: 8 },
  riskItem: { padding: '9px 10px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 12 },
  risk_danger: { background: '#fff1f2', borderColor: '#fecdd3', color: '#9f1239' },
  risk_warning: { background: '#fffbeb', borderColor: '#fde68a', color: '#92400e' },
  risk_success: { background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' },
  riskText: { marginTop: 4, opacity: .88, lineHeight: 1.4 },
};
