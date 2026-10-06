export function splitTabs(widths: number[], moreWidth: number, available: number, gap: number, activeIndex: number) {
  const all = widths.map((_, index) => index);
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, widths.length - 1);
  if (total <= available) return { visible: all, overflow: [] as number[] };

  const visible = new Set<number>();
  let used = moreWidth;
  if (activeIndex >= 0 && activeIndex < widths.length) {
    visible.add(activeIndex);
    used += gap + widths[activeIndex];
  }
  for (const index of all) {
    if (visible.has(index)) continue;
    if (used + gap + widths[index] > available) break;
    visible.add(index);
    used += gap + widths[index];
  }
  return { visible: all.filter((index) => visible.has(index)), overflow: all.filter((index) => !visible.has(index)) };
}
