"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { App, Tour, type TourStepProps } from "antd";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { useUnitsContext } from "@/components/units-provider";
import { useNav } from "@/components/use-nav";
import { hasUnits, saveOnboarding } from "@/models/users/profile";
import { isNewcomer, onboardingSteps, type OnboardingSection } from "@/lib/onboarding";

export type TourName = "welcome" | OnboardingSection;

type StepSpec = { target: string | null; title: string; description: string };

const TOURS: Record<TourName, StepSpec[]> = {
  welcome: [
    { target: null, title: "Welcome to Life Tracker", description: "Your health, plans, and money. Let’s take a quick look." },
    { target: "main-nav", title: "Four sections", description: "Health, Journal, Finance, and Records. Switch sections here." },
    { target: "quick-log", title: "Quick actions", description: "Shortcuts for the page you’re on, plus a quick note from anywhere." },
    { target: "getting-started", title: "Your next steps", description: "Pick any action. Your progress updates as you go." },
    { target: "account", title: "Profile and settings", description: "Set your units, edit your details, or replay this tour." },
  ],
  health: [
    { target: "health-averages", title: "Your week at a glance", description: "Averages for weight, blood pressure, water, calories and sodium, compared with the week before. Values outside your ideal ranges are flagged." },
    { target: "health-trends", title: "Trends over time", description: "Switch between weight, blood pressure and water, and change the date range above to look further back." },
    { target: "health-habits", title: "Habits", description: "A heatmap of your good and bad habits, so streaks and slips are easy to spot." },
    { target: "health-recent", title: "Recent entries", description: "Everything you logged over the last week, day by day." },
    { target: "page-actions", title: "Set your ideal ranges", description: "Tell the app what healthy looks like for you, and it flags anything outside those ranges." },
    { target: "quick-log", title: "Log in a tap", description: "On Health, this menu adds weight, water, blood pressure, food or habits. It always has a quick note too." },
  ],
  journal: [
    { target: "submenu", title: "Journal pages", description: "Capture notes, build routines, and organize to-dos in a list or board." },
    { target: "side-menu", title: "Pick what to see", description: "Choose a day, a view, or a list. Notes can also show a calendar." },
    { target: "journal-main", title: "Your entries", description: "Everything for what you picked shows here. Check things off as you go." },
    { target: "journal-board", title: "Drag to update", description: "Move to-dos between upcoming, to do, in progress, and done." },
    { target: "page-actions", title: "Add something new", description: "Start a note, routine, or to-do with this button." },
    { target: "quick-log", title: "Quick add", description: "Add a to-do or task from this menu on any Journal page." },
  ],
  finance: [
    { target: "submenu", title: "Finance pages", description: "Check balances, log transactions, and explore spending patterns." },
    { target: "finance-emergency", title: "Emergency fund", description: "How many months your money would last, against a goal you choose." },
    { target: "finance-accounts", title: "Your accounts", description: "Balances at a glance. Tap one to edit it, or drag to reorder." },
    { target: "finance-overview", title: "Where it goes", description: "Cash flow, spending by category and account, and your savings rate." },
    { target: "filters", title: "Narrow it down", description: "Filter by type, account, currency, or period." },
    { target: "finance-records", title: "Every record", description: "Expenses, income, and transfers, grouped by day." },
    { target: "finance-charts", title: "Spending patterns", description: "Totals, trends, top categories, and savings rate for the period." },
    { target: "page-actions", title: "Start with an account", description: "Add your account and balance, then log expenses or income." },
    { target: "quick-log", title: "Quick add", description: "Add an account or record from this menu on any Finance page." },
  ],
  records: [
    { target: "submenu", title: "Records pages", description: "Find foods in Database and your health history in Summary." },
    { target: "records-add", title: "Add a food or drink", description: "Name it and add calories and sodium. It shows up when you log meals." },
    { target: "records-list", title: "Shared database", description: "Search everything you and others have added, and fix details." },
    { target: "records-summary", title: "Your full history", description: "Browse every health entry you've logged, by date." },
    { target: "page-actions", title: "Download a report", description: "Save a PDF of your history for any date range." },
    { target: "quick-log", title: "Quick add", description: "Jump to adding a food or drink from this menu on any Records page." },
  ],
};

