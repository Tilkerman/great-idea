import { nowInHourGrid } from '../../utils/nowIndicator';

export function NowIndicator({
  now,
  dayStartHour,
  dayEndHour,
  showLabel,
  withinHourFrac = null,
}: {
  now: Date;
  dayStartHour: number;
  dayEndHour: number;
  showLabel: boolean;
  /** Доля текущего часа. Черта лежит внутри этого часа, а не всей колонки. */
  withinHourFrac?: number | null;
}) {
  const pos = nowInHourGrid(now, dayStartHour, dayEndHour);
  if (!pos) return null;
  const frac = withinHourFrac != null ? withinHourFrac : pos.ratio;
  const top = frac >= 1 ? 'calc(100% - 1px)' : `${frac * 100}%`;

  return (
    <div
      className="now-indicator"
      style={{ top }}
      aria-hidden
    >
      <span className="now-indicator__dot" />
      <span className="now-indicator__line" />
      {showLabel && (
        <span className="now-indicator__label">{pos.label}</span>
      )}
    </div>
  );
}
