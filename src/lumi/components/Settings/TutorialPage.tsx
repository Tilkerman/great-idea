import Header from '../Header/Header';
import './SettingsPages.css';
import './TutorialPage.css';
import { useI18n } from '../../i18n';
import type { LifeArea } from '../../types';

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

const AREAS: LifeArea[] = ['health', 'love', 'growth', 'family', 'home', 'work', 'hobby', 'finance'];

// Упрощенная визуализация колеса жизни
function LifeWheelVisual() {
  const { t } = useI18n();
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 20;
  const labelR = r + 25;

  const angles = AREAS.map((_, i) => {
    const start = -Math.PI / 2;
    const step = (2 * Math.PI) / AREAS.length;
    return { area: AREAS[i], a0: start + i * step, a1: start + (i + 1) * step };
  });

  const polarToCartesian = (cx: number, cy: number, r: number, angleRad: number) => ({
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  });

  const sectorPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
    const p0 = polarToCartesian(cx, cy, r, a0);
    const p1 = polarToCartesian(cx, cy, r, a1);
    const largeArc = a1 - a0 > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArc} 1 ${p1.x} ${p1.y} Z`;
  };

  const getAreaLabel = (area: LifeArea) => {
    return t(`areas.${area}`);
  };

  return (
    <div className="tutorial-wheel-visual">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {angles.map(({ area, a0, a1 }) => {
          const labelPos = polarToCartesian(cx, cy, labelR, (a0 + a1) / 2);
          return (
            <g key={area}>
              <path
                d={sectorPath(cx, cy, r, a0, a1)}
                fill={AREA_COLORS[area]}
                opacity={0.3}
                stroke={AREA_COLORS[area]}
                strokeWidth="1"
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill="var(--text-primary)"
                fontWeight="500"
              >
                {getAreaLabel(area)}
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-color)" strokeWidth="1" />
      </svg>
    </div>
  );
}

// Визуализация индикаторов контакта
function ContactIndicatorsVisual() {
  return (
    <div className="tutorial-indicators-visual">
      <div className="tutorial-indicators-row">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <div key={day} className="tutorial-indicator-dot tutorial-indicator-filled">
            <div className="tutorial-indicator-tooltip">
              {day === 7 ? 'Сегодня' : `${day} дней назад`}
            </div>
          </div>
        ))}
      </div>
      <p className="tutorial-indicators-caption">7 дней активности</p>
    </div>
  );
}

// Визуализация бейджа "В фокусе"
function FocusBadgeVisual() {
  const { t } = useI18n();
  return (
    <div className="tutorial-focus-badge-visual">
      <div className="tutorial-focus-badge-example">
        <div className="tutorial-focus-badge">
          <span className="tutorial-focus-checkmark">✓</span>
          <span className="tutorial-focus-text">{t('desires.focusBadge')}</span>
        </div>
      </div>
      <p className="tutorial-focus-caption">{t('tutorial.step4.badgeCaption')}</p>
    </div>
  );
}

// Визуализация типов контактов
function ContactTypesVisual() {
  const { t } = useI18n();
  return (
    <div className="tutorial-contact-types">
      <div className="tutorial-contact-type">
        <div className="tutorial-contact-icon tutorial-contact-entry">{t('contacts.entryShort')}</div>
        <span>{t('contacts.entry')}</span>
      </div>
      <div className="tutorial-contact-type">
        <div className="tutorial-contact-icon tutorial-contact-thought">{t('contacts.thoughtShort')}</div>
        <span>{t('contacts.thought')}</span>
      </div>
      <div className="tutorial-contact-type">
        <div className="tutorial-contact-icon tutorial-contact-step">{t('contacts.stepShort')}</div>
        <span>{t('contacts.step')}</span>
      </div>
    </div>
  );
}

interface TutorialPageProps {
  onBack: () => void;
  onCreateDesire: () => void;
  onSettingsClick?: () => void;
  onGoHome?: () => void;
}

export default function TutorialPage({ onBack, onCreateDesire, onSettingsClick, onGoHome }: TutorialPageProps) {
  const { t } = useI18n();

  return (
    <>
      <Header
        onBack={onBack}
        title={t('settings.menu.tutorial')}
      />
      <div className="settings-page">
        <div className="settings-page-content">
          <h1 className="settings-page-title">{t('settings.menu.tutorial')}</h1>

          {/* Приветствие */}
          <div className="settings-section" style={{ marginTop: '2rem' }}>
            <h2 className="settings-section-title">{t('tutorial.welcome.title')}</h2>
            <div className="settings-page-text">
              <p>{t('tutorial.welcome.text')}</p>
            </div>
          </div>

          {/* Шаг 1: Создание желания */}
          <div className="settings-section" style={{ marginTop: '2rem' }}>
            <h2 className="settings-section-title">{t('tutorial.step1.title')}</h2>
            <div className="settings-page-text">
              <p>{t('tutorial.step1.text')}</p>
              <ul className="settings-page-list">
                <li>{t('tutorial.step1.item1')}</li>
                <li>{t('tutorial.step1.item2')}</li>
                <li>{t('tutorial.step1.item3')}</li>
                <li>{t('tutorial.step1.item4')}</li>
              </ul>
              <button
                type="button"
                className="backup-button"
                onClick={onCreateDesire}
                style={{ marginTop: '1rem' }}
              >
                {t('tutorial.step1.button')}
              </button>
            </div>
          </div>

          {/* Шаг 2: Колесо жизни */}
          <div className="settings-section" style={{ marginTop: '2rem' }}>
            <h2 className="settings-section-title">{t('tutorial.step2.title')}</h2>
            <div className="settings-page-text">
              <p>{t('tutorial.step2.text')}</p>
              <LifeWheelVisual />
              <p style={{ marginTop: '1rem' }}>{t('tutorial.step2.text2')}</p>
            </div>
          </div>

          {/* Шаг 3: Ежедневный ритуал */}
          <div className="settings-section" style={{ marginTop: '2rem' }}>
            <h2 className="settings-section-title">{t('tutorial.step3.title')}</h2>
            <div className="settings-page-text">
              <p>{t('tutorial.step3.text')}</p>
              <ContactTypesVisual />
              <ul className="settings-page-list" style={{ marginTop: '1rem' }}>
                <li><strong>{t('tutorial.step3.item1.title')}</strong> — {t('tutorial.step3.item1.text')}</li>
                <li><strong>{t('tutorial.step3.item2.title')}</strong> — {t('tutorial.step3.item2.text')}</li>
                <li><strong>{t('tutorial.step3.item3.title')}</strong> — {t('tutorial.step3.item3.text')}</li>
              </ul>
              <p style={{ marginTop: '1rem' }}>{t('tutorial.step3.tip')}</p>
            </div>
          </div>

          {/* Шаг 4: Фокус на желании */}
          <div className="settings-section" style={{ marginTop: '2rem' }}>
            <h2 className="settings-section-title">{t('tutorial.step4.title')}</h2>
            <div className="settings-page-text">
              <p>{t('tutorial.step4.text')}</p>
              <FocusBadgeVisual />
              <p style={{ marginTop: '1rem' }}>{t('tutorial.step4.text2')}</p>
            </div>
          </div>

          {/* Шаг 5: Индикаторы контакта */}
          <div className="settings-section" style={{ marginTop: '2rem' }}>
            <h2 className="settings-section-title">{t('tutorial.step5.title')}</h2>
            <div className="settings-page-text">
              <p>{t('tutorial.step5.text')}</p>
              <ContactIndicatorsVisual />
              <p style={{ marginTop: '1rem' }}>{t('tutorial.step5.text2')}</p>
            </div>
          </div>

          {/* Советы */}
          <div className="settings-section" style={{ marginTop: '2rem' }}>
            <h2 className="settings-section-title">{t('tutorial.tips.title')}</h2>
            <div className="settings-page-text">
              <ul className="settings-page-list">
                <li>{t('tutorial.tips.item1')}</li>
                <li>{t('tutorial.tips.item2')}</li>
                <li>{t('tutorial.tips.item3')}</li>
                <li>{t('tutorial.tips.item4')}</li>
              </ul>
            </div>
          </div>

          {/* Призыв к действию */}
          <div className="settings-section" style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button
              type="button"
              className="backup-button"
              onClick={onCreateDesire}
              style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}
            >
              {t('tutorial.cta')}
            </button>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {t('tutorial.wish')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