const PROXY_ATTRIBUTE = "data-tour-proxy";

function removeTourProxies() {
  document.querySelectorAll(`[${PROXY_ATTRIBUTE}]`).forEach((element) => element.remove());
}

function quickLogTarget() {
  const group = document.querySelector<HTMLElement>(".quick-action-group");
  if (!group) return null;
  const rects = Array.from(group.querySelectorAll<HTMLElement>(".ant-float-btn"))
    .filter((button) => !button.classList.contains("quick-action-health-collapsed"))
    .map((button) => button.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0);
  if (rects.length === 0) return group;
  const top = Math.min(...rects.map((rect) => rect.top));
  const left = Math.min(...rects.map((rect) => rect.left));
  const proxy = document.createElement("div");
  proxy.setAttribute(PROXY_ATTRIBUTE, "");
  Object.assign(proxy.style, {
    position: "fixed",
    top: `${top}px`,
    left: `${left}px`,
    width: `${Math.max(...rects.map((rect) => rect.right)) - left}px`,
    height: `${Math.max(...rects.map((rect) => rect.bottom)) - top}px`,
    pointerEvents: "none",
    visibility: "hidden",
  });
  document.body.appendChild(proxy);
  return proxy;
}

function visibleTarget(name: string) {
  if (name === "quick-log") return quickLogTarget();
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)).find((element) => element.offsetParent !== null || getComputedStyle(element).position === "fixed") ?? null;
}

const TourContext = createContext<{ startTour: (name: TourName) => void }>({ startTour: () => {} });

export function useAppTour() {
  return useContext(TourContext);
}

export function AppTourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const pathname = usePathname();
  const { profile, ready: profileReady } = useUnitsContext();
  const data = useHealthData();
  const { home } = useNav();
  const [active, setActive] = useState<{ name: TourName; steps: TourStepProps[] } | null>(null);
  const [current, setCurrent] = useState(0);
  const autoStarted = useRef(false);
  const activeRef = useRef<{ name: TourName; steps: TourStepProps[] } | null>(null);

  const startTour = useCallback((name: TourName) => {
    removeTourProxies();
    const steps = TOURS[name].flatMap((spec): TourStepProps[] => {
      if (spec.target === null) return [{ title: spec.title, description: spec.description, target: null }];
      const element = visibleTarget(spec.target);
      return element ? [{ title: spec.title, description: spec.description, target: () => element, scrollIntoViewOptions: { block: "center" } }] : [];
    });
    if (steps.length === 0) return;
    const next = { name, steps };
    activeRef.current = next;
    setCurrent(0);
    setActive(next);
  }, []);

  const dataReady = data.ready && data.financeReady && data.todosReady && data.tasksReady;
  const newcomer = useMemo(() => isNewcomer(onboardingSteps(data, profile)), [data, profile]);

  useEffect(() => {
    if (!user || pathname !== home || !profileReady || !dataReady || !hasUnits(profile) || active) return;
    const requested = new URLSearchParams(window.location.search).get("tour") === "welcome";
    if (!requested && (autoStarted.current || profile.onboarding.welcomeTourDone || !newcomer)) return;
    autoStarted.current = true;
    if (requested) window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    const timer = window.setTimeout(() => startTour("welcome"), 400);
    return () => window.clearTimeout(timer);
  }, [user, pathname, home, profileReady, dataReady, profile, newcomer, active, startTour]);

  function close() {
    const closing = activeRef.current;
    if (!closing) return;
    activeRef.current = null;
    setActive(null);
    removeTourProxies();
    if (closing.name === "welcome" && user && !profile.onboarding.welcomeTourDone) {
      saveOnboarding(user.uid, { welcomeTourDone: true }).catch(() => message.error("Could not save your tour progress."));
    }
  }

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
      <Tour open={!!active} steps={active?.steps ?? []} gap={{ radius: 16 }} current={current} onChange={setCurrent} onClose={close} onFinish={close} />
    </TourContext.Provider>
  );
}
