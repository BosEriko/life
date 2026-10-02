export function mergeSubsetOrder(full: string[], subset: string[]) {
  const positions = full.map((id, index) => (subset.includes(id) ? index : -1)).filter((index) => index >= 0);
  const next = [...full];
  positions.forEach((position, index) => {
    next[position] = subset[index];
  });
  return next;
}
