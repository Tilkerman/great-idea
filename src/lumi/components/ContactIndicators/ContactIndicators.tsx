import './ContactIndicators.css';
import { useI18n } from '../../i18n';
import { formatDate } from '../../utils/date';

interface ContactIndicatorsProps {
  days: Array<{ date: string; types: Array<'entry' | 'thought' | 'step'> }>; // 7 дней (из сервиса приходит oldest -> today)
  size?: 'small' | 'medium' | 'large';
  mode?: 'combined' | 'byType';
  actionItemsProgress?: { completed: number; total: number }; // прогресс по action items (для замены индикатора шагов)
}

/**
 * Индикатор последних 7 дней: каждый кружок = день, цвет = тип контакта.
 */
export default function ContactIndicators({
  days,
  size = 'medium',
  mode = 'byType',
  actionItemsProgress,
}: ContactIndicatorsProps) {
  const { t, locale } = useI18n();
  // Требование: отметки "идут" слева направо, поэтому показываем today слева (newest -> oldest).
  // Данные из сервиса приходят oldest -> today, разворачиваем только для отображения.
  const displayDays = [...days].reverse();

  const buildTitle = (d: { date: string; types: Array<'entry' | 'thought' | 'step'> }) => {
    const types = d.types;
    const typesLabel =
      types.length === 0
        ? t('dots.day.none')
        : types
            .map((x) =>
              x === 'entry' ? t('contacts.entry') : x === 'thought' ? t('contacts.thought') : t('contacts.step')
            )
            .join(', ');
    const dateLabel = formatDate(d.date, locale);
    return t('dots.day.title', { date: dateLabel, types: typesLabel });
  };

  if (mode === 'combined') {
    return (
      <div className={`week-dots week-dots-${size}`}>
        {displayDays.map((d) => {
          const types = d.types;

          let kind: 'none' | 'entry' | 'thought' | 'step' | 'mixed' = 'none';
          if (types.length === 1) kind = types[0];
          else if (types.length > 1) kind = 'mixed';

          const title = buildTitle(d);

          return (
            <span
              key={d.date}
              className={`week-dot week-dot-${kind}`}
              title={title}
              aria-label={title}
            />
          );
        })}
      </div>
    );
  }

  const rows: Array<{ type: 'entry' | 'thought' | 'step' }> = [
    { type: 'entry' },
    { type: 'thought' },
    { type: 'step' },
  ];

  return (
    <div className={`week-dots week-dots-${size} week-dots-bytype`}>
      {rows.map((row) => {
        // Для шагов показываем прогресс action items, если передан
        if (row.type === 'step' && actionItemsProgress) {
          return (
            <div key={row.type} className="week-dots-row">
              <span className="week-dots-row-label" title={t(`contacts.${row.type}` as never)}>
                {t(`contacts.${row.type}` as never)}
              </span>
              <div className="week-dots-row-progress">
                <span className="action-items-progress-text">
                  {actionItemsProgress.completed}/{actionItemsProgress.total}
                </span>
              </div>
            </div>
          );
        }
        
        // Для записей и мыслей показываем индикатор за 7 дней как обычно
        return (
          <div key={row.type} className="week-dots-row">
            <span className="week-dots-row-label" title={t(`contacts.${row.type}` as never)}>
              {t(`contacts.${row.type}` as never)}
            </span>
            <div className="week-dots-row-dots">
              {displayDays.map((d) => {
                const hasType = d.types.includes(row.type);
                const kind = hasType ? row.type : 'none';
                const title = buildTitle(d);

                return (
                  <span
                    key={`${row.type}-${d.date}`}
                    className={`week-dot week-dot-${kind}`}
                    title={title}
                    aria-label={title}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

