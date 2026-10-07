"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Flex, Progress, Typography, theme } from "antd";
import { ArrowRightOutlined, CheckCircleFilled, CheckOutlined, CloseOutlined, CompassOutlined, HeartOutlined, CalendarOutlined, WalletOutlined, UserOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { useAppTour } from "@/components/app-tour";
import { useHealthData } from "@/components/health-data-provider";
import { useUnitsContext } from "@/components/units-provider";
import { FinanceAccountModal } from "@/components/finance-account-modal";
import { FinanceRecordModal } from "@/components/finance-record-modal";
import { HabitModal } from "@/components/habit-modal";
import { IdealsModal } from "@/components/ideals-modal";
import { TodoEditor } from "@/components/todo-editor";
import { AddTaskModal } from "@/components/tasks-card";
import { WaterModal } from "@/components/water-modal";
import { WeightModal } from "@/components/weight-modal";
import { saveOnboarding } from "@/models/users/profile";
import { onboardingSteps, type OnboardingStepId } from "@/lib/onboarding";

type ModalStep = Exclude<OnboardingStepId, "profile">;

const GROUPS = [
  { title: "Health", icon: <HeartOutlined /> },
  { title: "Journal", icon: <CalendarOutlined /> },
  { title: "Finance", icon: <WalletOutlined /> },
  { title: "Profile", icon: <UserOutlined /> },
] as const;

const ACTIONS: Record<OnboardingStepId, string> = {
  weight: "Log weight",
  water: "Log water",
  habit: "Check a habit",
  ideals: "Set ideal ranges",
  todo: "Add a to-do",
  routine: "Create a routine",
  account: "Add an account",
  record: "Add a record",
  profile: "Add your details",
};

const LINKS: Partial<Record<OnboardingStepId, string>> = { profile: "/personal/details" };

export function GettingStarted() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { startTour } = useAppTour();
  const router = useRouter();
  const { profile, ready: profileReady } = useUnitsContext();
  const data = useHealthData();
  const [open, setOpen] = useState<ModalStep | null>(null);
  const dataReady = data.ready && data.financeReady && data.todosReady && data.tasksReady;

  if (!user || !profileReady || !dataReady || profile.onboarding.checklistDismissed) return null;

  const steps = onboardingSteps(data, profile);
  const doneCount = steps.filter((step) => step.done).length;
  const remaining = steps.filter((step) => !step.done);
  const hasAccount = steps.find((step) => step.id === "account")?.done ?? false;

  function dismiss() {
    if (!user) return;
    saveOnboarding(user.uid, { checklistDismissed: true }).catch(() => message.error("Could not hide the checklist."));
  }

  return (
    <aside
      data-tour="getting-started"
      aria-label="Optional setup guide"
      style={{ marginBottom: 24, padding: 20, border: `1px dashed ${token.colorPrimaryBorder}`, borderRadius: token.borderRadiusLG, background: token.colorPrimaryBg }}
    >
      <Flex align="center" justify="space-between" gap={12} wrap>
        <Flex align="center" gap={12}>
          <Progress type="circle" size={42} percent={Math.round((doneCount / steps.length) * 100)} strokeColor={token.colorPrimary} format={() => <span style={{ fontSize: 12 }}>{doneCount}/{steps.length}</span>} />
          <div>
            <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Optional setup</Typography.Text>
            <Typography.Text strong style={{ display: "block", fontSize: 17 }}>
              {remaining.length === 0 ? "You’re all set" : "Make yourself at home"}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {remaining.length === 0 ? "Your guide is complete. You can hide it now." : "Try a few things, then hide this guide."}
            </Typography.Text>
          </div>
        </Flex>
        <Flex gap={4} align="center">
          <Button type="text" icon={<CompassOutlined />} onClick={() => startTour("welcome")}>Quick tour</Button>
          <Button type="text" icon={<CloseOutlined />} onClick={dismiss}>Hide guide</Button>
        </Flex>
      </Flex>
      {remaining.length > 0 && (
        <div className="getting-started-steps" style={{ "--onboarding-hover": token.colorFillSecondary, "--onboarding-accent": token.colorPrimary, "--onboarding-line": token.colorTextSecondary, "--onboarding-check-bg": token.colorBgContainer } as CSSProperties}>
          {GROUPS.map((group) => (
            <section key={group.title} className="getting-started-group" aria-label={group.title}>
              <Flex gap={8} align="center" style={{ color: token.colorPrimary, padding: "0 8px 8px", fontWeight: 600, fontSize: 13 }}>
                {group.icon}{group.title}
              </Flex>
              {steps.filter((step) => step.section === group.title).map((step) => {
                const href = LINKS[step.id];
                const needsAccount = step.id === "record" && !hasAccount;
                return step.done ? (
                  <div key={step.id} className="getting-started-action" style={{ color: token.colorTextSecondary }}>
                    <CheckCircleFilled style={{ color: token.colorSuccess }} />
                    <span>{ACTIONS[step.id]}</span>
                  </div>
                ) : (
                  <button
                    key={step.id}
                    type="button"
                    className="getting-started-action"
                    style={{ color: token.colorText }}
                    title={needsAccount ? "Add an account first" : step.description}
                    onClick={() => href ? router.push(href) : setOpen(needsAccount ? "account" : (step.id as ModalStep))}
                  >
                    <span className="getting-started-check" aria-hidden><CheckOutlined /></span>
                    <span>{ACTIONS[step.id]}</span>
                    <ArrowRightOutlined className="getting-started-arrow" />
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      )}
      {open === "weight" && <WeightModal open onClose={() => setOpen(null)} />}
      {open === "water" && <WaterModal open onClose={() => setOpen(null)} />}
      {open === "habit" && <HabitModal open onClose={() => setOpen(null)} />}
      {open === "ideals" && <IdealsModal open ideals={data.ideals} onClose={() => setOpen(null)} />}
      {open === "todo" && <TodoEditor initial={null} lists={data.todoLists} listId="inbox" onClose={() => setOpen(null)} />}
      <AddTaskModal open={open === "routine"} onClose={() => setOpen(null)} />
      {open === "account" && <FinanceAccountModal onClose={() => setOpen(null)} />}
      {open === "record" && <FinanceRecordModal onClose={() => setOpen(null)} onSaved={() => {}} />}
    </aside>
  );
}
