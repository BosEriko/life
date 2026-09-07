"use client";

import { useEffect, useMemo, useState } from "react";
import { App, FloatButton, Grid, theme } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { BpModal } from "@/components/bp-modal";
import { HabitModal } from "@/components/habit-modal";
import { IntakeModal } from "@/components/intake-modal";
import { NotesModal } from "@/components/notes-modal";
import { WaterModal } from "@/components/water-modal";
import { WeightModal } from "@/components/weight-modal";
import { Icon } from "@/components/icon";
import { useBottomToast } from "@/components/use-bottom-toast";
import { todayKey, watchDailies, type DailyEntry } from "@/models/dailies";
import { watchIntake, type IntakeEntry } from "@/models/intake";
import { watchBpReadings, type BpReading } from "@/models/bp";
import { watchWaterLogs, type WaterLog } from "@/models/water";
import { watchWaterPresets, type WaterPreset } from "@/models/presets";
import { EMPTY_IDEALS, watchIdeals, type Ideals } from "@/models/ideals";

const HISTORY_LIMIT = 1000;
const MENU_SIDE_KEY = "quick-action-menu-side";

type MenuSide = "left" | "right";

export function ReportDownload() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const { token } = theme.useToken();
  const bottomToast = useBottomToast();

  const controlStyle = {
    background: token.colorBgSpotlight,
    color: token.colorTextLightSolid,
  };

  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [bpReadings, setBpReadings] = useState<BpReading[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [intakeEntries, setIntakeEntries] = useState<IntakeEntry[]>([]);
  const [presets, setPresets] = useState<WaterPreset[]>([]);
  const [ideals, setIdeals] = useState<Ideals>(EMPTY_IDEALS);
  const [habitOpen, setHabitOpen] = useState(false);
  const [bpOpen, setBpOpen] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [menuSide, setMenuSide] = useState<MenuSide>("right");
  const [menuCollapsed, setMenuCollapsed] = useState(false);

  useEffect(() => {
    let restoreTimer: number | undefined;
    try {
      const saved = window.localStorage.getItem(MENU_SIDE_KEY);
      if (saved === "left" || saved === "right") {
        restoreTimer = window.setTimeout(() => setMenuSide(saved), 0);
      }
    } catch {}
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!user) return;
    return watchDailies(
      user.uid,
      setEntries,
      () => message.error("Could not load your data."),
      HISTORY_LIMIT,
    );
  }, [user, message]);

  useEffect(() => {
    if (!user) return;
    return watchBpReadings(user.uid, setBpReadings, () => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return watchWaterLogs(user.uid, setWaterLogs, () => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return watchIntake(user.uid, setIntakeEntries, () => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return watchWaterPresets(user.uid, setPresets, () => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return watchIdeals(user.uid, setIdeals, () => {});
  }, [user]);

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

  const pulsing =
    !hasWeightToday || !hasWaterToday || !hasIntakeToday || !hasBpToday;
  const collapsed = pulsing ? false : menuCollapsed;

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

  return (
    <>
      <FloatButton.Group
        shape="circle"
        className="quick-action-group"
        style={{
          insetInlineStart: 24,
          insetInlineEnd: "auto",
          ...(screens.md === false ? { insetBlockEnd: 88 } : {}),
          transform:
            menuSide === "right"
              ? "translateX(calc(100vw - 100% - 48px))"
              : "translateX(0)",
        }}
      >
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
        <FloatButton
          icon={<Icon name="bp" style={{ marginRight: 0, opacity: 1 }} />}
          tooltip={tip("Blood pressure")}
          onClick={() => setBpOpen(true)}
          className={`quick-action-health${hasBpToday ? "" : " bp-pulse"}${collapsed ? " quick-action-health-collapsed" : ""}`}
        />
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
          style={
            pulsing
              ? { ...controlStyle, opacity: 0.5, cursor: "not-allowed" }
              : controlStyle
          }
          tooltip={tip(collapsed ? "Expand menu" : "Collapse menu")}
          onClick={() => {
            if (pulsing) {
              bottomToast.show("Log today's pulsing items first");
              return;
            }
            setMenuCollapsed((current) => !current);
          }}
        />
        {screens.md !== false ? (
          <FloatButton
            type="primary"
            icon={
              <Icon name="logEntry" style={{ marginRight: 0, opacity: 1 }} />
            }
            tooltip={tip("Notes")}
            onClick={() => setNotesOpen(true)}
          />
        ) : null}
      </FloatButton.Group>

      {bottomToast.node}

      <HabitModal
        open={habitOpen}
        onClose={() => setHabitOpen(false)}
        entries={entries}
      />

      <WeightModal
        open={weightOpen}
        onClose={() => setWeightOpen(false)}
        entries={entries}
        ideals={ideals}
      />

      <WaterModal
        open={waterOpen}
        onClose={() => setWaterOpen(false)}
        logs={waterLogs}
        presets={presets}
        ideals={ideals}
      />

      <IntakeModal
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        entries={intakeEntries}
        ideals={ideals}
      />

      <BpModal
        open={bpOpen}
        onClose={() => setBpOpen(false)}
        readings={bpReadings}
        ideals={ideals}
      />

      <NotesModal open={notesOpen} onClose={() => setNotesOpen(false)} />
    </>
  );
}
