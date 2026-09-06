"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Modal, Segmented, Typography } from "antd";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { useUnits } from "@/components/units-provider";
import { todayKey, watchDailies, type DailyEntry } from "@/models/dailies";
import { dailyBpAverages, watchBpReadings, type BpReading } from "@/models/bp";
import {
  dailyWaterTotals,
  watchWaterLogs,
  type WaterLog,
} from "@/models/water";
import {
  dailyIntake,
  watchIntake,
  type IntakeEntry,
} from "@/models/intake";
import { fromKg, volumeSuffix, volumeValue, weightSuffix } from "@/lib/units";

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

function withinRange<T extends { date: string }>(
  items: T[],
  range: Range,
): T[] {
  if (range === "all") return items;
  const cutoff = dayjs(todayKey()).subtract(Number(range) - 1, "day");
  return items.filter((item) => !dayjs(item.date).isBefore(cutoff, "day"));
}

export function ReportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const units = useUnits();
  const { user } = useAuth();
  const { message } = App.useApp();

  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [bpReadings, setBpReadings] = useState<BpReading[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [intakeEntries, setIntakeEntries] = useState<IntakeEntry[]>([]);
  const [range, setRange] = useState<Range>("30");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    return watchDailies(
      user.uid,
      setEntries,
      () => message.error("Could not load your data."),
      HISTORY_LIMIT,
    );
  }, [user, open, message]);

  useEffect(() => {
    if (!user || !open) return;
    return watchBpReadings(user.uid, setBpReadings, () => {});
  }, [user, open]);

  useEffect(() => {
    if (!user || !open) return;
    return watchWaterLogs(user.uid, setWaterLogs, () => {});
  }, [user, open]);

  useEffect(() => {
    if (!user || !open) return;
    return watchIntake(user.uid, setIntakeEntries, () => {});
  }, [user, open]);

  const dailyBp = useMemo(() => dailyBpAverages(bpReadings), [bpReadings]);
  const dailyWater = useMemo(() => dailyWaterTotals(waterLogs), [waterLogs]);
  const dailyIntakeMap = useMemo(
    () => dailyIntake(intakeEntries),
    [intakeEntries],
  );

  const rows = useMemo(
    () =>
      withinRange(
        [...entries].sort((a, b) => a.date.localeCompare(b.date)),
        range,
      ),
    [entries, range],
  );
  const bpRows = useMemo(
    () => withinRange(Array.from(dailyBp.values()), range),
    [dailyBp, range],
  );
  const waterRows = useMemo(
    () => withinRange(Array.from(dailyWater.values()), range),
    [dailyWater, range],
  );
  const intakeRows = useMemo(
    () => withinRange(Array.from(dailyIntakeMap.values()), range),
    [dailyIntakeMap, range],
  );

  async function handleDownload() {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      const generatedAt = dayjs().format("YYYY-MM-DD HH:mm");
      const weightUnit = weightSuffix(units.weight);
      const volumeUnit = volumeSuffix(units.volume);

      doc.setFontSize(16);
      doc.text("Life Tracker Report", 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(110);
      if (user?.email) doc.text(user.email, 14, 25);
      doc.text(`${RANGE_LABEL[range]} · generated ${generatedAt}`, 14, 30);
      doc.setTextColor(0);

      const avgWeightKg = mean(
        rows
          .map((entry) => entry.weight)
          .filter((value): value is number => value != null),
      );
      const avgSystolic = mean(bpRows.map((day) => day.systolic));
      const avgDiastolic = mean(bpRows.map((day) => day.diastolic));
      const avgWaterMl = mean(waterRows.map((day) => day.ml));
      const avgCalories = mean(
        intakeRows.map((day) => day.calories).filter((value) => value > 0),
      );
      const avgSodium = mean(
        intakeRows.map((day) => day.sodium).filter((value) => value > 0),
      );

      autoTable(doc, {
        startY: 36,
        theme: "plain",
        styles: { fontSize: 9 },
        body: [
          ["Days logged", String(rows.length)],
          [
            "Avg weight",
            avgWeightKg != null
              ? `${fromKg(avgWeightKg, units.weight).toFixed(1)} ${weightUnit}`
              : "—",
          ],
          [
            "Avg blood pressure",
            avgSystolic != null && avgDiastolic != null
              ? `${Math.round(avgSystolic)}/${Math.round(avgDiastolic)} mmHg`
              : "—",
          ],
          [
            "Avg water",
            avgWaterMl != null
              ? `${volumeValue(avgWaterMl, units.volume)} ${volumeUnit}`
              : "—",
          ],
          [
            "Avg daily calories",
            avgCalories != null ? `${Math.round(avgCalories)} kcal` : "—",
          ],
          [
            "Avg daily sodium",
            avgSodium != null ? `${Math.round(avgSodium)} mg` : "—",
          ],
          [
            "Junk food days",
            String(intakeRows.filter((day) => day.junkFood).length),
          ],
          [
            "Junk drink days",
            String(intakeRows.filter((day) => day.junkDrink).length),
          ],
          ["Bath days", String(rows.filter((entry) => entry.bath).length)],
          [
            "Brush days",
            String(rows.filter((entry) => entry.brushTeeth).length),
          ],
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
            `Weight (${weightUnit})`,
            "BP",
            `Water (${volumeUnit})`,
            "Junk F",
            "Junk D",
            "Bath",
            "Brush",
          ],
        ],
        body: rows.map((entry) => {
          const bp = dailyBp.get(entry.date);
          const water = dailyWater.get(entry.date);
          const intake = dailyIntakeMap.get(entry.date);
          return [
            entry.date,
            entry.weight != null
              ? String(fromKg(entry.weight, units.weight).toFixed(1))
              : "",
            bp ? `${bp.systolic}/${bp.diastolic}` : "",
            water ? String(volumeValue(water.ml, units.volume)) : "",
            intake?.junkFood ? "Y" : "",
            intake?.junkDrink ? "Y" : "",
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
      onClose();
    } catch {
      message.error("Could not generate the report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      centered
      title="Download report"
      okText="Download PDF"
      confirmLoading={busy}
      onOk={handleDownload}
      onCancel={onClose}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        A PDF summary plus a day-by-day table. Choose the range to include.
      </Typography.Paragraph>
      <Segmented
        block
        options={RANGE_OPTIONS}
        value={range}
        onChange={(value) => setRange(value as Range)}
      />
    </Modal>
  );
}
