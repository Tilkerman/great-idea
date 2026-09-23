import { useState, useEffect, useMemo } from 'react';
import type { Desire, Contact, DesireImage, ActionItem } from '../../types';
import { desireService, contactService, actionItemService } from '../../services/db';
import ImageGallery from '../ImageGallery/ImageGallery';
import { formatDate, getTodayDateString } from '../../utils/date';
import './DesireDetail.css';
import { useI18n } from '../../i18n';
import Header from '../Header/Header';

interface DesireDetailProps {
  desireId: string;
  onBack: () => void;
  onSettingsClick?: () => void;
  onGoHome?: () => void;
  onEdit?: () => void;
}

export default function DesireDetail({ desireId, onBack, onSettingsClick, onGoHome, onEdit }: DesireDetailProps) {
  const { t, locale } = useI18n();
  const [desire, setDesire] = useState<Desire | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  
  // Сегодняшние контакты
  const [todayEntry, setTodayEntry] = useState<Contact | null>(null);
  const [todayThought, setTodayThought] = useState<Contact | null>(null);
  const [entryText, setEntryText] = useState('');
  
  // История контактов (все, но без сегодняшних)
  const [entryHistory, setEntryHistory] = useState<Contact[]>([]);
  const [thoughtHistory, setThoughtHistory] = useState<Contact[]>([]);
  
  // Состояния для модальных окон истории
  const [showEntryHistory, setShowEntryHistory] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveConfirmation, setSaveConfirmation] = useState<string | null>(null);
  
  // Состояние для шагов (action items)
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  // IMPORTANT: хуки должны вызываться всегда, поэтому вычисления для details делаем до ранних return'ов
  const detailsText = (desire?.details || '').trim();
  const hasDetails = detailsText.length > 0;
  const detailsShouldClamp = useMemo(() => {
    if (!detailsText) return false;
    const lines = detailsText.split('\n').length;
    return lines > 6 || detailsText.length > 320;
  }, [detailsText]);

  useEffect(() => {
    loadDesire();
  }, [desireId]);

  // Обновляем данные при возврате на экран (например, после переключения вкладки),
  // но НЕ во время открытых модалок — иначе выбор файла (input type="file") может не успеть обработаться.
  useEffect(() => {
    const handleFocus = () => {
      if (showEntryHistory) {
        return;
      }
      loadDesire();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [desireId, showEntryHistory]);

  const loadDesire = async () => {
    setIsLoading(true);
    try {
      const loadedDesire = await desireService.getDesireById(desireId);
      if (!loadedDesire) {
        onBack();
        return;
      }

      setDesire(loadedDesire);
      
      // Загружаем шаги
      const items = await actionItemService.getActionItemsByDesire(desireId);
      setActionItems(items);

      // Загружаем сегодняшние контакты
      const todayEntryContact = await contactService.getTodayContact(desireId, 'entry');
      const todayThoughtContact = await contactService.getTodayContact(desireId, 'thought');
      
      if (todayEntryContact) {
        setTodayEntry(todayEntryContact);
        setEntryText(todayEntryContact.text || '');
      } else {
        setTodayEntry(null);
        setEntryText('');
      }
      
      setTodayThought(todayThoughtContact || null);

      // Загружаем историю контактов (все для каждого типа, исключая сегодняшние)
      const today = getTodayDateString();
      const entryContacts = await contactService.getContactsByType(desireId, 'entry');
      const thoughtContacts = await contactService.getContactsByType(desireId, 'thought');
      
      // Исключаем сегодняшние записи из истории
      setEntryHistory(entryContacts.filter(c => c.date !== today));
      setThoughtHistory(thoughtContacts.filter(c => c.date !== today));
    } catch (error) {
      console.error('Ошибка при загрузке желания:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEntry = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!desire) return;
    
    // Сохраняем текущую позицию скролла
    const scrollPosition = window.scrollY;
    
    setIsSaving(true);
    try {
      const textToSave = entryText.trim();
      
      // Если текст пустой и был сохранён контакт ранее - удаляем контакт
      // Если текст есть - создаём/обновляем контакт
      if (!textToSave && todayEntry) {
        // Удаляем контакт, если текст пустой
        await contactService.deleteContact(todayEntry.id);
        setSaveConfirmation('entry');
        setTimeout(() => setSaveConfirmation(null), 2000);
      } else if (textToSave) {
        // Создаём/обновляем контакт только если есть текст
        await contactService.createOrUpdateContact(desire.id, 'entry', textToSave);
        setSaveConfirmation('entry');
        setTimeout(() => setSaveConfirmation(null), 2000);
      }
      
      await loadDesire();
      
      // Восстанавливаем позицию скролла после перезагрузки
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollPosition, behavior: 'auto' });
      });
    } catch (error) {
      console.error('Ошибка при сохранении записи:', error);
      alert(t('detail.error.saveNote'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleThoughtClick = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!desire || todayThought) return; // Уже есть контакт за сегодня
    
    // Сохраняем текущую позицию скролла
    const scrollPosition = window.scrollY;
    
    setIsSaving(true);
    try {
      await contactService.createOrUpdateContact(desire.id, 'thought', null);
      setSaveConfirmation('thought');
      setTimeout(() => setSaveConfirmation(null), 2000);
      await loadDesire();
      
      // Восстанавливаем позицию скролла после перезагрузки
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollPosition, behavior: 'auto' });
      });
    } catch (error) {
      console.error('Ошибка при сохранении мыслей:', error);
    } finally {
      setIsSaving(false);
    }
  };



  const handleDeleteDesire = async () => {
    if (!desire) return;
    
    const confirmed = window.confirm(t('detail.deleteConfirm', { title: desire.title }));
    if (!confirmed) return;

    try {
      await desireService.deleteDesire(desire.id);
      onBack();
    } catch (error) {
      console.error('Ошибка при удалении желания:', error);
      alert(t('detail.error.deleteWish'));
    }
  };

  const handleMarkAsCompleted = async () => {
    if (!desire) return;
    
    const confirmed = window.confirm(t('detail.completeConfirm', { title: desire.title }));
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await desireService.markAsCompleted(desire.id);
      onBack(); // Возвращаемся на главную страницу
    } catch (error) {
      console.error('Ошибка при пометке желания как выполненного:', error);
      alert(t('detail.error.completeWish'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActionItem = async (id: string, e?: React.ChangeEvent<HTMLInputElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Сохраняем текущую позицию скролла
    const scrollPosition = window.scrollY;
    
    setIsSaving(true);
    try {
      await actionItemService.toggleActionItem(id);
      await loadDesire(); // Перезагружаем данные
      
      // Восстанавливаем позицию скролла после перезагрузки
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollPosition, behavior: 'auto' });
      });
    } catch (error) {
      console.error('Ошибка при переключении шага:', error);
      alert(t('detail.error.toggleStep'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="desire-detail-loading">
        <div>{t('common.loading')}</div>
      </div>
    );
  }

  if (!desire) {
    return null;
  }

  return (
    <div className="desire-detail">
      {/* Шапка с главной страницы */}
      <Header
        onBack={onBack}
        title={desire.title}
      />

      {/* Визуальный якорь - галерея изображений */}
      {(() => {
        // Получаем изображения: сначала из массива images, затем из imageUrl (legacy)
        const images: DesireImage[] = desire.images || [];
        const hasLegacyImage = desire.imageUrl && images.length === 0;
        
        // Если есть legacy imageUrl, добавляем его как первое изображение
        if (hasLegacyImage && desire.imageUrl) {
          images.push({
            id: 'legacy-' + desire.id,
            url: desire.imageUrl,
            order: 0,
          });
        }

        if (images.length === 0) {
          return (
            <div className="desire-detail-visual">
              <div className="desire-detail-visual-placeholder"></div>
            </div>
          );
        }

        return <ImageGallery images={images} title={desire.title} />;
      })()}

      <div className="desire-detail-content">
        {/* Описание желания (важно по Джиканти — показываем сразу) */}
        <div className="desire-detail-section">
          <h2 className="desire-detail-section-title">{t('detail.details.title')}</h2>
          {!hasDetails && (
            <p className="desire-detail-details-hint">{t('detail.details.hint')}</p>
          )}

          <div className="desire-detail-details-box">
            <div
              className={`desire-detail-details-box-content ${detailsExpanded ? 'expanded' : 'clamped'} ${
                hasDetails ? '' : 'empty'
              }`}
            >
              {hasDetails ? detailsText : t('detail.details.notSet')}
            </div>
          </div>

          {detailsShouldClamp && (
            <button
              type="button"
              className="desire-detail-details-toggle"
              onClick={() => setDetailsExpanded((v) => !v)}
            >
              {detailsExpanded ? t('detail.details.showLess') : t('detail.details.showMore')}
            </button>
          )}
        </div>


        {/* Блок записей */}
        <div className="desire-detail-section">
          <div className="desire-detail-section-header">
            <h2 className="desire-detail-section-title">{t('detail.notes.title')}</h2>
            <button
              className="desire-detail-history-button-small"
              onClick={() => setShowEntryHistory(true)}
              title={t('detail.notes.history')}
            >
              {t('detail.notes.history')}
            </button>
          </div>
          <textarea
            className="desire-detail-entry-input"
            value={entryText}
            onChange={(e) => setEntryText(e.target.value)}
            onBlur={(e) => {
              // Предотвращаем скролл при потере фокуса
              e.preventDefault();
              handleSaveEntry();
            }}
            placeholder={t('detail.notes.placeholder')}
            rows={4}
            disabled={isSaving}
          />
          {entryText.trim() !== (todayEntry?.text || '').trim() && entryText.trim() && (
            <button
              type="button"
              className="desire-detail-save-button"
              onClick={handleSaveEntry}
              disabled={isSaving}
            >
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
          )}
          {saveConfirmation === 'entry' && (
            <div className="desire-detail-confirmation">{t('detail.saved')}</div>
          )}
        </div>

        {/* Блок мыслей */}
        <div className="desire-detail-section">
          <h2 className="desire-detail-section-title desire-detail-section-title-spaced">{t('detail.thoughts.title')}</h2>
          <button
            type="button"
            className={`desire-detail-action-button ${todayThought ? 'desire-detail-action-button-done' : ''}`}
            onClick={handleThoughtClick}
            disabled={isSaving || !!todayThought}
          >
            {todayThought ? t('detail.thoughts.done') : t('detail.thoughts.action')}
          </button>
          {saveConfirmation === 'thought' && (
            <div className="desire-detail-confirmation">{t('detail.marked')}</div>
          )}
          {thoughtHistory.length > 0 && (
            <div className="desire-detail-history">
              {thoughtHistory.map((contact) => (
                <div key={contact.id} className="desire-detail-history-item">
                  <span className="desire-detail-history-date">{formatDate(contact.date, locale)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Блок шагов действий (action items) */}
        {actionItems.length > 0 && (
          <div className="desire-detail-section">
            <h2 className="desire-detail-section-title">{t('detail.actionItems.title')}</h2>
            <div className="action-items-checklist">
              {actionItems.map((item) => (
                <label key={item.id} className="action-item-checkbox-label">
                  <input
                    type="checkbox"
                    checked={item.isCompleted}
                    onChange={(e) => handleToggleActionItem(item.id, e)}
                    disabled={isSaving}
                    className="action-item-checkbox"
                  />
                  <span className={`action-item-checkbox-text ${item.isCompleted ? 'completed' : ''}`}>
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
            {actionItems.every((item) => item.isCompleted) && actionItems.length > 0 && (
              <p className="action-items-all-completed">{t('detail.actionItems.allCompleted')}</p>
            )}
          </div>
        )}


        {/* Эмоциональное описание */}
        <div className="desire-detail-section">
          <h2 className="desire-detail-section-title">{t('detail.feelings.title')}</h2>
          <p>{desire.description || t('detail.feelings.notSet')}</p>
        </div>

        {/* Ориентир по времени */}
        {desire.deadline && (
          <div className="desire-detail-section">
            <h2 className="desire-detail-section-title">{t('detail.timeHint.title')}</h2>
            <p className="desire-detail-deadline">
              {new Date(desire.deadline).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p className="desire-detail-deadline-hint">
              {t('detail.timeHint.notDeadline')}
            </p>
          </div>
        )}

        {/* Дополнительные действия */}
        <div className="desire-detail-section">
          <h2 className="desire-detail-section-title desire-detail-section-title-spaced">{t('detail.extra.title')}</h2>
          <div className="desire-detail-actions">
            <button
              className="desire-detail-secondary-button"
              onClick={() => onEdit && onEdit()}
            >
              {t('detail.editWish')}
            </button>
            {!desire.isCompleted && (
              <button
                className="desire-detail-complete-button"
                onClick={handleMarkAsCompleted}
                disabled={isSaving}
              >
                {isSaving ? t('common.saving') : t('detail.completeWish')}
              </button>
            )}
            <button
              className="desire-detail-delete-button"
              onClick={handleDeleteDesire}
            >
              {t('detail.deleteWish')}
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно истории записей */}
      {showEntryHistory && (
        <div className="desire-detail-history-modal-overlay" onClick={() => setShowEntryHistory(false)}>
          <div className="desire-detail-history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="desire-detail-history-modal-header">
              <h2>{t('detail.modal.notesHistory.title')}</h2>
              <button
                className="desire-detail-history-modal-close"
                onClick={() => setShowEntryHistory(false)}
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>
            <div className="desire-detail-history-modal-content">
              {entryHistory.length === 0 ? (
                <p className="desire-detail-history-empty">{t('detail.modal.empty')}</p>
              ) : (
                (() => {
                  // Группируем записи по датам
                  const grouped = entryHistory.reduce((acc, contact) => {
                    const date = contact.date;
                    if (!acc[date]) {
                      acc[date] = [];
                    }
                    acc[date].push(contact);
                    return acc;
                  }, {} as Record<string, Contact[]>);

                  // Сортируем даты по убыванию
                  const sortedDates = Object.keys(grouped).sort((a, b) => 
                    new Date(b).getTime() - new Date(a).getTime()
                  );

                  return sortedDates.map((date) => (
                    <div key={date} className="desire-detail-history-group">
                      <div className="desire-detail-history-group-date">{formatDate(date, locale)}</div>
                      {grouped[date].map((contact) => (
                        <div key={contact.id} className="desire-detail-history-modal-item">
                          {contact.text && (
                            <div className="desire-detail-history-modal-text">{contact.text}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ));
                })()
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

