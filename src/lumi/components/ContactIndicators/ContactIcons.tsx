import type React from 'react';

interface ContactIconProps {
  fillPct: number; // 0..1
  size?: number; // px
  title: string;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function FilledIcon({
  title,
  fillPct,
  children,
  viewBox = '0 0 24 24',
}: {
  title: string;
  fillPct: number;
  children: React.ReactNode;
  viewBox?: string;
}) {
  const pct = clamp01(fillPct);
  const insetTopPct = (1 - pct) * 100;

  return (
    <svg 
      className="contact-svg" 
      viewBox={viewBox} 
      role="img" 
      aria-label={title}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block' }}
    >
      {/* base (серый контур/фон) */}
      <g className="contact-svg-base">{children}</g>

      {/* fill (цветная заливка снизу вверх) */}
      {pct > 0 && (
        <g className="contact-svg-fill" style={{ clipPath: `inset(${insetTopPct}% 0 0 0)` }}>
          {children}
        </g>
      )}
    </svg>
  );
}

export function NoteIcon({ fillPct, title }: ContactIconProps) {
  return (
    <FilledIcon title={title} fillPct={fillPct} viewBox="0 0 24 24">
      {/* 📝 - Лист бумаги с загнутым уголком и строками текста (выровнен по визуальной высоте) */}
      {/* Основной лист (от y=4 до y=20 для одинаковой визуальной высоты) */}
      <path
        d="M5 4h12l4 4v12H5V4z"
        fill="currentColor"
      />
      {/* Загнутый уголок справа вверху */}
      <path
        d="M17 4v4h4l-4-4z"
        fill="currentColor"
      />
      {/* Строки текста (3 линии) */}
      <rect x="7" y="9" width="10" height="1.5" rx="0.3" fill="currentColor" />
      <rect x="7" y="12" width="10" height="1.5" rx="0.3" fill="currentColor" />
      <rect x="7" y="15" width="7" height="1.5" rx="0.3" fill="currentColor" />
    </FilledIcon>
  );
}

export function StepIcon({ fillPct, title }: ContactIconProps) {
  return (
    <FilledIcon title={title} fillPct={fillPct} viewBox="0 0 24 24">
      {/* 👣 - Два отпечатка ноги в шахматном порядке, выровнены по визуальной высоте с другими иконками */}
      {/* Левый отпечаток - подошва (слева, выше, от y=6 до y=14) */}
      <ellipse cx="7.5" cy="10" rx="2.8" ry="4" fill="currentColor" />
      {/* Левый отпечаток - пальцы (4 пальца сверху, от y=3 до y=6) */}
      <circle cx="5.5" cy="4.5" r="1.3" fill="currentColor" />
      <circle cx="6.8" cy="3.5" r="1.3" fill="currentColor" />
      <circle cx="8.2" cy="3.5" r="1.3" fill="currentColor" />
      <circle cx="9.4" cy="4.5" r="1.2" fill="currentColor" />
      
      {/* Правый отпечаток - подошва (справа, ниже, от y=9 до y=17, край пятки на y=17) */}
      <ellipse cx="15.5" cy="13" rx="2.7" ry="4" fill="currentColor" />
      {/* Правый отпечаток - пальцы (4 пальца сверху, от y=5 до y=8) */}
      <circle cx="14" cy="7.5" r="1.25" fill="currentColor" />
      <circle cx="15.2" cy="6.5" r="1.25" fill="currentColor" />
      <circle cx="16.5" cy="6.5" r="1.25" fill="currentColor" />
      <circle cx="17.5" cy="7.5" r="1.15" fill="currentColor" />
    </FilledIcon>
  );
}

export function ThoughtIcon({ fillPct, title }: ContactIconProps) {
  return (
    <FilledIcon title={title} fillPct={fillPct} viewBox="0 0 24 24">
      {/* 💭 - Облако мысли с тремя точками внизу (выровнено по визуальной высоте) */}
      {/* Основное облако (от y=4 до y=12, чтобы визуально совпадало с другими) */}
      <path
        d="M10 4c-3 0-5.5 2-5.5 4.5 0 1.2.6 2.2 1.6 2.8h9.8c1.5 0 2.7-1.1 2.7-2.5 0-1.1-.9-2-2-2.3-.4-1.9-2-3.3-4-3.3z"
        fill="currentColor"
      />
      {/* Дополнительные части облака для объёма и красивой формы */}
      <ellipse cx="9" cy="8.5" rx="1.6" ry="2" fill="currentColor" />
      <ellipse cx="14.5" cy="8" rx="1.4" ry="1.8" fill="currentColor" />
      <ellipse cx="11.5" cy="6.5" rx="1.3" ry="1.6" fill="currentColor" />
      <ellipse cx="12.5" cy="10" rx="1.1" ry="1.4" fill="currentColor" />
      <ellipse cx="8.5" cy="10.5" rx="1.2" ry="1.5" fill="currentColor" />
      {/* Три точки мысли (расположены по диагонали снизу слева, от большей к меньшей, до y=20) */}
      <circle cx="6.5" cy="16" r="1.3" fill="currentColor" />
      <circle cx="5" cy="17.8" r="1" fill="currentColor" />
      <circle cx="3.8" cy="19.2" r="0.7" fill="currentColor" />
    </FilledIcon>
  );
}


