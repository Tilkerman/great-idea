import { useState, useEffect, useMemo } from 'react';
import Header from '../Header/Header';
import './SettingsPages.css';
import './StatisticsPage.css';
import { useI18n } from '../../i18n';
import { desireService, contactService, actionItemService } from '../../services/db';
import type { Desire } from '../../types';
import { formatStatValue } from '../../utils/formatStats';
import { getActivityIndicator, compareWithAverage } from '../../utils/activityIndicators';
import ActivityCalendarModal from '../ActivityCalendar/ActivityCalendarModal';

interface StatisticsPageProps {
  onBack: () => void;
  onSettingsClick?: () => void;
  onGoHome?: () => void;
  onDesireClick?: (desireId: string) => void;
}

interface DesireStatistics extends Desire {
  daysAlive: number; // сколько дней существует желание
  entryCount: number; // количество записей
  thoughtCount: number; // количество мыслей
  actionItemsProgress?: { completed: number; total: number }; // прогресс по action items
  totalContacts: number; // общее количество контактов (записи + мысли, без шагов)
  avgActivityPerDay: number; // средняя активность в день (контактов/день)
  activityPercent: number; // процент дней с активностью (0-100)
  isHot: boolean; // "горячее" желание (много активности за последние дни)
  daysUntilCompleted?: number; // сколько дней заняло до выполнения (если выполнено)
}

