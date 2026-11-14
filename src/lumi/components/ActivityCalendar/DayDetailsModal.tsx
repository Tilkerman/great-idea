import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import { formatLongDate } from '../../utils/date';
import type { Contact } from '../../types';
import './ActivityCalendarModal.css';

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
  contacts: Contact[];
}

export default function DayDetailsModal({
  isOpen,
  onClose,
  date,
  contacts,
}: DayDetailsModalProps) {
  const { t, locale } = useI18n();

  // Группируем контакты по типам
  const contactsByType = useMemo(() => {
    const grouped: {
      thought?: Contact;
      entry?: Contact;
      step?: Contact;
    } = {};

    contacts.forEach((contact) => {
      const normalizedType = contact.type === 'note' ? 'entry' : contact.type;
      if (normalizedType === 'thought' || normalizedType === 'entry' || normalizedType === 'step') {
        if (!grouped[normalizedType]) {
          grouped[normalizedType] = contact;
        }
      }
    });

    return grouped;
  }, [contacts]);

  const hasThought = !!contactsByType.thought;
  const hasEntry = !!contactsByType.entry;
  const hasStep = !!contactsByType.step;

  const formatDateLabel = (dateStr: string): string => {
    return formatLongDate(new Date(dateStr + 'T00:00:00'), locale);
  };

  const truncateText = (text: string | null, maxLength: number = 60): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (!isOpen) return null;

  return (
    <div className="day-details-overlay" onClick={onClose}>
      <div className="day-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="day-details-header">
          <h3 className="day-details-title">{formatDateLabel(date)}</h3>
          <button
            type="button"
            className="day-details-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        <div className="day-details-content">
          {contacts.length === 0 ? (
            <div className="day-details-empty">{t('activityCalendar.dayDetails.noActivity')}</div>
          ) : (
            <div className="day-details-list">
              <div className={`day-details-item ${hasThought ? 'day-details-item-yes' : 'day-details-item-no'}`}>
                <span className="day-details-icon">💭</span>
                <div className="day-details-item-content">
                  <div className="day-details-item-label">{t('activityCalendar.dayDetails.thought')}</div>
                  <div className="day-details-item-status">
                    {hasThought ? t('activityCalendar.dayDetails.yes') : t('activityCalendar.dayDetails.no')}
                  </div>
                  {hasThought && contactsByType.thought?.text && (
                    <div className="day-details-item-text">
                      {truncateText(contactsByType.thought.text)}
                    </div>
                  )}
                </div>
              </div>

              <div className={`day-details-item ${hasEntry ? 'day-details-item-yes' : 'day-details-item-no'}`}>
                <span className="day-details-icon">📝</span>
                <div className="day-details-item-content">
                  <div className="day-details-item-label">{t('activityCalendar.dayDetails.entry')}</div>
                  <div className="day-details-item-status">
                    {hasEntry ? t('activityCalendar.dayDetails.yes') : t('activityCalendar.dayDetails.no')}
                  </div>
                  {hasEntry && contactsByType.entry?.text && (
                    <div className="day-details-item-text">
                      {truncateText(contactsByType.entry.text)}
                    </div>
                  )}
                </div>
              </div>

              <div className={`day-details-item ${hasStep ? 'day-details-item-yes' : 'day-details-item-no'}`}>
                <span className="day-details-icon">👣</span>
                <div className="day-details-item-content">
                  <div className="day-details-item-label">{t('activityCalendar.dayDetails.step')}</div>
                  <div className="day-details-item-status">
                    {hasStep ? t('activityCalendar.dayDetails.yes') : t('activityCalendar.dayDetails.no')}
                  </div>
                  {hasStep && contactsByType.step?.text && (
                    <div className="day-details-item-text">
                      {truncateText(contactsByType.step.text)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="day-details-footer">
          <button type="button" className="day-details-close-button" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

