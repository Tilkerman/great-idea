import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CATEGORY_ORDER,
  STATS_PERIOD_OPTIONS,
  categoryLabel,
  computeTaskStats,
  dynamicsText,
  formatHours,
  formatSignedHours,
  type StatsPeriod,
} from '../../utils/taskStats';
import './Settings.css';

function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <p className="stats-time-row">
      <span>
        {label}
        {sub && <span className="stats-row-sub">{sub}</span>}
      </span>
      <strong>{value}</strong>
    </p>
  );
}

export function SettingsStatistics() {
  const { setScreen, tasks, settings, session, openAuth } = useApp();
  const [period, setPeriod] = useState<StatsPeriod>('day');
  const report = useMemo(
    () => computeTaskStats(tasks, period, settings.weekStartsOn),
    [tasks, period, settings.weekStartsOn],
  );

  const dynamics = dynamicsText(period, report.dynamics.completedHoursDeltaPct);
  const hasTails = report.tails.over3Days.count > 0;

  return (
    <div className="settings-page">
      <header className="settings-topbar">
        <button type="button" onClick={() => setScreen('settings')}>‹ Назад</button>
        <span>Статистика</span>
        <span />
      </header>

      <div className="settings-form stats-page">
        <div className="stats-period-tabs">
          {STATS_PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`stats-period-tab ${period === opt.id ? 'stats-period-tab--active' : ''}`}
              onClick={() => setPeriod(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <p className="stats-period-label">{report.periodLabel}</p>

        {!report.hasData ? (
          <div className="stats-empty">
            <p>За этот период часов в календаре пока нет.</p>
            <p className="settings-note">Создай задачи — статистика считается по их длительности.</p>
          </div>
        ) : (
          <>
            <section className="stats-hero" aria-label="Выполнение по времени">
              <h2 className="stats-hero__title">Выполнение по времени</h2>
              <p className="stats-hero__big">{report.hours.completionPct}%</p>
              <div
                className="stats-hero__bar"
                role="progressbar"
                aria-valuenow={report.hours.completionPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Выполнено ${formatHours(report.hours.completed)} из ${formatHours(report.hours.scheduled)}`}
              >
                <span className="stats-hero__bar-fill" style={{ width: `${report.hours.completionPct}%` }} />
              </div>
              <MetricRow label="Запланировано" value={formatHours(report.hours.scheduled)} />
              <MetricRow label="Выполнено" value={formatHours(report.hours.completed)} />
            </section>

            {(report.past.hoursClosed > 0 || report.past.hoursOverdue > 0) && (
              <section className="stats-section">
                <h2 className="stats-section__title">Уже прошло по времени</h2>
                <p className="stats-section__lead">
                  Закрыто {report.past.closedPct}% прошедших часов
                </p>
                <MetricRow
                  label="Закрыто"
                  value={formatHours(report.past.hoursClosed)}
                  sub={` · ${report.past.tasksClosed} ${report.past.tasksClosed === 1 ? 'дело' : 'дел'}`}
                />
                <MetricRow
                  label="Просрочено"
                  value={formatHours(report.past.hoursOverdue)}
                  sub={` · ${report.past.tasksOverdue} ${report.past.tasksOverdue === 1 ? 'дело' : 'дел'}`}
                />
              </section>
            )}

            <section className="stats-section">
              <h2 className="stats-section__title">План vs факт</h2>
              <MetricRow label="Запланировано" value={formatHours(report.planFact.plannedHours)} />
              <MetricRow label="Фактически" value={formatHours(report.planFact.actualHours)} />
              <MetricRow
                label="Разница"
                value={
                  report.planFact.diffPct !== null
                    ? `${formatSignedHours(report.planFact.diffHours)} (${report.planFact.diffPct > 0 ? '+' : ''}${report.planFact.diffPct}%)`
                    : formatSignedHours(report.planFact.diffHours)
                }
              />
            </section>

            <section className="stats-section">
              <h2 className="stats-section__title">Баланс по категориям</h2>
              {CATEGORY_ORDER.map((cat) => {
                const row = report.byCategory[cat];
                if (row.hoursScheduled <= 0) return null;
                const share = Math.round((row.hoursScheduled / report.hours.scheduled) * 100);
                return (
                  <div key={cat} className="stats-cat" data-cat={cat}>
                    <div className="stats-cat__head">
                      <span className="stats-cat__name">{categoryLabel(cat)}</span>
                      <span className="stats-cat__nums">
                        {formatHours(row.hoursScheduled)} · {share}%
                      </span>
                    </div>
                    <div className="stats-cat__bar" aria-hidden>
                      <span className="stats-cat__bar-done" style={{ width: `${share}%` }} />
                    </div>
                    <p className="stats-cat__hint">
                      Выполнено {formatHours(row.hoursCompleted)}
                      {row.hoursMissed > 0 && ` · просрочено ${formatHours(row.hoursMissed)}`}
                    </p>
                  </div>
                );
              })}
            </section>

            <section className="stats-section">
              <h2 className="stats-section__title">Нагрузка</h2>
              <MetricRow
                label="Среднее в день"
                value={formatHours(report.load.avgHoursPerDay)}
                sub={` · ${report.load.daysInPeriod} дн.`}
              />
              <MetricRow label="Всего за период" value={formatHours(report.hours.scheduled)} />
              {report.load.busiestWeekday && (
                <MetricRow
                  label="Самый загруженный день"
                  value={report.load.busiestWeekday}
                  sub={` · ${formatHours(report.load.busiestWeekdayHours)}`}
                />
              )}
            </section>

            {report.important.hoursScheduled > 0 && (
              <section className="stats-section">
                <h2 className="stats-section__title">Важные задачи</h2>
                <p className="stats-section__lead">
                  {report.important.completionPct}% по времени · {report.important.taskCount}{' '}
                  {report.important.taskCount === 1 ? 'дело' : 'дел'}
                </p>
                <MetricRow label="Запланировано" value={formatHours(report.important.hoursScheduled)} />
                <MetricRow label="Выполнено" value={formatHours(report.important.hoursCompleted)} />
              </section>
            )}

            {report.dynamics.hasPrevious && dynamics && (
              <section className="stats-section stats-dynamics">
                <h2 className="stats-section__title">Динамика</h2>
                <p
                  className={`stats-dynamics__value ${
                    (report.dynamics.completedHoursDeltaPct ?? 0) >= 0
                      ? 'stats-dynamics__value--up'
                      : 'stats-dynamics__value--down'
                  }`}
                >
                  {dynamics}
                </p>
                <p className="stats-cat__hint">Сравнение выполненных часов с {report.dynamics.previousLabel.toLowerCase()}</p>
              </section>
            )}

            <p className="stats-tasks-note">
              Дополнительно: {report.tasks.completed} / {report.tasks.total} дел закрыто
              {report.tasks.planned > 0 && ` · ${report.tasks.planned} впереди`}
            </p>
          </>
        )}

        {hasTails && (
          <section className="stats-section stats-tails">
            <h2 className="stats-section__title">Хвосты</h2>
            <p className="stats-section__lead">Незакрытые дела, время которых прошло</p>
            <MetricRow
              label="Старше 3 дней"
              value={`${report.tails.over3Days.count} · ${formatHours(report.tails.over3Days.hours)}`}
            />
            <MetricRow
              label="Старше 7 дней"
              value={`${report.tails.over7Days.count} · ${formatHours(report.tails.over7Days.hours)}`}
            />
            {report.tails.oldest.length > 0 && (
              <ul className="stats-tail-list">
                {report.tails.oldest.map((t) => (
                  <li key={t.id} className="stats-tail-item">
                    <span className="stats-tail-item__title">{t.title}</span>
                    <span className="stats-tail-item__meta">
                      {t.daysOpen} дн. · {formatHours(t.hours)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {session.isGuest ? (
          <div className="stats-upsell">
            <p className="stats-upsell__text">
              Сейчас статистика считается на этом телефоне. С аккаунтом позже можно будет
              сохранять её между устройствами.
            </p>
            <button type="button" className="btn btn--ghost settings-full" onClick={() => openAuth('choice', 'settings-stats')}>
              Создать аккаунт
            </button>
          </div>
        ) : (
          <p className="settings-note stats-footer-note">
            Все метрики — по длительности задач в календаре. Просрочено — время прошло, дело не завершено.
          </p>
        )}
      </div>
    </div>
  );
}
