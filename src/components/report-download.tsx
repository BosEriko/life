"use client";

import { useEffect, useMemo, useState } from "react";
import { App, FloatButton, Grid } from "antd";
import { useAuth } from "@/components/auth-provider";
import { BpModal } from "@/components/bp-modal";
import { HabitModal } from "@/components/habit-modal";
import { IntakeModal } from "@/components/intake-modal";
import { NotesModal } from "@/components/notes-modal";
import { WaterModal } from "@/components/water-modal";
import { WeightModal } from "@/components/weight-modal";
import { Icon } from "@/components/icon";
import { todayKey, watchDailies, type DailyEntry } from "@/models/dailies";
import { watchIntake, type IntakeEntry } from "@/models/intake";
import { watchBpReadings, type BpReading } from "@/models/bp";
import { watchWaterLogs, type WaterLog } from "@/models/water";
import { watchWaterPresets, type WaterPreset } from "@/models/presets";
import { EMPTY_IDEALS, watchIdeals, type Ideals } from "@/models/ideals";

const HISTORY_LIMIT = 1000;

export function ReportDownload() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();

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

  const tip = (title: string) =>
    screens.md === false ? undefined : { title, placement: "left" as const };

  return (
    <>
      <FloatButton.Group
        shape="circle"
        style={screens.md === false ? { insetBlockEnd: 88 } : undefined}
      >
        <FloatButton
          icon={<Icon name="habits" style={{ marginRight: 0, opacity: 1 }} />}
          tooltip={tip("Habits")}
          onClick={() => setHabitOpen(true)}
        />
        <FloatButton
          icon={<Icon name="weight" style={{ marginRight: 0, opacity: 1 }} />}
          tooltip={tip("Weight")}
          onClick={() => setWeightOpen(true)}
          className={hasWeightToday ? undefined : "bp-pulse"}
        />
        <FloatButton
          icon={<Icon name="water" style={{ marginRight: 0, opacity: 1 }} />}
          tooltip={tip("Water")}
          onClick={() => setWaterOpen(true)}
          className={hasWaterToday ? undefined : "bp-pulse"}
        />
        <FloatButton
          icon={<Icon name="intake" style={{ marginRight: 0, opacity: 1 }} />}
          tooltip={tip("Food & drink")}
          onClick={() => setIntakeOpen(true)}
          className={hasIntakeToday ? undefined : "bp-pulse"}
        />
        <FloatButton
          icon={<Icon name="bp" style={{ marginRight: 0, opacity: 1 }} />}
          tooltip={tip("Blood pressure")}
          onClick={() => setBpOpen(true)}
          className={hasBpToday ? undefined : "bp-pulse"}
        />
        <FloatButton
          type="primary"
          icon={<Icon name="logEntry" style={{ marginRight: 0, opacity: 1 }} />}
          tooltip={tip("Notes")}
          onClick={() => setNotesOpen(true)}
        />
      </FloatButton.Group>

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
