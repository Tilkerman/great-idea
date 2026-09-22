import { useState } from 'react';
import Header from '../Header/Header';
import './SettingsPages.css';
import { useI18n } from '../../i18n';
import { db } from '../../services/db';

interface ClearDataPageProps {
  onBack: () => void;
  onDataCleared: () => void;
  onSettingsClick?: () => void;
  onGoHome?: () => void;
}

export default function ClearDataPage({ onBack, onDataCleared, onSettingsClick, onGoHome }: ClearDataPageProps) {
  const { t } = useI18n();
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    const confirmed = window.confirm(t('settings.clear.confirm'));
    if (!confirmed) return;

    setIsClearing(true);
    try {
      // Очищаем все таблицы
      await db.desires.clear();
      await db.contacts.clear();
      await db.lifeAreas.clear();
      await db.feedbacks.clear();

      alert(t('settings.clear.success'));
      onDataCleared();
    } catch (error) {
      console.error('Clear data error:', error);
      alert('Ошибка при очистке данных');
    } finally {
      setIsClearing(false);
    }
  };

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
          <h1 className="settings-page-title">{t('settings.clear.title')}</h1>
          <div className="settings-page-text">
            <p>{t('settings.clear.confirm')}</p>
          </div>
          <button
            type="button"
            className="backup-button"
            onClick={handleClear}
            disabled={isClearing}
            style={{ background: '#c44d58', marginTop: '2rem' }}
          >
            {isClearing ? t('common.saving') : t('common.delete')}
          </button>
        </div>
      </div>
    </>
  );
}

