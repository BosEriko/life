export type OnboardingSection = "health" | "journal" | "finance" | "records";

export type Onboarding = {
  checklistDismissed: boolean;
  welcomeTourDone: boolean;
  introsDismissed: Record<OnboardingSection, boolean>;
};

export const EMPTY_ONBOARDING: Onboarding = {
  checklistDismissed: false,
  welcomeTourDone: false,
  introsDismissed: { health: false, journal: false, finance: false, records: false },
};

export function readOnboarding(value: unknown): Onboarding {
  const data = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const intros = (data.introsDismissed && typeof data.introsDismissed === "object" ? data.introsDismissed : {}) as Record<string, unknown>;
  return {
    checklistDismissed: data.checklistDismissed === true,
    welcomeTourDone: data.welcomeTourDone === true,
    introsDismissed: {
      health: intros.health === true,
      journal: intros.journal === true,
      finance: intros.finance === true,
      records: intros.records === true,
    },
  };
}

export type OnboardingStepId =
  | "weight"
  | "water"
  | "habit"
  | "ideals"
  | "todo"
  | "routine"
  | "account"
  | "record"
  | "profile";

export type OnboardingStep = {
  id: OnboardingStepId;
  section: "Health" | "Journal" | "Finance" | "Profile";
  title: string;
  description: string;
  done: boolean;
};

type Range = { min: number | null; max: number | null };

export type OnboardingData = {
  dailies: { weight: number | null }[];
  waterLogs: unknown[];
  habits: { bath: boolean | null; brushTeeth: boolean | null; steps: boolean | null }[];
  bpReadings: unknown[];
  intake: unknown[];
  ideals: Record<string, Range | { start: string | null; end: string | null }>;
  todos: unknown[];
  tasks: unknown[];
  financeAccounts: { deletedAt?: string | null }[];
  financeRecords: unknown[];
};

export type OnboardingProfile = { birthday: string | null; heightFeet: number | null };

function hasIdeals(ideals: OnboardingData["ideals"]) {
  return Object.values(ideals).some((value) =>
    "min" in value ? value.min != null || value.max != null : value.start != null || value.end != null,
  );
}

export function onboardingSteps(data: OnboardingData, profile: OnboardingProfile): OnboardingStep[] {
  return [
    { id: "weight", section: "Health", title: "Log your weight", description: "Your first entry starts the weight trend on your dashboard.", done: data.dailies.some((entry) => entry.weight != null) },
    { id: "water", section: "Health", title: "Log a glass of water", description: "Track how much you drink through the day.", done: data.waterLogs.length > 0 },
    { id: "habit", section: "Health", title: "Check off a habit", description: "Mark daily habits like brushing your teeth or getting your steps in.", done: data.habits.some((entry) => entry.bath != null || entry.brushTeeth != null || entry.steps != null) },
    { id: "ideals", section: "Health", title: "Set your ideal ranges", description: "Targets for weight, blood pressure and more, so values outside them are flagged.", done: hasIdeals(data.ideals) },
    { id: "todo", section: "Journal", title: "Add a to-do", description: "Keep projects and next steps in one list.", done: data.todos.length > 0 },
    { id: "routine", section: "Journal", title: "Set up a routine", description: "Recurring tasks that repeat daily, weekly, monthly or yearly.", done: data.tasks.length > 0 },
    { id: "account", section: "Finance", title: "Add a money account", description: "Cash, a bank, an e-wallet or a card, with its current balance.", done: data.financeAccounts.some((account) => !account.deletedAt) },
    { id: "record", section: "Finance", title: "Record an expense or income", description: "Your records power the emergency fund and analytics.", done: data.financeRecords.length > 0 },
    { id: "profile", section: "Profile", title: "Complete your profile", description: "Your birthday and height make health summaries more accurate.", done: profile.birthday != null && profile.heightFeet != null },
  ];
}

export function isNewcomer(steps: OnboardingStep[]) {
  return steps.filter((step) => step.done).length <= 1;
}

export function sectionHasData(section: OnboardingSection, data: OnboardingData) {
  if (section === "finance") return data.financeAccounts.some((account) => !account.deletedAt);
  if (section === "journal") return data.todos.length > 0 || data.tasks.length > 0;
  return data.dailies.length > 0 || data.waterLogs.length > 0 || data.habits.length > 0 || data.bpReadings.length > 0 || data.intake.length > 0;
}
