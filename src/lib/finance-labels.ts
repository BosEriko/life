export type FinanceLabel = { id: string; name: string; color: string; order: number };

export const LABEL_COLORS = ["#F44336", "#4FC3F7", "#FFA726", "#78909C", "#AA00FF", "#64DD17", "#536DFE", "#00BFA5", "#FF4081", "#FBC02D", "#9E9E9E"];

export function sortLabels(labels: FinanceLabel[]) {
  return [...labels].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export function recordLabels(labels: FinanceLabel[], ids: string[]) {
  return ids.map((id) => labels.find((label) => label.id === id)).filter((label): label is FinanceLabel => !!label);
}

export function labelValidation(label: FinanceLabel, labels: FinanceLabel[]) {
  const name = label.name.trim();
  if (!name || name.length > 60) return "Enter a label name of up to 60 characters.";
  if (!/^#[0-9a-f]{6}$/i.test(label.color)) return "Choose a six-digit hexadecimal color.";
  if (!Number.isFinite(label.order)) return "Enter a valid order.";
  if (labels.some((item) => item.id !== label.id && item.name.trim().toLowerCase() === name.toLowerCase())) return "A label with this name already exists.";
  return null;
}
