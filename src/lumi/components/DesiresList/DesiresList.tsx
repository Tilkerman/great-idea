import { useState, useEffect } from 'react';
import type { Desire, LifeArea } from '../../types';
import { desireService, contactService, actionItemService } from '../../services/db';
import Header from '../Header/Header';
import ContactIndicators from '../ContactIndicators/ContactIndicators';
import './DesiresList.css';
import { getWishNoun, useI18n } from '../../i18n';

interface DesiresListProps {
  onDesireClick: (desire: Desire) => void;
  onAddDesire: () => void;
  onBack?: () => void;
  useAreaBorderColors?: boolean;
  filterArea?: LifeArea | null;
  onSettingsClick?: () => void;
  onGoHome?: () => void;
  showCompleted?: boolean; // Показывать только выполненные желания
}

interface DesireWithContacts extends Desire {
  last7Days: Array<{ date: string; types: Array<'entry' | 'thought' | 'step'> }>;
  hasTodayContact: boolean; // есть ли контакт за сегодня
  actionItemsProgress?: { completed: number; total: number }; // прогресс по action items
}

const AREA_COLORS: Record<LifeArea, string> = {
  health: '#49a078',
  love: '#f2b6c6',
  growth: '#5a7ba7',
  family: '#9aa0a6',
  home: '#58c6d6',
  work: '#2d4f7a',
  hobby: '#f4c542',
  finance: '#c44d58',
};

