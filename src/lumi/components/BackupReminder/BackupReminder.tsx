import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import { shouldShowBackupReminder, dismissBackupReminder, getDaysSinceLastBackup, getLastBackupDate } from '../../utils/backupReminder';
import { desireService } from '../../services/db';
import './BackupReminder.css';

interface BackupReminderProps {
  onBackupClick: () => void;
}

export default function BackupReminder({ onBackupClick }: BackupReminderProps) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [daysSince, setDaysSince] = useState<number | null>(null);

  useEffect(() => {
    const checkReminder = async () => {
      // Не показываем напоминание, если мы уже на странице backup
      if (window.location.hash.includes('backup') || window.location.pathname.includes('backup')) {
        setShow(false);
        return;
      }

      // Проверяем, есть ли данные для экспорта
      const desires = await desireService.getAllDesires(true); // включая выполненные
      const hasDesires = desires.length > 0;
      setHasData(hasDesires);

      if (hasDesires && shouldShowBackupReminder()) {
        const days = getDaysSinceLastBackup();
        setDaysSince(days);
        setShow(true);
      } else {
        setShow(false);
      }
    };

    checkReminder();
    
    // Проверяем напоминание периодически (каждые 5 минут)
    const interval = setInterval(checkReminder, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    dismissBackupReminder();
    setShow(false);
  };

  const handleBackup = () => {
    setShow(false);
    onBackupClick();
  };

  if (!show || !hasData) {
    return null;
  }

  const lastBackupDate = getLastBackupDate();
  const hasNeverBackedUp = !lastBackupDate;

  return (
    <div className="backup-reminder-overlay" onClick={handleDismiss}>
      <div className="backup-reminder-modal" onClick={(e) => e.stopPropagation()}>
        <div className="backup-reminder-icon">💾</div>
        <h2 className="backup-reminder-title">
          {hasNeverBackedUp 
            ? t('backup.reminder.titleNever')
            : t('backup.reminder.title', { days: daysSince ?? 7 })
          }
        </h2>
        <p className="backup-reminder-text">
          {hasNeverBackedUp
            ? t('backup.reminder.textNever')
            : t('backup.reminder.text', { days: daysSince ?? 7 })
          }
        </p>
        <div className="backup-reminder-actions">
          <button
            type="button"
            className="backup-reminder-button backup-reminder-button-primary"
            onClick={handleBackup}
          >
            {t('backup.reminder.backupButton')}
          </button>
          <button
            type="button"
            className="backup-reminder-button backup-reminder-button-secondary"
            onClick={handleDismiss}
          >
            {t('backup.reminder.laterButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

