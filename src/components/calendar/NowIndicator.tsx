import { nowInHourGrid } from '../../utils/nowIndicator';

export function NowIndicator({
  now,
  dayStartHour,
  dayEndHour,
  showLabel,
}: {
  now: Date;
  dayStartHour: number;
  dayEndHour: number;
  showLabel: boolean;
}) {
  const pos = nowInHourGrid(now, dayStartHour, dayEndHour);
  if (!pos) return null;

  return (
    <div
      className="now-indicator"
      style={{ top: `${pos.ratio * 100}%` }}
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
