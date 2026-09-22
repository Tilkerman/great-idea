import { useState, useRef, useEffect } from 'react';
import type { Desire, DesireImage, LifeArea, ActionItem } from '../../types';
import { desireService, actionItemService } from '../../services/db';
import { newTaskId } from '../../../utils/id';
import './DesireForm.css';
import { useI18n } from '../../i18n';
import Header from '../Header/Header';

interface DesireFormProps {
  onSave: (desireId?: string) => void;
  initialDesire?: Desire;
  onBack?: () => void;
  presetArea?: LifeArea | null;
  onSettingsClick?: () => void;
  onGoHome?: () => void;
}

export default function DesireForm({ onSave, initialDesire, onBack, presetArea, onSettingsClick, onGoHome }: DesireFormProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState(initialDesire?.title || '');
  const [details, setDetails] = useState(initialDesire?.details || '');
  const [description, setDescription] = useState(initialDesire?.description || '');
  // Инициализируем images из initialDesire, учитывая что может быть undefined или пустой массив
  const [images, setImages] = useState<DesireImage[]>(
    initialDesire?.images && Array.isArray(initialDesire.images) 
      ? initialDesire.images 
      : []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  // Состояние для шагов (action items)
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [newActionItemText, setNewActionItemText] = useState('');
  const [editingActionItemId, setEditingActionItemId] = useState<string | null>(null);
  const [editingActionItemText, setEditingActionItemText] = useState('');

  // Загружаем шаги при редактировании существующего желания
  useEffect(() => {
    const loadActionItems = async () => {
      if (initialDesire) {
        const items = await actionItemService.getActionItemsByDesire(initialDesire.id);
        setActionItems(items);
      } else {
        setActionItems([]);
      }
      setNewActionItemText('');
    };
    loadActionItems();
  }, [initialDesire]);

  // Скроллим в самый верх при редактировании (к названию желания).
  // Важно: не трогаем скролл при создании нового желания.
  useEffect(() => {
    if (!initialDesire) return;

    // Небольшая задержка, чтобы компонент успел отрендериться
    const timer = window.setTimeout(() => {
      // Сначала скроллим в самый верх страницы (к началу документа)
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Затем скроллим к полю названия
      window.setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [initialDesire?.id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= 3) {
      alert(t('form.visual.max'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const newImage: DesireImage = {
        id: newTaskId(),
        url: reader.result as string,
        order: images.length,
      };
      setImages([...images, newImage]);
    };
    reader.onerror = () => {
      setError(t('form.error.imageLoad') || 'Ошибка при загрузке изображения');
    };
    reader.readAsDataURL(file);

    // Сбрасываем input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (imageId: string) => {
    const updated = images
      .filter((img) => img.id !== imageId)
      .map((img, index) => ({ ...img, order: index }));
    setImages(updated);
  };

  // Обработчики для шагов
  const handleAddActionItem = () => {
    const draftText = newActionItemText.trim();
    if (!draftText) return;

    setActionItems((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}-${Math.random()}`,
        desireId: initialDesire?.id || '',
        text: draftText,
        isCompleted: false,
        order: prev.length,
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
    ]);
    setNewActionItemText('');
  };

  const buildActionItemsForSave = (): ActionItem[] => {
    const draftText = newActionItemText.trim();
    let items: ActionItem[] = [...actionItems];

    if (draftText) {
      items.push({
        id: `temp-${Date.now()}-${Math.random()}`,
        desireId: initialDesire?.id || '',
        text: draftText,
        isCompleted: false,
        order: items.length,
        createdAt: new Date().toISOString(),
        completedAt: null,
      });
    }

    return items
      .map((it, index) => ({ ...it, text: it.text.trim(), order: index }))
      .filter((it) => Boolean(it.text));
  };

  const handleEditActionItem = (id: string) => {
    const item = actionItems.find((it) => it.id === id);
    if (item) {
      setEditingActionItemId(id);
      setEditingActionItemText(item.text);
    }
  };

  const handleSaveActionItem = (id: string) => {
    if (!editingActionItemText.trim()) return;
    
    setActionItems(
      actionItems.map((it) =>
        it.id === id ? { ...it, text: editingActionItemText.trim() } : it
      )
    );
    setEditingActionItemId(null);
    setEditingActionItemText('');
  };

  const handleDeleteActionItem = (id: string) => {
    setActionItems(actionItems.filter((it) => it.id !== id).map((it, index) => ({ ...it, order: index })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setIsLoading(true);
    try {
      const itemsToSave = buildActionItemsForSave();

      if (initialDesire) {
        // Редактирование существующего желания
        await desireService.updateDesire(initialDesire.id, {
          title: title.trim() || '',
          details: details.trim() || null,
          description: description.trim() || '',
          images: images, // Всегда передаем массив, даже если пустой
        });
        
        // Сохраняем шаги
        const existingItems = await actionItemService.getActionItemsByDesire(initialDesire.id);
        const currentIds = new Set(itemsToSave.map((it) => it.id));
        
        // Удаляем шаги, которых больше нет
        for (const existing of existingItems) {
          if (!currentIds.has(existing.id) && !existing.id.startsWith('temp-')) {
            await actionItemService.deleteActionItem(existing.id);
          }
        }
        
        // Создаём или обновляем шаги
        for (let i = 0; i < itemsToSave.length; i++) {
          const item = itemsToSave[i];
          if (item.id.startsWith('temp-')) {
            // Новый шаг
            await actionItemService.createActionItem(initialDesire.id, item.text, i);
          } else {
            // Обновляем существующий
            await actionItemService.updateActionItem(item.id, {
              text: item.text,
              order: i,
            });
          }
        }
        
        onSave();
      } else {
        // Создание нового желания
        const desireId = await desireService.createDesire({
          title: title.trim() || '',
          details: details.trim() || null,
          description: description.trim() || '',
          deadline: null,
          images: images.length > 0 ? images : undefined,
          area: presetArea ?? null,
          isActive: true, // Новое желание автоматически становится "Сегодня в фокусе"
        });
        
        // Создаём шаги (включая черновик шага из поля ввода)
        for (let i = 0; i < itemsToSave.length; i++) {
          await actionItemService.createActionItem(desireId, itemsToSave[i].text, i);
        }
        
        // Устанавливаем фокус на новое желание
        await desireService.setFocusDesire(desireId);
        onSave(desireId);
      }
    } catch (error) {
      console.error('Ошибка при сохранении желания:', error);
      setError(t('form.error.save'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="desire-form-container">
      {/* Шапка с главной страницы */}
      <Header
        leftSlot={
          onBack ? (
            <button type="button" className="desires-list-back" onClick={onBack}>
              ← {t('common.back')}
            </button>
          ) : null
        }
        onLogoClick={onGoHome}
        onSettingsClick={onSettingsClick}
      />
      
      <form className="desire-form" onSubmit={handleSubmit}>
        {error && (
          <div className="desire-form-error">
            {error}
          </div>
        )}

        {/* 1. Название желания */}
        <div className="form-group">
          <label htmlFor="title">{t('form.title.label')}</label>
          <input
            ref={titleInputRef}
            id="title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
            placeholder={t('form.title.placeholder')}
          />
        </div>

        {/* 2. Визуальный образ (опционально, до 6 изображений) */}
        <div className="form-group">
          <label htmlFor="image">{t('form.visual.label')}</label>
          <input
            ref={fileInputRef}
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: 'none' }}
            disabled={images.length >= 3}
          />
          <div className="image-upload-grid">
            {images.map((image) => (
              <div key={image.id} className="image-preview-item">
                <img src={image.url} alt={t('form.image.previewAlt', { n: image.order + 1 })} />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(image.id)}
                  className="remove-image"
                  title={t('form.image.removeTitle')}
                >
                  ✕
                </button>
              </div>
            ))}
            {images.length < 3 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="upload-button-grid"
                title={t('form.image.addTitle')}
              >
                +
              </button>
            )}
          </div>
          {images.length > 0 && (
            <p className="form-hint">{t('form.visual.count', { count: images.length })}</p>
          )}
        </div>

        {/* 3. Описание желания (НОВОЕ ПОЛЕ) */}
        <div className="form-group">
          <label htmlFor="details">{t('form.details.label')}</label>
          <textarea
            id="details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t('form.details.placeholder')}
            rows={8}
          />
        </div>

        {/* 4. Эмоциональное состояние */}
        <div className="form-group">
          <label htmlFor="description">{t('form.feelings.label')}</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('form.feelings.placeholder')}
            rows={4}
          />
        </div>

        {/* 5. Шаги действий (action items) */}
        <div className="form-group">
          <label>{t('form.actionItems.label')}</label>
          <p className="form-label-hint">{t('form.actionItems.hint')}</p>
          
          {/* Список существующих шагов */}
          {actionItems.length > 0 && (
            <div className="action-items-list">
              {actionItems.map((item) => (
                <div key={item.id} className="action-item-row">
                  {editingActionItemId === item.id ? (
                    <>
                      <input
                        type="text"
                        className="action-item-edit-input"
                        value={editingActionItemText}
                        onChange={(e) => setEditingActionItemText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveActionItem(item.id);
                          } else if (e.key === 'Escape') {
                            setEditingActionItemId(null);
                            setEditingActionItemText('');
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="action-item-save-btn"
                        onClick={() => handleSaveActionItem(item.id)}
                        title={t('common.save')}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="action-item-cancel-btn"
                        onClick={() => {
                          setEditingActionItemId(null);
                          setEditingActionItemText('');
                        }}
                        title={t('common.cancel')}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="action-item-text">{item.text}</span>
                      <button
                        type="button"
                        className="action-item-edit-btn"
                        onClick={() => handleEditActionItem(item.id)}
                        title={t('common.edit')}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="action-item-delete-btn"
                        onClick={() => handleDeleteActionItem(item.id)}
                        title={t('common.delete')}
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Поле для добавления нового шага */}
          <div className="action-item-add">
            <input
              type="text"
              className="action-item-input"
              value={newActionItemText}
              onChange={(e) => setNewActionItemText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddActionItem();
                }
              }}
              placeholder={t('form.actionItems.placeholder')}
            />
            <button
              type="button"
              className="action-item-add-btn"
              onClick={handleAddActionItem}
              disabled={!newActionItemText.trim()}
              title={t('form.actionItems.add')}
            >
              +
            </button>
          </div>
        </div>

        {/* Кнопка действия */}
        <button type="submit" className="submit-button" disabled={isLoading}>
          {isLoading
            ? t('form.submit.saving')
            : initialDesire
              ? t('form.submit.save')
              : t('form.submit.create')}
        </button>
      </form>
    </div>
  );
}