export default function DesiresList({
  onDesireClick,
  onAddDesire,
  onBack,
  useAreaBorderColors,
  filterArea,
  onSettingsClick,
  onGoHome,
  showCompleted = false,
}: DesiresListProps) {
  const { t, locale } = useI18n();
  const [desires, setDesires] = useState<DesireWithContacts[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDesires = async () => {
    setIsLoading(true);
    try {
      let allDesires = showCompleted 
        ? await desireService.getCompletedDesires()
        : await desireService.getAllDesires();

      if (filterArea) {
        allDesires = allDesires.filter((d) => d.area === filterArea);
      }
      
      // Проверяем время - если после 23:00, сбрасываем все isActive (только для активных желаний)
      if (!showCompleted) {
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour >= 23) {
          // После 23:00 сбрасываем все флаги isActive
          await Promise.all(
            allDesires
              .filter((d) => d.isActive)
              .map((d) => desireService.updateDesire(d.id, { isActive: false }))
          );
          // Перезагружаем желания после сброса
          allDesires = await desireService.getAllDesires();
          if (filterArea) {
            allDesires = allDesires.filter((d) => d.area === filterArea);
          }
        }
      }

      // Загружаем контакты для каждого желания
      const now = new Date();
      const currentHour = now.getHours();
      
      const desiresWithContacts = await Promise.all(
        allDesires.map(async (desire) => {
          // Сводка по последним 7 дням
          const last7Days = await contactService.getLast7DaysSummary(desire.id);
          const today = last7Days[last7Days.length - 1];
          const hasTodayContact = (today?.types?.length ?? 0) > 0;
          
          // Если есть контакт сегодня и время до 23:00, автоматически устанавливаем isActive
          // (может быть несколько желаний в фокусе одновременно)
          if (hasTodayContact && currentHour < 23 && !desire.isActive) {
            await desireService.updateDesire(desire.id, { isActive: true });
            desire.isActive = true;
          }
          
          // НЕ создаём контакт автоматически при загрузке!
          // Контакт создаётся ТОЛЬКО при явном действии пользователя
          
          // Загружаем action items для подсчета прогресса
          const actionItems = await actionItemService.getActionItemsByDesire(desire.id);
          const actionItemsProgress = actionItems.length > 0
            ? {
                completed: actionItems.filter(item => item.isCompleted).length,
                total: actionItems.length
              }
            : undefined;
          
          return { 
            ...desire, 
            last7Days,
            hasTodayContact,
            actionItemsProgress,
          };
        })
      );

      setDesires(desiresWithContacts);
    } catch (error) {
      console.error('Ошибка при загрузке желаний:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDesires();
  }, [filterArea, showCompleted]); // loadDesires использует эти зависимости внутри

  const handleDesireClick = async (desire: Desire) => {
    // При клике на желание устанавливаем его "в фокусе" (если время до 23:00 и желание не выполнено)
    // Может быть несколько желаний в фокусе одновременно
    // НО НЕ создаём контакт автоматически! Контакт создаётся только при явном действии.
    if (!showCompleted && !desire.isCompleted) {
      const now = new Date();
      const currentHour = now.getHours();
      
      if (currentHour < 23) {
        // Активируем текущее желание (может быть несколько желаний в фокусе одновременно)
        await desireService.updateDesire(desire.id, { isActive: true });
        
        // НЕ создаём контакт автоматически!
        // Контакт создаётся ТОЛЬКО при явном действии пользователя:
        // - нажатие кнопки "Мысли сегодня" на странице деталей
        // - добавление/изменение Записи
        // - добавление/изменение Шага
        
        // Перезагружаем список для обновления индикаторов
        await loadDesires();
      }
    }
    
    // Открываем детальный экран желания
    onDesireClick(desire);
  };

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    } else {
      alert(t('settings.comingSoon'));
    }
  };

  if (isLoading) {
    return (
      <>
        <Header
          leftSlot={
            onBack ? (
              <button type="button" className="desires-list-back" onClick={onBack}>
                ← {t('common.back')}
              </button>
            ) : null
          }
          onLogoClick={onGoHome}
          onSettingsClick={handleSettingsClick}
        />
        <div className="desires-list-container">
          <div className="loading">{t('common.loading')}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        leftSlot={
          onBack ? (
            <button type="button" className="desires-list-back" onClick={onBack}>
              ← {t('common.back')}
            </button>
          ) : null
        }
        onLogoClick={onGoHome}
        onSettingsClick={handleSettingsClick}
      />
      <div className="desires-list-container">
        {/* Блок информации под шапкой */}
        <div className="desires-info-block">
          {/* Количество желаний */}
          <p className="desires-count">
            {showCompleted 
              ? t('desires.completed.count', { count: desires.length, noun: getWishNoun(desires.length, locale) })
              : t('desires.count', { count: desires.length, noun: getWishNoun(desires.length, locale) })
            }
          </p>

          {/* Пояснение фокуса - только для активных желаний */}
          {!showCompleted && (
            <>
              <p className="desires-focus-instruction">
                {t('desires.chooseFocus')}
              </p>
              <p className="desires-focus-hint">
                {t('desires.focusHint')}
              </p>
            </>
          )}
        </div>

        {/* Карточки желаний */}
        <div className="desires-list">
          {desires.length === 0 ? (
            <div className="empty-state">
              <p>{t('desires.empty.title')}</p>
              <p className="empty-state-hint">{t('desires.empty.hint')}</p>
            </div>
          ) : (
            desires.map((desire) => (
              <div
                key={desire.id}
                className={`desire-card ${desire.isActive ? 'desire-card-focused' : ''}`}
                style={
                  useAreaBorderColors && desire.area
                    ? { borderColor: AREA_COLORS[desire.area], borderWidth: 2 }
                    : undefined
                }
                onClick={() => handleDesireClick(desire)}
              >
                {/* Верхняя часть: название и бейдж */}
                <div className="desire-card-header">
                  {/* Название желания - главный визуальный якорь */}
                  <h2 className="desire-card-title">{desire.title}</h2>
                  
                  {/* Метка "Сегодня в фокусе" - сверху справа */}
                  {desire.isActive && (
                    <div className="desire-card-focus-badge">
                      <span className="focus-checkmark">✓</span>
                      <span className="focus-text">{t('desires.focusBadge')}</span>
                    </div>
                  )}
                </div>

                <div className="desire-card-content">
                  {/* Превью-изображение - слева */}
                  <div className="desire-card-image">
                    {(() => {
                      // Получаем первое изображение из массива images или из imageUrl (legacy)
                      const firstImage = desire.images && desire.images.length > 0
                        ? desire.images.sort((a, b) => a.order - b.order)[0]
                        : null;
                      const imageUrl = firstImage?.url || desire.imageUrl;
                      
                      return imageUrl ? (
                        <img src={imageUrl} alt={desire.title} />
                      ) : (
                        <div className="desire-card-image-placeholder"></div>
                      );
                    })()}
                  </div>

                  {/* Блок "Контакт за 7 дней" - справа */}
                  <div className="desire-card-contacts-block">
                    <p className="desire-card-contacts-label">{t('desires.contact7days')}</p>
                    <ContactIndicators
                      days={desire.last7Days}
                      mode="byType"
                      size="small"
                      actionItemsProgress={desire.actionItemsProgress}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Кнопка добавления желания - закреплена внизу */}
      <div className="desires-list-add-button-container">
        <button className="desires-list-add-button" onClick={onAddDesire}>
          {t('desires.add')}
        </button>
      </div>
    </>
  );
}
