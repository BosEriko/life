export type Accent = "weight" | "bp" | "bpLow" | "water" | "calories" | "sodium" | "habits" | "notes";

const LIGHT: Record<Accent, string> = {
  weight: "#3b6fd8",
  bp: "#c2417a",
  bpLow: "#7c4dcc",
  water: "#0e8fb3",
  calories: "#d9730d",
  sodium: "#7c4dcc",
  habits: "#2f9e5a",
  notes: "#b7791f",
};

const DARK: Record<Accent, string> = {
  weight: "#8fb3ff",
  bp: "#f39ac0",
  bpLow: "#c3a6ff",
  water: "#6fd0ec",
  calories: "#ffb26b",
  sodium: "#c3a6ff",
  habits: "#7fd9a0",
  notes: "#f0c75e",
};

export function accentColor(accent: Accent, dark: boolean): string {
  return (dark ? DARK : LIGHT)[accent];
}
