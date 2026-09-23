import { useState, useRef } from 'react';
import Header from '../Header/Header';
import './SettingsPages.css';
import { useI18n } from '../../i18n';
import { db, desireService, contactService, lifeAreaService, feedbackService } from '../../services/db';
import type { Contact, LifeAreaRating, Feedback } from '../../types';
import { saveLastBackupDate } from '../../utils/backupReminder';

interface BackupPageProps {
  onBack: () => void;
  onSettingsClick?: () => void;
  onGoHome?: () => void;
}

export default function BackupPage({ onBack }: BackupPageProps) {
  const { t } = useI18n();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const desires = await desireService.getAllDesires();
      const allContacts: Contact[] = [];
      const allLifeAreas: LifeAreaRating[] = [];

      // Получаем все контакты
      const desiresIds = desires.map((d) => d.id);
      for (const desireId of desiresIds) {
        const contacts = await contactService.getAllContacts(desireId);
        allContacts.push(...contacts);
      }

      // Получаем все оценки сфер
      const areas = await lifeAreaService.getAll();
      const areaEntries: LifeAreaRating[] = Object.entries(areas).map(([id, score]) => ({
        id: id as any,
        score,
        updatedAt: new Date().toISOString(),
      }));
      allLifeAreas.push(...areaEntries);

      // Получаем все обратные связи
      const allFeedbacks: Feedback[] = await feedbackService.getAllFeedbacks();

      const backupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        desires,
        contacts: allContacts,
        lifeAreas: allLifeAreas,
        feedbacks: allFeedbacks,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calendar-of-desires-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Сохраняем дату последнего экспорта для напоминаний
      saveLastBackupDate();

      alert(t('settings.backup.exportSuccess'));
    } catch (error) {
      console.error('Export error:', error);
      alert(t('settings.backup.exportError'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.desires || !Array.isArray(backupData.desires)) {
        throw new Error('Invalid backup file format');
      }

      // Подтверждение перед импортом
      const confirmed = window.confirm(t('settings.backup.importConfirm'));
      if (!confirmed) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsImporting(false);
        return;
      }

      // Очищаем существующие данные
      await db.desires.clear();
      await db.contacts.clear();
      await db.lifeAreas.clear();
      await db.feedbacks.clear();

      // Импортируем данные
      await db.transaction('rw', db.desires, db.contacts, db.lifeAreas, db.feedbacks, async () => {
        if (backupData.desires) {
          await db.desires.bulkAdd(backupData.desires);
        }
        if (backupData.contacts) {
          await db.contacts.bulkAdd(backupData.contacts);
        }
        if (backupData.lifeAreas) {
          await db.lifeAreas.bulkAdd(backupData.lifeAreas);
        }
        if (backupData.feedbacks) {
          await db.feedbacks.bulkAdd(backupData.feedbacks);
        }
      });

      alert(t('settings.backup.importSuccess'));
      // Перезагружаем страницу чтобы применить изменения
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      alert(t('settings.backup.importError'));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Header
        onBack={onBack}
        title={t('settings.backup.title')}
      />
      <div className="settings-page">
        <div className="settings-page-content">
          <h1 className="settings-page-title">{t('settings.backup.title')}</h1>

          <div className="backup-section">
            <h2 className="settings-section-title">{t('settings.backup.export')}</h2>
            <p className="settings-page-text">{t('settings.backup.exportDesc')}</p>
            <button
              type="button"
              className="backup-button"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? t('common.saving') : t('settings.backup.exportButton')}
            </button>
          </div>

          <div className="backup-section">
            <h2 className="settings-section-title">{t('settings.backup.import')}</h2>
            <p className="settings-page-text">{t('settings.backup.importDesc')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="backup-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImporting ? t('common.saving') : t('settings.backup.importButton')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

