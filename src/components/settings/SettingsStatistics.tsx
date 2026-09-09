import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CATEGORY_ORDER,
  STATS_PERIOD_OPTIONS,
  categoryLabel,
  computeTaskStats,
  type StatsPeriod,
} from '../../utils/taskStats';
import './Settings.css';

function pct(n: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((n / total) * 100);
}

function formatHours(h: number) {
  if (h < 1) return `${Math.round(h * 60)} мин`;
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  if (mins === 0) return `${whole} ч`;
  return `${whole} ч ${mins} мин`;
}

function tasksWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'дело';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дела';
  return 'дел';
}

export function SettingsStatistics() {
  const { setScreen, tasks, settings, session, openAuth } = useApp();
  const [period, setPeriod] = useState<StatsPeriod>('day');
  const report = useMemo(
    () => computeTaskStats(tasks, period, settings.weekStartsOn),
    [tasks, period, settings.weekStartsOn],
  );
  const pastTotal = report.completed + report.missed;

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

        {report.total === 0 ? (
          <div className="stats-empty">
            <p>За этот период дел пока нет.</p>
            <p className="settings-note">Создай задачи в календаре — здесь появится прогресс.</p>
          </div>
        ) : (
          <>
            <section className="stats-hero" aria-label="Итог за период">
              <h2 className="stats-hero__title">Уже было по календарю</h2>
              <p className="stats-hero__counts">
                <span className="stats-hero__done">
                  <strong>{report.completed}</strong> сделано
                </span>
                <span className="stats-hero__sep" aria-hidden>·</span>
                <span className="stats-hero__missed">
                  <strong>{report.missed}</strong> не сделано
                </span>
              </p>
              {pastTotal > 0 ? (
                <>
                  <div
                    className="stats-hero__bar"
                    role="progressbar"
                    aria-valuenow={report.completionRate}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Сделано ${report.completed} из ${pastTotal}`}
                  >
                    <span className="stats-hero__bar-fill" style={{ width: `${report.completionRate}%` }} />
                  </div>
                  <p className="stats-hero__detail">
                    Закрыто {report.completionRate}% — {report.completed} из {pastTotal}{' '}
                    {tasksWord(pastTotal)}, время которых уже прошло
                  </p>
                </>
              ) : (
                <p className="stats-hero__detail">Пока нет дел, время которых уже наступило.</p>
              )}
              {report.planned > 0 && (
                <p className="stats-hero__ahead">
                  Ещё <strong>{report.planned}</strong> {tasksWord(report.planned)} впереди — время не наступило
                </p>
              )}
            </section>

            <div className="stats-grid">
              <div className="stats-card">
                <span className="stats-card__num">{report.completed}</span>
                <span className="stats-card__label">Сделано</span>
              </div>
              <div className="stats-card">
                <span className="stats-card__num">{report.planned}</span>
                <span className="stats-card__label">Впереди</span>
              </div>
              <div className="stats-card stats-card--warn">
                <span className="stats-card__num">{report.missed}</span>
                <span className="stats-card__label">Не сделано</span>
              </div>
            </div>

            <section className="stats-section">
              <h2 className="stats-section__title">По категориям</h2>
              {CATEGORY_ORDER.map((cat) => {
                const row = report.byCategory[cat];
                if (row.total === 0) return null;
                const donePct = pct(row.completed, row.total);
                return (
                  <div key={cat} className="stats-cat" data-cat={cat}>
                    <div className="stats-cat__head">
                      <span className="stats-cat__name">{categoryLabel(cat)}</span>
                      <span className="stats-cat__nums">
                        {row.completed}/{row.total}
                      </span>
                    </div>
                    <div className="stats-cat__bar" aria-hidden>
                      <span className="stats-cat__bar-done" style={{ width: `${donePct}%` }} />
                    </div>
                    <p className="stats-cat__hint">
                      {row.planned > 0 && `${row.planned} впереди`}
                      {row.planned > 0 && row.missed > 0 && ' · '}
                      {row.missed > 0 && `${row.missed} не сделано`}
                      {row.planned === 0 && row.missed === 0 && 'всё закрыто'}
                    </p>
                  </div>
                );
              })}
            </section>

            <section className="stats-section">
              <h2 className="stats-section__title">Время в календаре</h2>
              <p className="stats-time-row">
                <span>Запланировано</span>
                <strong>{formatHours(report.hoursScheduled)}</strong>
              </p>
              <p className="stats-time-row">
                <span>Выполнено</span>
                <strong>{formatHours(report.hoursCompleted)}</strong>
              </p>
            </section>

            {report.important.total > 0 && (
              <section className="stats-section">
                <h2 className="stats-section__title">Важные</h2>
                <p className="stats-time-row">
                  <span>Сделано</span>
                  <strong>
                    {report.important.completed} / {report.important.total}
                  </strong>
                </p>
              </section>
            )}
          </>
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
            Считаем по дате дела в календаре. «Не сделано» — время прошло, дело не отмечено завершённым.
          </p>
        )}
      </div>
    </div>
  );
}
