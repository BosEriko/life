"use client";

import { useEffect, useMemo, useState } from "react";
import { FloatButton, Grid, theme } from "antd";
import { CheckSquareOutlined, MenuOutlined, ScheduleOutlined, TransactionOutlined, WalletOutlined } from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import { BpModal } from "@/components/bp-modal";
import { FinanceAccountModal } from "@/components/finance-account-modal";
import { FinanceRecordModal } from "@/components/finance-record-modal";
import { AddTaskModal } from "@/components/tasks-card";
import { TodoEditor } from "@/components/todo-editor";
import { HabitModal } from "@/components/habit-modal";
import { useHealthData } from "@/components/health-data-provider";
import { IntakeModal } from "@/components/intake-modal";
import { NotesModal } from "@/components/notes-modal";
import { WaterModal } from "@/components/water-modal";
import { WeightModal } from "@/components/weight-modal";
import { Icon } from "@/components/icon";
import { todayKey } from "@/models/users/dailies";
import { accentColor } from "@/lib/accents";
import { useIsDark } from "@/components/theme-provider";
import { focusDatabaseAdd } from "@/lib/database-add";

const MENU_SIDE_KEY = "quick-action-menu-side";
const MENU_COLLAPSED_KEY = "quick-action-menu-collapsed";

type MenuSide = "left" | "right";

