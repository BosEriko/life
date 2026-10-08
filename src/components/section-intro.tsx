"use client";

import { usePathname } from "next/navigation";
import { App, Button, Card, Flex, Typography, theme } from "antd";
import { CompassOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { useAppTour } from "@/components/app-tour";
import { useHealthData } from "@/components/health-data-provider";
import { useUnitsContext } from "@/components/units-provider";
import { saveOnboarding } from "@/models/users/profile";
import { sectionHasData, type OnboardingSection } from "@/lib/onboarding";

const INTROS: Record<OnboardingSection, { title: string; body: string }> = {
  health: {
    title: "Welcome to Health",
    body: "Log your weight, water, food, blood pressure and habits in a few taps, then watch your weekly averages and trends take shape.",
  },
  journal: {
    title: "A little space for your day",
    body: "Notes, routines, and to-dos — all in one place.",
  },
  finance: {
    title: "Know where your money goes",
    body: "Add an account, then track what comes in and out.",
  },
  records: {
    title: "Your history, at a glance",
    body: "Find foods in Database. Explore your health in Summary.",
  },
};

export function SectionIntro() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { startTour } = useAppTour();
  const { profile, ready: profileReady } = useUnitsContext();
  const data = useHealthData();
  const section = pathname.split("/")[1] as OnboardingSection;
  const intro = INTROS[section];
  const dataReady = data.ready && data.financeReady && data.todosReady && data.tasksReady;

  if (!user || !intro || !profileReady || !dataReady || profile.onboarding.introsDismissed[section] || sectionHasData(section, data)) return null;

  function dismiss() {
    if (!user) return;
    saveOnboarding(user.uid, { introsDismissed: { [section]: true } }).catch(() => message.error("Could not hide this tip."));
  }

  return (
    <Card
      role="note"
      styles={{ body: { padding: "16px 20px" } }}
      style={{ marginBottom: 24, background: token.colorPrimaryBg, borderColor: `color-mix(in srgb, ${token.colorPrimary} 25%, ${token.colorPrimaryBg})` }}
    >
      <Flex align="flex-start" gap={14} wrap>
        <CompassOutlined aria-hidden style={{ fontSize: 22, color: token.colorPrimary, marginTop: 2 }} />
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <Typography.Text strong style={{ display: "block", fontSize: 15 }}>{intro.title}</Typography.Text>
          <Typography.Text type="secondary" style={{ display: "block", marginTop: 2 }}>{intro.body}</Typography.Text>
        </div>
        <Flex gap={8} wrap align="center">
          <Button type="primary" onClick={() => startTour(section)}>Quick tour</Button>
          <Button type="text" onClick={dismiss}>Dismiss</Button>
        </Flex>
      </Flex>
    </Card>
  );
}
