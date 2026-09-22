import { useEffect, useMemo, useRef, useState } from 'react';
import type { LifeArea } from '../../types';
import { desireService, lifeAreaService } from '../../services/db';
import './LifeWheel.css';
import { useI18n } from '../../i18n';
import mandalaPng from '../../assets/Мандала.png';
import logoMark from '../../assets/group-29.svg';

const AREAS: LifeArea[] = ['health', 'love', 'growth', 'family', 'home', 'work', 'hobby', 'finance'];

// Палитра под новые "карточки" сфер (как в макете 3-го экрана)
const AREA_TILE_COLORS: Record<LifeArea, string> = {
  health: '#9BE57A',
  love: '#E79BD6',
  growth: '#66AEEB',
  family: '#79E3E6',
  home: '#E9E17A',
  work: '#4B63A6',
  hobby: '#F2BE62',
  finance: '#E45D6D',
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function sectorPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = polarToCartesian(cx, cy, r, a0);
  const p1 = polarToCartesian(cx, cy, r, a1);
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArc} 1 ${p1.x} ${p1.y} Z`;
}

export default function LifeWheel({
  onCreateWishInArea,
  onShowAllDesires,
  onGoHome,
}: {
  onCreateWishInArea: (area: LifeArea) => void;
  onShowAllDesires: (area?: LifeArea) => void;
  onGoHome?: () => void;
}) {
  const { t } = useI18n();
  const contentRef = useRef<HTMLDivElement>(null);
  const [scores, setScores] = useState<Record<LifeArea, number>>(() => {
    const init = {} as Record<LifeArea, number>;
    for (const a of AREAS) init[a] = 0;
    return init;
  });
  const [counts, setCounts] = useState<Record<LifeArea, number>>(() => {
    const init = {} as Record<LifeArea, number>;
    for (const a of AREAS) init[a] = 0;
    return init;
  });
  const load = async () => {
    const [s, c] = await Promise.all([
      lifeAreaService.getAll(),
      desireService.getCountsByArea(AREAS),
    ]);
    setScores((prev) => ({ ...prev, ...s }));
    setCounts(c);
  };

  useEffect(() => {
    load();
  }, []);

  // SVG geometry
  // Делаем viewBox больше, чтобы подписи вокруг колеса не обрезались.
  // Делаем большой viewBox с запасом, чтобы подписи вокруг колеса не обрезались
  const viewSize = 440;
  const cx = viewSize / 2;
  const cy = viewSize / 2;
  const R = 138;
  const ringStep = R / 10;
  // Подписи должны быть максимально близко к внешней окружности (как на макете)
  const labelR = R + 18;

  const angles = useMemo(() => {
    // start at -90deg (top), clockwise
    const start = -Math.PI / 2;
    const step = (2 * Math.PI) / AREAS.length;
    return AREAS.map((a, i) => ({ area: a, a0: start + i * step, a1: start + (i + 1) * step }));
  }, []);

  const handlePointer = async (clientX: number, clientY: number, target: SVGSVGElement) => {
    const rect = target.getBoundingClientRect();
    // Переводим координаты из px в координаты viewBox
    const sx = viewSize / rect.width;
    const sy = viewSize / rect.height;
    const x = (clientX - rect.left) * sx;
    const y = (clientY - rect.top) * sy;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > R) return;

    // angle in [0..2pi)
    let ang = Math.atan2(dy, dx);
    // convert to start at top (-pi/2) => shift
    const start = -Math.PI / 2;
    const twoPi = 2 * Math.PI;
    let rel = ang - start;
    while (rel < 0) rel += twoPi;
    while (rel >= twoPi) rel -= twoPi;

    const idx = Math.floor((rel / twoPi) * AREAS.length);
    const area = AREAS[clamp(idx, 0, AREAS.length - 1)];

    const score = clamp(Math.ceil(dist / ringStep), 0, 10);
    setScores((prev) => ({ ...prev, [area]: score }));
    await lifeAreaService.setScore(area, score);
  };

  return (
    <div className="life-wheel-screen">
      <header className="life-wheel-header">
        <div className="life-wheel-header-left">
          <button
            type="button"
            className="life-wheel-logo-btn"
            onClick={() => {
              contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              onGoHome?.();
            }}
            aria-label={t('header.home')}
          >
            <img className="life-wheel-logo" src={logoMark} alt={t('header.appName')} draggable={false} />
          </button>
        </div>

        <div className="life-wheel-header-center" />

        <div className="life-wheel-header-right" aria-hidden="true" />
      </header>

      <div className="life-wheel-content" ref={contentRef}>
        <div className="life-wheel-title">
          <div className="life-wheel-title-main">{t('wheel.title')}</div>
          <div className="life-wheel-title-sub">{t('wheel.subtitle')}</div>
          <button
            type="button"
            className="life-wheel-all-link"
            onClick={() => onShowAllDesires()}
          >
            {t('wheel.allDesires')}
          </button>
        </div>

        <div className="life-wheel-wrapper">
          <svg
            className="life-wheel-svg"
            viewBox={`0 0 ${viewSize} ${viewSize}`}
            onPointerDown={(e) => handlePointer(e.clientX, e.clientY, e.currentTarget)}
          >
            <defs>
              <filter id="wheelGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="14" result="blur" />
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.7 0"
                  result="glow"
                />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* мягкое свечение как на макете */}
            <circle cx={cx} cy={cy} r={R + 8} className="life-wheel-glow" filter="url(#wheelGlow)" />

            {/* rings */}
            {Array.from({ length: 10 }).map((_, i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={(i + 1) * ringStep}
                className="life-wheel-ring"
              />
            ))}

            {/* sector dividers */}
            {angles.map(({ area, a0 }) => {
              const p = polarToCartesian(cx, cy, R, a0);
              return <line key={area} x1={cx} y1={cy} x2={p.x} y2={p.y} className="life-wheel-divider" />;
            })}

            {/* fills */}
            {angles.map(({ area, a0, a1 }) => {
              const score = scores[area] ?? 0;
              if (!score) return null;
              const r = score * ringStep;
              return (
                <path
                  key={`fill-${area}`}
                  d={sectorPath(cx, cy, r, a0, a1)}
                  fill={AREA_TILE_COLORS[area]}
                  opacity={0.28}
                />
              );
            })}

            {/* outer circle */}
            <circle cx={cx} cy={cy} r={R} className="life-wheel-outline" />

            {/* центральная мандала */}
            <g className="life-wheel-center">
              <circle cx={cx} cy={cy} r={18} className="life-wheel-center-bg" />
              <image
                href={mandalaPng}
                x={cx - 13}
                y={cy - 13}
                width={26}
                height={26}
                opacity={0.95}
                preserveAspectRatio="xMidYMid meet"
              />
            </g>

            {/* labels around wheel (one per sector) */}
            {angles.map(({ area, a0, a1 }) => {
              const mid = (a0 + a1) / 2;
              const p = polarToCartesian(cx, cy, labelR, mid);

              // Пишем по касательной к внешнему контуру (как на референсе)
              const rotate = (mid * 180) / Math.PI + 90;
              // Keep text readable: flip on bottom half
              const flip = rotate > 90 && rotate < 270;
              const textRotate = flip ? rotate + 180 : rotate;
              
              // Обработчик клика на название сферы
              const handleLabelClick = (e: React.MouseEvent) => {
                e.stopPropagation(); // Предотвращаем всплытие к колесу
                const count = counts[area] ?? 0;
                if (count > 0) {
                  onShowAllDesires(area);
                } else {
                  onCreateWishInArea(area);
                }
              };
              
              return (
                <g
                  key={`lbl-${area}`}
                  onClick={handleLabelClick}
                  className="life-wheel-label-group"
                  style={{ cursor: 'pointer' }}
                >
                  {/* Невидимая кликабельная область */}
                  <rect
                    x={p.x - 55}
                    y={p.y - 12}
                    width="110"
                    height="24"
                    rx="12"
                    fill="transparent"
                    pointerEvents="all"
                    transform={`rotate(${textRotate} ${p.x} ${p.y})`}
                  />
                  <text
                    x={p.x}
                    y={p.y}
                    className="life-wheel-label"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textRotate} ${p.x} ${p.y})`}
                    pointerEvents="none"
                  >
                    {t(`areas.${area}` as never)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="life-wheel-cards-title">{t('wheel.cardsTitle')}</div>

        <div className="life-wheel-grid">
          {AREAS.map((area) => (
            <button
              key={area}
              type="button"
              className="life-area-tile"
              onClick={() => {
                const count = counts[area] ?? 0;
                if (count > 0) return onShowAllDesires(area);
                return onCreateWishInArea(area);
              }}
            >
              <div className="life-area-label">{t(`areas.${area}` as never)}</div>
              <div className="life-area-rect" style={{ background: AREA_TILE_COLORS[area] }}>
                <div className="life-area-count">{counts[area] ?? 0}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


