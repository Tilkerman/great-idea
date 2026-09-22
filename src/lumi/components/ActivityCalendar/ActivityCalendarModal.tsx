import { useState, useEffect, useMemo } from 'react';
import { contactService, desireService } from '../../services/db';
import { useI18n } from '../../i18n';
import { toLocalDateString } from '../../utils/date';
import type { Contact } from '../../types';
import DayDetailsModal from './DayDetailsModal';
import './ActivityCalendarModal.css';

interface ActivityCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  desireId: string;
  desireTitle: string;
}

interface DayData {
  date: string; // YYYY-MM-DD
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  activityCount: number; // количество действий в этот день
  isBeforeCreation: boolean; // день до создания желания
  isCreationDate: boolean; // день создания желания
}

export default function ActivityCalendarModal({
  isOpen,
  onClose,
  desireId,
  desireTitle,
}: ActivityCalendarModalProps) {
  const { t, locale } = useI18n();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [desireCreatedAt, setDesireCreatedAt] = useState<string | null>(null);

  // Загружаем контакты и устанавливаем начальный месяц при открытии модала
  useEffect(() => {
    if (isOpen) {
      loadContacts();
      initializeMonth();
    }
  }, [isOpen, desireId]);

  // Инициализируем месяц: показываем последние 3-6 месяцев + месяц создания желания
  const initializeMonth = async () => {
    try {
      const desire = await desireService.getDesireById(desireId);
      if (!desire) return;

      const createdAt = new Date(desire.createdAt);
      const createdAtStr = toLocalDateString(createdAt);
      setDesireCreatedAt(createdAtStr);
      
      const today = new Date();
      
      // Вычисляем разницу в месяцах между созданием и сегодня
      const monthsDiff = (today.getFullYear() - createdAt.getFullYear()) * 12 + 
                         (today.getMonth() - createdAt.getMonth());
      
      // Показываем минимум 3 месяца назад, максимум 6, но не раньше месяца создания
      let startMonthOffset = Math.min(6, Math.max(3, monthsDiff));
      
      // Если желание создано меньше 3 месяцев назад, показываем месяц создания
      if (monthsDiff < 3) {
        startMonthOffset = 0;
      }
      
      // Устанавливаем начальный месяц (сегодня минус offset месяцев)
      const initialMonth = new Date(today.getFullYear(), today.getMonth() - startMonthOffset, 1);
      setCurrentMonth(initialMonth);
    } catch (error) {
      console.error('Ошибка при инициализации месяца:', error);
      // В случае ошибки показываем текущий месяц
      setCurrentMonth(new Date());
    }
  };

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const allContacts = await contactService.getAllContacts(desireId);
      setContacts(allContacts);
    } catch (error) {
      console.error('Ошибка при загрузке контактов:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Получаем контакты для конкретной даты
  const getContactsForDate = (date: string): Contact[] => {
    return contacts.filter((c) => c.date === date);
  };

  // Подсчитываем активность для даты
  const getActivityCount = (date: string): number => {
    const dayContacts = getContactsForDate(date);
    // Считаем уникальные типы контактов (entry/note, thought, step)
    const types = new Set<string>();
    dayContacts.forEach((c) => {
      // 'note' и 'entry' считаем как один тип
      const normalizedType = c.type === 'note' ? 'entry' : c.type;
      types.add(normalizedType);
    });
    return types.size;
  };

  // Получаем цвет для дня в зависимости от активности
  const getDayColor = (date: string, isCurrentMonth: boolean): string => {
    if (!isCurrentMonth) {
      return '#E0E0E0'; // серый для дней другого месяца
    }

    const activityCount = getActivityCount(date);
    
    if (activityCount === 0) {
      return '#E0E0E0'; // нет активности
    } else if (activityCount === 1) {
      return '#FFCA28'; // низкая/средняя (1 действие)
    } else if (activityCount === 2) {
      return '#81C784'; // хорошая (2 действия)
    } else {
      return '#4CAF50'; // высокая (3+ действий)
    }
  };

  // Генерируем календарь для текущего месяца
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Первый день месяца
    const firstDay = new Date(year, month, 1);
    // Последний день месяца
    const lastDay = new Date(year, month + 1, 0);
    
    // День недели первого дня (0 = воскресенье, нужно преобразовать: 0 -> 6, 1-6 -> 0-5)
    let firstDayOfWeek = firstDay.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // ПН = 0, ВС = 6
    
    const days: DayData[] = [];
    
    // Дни предыдущего месяца
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(year, month - 1, day);
      const dateStr = toLocalDateString(date);
      const isBeforeCreation = desireCreatedAt ? dateStr < desireCreatedAt : false;
      const isCreationDate = desireCreatedAt ? dateStr === desireCreatedAt : false;
      days.push({
        date: dateStr,
        day,
        isCurrentMonth: false,
        isToday: false,
        activityCount: getActivityCount(dateStr),
        isBeforeCreation,
        isCreationDate,
      });
    }
    
    // Дни текущего месяца
    const today = new Date();
    const todayStr = toLocalDateString(today);
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = toLocalDateString(date);
      const isBeforeCreation = desireCreatedAt ? dateStr < desireCreatedAt : false;
      const isCreationDate = desireCreatedAt ? dateStr === desireCreatedAt : false;
      days.push({
        date: dateStr,
        day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        activityCount: getActivityCount(dateStr),
        isBeforeCreation,
        isCreationDate,
      });
    }
    
    // Дни следующего месяца (чтобы заполнить последнюю неделю)
    const totalCells = Math.ceil(days.length / 7) * 7;
    let nextMonthDay = 1;
    while (days.length < totalCells) {
      const date = new Date(year, month + 1, nextMonthDay);
      const dateStr = toLocalDateString(date);
      const isBeforeCreation = desireCreatedAt ? dateStr < desireCreatedAt : false;
      const isCreationDate = desireCreatedAt ? dateStr === desireCreatedAt : false;
      days.push({
        date: dateStr,
        day: nextMonthDay,
        isCurrentMonth: false,
        isToday: false,
        activityCount: getActivityCount(dateStr),
        isBeforeCreation,
        isCreationDate,
      });
      nextMonthDay++;
    }
    
    return days;
  }, [currentMonth, contacts, desireCreatedAt]);

  // Название месяца и года
  const monthYearLabel = useMemo(() => {
    const monthNames = locale === 'ru' 
      ? ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  }, [currentMonth, locale]);

  // Дни недели
  const weekDays = locale === 'ru' 
    ? ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Форматирование даты для отображения
  const formatDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    const monthNames = locale === 'ru'
      ? ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    const today = new Date();
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    // Не позволяем перейти дальше текущего месяца
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    if (nextMonth <= currentMonthStart) {
      setCurrentMonth(nextMonth);
    }
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleCloseDayDetails = () => {
    setSelectedDate(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="activity-calendar-overlay" onClick={onClose}>
        <div className="activity-calendar-modal" onClick={(e) => e.stopPropagation()}>
          <div className="activity-calendar-header">
            <h2 className="activity-calendar-title">
              {t('activityCalendar.title', { title: desireTitle })}
            </h2>
            <button
              type="button"
              className="activity-calendar-close"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              ×
            </button>
          </div>

          <div className="activity-calendar-content">
            {isLoading ? (
              <div className="activity-calendar-loading">{t('common.loading')}</div>
            ) : (
              <>
                <div className="activity-calendar-month-header">
                  <button
                    type="button"
                    className="activity-calendar-nav-button"
                    onClick={handlePrevMonth}
                    aria-label={t('activityCalendar.prevMonth')}
                  >
                    &lt;
                  </button>
                  <h3 className="activity-calendar-month-title">{monthYearLabel}</h3>
                  <button
                    type="button"
                    className="activity-calendar-nav-button"
                    onClick={handleNextMonth}
                    aria-label={t('activityCalendar.nextMonth')}
                  >
                    &gt;
                  </button>
                </div>

                <div className="activity-calendar-weekdays">
                  {weekDays.map((day) => (
                    <div key={day} className="activity-calendar-weekday">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="activity-calendar-grid">
                  {calendarDays.map((dayData) => {
                    const color = getDayColor(dayData.date, dayData.isCurrentMonth);
                    const classes = [
                      'activity-calendar-day',
                      !dayData.isCurrentMonth ? 'activity-calendar-day-other-month' : '',
                      dayData.isToday ? 'activity-calendar-day-today' : '',
                      dayData.isBeforeCreation ? 'activity-calendar-day-before-creation' : '',
                      dayData.isCreationDate ? 'activity-calendar-day-creation' : '',
                    ].filter(Boolean).join(' ');
                    
                    return (
                      <button
                        key={dayData.date}
                        type="button"
                        className={classes}
                        style={{ backgroundColor: color }}
                        onClick={() => handleDayClick(dayData.date)}
                        aria-label={`${dayData.day} ${monthYearLabel}`}
                        disabled={dayData.isBeforeCreation}
                      >
                        <span className="activity-calendar-day-number">{dayData.day}</span>
                        {dayData.isCreationDate && (
                          <span className="activity-calendar-creation-badge" title={t('activityCalendar.creationDate')}>✨</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Информация о дате создания */}
                {desireCreatedAt && (
                  <div className="activity-calendar-creation-info">
                    <span className="activity-calendar-creation-icon">✨</span>
                    <span className="activity-calendar-creation-text">
                      {t('activityCalendar.createdOn', { date: formatDateLabel(desireCreatedAt) })}
                    </span>
                  </div>
                )}

                {/* Легенда */}
                <div className="activity-calendar-legend">
                  <div className="activity-calendar-legend-item">
                    <div className="activity-calendar-legend-circle" style={{ backgroundColor: '#E0E0E0' }}></div>
                    <span>{t('activityCalendar.legend.noActivity')}</span>
                  </div>
                  <div className="activity-calendar-legend-item">
                    <div className="activity-calendar-legend-circle" style={{ backgroundColor: '#FFCA28' }}></div>
                    <span>{t('activityCalendar.legend.lowActivity')}</span>
                  </div>
                  <div className="activity-calendar-legend-item">
                    <div className="activity-calendar-legend-circle" style={{ backgroundColor: '#81C784' }}></div>
                    <span>{t('activityCalendar.legend.mediumActivity')}</span>
                  </div>
                  <div className="activity-calendar-legend-item">
                    <div className="activity-calendar-legend-circle" style={{ backgroundColor: '#4CAF50' }}></div>
                    <span>{t('activityCalendar.legend.highActivity')}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {selectedDate && (
        <DayDetailsModal
          isOpen={!!selectedDate}
          onClose={handleCloseDayDetails}
          date={selectedDate}
          contacts={getContactsForDate(selectedDate)}
        />
      )}
    </>
  );
}
