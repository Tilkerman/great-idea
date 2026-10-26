/** Высота дел в часе. Пустой час не раздуваем: его пол задаёт minRow. */
function slotContentHeight(slot: HTMLElement) {
  const stack = slot.querySelector<HTMLElement>('.hour-slot__stack');
  const add = slot.querySelector<HTMLElement>('.hour-slot__add-strip');
  if (!stack) return 0;
  const prev = {
    overflow: stack.style.overflow,
    minHeight: stack.style.minHeight,
    flex: stack.style.flex,
  };
  stack.style.overflow = 'visible';
  stack.style.minHeight = 'auto';
  stack.style.flex = '0 0 auto';
  const height = stack.scrollHeight + (add?.offsetHeight ?? 0) + 8;
  stack.style.overflow = prev.overflow;
  stack.style.minHeight = prev.minHeight;
  stack.style.flex = prev.flex;
  return height;
}

/**
 * На компьютере час с несколькими делами выше остальных.
 * Ставит одну высоту на шкалу и на все колонки этого часа.
 */
export function syncDesktopWeekHourHeights(grid: HTMLElement, minRowPx: number) {
  const labels = [...grid.querySelectorAll<HTMLElement>('.week-view__time-label')];
  const cols = [...grid.querySelectorAll<HTMLElement>('.week-view__col')];
  const slotRows = cols.map((col) => [...col.querySelectorAll<HTMLElement>(':scope > .week-view__slot')]);
  if (!labels.length) return;

  const heights = labels.map((_, i) => {
    let h = minRowPx;
    for (const row of slotRows) {
      const slot = row[i];
      if (slot) h = Math.max(h, slotContentHeight(slot));
    }
    return h;
  });

  const viewH = grid.parentElement?.clientHeight ?? 0;
  const sum = heights.reduce((a, b) => a + b, 0);
  const extra = viewH > sum + 1 ? (viewH - sum) / labels.length : 0;

  let totalPx = 0;
  heights.forEach((h, i) => {
    const rowPx = Math.round(h + extra);
    totalPx += rowPx;
    const px = `${rowPx}px`;
    const apply = (el: HTMLElement | undefined) => {
      if (!el || el.style.height === px) return;
      el.style.flex = '0 0 auto';
      el.style.height = px;
    };
    apply(labels[i]);
    for (const row of slotRows) apply(row[i]);
  });

  const minH = `${totalPx}px`;
  if (grid.style.minHeight !== minH) grid.style.minHeight = minH;
}

export function clearDesktopWeekHourHeights(grid: HTMLElement) {
  grid.style.minHeight = '';
  grid.querySelectorAll<HTMLElement>('.week-view__time-label, .week-view__slot').forEach((el) => {
    el.style.height = '';
    el.style.flex = '';
  });
}
