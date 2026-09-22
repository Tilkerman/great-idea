import type { LifeArea } from '../../types';
import './AreaPickerModal.css';
import { useI18n } from '../../i18n';

const AREAS: LifeArea[] = ['health', 'love', 'growth', 'family', 'home', 'work', 'hobby', 'finance'];

export default function AreaPickerModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (area: LifeArea) => void;
}) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div className="area-picker-overlay" onClick={onClose}>
      <div className="area-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="area-picker-header">
          <div className="area-picker-title">{t('wheel.pickArea.title')}</div>
          <button className="area-picker-close" onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>
        <div className="area-picker-grid">
          {AREAS.map((a) => (
            <button key={a} className="area-picker-item" onClick={() => onPick(a)} type="button">
              {t(`areas.${a}` as never)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}