export function ReportDownload() {
  const screens = Grid.useBreakpoint();
  const { token } = theme.useToken();
  const {
    dailies: entries,
    bpReadings,
    waterLogs,
    intake: intakeEntries,
    financeAccounts,
    todoLists,
  } = useHealthData();
  const pathname = usePathname();
  const router = useRouter();
  const section = pathname.split("/")[1];
  const [pageModal, setPageModal] = useState<"account" | "record" | "todo" | "task" | null>(null);
  const hasAccount = financeAccounts.some((account) => !account.deletedAt);
  const isDark = useIsDark();
  const accent = (name: Parameters<typeof accentColor>[0]) => ({ color: accentColor(name, isDark) });

  const controlStyle = {
    background: token.colorBgSpotlight,
    color: token.colorTextLightSolid,
  };

  const [habitOpen, setHabitOpen] = useState(false);
  const [bpOpen, setBpOpen] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [menuSide, setMenuSide] = useState<MenuSide>("right");
  const [menuCollapsed, setMenuCollapsed] = useState(false);

  useEffect(() => {
    let sideTimer: number | undefined;
    let collapsedTimer: number | undefined;
    try {
      const savedSide = window.localStorage.getItem(MENU_SIDE_KEY);
      if (savedSide === "left" || savedSide === "right") {
        sideTimer = window.setTimeout(() => setMenuSide(savedSide), 0);
      }
      const savedCollapsed = window.localStorage.getItem(MENU_COLLAPSED_KEY);
      if (savedCollapsed === "1" || savedCollapsed === "0") {
        const value = savedCollapsed === "1";
        collapsedTimer = window.setTimeout(() => setMenuCollapsed(value), 0);
      }
    } catch {}
    return () => {
      window.clearTimeout(sideTimer);
      window.clearTimeout(collapsedTimer);
    };
  }, []);

  const hasBpToday = useMemo(
    () => bpReadings.some((reading) => reading.date === todayKey()),
    [bpReadings],
  );
  const hasWaterToday = useMemo(
    () => waterLogs.some((log) => log.date === todayKey()),
    [waterLogs],
  );
  const hasWeightToday = useMemo(
    () =>
      entries.some(
        (entry) => entry.date === todayKey() && entry.weight != null,
      ),
    [entries],
  );
  const hasIntakeToday = useMemo(
    () => intakeEntries.some((entry) => entry.date === todayKey()),
    [intakeEntries],
  );

  const pulsingCount =
    (hasWeightToday ? 0 : 1) +
    (hasWaterToday ? 0 : 1) +
    (hasIntakeToday ? 0 : 1) +
    (hasBpToday ? 0 : 1);
  const collapsed = menuCollapsed;

  const tip = (title: string) =>
    screens.md === true
      ? {
          title,
          placement:
            menuSide === "left" ? ("right" as const) : ("left" as const),
        }
      : undefined;

  function toggleMenuSide() {
    setMenuSide((current) => {
      const next = current === "right" ? "left" : "right";
      try {
        window.localStorage.setItem(MENU_SIDE_KEY, next);
      } catch {}
      return next;
    });
  }

  function toggleMenuCollapsed() {
    setMenuCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(MENU_COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  return (
    <>
      <FloatButton.Group
        shape="circle"
        className="quick-action-group"
        style={{
          insetInlineStart: 24,
          insetInlineEnd: "auto",
          ...(screens.md === false ? { insetBlockEnd: "calc(88px + var(--mobile-subnav-height, 0px))" } : {}),
          transform:
            menuSide === "right"
              ? "translateX(calc(100vw - 100% - 48px))"
              : "translateX(0)",
        }}
      >
        {section === "health" && <>
          <FloatButton
            icon={<Icon name="habits" style={{ marginRight: 0, opacity: 1 }} />}
            tooltip={tip("Habits")}
            onClick={() => setHabitOpen(true)}
            className={`quick-action-health${collapsed ? " quick-action-health-collapsed" : ""}`}
          />
          <FloatButton
            icon={<Icon name="weight" style={{ marginRight: 0, opacity: 1 }} />}
            tooltip={tip("Weight")}
            onClick={() => setWeightOpen(true)}
            className={`quick-action-health${hasWeightToday ? "" : " bp-pulse"}${collapsed ? " quick-action-health-collapsed" : ""}`}
          />
          <FloatButton
            icon={<Icon name="bp" style={{ marginRight: 0, opacity: 1 }} />}
            tooltip={tip("Blood pressure")}
            onClick={() => setBpOpen(true)}
            className={`quick-action-health${hasBpToday ? "" : " bp-pulse"}${collapsed ? " quick-action-health-collapsed" : ""}`}
          />
          <FloatButton
            icon={<Icon name="water" style={{ marginRight: 0, opacity: 1 }} />}
            tooltip={tip("Water")}
            onClick={() => setWaterOpen(true)}
            className={`quick-action-health${hasWaterToday ? "" : " bp-pulse"}${collapsed ? " quick-action-health-collapsed" : ""}`}
          />
          <FloatButton
            icon={<Icon name="intake" style={{ marginRight: 0, opacity: 1 }} />}
            tooltip={tip("Food & drink")}
            onClick={() => setIntakeOpen(true)}
            className={`quick-action-health${hasIntakeToday ? "" : " bp-pulse"}${collapsed ? " quick-action-health-collapsed" : ""}`}
          />
        </>}
        {section === "finance" && <>
          <FloatButton
            icon={<WalletOutlined style={accent("weight")} />}
            tooltip={tip("Add account")}
            aria-label="Add account"
            onClick={() => setPageModal("account")}
            className={`quick-action-health${collapsed ? " quick-action-health-collapsed" : ""}`}
          />
          <FloatButton
            icon={<TransactionOutlined style={accent("habits")} />}
            tooltip={tip(hasAccount ? "Add record" : "Add an account first")}
            aria-label="Add record"
            onClick={() => setPageModal(hasAccount ? "record" : "account")}
            className={`quick-action-health${collapsed ? " quick-action-health-collapsed" : ""}`}
          />
        </>}
        {section === "journal" && <>
          <FloatButton
            icon={<CheckSquareOutlined style={accent("notes")} />}
            tooltip={tip("Add to-do")}
            aria-label="Add to-do"
            onClick={() => setPageModal("todo")}
            className={`quick-action-health${collapsed ? " quick-action-health-collapsed" : ""}`}
          />
          <FloatButton
            icon={<ScheduleOutlined style={accent("bpLow")} />}
            tooltip={tip("Add task")}
            aria-label="Add task"
            onClick={() => setPageModal("task")}
            className={`quick-action-health${collapsed ? " quick-action-health-collapsed" : ""}`}
          />
        </>}
        {section === "records" && (
          <FloatButton
            icon={<Icon name="intake" style={{ marginRight: 0, opacity: 1 }} />}
            tooltip={tip("Add food or drink")}
            aria-label="Add food or drink"
            onClick={() => {
              if (pathname !== "/records/database") router.push("/records/database#add-item");
              focusDatabaseAdd();
            }}
            className={`quick-action-health${collapsed ? " quick-action-health-collapsed" : ""}`}
          />
        )}
        <FloatButton
          aria-label={`Move menu to ${menuSide === "right" ? "left" : "right"}`}
          icon={
            <Icon
              name={menuSide === "right" ? "menuLeft" : "menuRight"}
              style={{ marginRight: 0, opacity: 1 }}
            />
          }
          tooltip={tip(`Move menu to ${menuSide === "right" ? "left" : "right"}`)}
          onClick={toggleMenuSide}
          style={controlStyle}
          className={`quick-action-health${collapsed ? " quick-action-health-collapsed" : ""}`}
        />
        <FloatButton
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          icon={<MenuOutlined />}
          style={controlStyle}
          badge={{ count: collapsed && section === "health" ? pulsingCount : 0 }}
          tooltip={tip(collapsed ? "Expand menu" : "Collapse menu")}
          onClick={toggleMenuCollapsed}
          className={collapsed && section === "health" && pulsingCount > 0 ? "bp-pulse" : undefined}
        />
        {screens.md !== false ? (
          <FloatButton
            type="primary"
            icon={
              <Icon name="logEntry" style={{ marginRight: 0, opacity: 1, color: "inherit" }} />
            }
            tooltip={tip("Notes")}
            onClick={() => setNotesOpen(true)}
          />
        ) : null}
      </FloatButton.Group>


      <HabitModal open={habitOpen} onClose={() => setHabitOpen(false)} />

      <WeightModal open={weightOpen} onClose={() => setWeightOpen(false)} />

      <WaterModal open={waterOpen} onClose={() => setWaterOpen(false)} />

      <IntakeModal open={intakeOpen} onClose={() => setIntakeOpen(false)} />

      <BpModal open={bpOpen} onClose={() => setBpOpen(false)} />

      <NotesModal open={notesOpen} onClose={() => setNotesOpen(false)} />

      {pageModal === "account" && <FinanceAccountModal onClose={() => setPageModal(null)} />}
      {pageModal === "record" && <FinanceRecordModal onClose={() => setPageModal(null)} onSaved={() => {}} />}
      {pageModal === "todo" && <TodoEditor initial={null} lists={todoLists} listId="inbox" onClose={() => setPageModal(null)} />}
      <AddTaskModal open={pageModal === "task"} onClose={() => setPageModal(null)} />
    </>
  );
}