export default function StatisticsPage({ onBack, onSettingsClick, onGoHome, onDesireClick }: StatisticsPageProps) {
  const { t, locale } = useI18n();
  const statLocale = locale === 'ru' ? 'ru' : 'en';
  const [desires, setDesires] = useState<DesireStatistics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activityCalendarOpen, setActivityCalendarOpen] = useState(false);
  const [selectedDesireForCalendar, setSelectedDesireForCalendar] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setIsLoading(true);
    try {
      // Получаем только активные желания (не удаленные и не выполненные)
      const allDesires = await desireService.getAllDesires(false);
      
      // Для каждого желания получаем статистику
      const desiresWithStats = await Promise.all(
        allDesires.map(async (desire) => {
          // Подсчитываем дни существования
          const createdAt = new Date(desire.createdAt);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          createdAt.setHours(0, 0, 0, 0);
          const diffInMs = today.getTime() - createdAt.getTime();
          const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
          const daysAlive = diffInDays === 0 ? 1 : diffInDays + 1;

          // Получаем статистику контактов
          const stats = await contactService.getStatistics(desire.id);
          
          // Загружаем action items для прогресса шагов
          const actionItems = await actionItemService.getActionItemsByDesire(desire.id);
          const actionItemsProgress = actionItems.length > 0
            ? {
                completed: actionItems.filter(item => item.isCompleted).length,
                total: actionItems.length
              }
            : undefined;
          
          // Общее количество контактов (только записи и мысли, без старых шагов)
          const totalContacts = stats.entryCount + stats.thoughtCount;
          
          // Средняя активность в день (контактов на день)
          const avgActivityPerDay = daysAlive > 0 ? totalContacts / daysAlive : 0;
          
          // Получаем все контакты для расчета процента дней с активностью
          const allContacts = await contactService.getAllContacts(desire.id);
          const uniqueDatesWithContact = new Set(allContacts.map(c => c.date));
          const activityPercent = daysAlive > 0 ? (uniqueDatesWithContact.size / daysAlive) * 100 : 0;
          
          // "Горячее" желание: более 3 контактов в день в среднем И более 50% дней с активностью
          const isHot = avgActivityPerDay >= 3 && activityPercent >= 50;
          
          // Для выполненных желаний - сколько дней заняло до выполнения
          let daysUntilCompleted: number | undefined = undefined;
          if (desire.isCompleted && desire.completedAt) {
            const completedAt = new Date(desire.completedAt);
            completedAt.setHours(0, 0, 0, 0);
            const completedDiff = Math.floor((completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
            daysUntilCompleted = completedDiff + 1; // включительно день выполнения
          }

          return {
            ...desire,
            daysAlive,
            entryCount: stats.entryCount,
            thoughtCount: stats.thoughtCount,
            actionItemsProgress,
            totalContacts,
            avgActivityPerDay: Math.round(avgActivityPerDay * 10) / 10, // округляем до 1 знака
            activityPercent: Math.round(activityPercent), // округляем до целого
            isHot,
            daysUntilCompleted,
          };
        })
      );

      // Сортируем по дате создания (новые сверху)
      desiresWithStats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setDesires(desiresWithStats);
    } catch (error) {
      console.error('Ошибка при загрузке статистики:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Вычисляем среднюю активность по всем желаниям для сравнения
  const averageActivityAll = useMemo(() => {
    if (desires.length === 0) return 0;
    const total = desires.reduce((sum, d) => sum + d.avgActivityPerDay, 0);
    return total / desires.length;
  }, [desires]);

  const handleDesireClick = (desireId: string) => {
    if (onDesireClick) {
      onDesireClick(desireId);
    }
  };

  const handleActivityClick = (e: React.MouseEvent, desire: DesireStatistics) => {
    e.stopPropagation(); // Предотвращаем клик по карточке
    setSelectedDesireForCalendar({ id: desire.id, title: desire.title });
    setActivityCalendarOpen(true);
  };

  const handleCloseActivityCalendar = () => {
    setActivityCalendarOpen(false);
    setSelectedDesireForCalendar(null);
  };

  const getMainImage = (desire: Desire): string | null => {
    if (desire.images && desire.images.length > 0) {
      return desire.images[0].url;
    }
    if (desire.imageUrl) {
      return desire.imageUrl;
    }
    return null;
  };

  if (isLoading) {
    return (
      <>
        <Header
          leftSlot={
            <button type="button" className="settings-page-back" onClick={onBack}>
              ← {t('common.back')}
            </button>
          }
          onSettingsClick={onSettingsClick}
          onLogoClick={onGoHome}
        />
        <div className="settings-page">
          <div className="settings-page-content">
            <div style={{ textAlign: 'center', padding: '2rem' }}>{t('common.loading')}</div>
          </div>
        </div>
      </>
    );
  }

  if (desires.length === 0) {
    return (
      <>
        <Header
          leftSlot={
            <button type="button" className="settings-page-back" onClick={onBack}>
              ← {t('common.back')}
            </button>
          }
          onSettingsClick={onSettingsClick}
          onLogoClick={onGoHome}
        />
        <div className="settings-page">
          <div className="settings-page-content">
            <h1 className="settings-page-title">{t('settings.statistics.title')}</h1>
            <p className="settings-page-text" style={{ textAlign: 'center', padding: '2rem' }}>
              {t('settings.statistics.empty')}
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        leftSlot={
          <button type="button" className="settings-page-back" onClick={onBack}>
            ← {t('common.back')}
          </button>
        }
        onSettingsClick={onSettingsClick}
        onLogoClick={onGoHome}
      />
      <div className="settings-page">
        <div className="settings-page-content">
          <h1 className="settings-page-title">{t('settings.statistics.title')}</h1>
          <p className="settings-page-text">{t('settings.statistics.description')}</p>
          
          {/* Секция "Как читать статистику" */}
          {desires.length > 0 && (
            <div className="statistics-help-section">
              <details className="statistics-help-details" open>
                <summary className="statistics-help-summary">
                  <span>{t('settings.statistics.howToRead.title')}</span>
                </summary>
                <div className="statistics-help-content">
                  <p className="statistics-help-intro">{t('settings.statistics.howToRead.intro')}</p>
                  
                  <div className="statistics-help-item">
                    <div className="statistics-help-item-header">
                      <span className="statistics-help-item-icon">📈</span>
                      <h4 className="statistics-help-item-title">{t('settings.statistics.howToRead.activityPercent.title')}</h4>
                    </div>
                    <p className="statistics-help-item-text">{t('settings.statistics.howToRead.activityPercent.text')}</p>
                    <div className="statistics-help-visual">
                      <div className="statistics-help-example">
                        <div className="statistics-help-example-bar">
                          <div className="statistics-help-example-fill" style={{ width: '50%' }}></div>
                        </div>
                        <span className="statistics-help-example-label">{t('settings.statistics.howToRead.activityPercent.example50')}</span>
                      </div>
                      <div className="statistics-help-example">
                        <div className="statistics-help-example-bar">
                          <div className="statistics-help-example-fill" style={{ width: '100%' }}></div>
                        </div>
                        <span className="statistics-help-example-label">{t('settings.statistics.howToRead.activityPercent.example100')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="statistics-help-item">
                    <div className="statistics-help-item-header">
                      <span className="statistics-help-item-icon">⚡</span>
                      <h4 className="statistics-help-item-title">{t('settings.statistics.howToRead.avgActivity.title')}</h4>
                    </div>
                    <p className="statistics-help-item-text">{t('settings.statistics.howToRead.avgActivity.text')}</p>
                    <div className="statistics-help-visual">
                      <div className="statistics-help-activity-example">
                        <span className="statistics-help-activity-icon">📝</span>
                        <span>{t('settings.statistics.howToRead.avgActivity.entry')}</span>
                        <span className="statistics-help-activity-plus">+</span>
                        <span className="statistics-help-activity-icon">💭</span>
                        <span>{t('settings.statistics.howToRead.avgActivity.thought')}</span>
                        <span className="statistics-help-activity-plus">+</span>
                        <span className="statistics-help-activity-icon">👣</span>
                        <span>{t('settings.statistics.howToRead.avgActivity.step')}</span>
                        <span className="statistics-help-activity-equals">=</span>
                        <strong>{t('settings.statistics.howToRead.avgActivity.activity')}</strong>
                      </div>
                    </div>
                  </div>
                  
                  <div className="statistics-help-item">
                    <div className="statistics-help-item-header">
                      <span className="statistics-help-item-icon">🎯</span>
                      <h4 className="statistics-help-item-title">{t('settings.statistics.howToRead.indicators.title')}</h4>
                    </div>
                    <p className="statistics-help-item-text">{t('settings.statistics.howToRead.indicators.text')}</p>
                    <div className="statistics-help-visual">
                      <div className="statistics-help-levels">
                        <div className="statistics-help-level">
                          <span className="statistics-help-level-icon">🐌</span>
                          <div className="statistics-help-level-info">
                            <strong>{t('settings.statistics.howToRead.indicators.low.title')}</strong>
                            <span>{t('settings.statistics.howToRead.indicators.low.text')}</span>
                          </div>
                        </div>
                        <div className="statistics-help-level">
                          <span className="statistics-help-level-icon">📊</span>
                          <div className="statistics-help-level-info">
                            <strong>{t('settings.statistics.howToRead.indicators.moderate.title')}</strong>
                            <span>{t('settings.statistics.howToRead.indicators.moderate.text')}</span>
                          </div>
                        </div>
                        <div className="statistics-help-level">
                          <span className="statistics-help-level-icon">⭐</span>
                          <div className="statistics-help-level-info">
                            <strong>{t('settings.statistics.howToRead.indicators.high.title')}</strong>
                            <span>{t('settings.statistics.howToRead.indicators.high.text')}</span>
                          </div>
                        </div>
                        <div className="statistics-help-level">
                          <span className="statistics-help-level-icon">🔥</span>
                          <div className="statistics-help-level-info">
                            <strong>{t('settings.statistics.howToRead.indicators.veryHigh.title')}</strong>
                            <span>{t('settings.statistics.howToRead.indicators.veryHigh.text')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="statistics-help-item">
                    <div className="statistics-help-item-header">
                      <span className="statistics-help-item-icon">💡</span>
                      <h4 className="statistics-help-item-title">{t('settings.statistics.howToRead.correlation.title')}</h4>
                    </div>
                    <p className="statistics-help-item-text">{t('settings.statistics.howToRead.correlation.text')}</p>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* Секция инсайтов и топ-3 */}
          {desires.length >= 3 && (
            <div className="statistics-insights">
              <div className="statistics-insights-header">
                <h2 className="statistics-insights-title">{t('settings.statistics.insights.title')}</h2>
                <p className="statistics-insights-subtitle">{t('settings.statistics.insights.subtitle')}</p>
              </div>
              
              {/* Топ-3 самых активных желания */}
              <div className="statistics-top3">
                <h3 className="statistics-top3-title">
                  {t('settings.statistics.insights.topActive')}
                  <span className="statistics-insight-hint" title={t('settings.statistics.insights.topActiveHint')}>
                    ℹ️
                  </span>
                </h3>
                <div className="statistics-top3-list">
                    {desires
                    .filter(d => !d.isCompleted)
                    .sort((a, b) => b.avgActivityPerDay - a.avgActivityPerDay)
                    .slice(0, 3)
                    .map((desire, index) => {
                      const indicator = getActivityIndicator(desire.avgActivityPerDay, statLocale);
                      return (
                        <div key={desire.id} className="statistics-top3-item">
                          <span className="statistics-top3-rank">#{index + 1}</span>
                          <span className="statistics-top3-icon">{indicator.icon}</span>
                          <span className="statistics-top3-name">{desire.title}</span>
                          <div className="statistics-top3-details">
                            <span className="statistics-top3-metric" style={{ color: indicator.color }}>
                              {indicator.label}
                            </span>
                            <span className="statistics-top3-frequency">{indicator.frequency}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Корреляция: выполненные желания vs активность */}
              {desires.filter(d => d.isCompleted && d.daysUntilCompleted).length > 0 && (
                <div className="statistics-correlation">
                  <h3 className="statistics-correlation-title">
                    <span className="statistics-correlation-icon">📈</span>
                    {t('settings.statistics.insights.completedPattern')}
                    <span className="statistics-insight-hint" title={t('settings.statistics.insights.correlationHint')}>
                      ℹ️
                    </span>
                  </h3>
                  <div className="statistics-correlation-content">
                    {(() => {
                      const completed = desires.filter(d => d.isCompleted && d.daysUntilCompleted);
                      const avgDaysToComplete = Math.round(
                        completed.reduce((sum, d) => sum + (d.daysUntilCompleted || 0), 0) / completed.length
                      );
                      const avgActivityCompleted = completed.reduce((sum, d) => sum + d.avgActivityPerDay, 0) / completed.length;
                      
                      // Определяем, есть ли корреляция: более активные желания выполняются быстрее?
                      const highActivityCompleted = completed.filter(d => d.avgActivityPerDay >= 2);
                      const lowActivityCompleted = completed.filter(d => d.avgActivityPerDay < 2);
                      
                      let insight = '';
                      if (highActivityCompleted.length > 0 && lowActivityCompleted.length > 0) {
                        const avgDaysHigh = highActivityCompleted.reduce((sum, d) => sum + (d.daysUntilCompleted || 0), 0) / highActivityCompleted.length;
                        const avgDaysLow = lowActivityCompleted.reduce((sum, d) => sum + (d.daysUntilCompleted || 0), 0) / lowActivityCompleted.length;
                        
                        if (avgDaysHigh < avgDaysLow) {
                          insight = t('settings.statistics.insights.insight1', {
                            faster: Math.round(avgDaysLow - avgDaysHigh)
                          });
                        }
                      }
                      
                      return (
                        <>
                          <p className="statistics-correlation-text">
                            {t('settings.statistics.insights.completedInfo', {
                              avgDays: avgDaysToComplete,
                              avgActivity: avgActivityCompleted.toFixed(1),
                              count: completed.length
                            })}
                          </p>
                          {insight && (
                            <p className="statistics-correlation-insight">
                              💡 {insight}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Горячие желания */}
              {desires.filter(d => d.isHot).length > 0 && (
                <div className="statistics-hot-section">
                  <h3 className="statistics-hot-title">🔥 {t('settings.statistics.insights.hotWishes')}</h3>
                  <p className="statistics-hot-text">
                    {t('settings.statistics.insights.hotInfo', { count: desires.filter(d => d.isHot).length })}
                  </p>
                  <div className="statistics-hot-list">
                    {desires
                      .filter(d => d.isHot)
                      .map(desire => (
                        <div key={desire.id} className="statistics-hot-item">
                          <span className="statistics-hot-name">{desire.title}</span>
                          <span className="statistics-hot-metric">
                            {desire.avgActivityPerDay.toFixed(1)} {t('settings.statistics.insights.perDay')}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="statistics-grid">
            {desires.map((desire) => {
              const mainImage = getMainImage(desire);
              
              return (
                <div
                  key={desire.id}
                  className="statistics-card"
                  onClick={() => handleDesireClick(desire.id)}
                >
                  {mainImage && (
                    <div className="statistics-card-image">
                      <img src={mainImage} alt={desire.title} />
                      {desire.isCompleted && (
                        <div className="statistics-card-completed-badge">✓</div>
                      )}
                    </div>
                  )}
                  {!mainImage && (
                    <div className="statistics-card-image statistics-card-image-placeholder">
                      {desire.title.charAt(0).toUpperCase()}
                      {desire.isCompleted && (
                        <div className="statistics-card-completed-badge">✓</div>
                      )}
                    </div>
                  )}
                  <div className="statistics-card-content">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h3 className="statistics-card-title">{desire.title}</h3>
                      {desire.isHot && (
                        <span className="statistics-hot-badge" title={t('settings.statistics.hotTooltip')}>
                          🔥
                        </span>
                      )}
                    </div>
                    
                    {/* Прогресс-бар активности */}
                    <div className="statistics-activity-bar" title={t('settings.statistics.activityTooltip')}>
                      <div className="statistics-activity-bar-label">
                        <span>{t('settings.statistics.activity')}</span>
                        <span>{desire.activityPercent}%</span>
                      </div>
                      <div className="statistics-activity-bar-track">
                        <div 
                          className="statistics-activity-bar-fill"
                          style={{ width: `${desire.activityPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Индикатор активности с понятными метками */}
                    {(() => {
                      const indicator = getActivityIndicator(desire.avgActivityPerDay, statLocale);
                      const comparison = compareWithAverage(desire.avgActivityPerDay, averageActivityAll);
                      
                      return (
                        <div className="statistics-activity-indicator" style={{ borderLeftColor: indicator.color }}>
                          <div className="statistics-indicator-header">
                            <span className="statistics-indicator-icon">{indicator.icon}</span>
                            <div className="statistics-indicator-info">
                              <div className="statistics-indicator-label">{indicator.label}</div>
                              <div className="statistics-indicator-frequency">{indicator.frequency}</div>
                            </div>
                            {comparison === 'above' && (
                              <span className="statistics-comparison-badge statistics-comparison-above" title={t('settings.statistics.aboveAverage')}>
                                ⬆
                              </span>
                            )}
                            {comparison === 'below' && (
                              <span className="statistics-comparison-badge statistics-comparison-below" title={t('settings.statistics.belowAverage')}>
                                ⬇
                              </span>
                            )}
                          </div>
                          <div className="statistics-indicator-recommendation">
                            {indicator.recommendation}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Для выполненных желаний - показать статистику за период */}
                    {desire.isCompleted && desire.daysUntilCompleted && (
                      <div className="statistics-completed-info">
                        <span className="statistics-completed-icon">✨</span>
                        <span className="statistics-completed-text">
                          {t('settings.statistics.statisticsFor')} {formatStatValue(desire.daysUntilCompleted, 'days', statLocale)}
                        </span>
                      </div>
                    )}

                    <div className="statistics-card-stats">
                      <div className="statistics-stat-item" title={t('settings.statistics.entriesTooltip')}>
                        <span className="statistics-stat-icon">📝</span>
                        <span className="statistics-stat-value">
                          {formatStatValue(desire.entryCount, 'entries', statLocale)}
                        </span>
                      </div>
                      <div className="statistics-stat-item" title={t('settings.statistics.thoughtsTooltip')}>
                        <span className="statistics-stat-icon">💭</span>
                        <span className="statistics-stat-value">
                          {formatStatValue(desire.thoughtCount, 'thoughts', statLocale)}
                        </span>
                      </div>
                      <div className="statistics-stat-item" title={t('settings.statistics.stepsTooltip')}>
                        <span className="statistics-stat-icon">👣</span>
                        <span className="statistics-stat-value">
                          {desire.actionItemsProgress 
                            ? `${desire.actionItemsProgress.completed}/${desire.actionItemsProgress.total}`
                            : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Кнопка "Активность" */}
                    <div className="statistics-card-activity-button-container">
                      <button
                        type="button"
                        className="statistics-card-activity-button"
                        onClick={(e) => handleActivityClick(e, desire)}
                      >
                        📅 {t('activityCalendar.button')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Модальное окно календаря активности */}
      {selectedDesireForCalendar && (
        <ActivityCalendarModal
          isOpen={activityCalendarOpen}
          onClose={handleCloseActivityCalendar}
          desireId={selectedDesireForCalendar.id}
          desireTitle={selectedDesireForCalendar.title}
        />
      )}
    </>
  );
}

