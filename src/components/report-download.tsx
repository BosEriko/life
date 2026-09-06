"use client";

import { useEffect, useMemo, useState } from "react";
import { App, FloatButton, Grid, Modal, Segmented, Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { BpModal } from "@/components/bp-modal";
import { WaterModal } from "@/components/water-modal";
import { Icon } from "@/components/icon";
import { todayKey, watchDailies, type DailyEntry } from "@/models/dailies";
import {
  dailyBpAverages,
  watchBpReadings,
  type BpReading,
  type DailyBp,
} from "@/models/bp";
import {
  dailyWaterTotals,
  watchWaterLogs,
  type DailyWater,
  type WaterLog,
} from "@/models/water";
import { watchWaterPresets, type WaterPreset } from "@/models/presets";

const HISTORY_LIMIT = 1000;

type Range = "7" | "30" | "90" | "365" | "all";

const RANGE_OPTIONS = [
  { label: "7D", value: "7" },
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
  { label: "1Y", value: "365" },
  { label: "All", value: "all" },
];

const RANGE_LABEL: Record<Range, string> = {
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
  "365": "Last 12 months",
  all: "All time",
};

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function ReportDownload() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();

  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [bpReadings, setBpReadings] = useState<BpReading[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [presets, setPresets] = useState<WaterPreset[]>([]);
  const [open, setOpen] = useState(false);
  const [bpOpen, setBpOpen] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);
  const [range, setRange] = useState<Range>("30");
  const [busy, setBusy] = useState(false);

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
    return watchWaterPresets(user.uid, setPresets, () => {});
  }, [user]);

  const dailyBp = useMemo(() => dailyBpAverages(bpReadings), [bpReadings]);
  const dailyWater = useMemo(() => dailyWaterTotals(waterLogs), [waterLogs]);

  const hasBpToday = useMemo(
    () => bpReadings.some((reading) => reading.date === todayKey()),
    [bpReadings],
  );
  const hasWaterToday = useMemo(
    () => waterLogs.some((log) => log.date === todayKey()),
    [waterLogs],
  );

  const rows = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    if (range === "all") return sorted;
    const cutoff = dayjs(todayKey()).subtract(Number(range) - 1, "day");
    return sorted.filter((entry) => !dayjs(entry.date).isBefore(cutoff, "day"));
  }, [entries, range]);

  const bpRows = useMemo<DailyBp[]>(() => {
    const all = Array.from(dailyBp.values());
    if (range === "all") return all;
    const cutoff = dayjs(todayKey()).subtract(Number(range) - 1, "day");
    return all.filter((day) => !dayjs(day.date).isBefore(cutoff, "day"));
  }, [dailyBp, range]);

  const waterRows = useMemo<DailyWater[]>(() => {
    const all = Array.from(dailyWater.values());
    if (range === "all") return all;
    const cutoff = dayjs(todayKey()).subtract(Number(range) - 1, "day");
    return all.filter((day) => !dayjs(day.date).isBefore(cutoff, "day"));
  }, [dailyWater, range]);

  async function handleDownload() {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      const generatedAt = dayjs().format("YYYY-MM-DD HH:mm");

      doc.setFontSize(16);
      doc.text("Life Tracker Report", 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(110);
      if (user?.email) doc.text(user.email, 14, 25);
      doc.text(`${RANGE_LABEL[range]} · generated ${generatedAt}`, 14, 30);
      doc.setTextColor(0);

      const avgWeight = mean(
        rows
          .map((entry) => entry.weight)
          .filter((value): value is number => value != null),
      );
      const avgSystolic = mean(bpRows.map((day) => day.systolic));
      const avgDiastolic = mean(bpRows.map((day) => day.diastolic));
      const avgWater = mean(waterRows.map((day) => day.ml));
      const count = (predicate: (entry: DailyEntry) => boolean | null) =>
        String(rows.filter((entry) => predicate(entry)).length);

      autoTable(doc, {
        startY: 36,
        theme: "plain",
        styles: { fontSize: 9 },
        body: [
          ["Days logged", String(rows.length)],
          ["Avg weight", avgWeight != null ? `${avgWeight.toFixed(1)} kg` : "—"],
          [
            "Avg blood pressure",
            avgSystolic != null && avgDiastolic != null
              ? `${Math.round(avgSystolic)}/${Math.round(avgDiastolic)} mmHg`
              : "—",
          ],
          ["Avg water", avgWater != null ? `${Math.round(avgWater)} ml` : "—"],
          ["Junk food days", count((entry) => entry.junkFood)],
          ["Junk drink days", count((entry) => entry.junkDrink)],
          ["Bath days", count((entry) => entry.bath)],
          ["Brush days", count((entry) => entry.brushTeeth)],
        ],
      });

      const summaryEnd =
        (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
          ?.finalY ?? 36;

      autoTable(doc, {
        startY: summaryEnd + 6,
        head: [
          [
            "Date",
            "Weight",
            "BP",
            "Water",
            "Junk F",
            "Junk D",
            "Bath",
            "Brush",
          ],
        ],
        body: rows.map((entry) => {
          const bp = dailyBp.get(entry.date);
          const water = dailyWater.get(entry.date);
          return [
            entry.date,
            entry.weight != null ? String(entry.weight) : "",
            bp ? `${bp.systolic}/${bp.diastolic}` : "",
            water ? String(water.ml) : "",
            entry.junkFood ? "Y" : "",
            entry.junkDrink ? "Y" : "",
            entry.bath ? "Y" : "",
            entry.brushTeeth ? "Y" : "",
          ];
        }),
        styles: { fontSize: 8, cellPadding: 1.5, overflow: "linebreak" },
        headStyles: { fillColor: [46, 125, 79] },
      });

      doc.save(
        `life-report-${range === "all" ? "all" : `${range}d`}-${dayjs().format(
          "YYYYMMDD",
        )}.pdf`,
      );
      setOpen(false);
    } catch {
      message.error("Could not generate the report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <FloatButton.Group
        shape="circle"
        style={screens.md === false ? { insetBlockEnd: 88 } : undefined}
      >
        <FloatButton
          icon={<Icon name="water" style={{ marginRight: 0, opacity: 1 }} />}
          tooltip={screens.md === false ? undefined : "Water"}
          onClick={() => setWaterOpen(true)}
          className={hasWaterToday ? undefined : "bp-pulse"}
        />
        <FloatButton
          icon={<Icon name="bp" style={{ marginRight: 0, opacity: 1 }} />}
          tooltip={screens.md === false ? undefined : "Blood pressure"}
          onClick={() => setBpOpen(true)}
          className={hasBpToday ? undefined : "bp-pulse"}
        />
        <FloatButton
          type="primary"
          icon={<DownloadOutlined />}
          tooltip={screens.md === false ? undefined : "Download report"}
          onClick={() => setOpen(true)}
        />
      </FloatButton.Group>

      <WaterModal
        open={waterOpen}
        onClose={() => setWaterOpen(false)}
        logs={waterLogs}
        presets={presets}
      />

      <BpModal
        open={bpOpen}
        onClose={() => setBpOpen(false)}
        readings={bpReadings}
      />

      <Modal
        open={open}
        centered
        title="Download report"
        okText="Download PDF"
        confirmLoading={busy}
        onOk={handleDownload}
        onCancel={() => setOpen(false)}
      >
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          Choose the range to include.
        </Typography.Paragraph>
        <Segmented
          block
          options={RANGE_OPTIONS}
          value={range}
          onChange={(value) => setRange(value as Range)}
        />
      </Modal>
    </>
  );
}
