import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
import { CATEGORY_LABEL_KEY } from '../../constants/categories';
import {
  CATEGORY_ORDER,
  STATS_PERIOD_OPTIONS,
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

const PERIOD_KEY: Record<StatsPeriod, 'periodDay' | 'periodWeek' | 'periodMonth' | 'periodYear'> = {
  day: 'periodDay',
  week: 'periodWeek',
  month: 'periodMonth',
  year: 'periodYear',
};

export function SettingsStatistics() {
  const { setScreen, tasks, settings, session, openAuth } = useApp();
  const { t, taskWord, locale } = useI18n();
  const [period, setPeriod] = useState<StatsPeriod>('day');
  const report = useMemo(
    () => computeTaskStats(tasks, period, settings.weekStartsOn, locale),
    [tasks, period, settings.weekStartsOn, locale],
  );

  const hours = (h: number) => formatHours(h, locale);
  const signedHours = (h: number) => formatSignedHours(h, locale);
  const dynamics = dynamicsText(period, report.dynamics.completedHoursDeltaPct, locale);
  const hasTails = report.tails.over3Days.count > 0;

  return (
    <div className="settings-page">
      <header className="settings-topbar">
        <button type="button" onClick={() => setScreen('settings')}>{t('back')}</button>
        <span>{t('stats')}</span>
        <span />
      </header>

      <div className="settings-form stats-page">
        <div className="stats-period-tabs">
          {STATS_PERIOD_OPTIONS.map((id) => (
            <button
              key={id}
              type="button"
              className={`stats-period-tab ${period === id ? 'stats-period-tab--active' : ''}`}
              onClick={() => setPeriod(id)}
            >
              {t(PERIOD_KEY[id])}
            </button>
          ))}
        </div>

        <p className="stats-period-label">{report.periodLabel}</p>

        {!report.hasData ? (
          <div className="stats-empty">
            <p>{t('statsEmpty')}</p>
            <p className="settings-note">{t('statsEmptyHint')}</p>
          </div>
        ) : (
          <>
            <section className="stats-hero" aria-label={t('statsTime')}>
              <h2 className="stats-hero__title">{t('statsTime')}</h2>
              <p className="stats-hero__big">{report.hours.completionPct}%</p>
              <div
                className="stats-hero__bar"
                role="progressbar"
                aria-valuenow={report.hours.completionPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t('statsDoneOf', {
                  done: hours(report.hours.completed),
                  scheduled: hours(report.hours.scheduled),
                })}
              >
                <span className="stats-hero__bar-fill" style={{ width: `${report.hours.completionPct}%` }} />
              </div>
              <MetricRow label={t('scheduled')} value={hours(report.hours.scheduled)} />
              <MetricRow label={t('doneHours')} value={hours(report.hours.completed)} />
            </section>

            {(report.past.hoursClosed > 0 || report.past.hoursOverdue > 0) && (
              <section className="stats-section">
                <h2 className="stats-section__title">{t('statsPastTitle')}</h2>
                <p className="stats-section__lead">
                  {t('statsPastLead', { pct: report.past.closedPct })}
                </p>
                <MetricRow
                  label={t('closed')}
                  value={hours(report.past.hoursClosed)}
                  sub={` · ${report.past.tasksClosed} ${taskWord(report.past.tasksClosed)}`}
                />
                <MetricRow
                  label={t('overdue')}
                  value={hours(report.past.hoursOverdue)}
                  sub={` · ${report.past.tasksOverdue} ${taskWord(report.past.tasksOverdue)}`}
                />
              </section>
            )}

            <section className="stats-section">
              <h2 className="stats-section__title">{t('statsPlanFact')}</h2>
              <MetricRow label={t('planned')} value={hours(report.planFact.plannedHours)} />
              <MetricRow label={t('actual')} value={hours(report.planFact.actualHours)} />
              <MetricRow
                label={t('delta')}
                value={
                  report.planFact.diffPct !== null
                    ? `${signedHours(report.planFact.diffHours)} (${report.planFact.diffPct > 0 ? '+' : ''}${report.planFact.diffPct}%)`
                    : signedHours(report.planFact.diffHours)
                }
              />
            </section>

            <section className="stats-section">
              <h2 className="stats-section__title">{t('statsBalance')}</h2>
              {CATEGORY_ORDER.map((cat) => {
                const row = report.byCategory[cat];
                if (row.hoursScheduled <= 0) return null;
                const share = Math.round((row.hoursScheduled / report.hours.scheduled) * 100);
                return (
                  <div key={cat} className="stats-cat" data-cat={cat}>
                    <div className="stats-cat__head">
                      <span className="stats-cat__name">{t(CATEGORY_LABEL_KEY[cat])}</span>
                      <span className="stats-cat__nums">
                        {hours(row.hoursScheduled)} · {share}%
                      </span>
                    </div>
                    <div className="stats-cat__bar" aria-hidden>
                      <span className="stats-cat__bar-done" style={{ width: `${share}%` }} />
                    </div>
                    <p className="stats-cat__hint">
                      {t('statsCatDone', { hours: hours(row.hoursCompleted) })}
                      {row.hoursMissed > 0 && t('statsCatMissed', { hours: hours(row.hoursMissed) })}
                    </p>
                  </div>
                );
              })}
            </section>

            <section className="stats-section">
              <h2 className="stats-section__title">{t('statsLoad')}</h2>
              <MetricRow
                label={t('avgDay')}
                value={hours(report.load.avgHoursPerDay)}
                sub={t('statsDaysShort', { n: report.load.daysInPeriod })}
              />
              <MetricRow label={t('totalPeriod')} value={hours(report.hours.scheduled)} />
              {report.load.busiestWeekday && (
                <MetricRow
                  label={t('busiest')}
                  value={report.load.busiestWeekday}
                  sub={` · ${hours(report.load.busiestWeekdayHours)}`}
                />
              )}
            </section>

            {report.important.hoursScheduled > 0 && (
              <section className="stats-section">
                <h2 className="stats-section__title">{t('statsImportantTitle')}</h2>
                <p className="stats-section__lead">
                  {t('statsImportantLead', {
                    pct: report.important.completionPct,
                    n: report.important.taskCount,
                    word: taskWord(report.important.taskCount),
                  })}
                </p>
                <MetricRow label={t('scheduled')} value={hours(report.important.hoursScheduled)} />
                <MetricRow label={t('doneHours')} value={hours(report.important.hoursCompleted)} />
              </section>
            )}

            {report.dynamics.hasPrevious && dynamics && (
              <section className="stats-section stats-dynamics">
                <h2 className="stats-section__title">{t('statsDynamics')}</h2>
                <p
                  className={`stats-dynamics__value ${
                    (report.dynamics.completedHoursDeltaPct ?? 0) >= 0
                      ? 'stats-dynamics__value--up'
                      : 'stats-dynamics__value--down'
                  }`}
                >
                  {dynamics}
                </p>
                <p className="stats-cat__hint">{t('statsDynamicsHint', { label: report.dynamics.previousLabel })}</p>
              </section>
            )}

            <p className="stats-tasks-note">
              {t('statsExtra', { done: report.tasks.completed, total: report.tasks.total })}
              {report.tasks.planned > 0 && t('statsAhead', { n: report.tasks.planned })}
            </p>
          </>
        )}

        {hasTails && (
          <section className="stats-section stats-tails">
            <h2 className="stats-section__title">{t('statsTails')}</h2>
            <p className="stats-section__lead">{t('statsTailsLead')}</p>
            <MetricRow
              label={t('older3')}
              value={`${report.tails.over3Days.count} · ${hours(report.tails.over3Days.hours)}`}
            />
            <MetricRow
              label={t('older7')}
              value={`${report.tails.over7Days.count} · ${hours(report.tails.over7Days.hours)}`}
            />
            {report.tails.oldest.length > 0 && (
              <ul className="stats-tail-list">
                {report.tails.oldest.map((item) => (
                  <li key={item.id} className="stats-tail-item">
                    <span className="stats-tail-item__title">{item.title}</span>
                    <span className="stats-tail-item__meta">
                      {t('statsTailMeta', { days: item.daysOpen, hours: hours(item.hours) })}
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
              {t('statsUpsell')}
            </p>
            <button type="button" className="btn btn--ghost settings-full" onClick={() => openAuth('choice', 'settings-stats')}>
              {t('onbRegister')}
            </button>
          </div>
        ) : (
          <p className="settings-note stats-footer-note">
            {t('statsFooter')}
          </p>
        )}
      </div>
    </div>
  );
}
