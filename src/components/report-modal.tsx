"use client";

import { useMemo, useState } from "react";
import { App, Checkbox, Divider, Modal, Segmented, Typography } from "antd";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { useHealthHistory } from "@/components/use-health-history";
import { mergeById, mergeByDate } from "@/lib/merge-records";
import { useUnits } from "@/components/units-provider";
import { todayKey, type DailyEntry } from "@/models/dailies";
import { type HabitEntry } from "@/models/habits";
import { dailyBpAverages } from "@/models/bp";
import { dailyWaterTotals } from "@/models/water";
import { dailyIntake } from "@/models/intake";
import {
  convertRange,
  fromKg,
  fromMl,
  volumeSuffix,
  volumeValue,
  weightSuffix,
} from "@/lib/units";

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

const FIELDS = [
  { key: "weight", label: "Weight" },
  { key: "bp", label: "Blood pressure" },
  { key: "water", label: "Water" },
  { key: "calories", label: "Calories" },
  { key: "sodium", label: "Sodium" },
  { key: "junkFood", label: "Junk food" },
  { key: "junkDrink", label: "Junk drink" },
  { key: "bath", label: "Bath" },
  { key: "brush", label: "Brush" },
  { key: "steps", label: "10k steps" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

const DEFAULT_FIELDS = FIELDS.map((field) => field.key).filter(
  (key): key is FieldKey =>
    key !== "bath" && key !== "brush" && key !== "steps",
);

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function idealGuides(
  range: { min: number | null; max: number | null },
  prefix: string,
): { value: number; label: string }[] {
  const out: { value: number; label: string }[] = [];
  if (range.min != null) {
    out.push({ value: range.min, label: `${prefix}min ${range.min}` });
  }
  if (range.max != null) {
    out.push({ value: range.max, label: `${prefix}max ${range.max}` });
  }
  return out;
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

  const [range, setRange] = useState<Range>("30");
  const [fields, setFields] = useState<FieldKey[]>(DEFAULT_FIELDS);
  const [busy, setBusy] = useState(false);

  const has = (key: FieldKey) => fields.includes(key);

  const {
    dailies,
    habits,
    bpReadings: bpWindow,
    waterLogs: waterWindow,
    intake: intakeWindow,
    ideals,
    cutoff,
  } = useHealthData();
  const needHistory = open && (range === "all" || range === "365");
  const history = useHealthHistory(needHistory, cutoff);

  const entries = useMemo(
    () => mergeByDate(dailies, history.dailies),
    [dailies, history.dailies],
  );
  const habitEntries = useMemo(
    () => mergeByDate(habits, history.habits),
    [habits, history.habits],
  );
  const habitByDate = useMemo(() => {
    const map = new Map<string, HabitEntry>();
    for (const entry of habitEntries) map.set(entry.date, entry);
    return map;
  }, [habitEntries]);
  const bpReadings = useMemo(
    () => mergeById(bpWindow, history.bpReadings),
    [bpWindow, history.bpReadings],
  );
  const waterLogs = useMemo(
    () => mergeById(waterWindow, history.waterLogs),
    [waterWindow, history.waterLogs],
  );
  const intakeEntries = useMemo(
    () => mergeById(intakeWindow, history.intake),
    [intakeWindow, history.intake],
  );

  const dailyBp = useMemo(() => dailyBpAverages(bpReadings), [bpReadings]);
  const dailyWater = useMemo(() => dailyWaterTotals(waterLogs), [waterLogs]);
  const dailyIntakeMap = useMemo(
    () => dailyIntake(intakeEntries),
    [intakeEntries],
  );

  const rows = useMemo(() => {
    const byDate = new Map<string, DailyEntry>();
    for (const entry of entries) byDate.set(entry.date, entry);
    for (const habit of habitEntries) {
      if (!byDate.has(habit.date)) {
        byDate.set(habit.date, {
          date: habit.date,
          weight: null,
          updatedAt: null,
        });
      }
    }
    return withinRange(
      Array.from(byDate.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
      range,
    );
  }, [entries, habitEntries, range]);
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
      const generatedAt = dayjs().format("MMM D, YYYY [at] h:mm A");
      const siteUrl = "https://life.boseriko.com/";
      const weightUnit = weightSuffix(units.weight);
      const volumeUnit = volumeSuffix(units.volume);

      // brand mark: rasterize the app icon (public/icon.svg) into the header
      try {
        const iconUri = await new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 160;
            canvas.height = 160;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("no 2d context"));
            ctx.drawImage(img, 0, 0, 160, 160);
            resolve(canvas.toDataURL("image/png"));
          };
          img.onerror = () => reject(new Error("icon failed to load"));
          img.src = "/icon.svg";
        });
        doc.addImage(iconUri, "PNG", 14, 11, 11, 11);
      } catch {
        doc.setFillColor(46, 125, 79);
        doc.roundedRect(14, 11, 11, 11, 2.6, 2.6, "F");
      }

      doc.setFontSize(16);
      doc.text("Life Tracker Report", 29, 18);
      doc.setFontSize(10);
      doc.setTextColor(110);
      if (user?.email) doc.text(user.email, 14, 27);
      doc.text(RANGE_LABEL[range], 14, 32);
      doc.textWithLink(`Generated ${generatedAt} · ${siteUrl}`, 14, 37, {
        url: siteUrl,
      });
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

      const summaryBody: string[][] = [["Days logged", String(rows.length)]];
      if (has("weight"))
        summaryBody.push([
          "Avg weight",
          avgWeightKg != null
            ? `${fromKg(avgWeightKg, units.weight).toFixed(1)} ${weightUnit}`
            : "—",
        ]);
      if (has("bp"))
        summaryBody.push([
          "Avg blood pressure",
          avgSystolic != null && avgDiastolic != null
            ? `${Math.round(avgSystolic)}/${Math.round(avgDiastolic)} mmHg`
            : "—",
        ]);
      if (has("water"))
        summaryBody.push([
          "Avg water",
          avgWaterMl != null
            ? `${volumeValue(avgWaterMl, units.volume)} ${volumeUnit}`
            : "—",
        ]);
      if (has("calories"))
        summaryBody.push([
          "Avg daily calories",
          avgCalories != null ? `${Math.round(avgCalories)} kcal` : "—",
        ]);
      if (has("sodium"))
        summaryBody.push([
          "Avg daily sodium",
          avgSodium != null ? `${Math.round(avgSodium)} mg` : "—",
        ]);
      if (has("junkFood"))
        summaryBody.push([
          "Junk food days",
          String(intakeRows.filter((day) => day.junkFood).length),
        ]);
      if (has("junkDrink"))
        summaryBody.push([
          "Junk drink days",
          String(intakeRows.filter((day) => day.junkDrink).length),
        ]);
      if (has("bath"))
        summaryBody.push([
          "Bath days",
          String(
            rows.filter((entry) => habitByDate.get(entry.date)?.bath).length,
          ),
        ]);
      if (has("brush"))
        summaryBody.push([
          "Brush days",
          String(
            rows.filter((entry) => habitByDate.get(entry.date)?.brushTeeth)
              .length,
          ),
        ]);
      if (has("steps"))
        summaryBody.push([
          "10k step days",
          String(
            rows.filter((entry) => habitByDate.get(entry.date)?.steps).length,
          ),
        ]);

      autoTable(doc, {
        startY: 42,
        theme: "plain",
        styles: { fontSize: 9 },
        body: summaryBody,
      });

      const summaryEnd =
        (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
          ?.finalY ?? 42;

      type DayBp = ReturnType<typeof dailyBp.get>;
      type DayWater = ReturnType<typeof dailyWater.get>;
      type DayIntake = ReturnType<typeof dailyIntakeMap.get>;
      type Column = {
        header: string;
        cell: (
          entry: DailyEntry,
          bp: DayBp,
          water: DayWater,
          intake: DayIntake,
          habit: HabitEntry | undefined,
        ) => string;
      };

      const columns: Column[] = [{ header: "Date", cell: (entry) => entry.date }];
      if (has("weight"))
        columns.push({
          header: `Weight (${weightUnit})`,
          cell: (entry) =>
            entry.weight != null
              ? String(fromKg(entry.weight, units.weight).toFixed(1))
              : "",
        });
      if (has("bp"))
        columns.push({
          header: "BP",
          cell: (_entry, bp) => (bp ? `${bp.systolic}/${bp.diastolic}` : ""),
        });
      if (has("water"))
        columns.push({
          header: `Water (${volumeUnit})`,
          cell: (_entry, _bp, water) =>
            water ? String(volumeValue(water.ml, units.volume)) : "",
        });
      if (has("calories"))
        columns.push({
          header: "Cal",
          cell: (_entry, _bp, _water, intake) =>
            intake && intake.calories > 0 ? String(intake.calories) : "",
        });
      if (has("sodium"))
        columns.push({
          header: "Sodium",
          cell: (_entry, _bp, _water, intake) =>
            intake && intake.sodium > 0 ? String(intake.sodium) : "",
        });
      if (has("junkFood"))
        columns.push({
          header: "Junk F",
          cell: (_entry, _bp, _water, intake) => (intake?.junkFood ? "Y" : ""),
        });
      if (has("junkDrink"))
        columns.push({
          header: "Junk D",
          cell: (_entry, _bp, _water, intake) => (intake?.junkDrink ? "Y" : ""),
        });
      if (has("bath"))
        columns.push({
          header: "Bath",
          cell: (_entry, _bp, _water, _intake, habit) =>
            habit?.bath ? "Y" : "",
        });
      if (has("brush"))
        columns.push({
          header: "Brush",
          cell: (_entry, _bp, _water, _intake, habit) =>
            habit?.brushTeeth ? "Y" : "",
        });
      if (has("steps"))
        columns.push({
          header: "Steps",
          cell: (_entry, _bp, _water, _intake, habit) =>
            habit?.steps ? "Y" : "",
        });

      autoTable(doc, {
        startY: summaryEnd + 6,
        head: [columns.map((column) => column.header)],
        body: rows.map((entry) => {
          const bp = dailyBp.get(entry.date);
          const water = dailyWater.get(entry.date);
          const intake = dailyIntakeMap.get(entry.date);
          const habit = habitByDate.get(entry.date);
          return columns.map((column) =>
            column.cell(entry, bp, water, intake, habit),
          );
        }),
        styles: { fontSize: 8, cellPadding: 1.5, overflow: "linebreak" },
        headStyles: { fillColor: [46, 125, 79] },
      });

      // ---- trend charts, on their own page after the tables ----
      const pageWidth = doc.internal.pageSize.getWidth();
      const GREEN: [number, number, number] = [46, 125, 79];
      const TERRA: [number, number, number] = [176, 83, 59];

      type ChartPoint = { label: string; value: number };
      type ChartSeries = {
        points: ChartPoint[];
        color: [number, number, number];
      };

      let chartsEnd = 20;

      const drawChart = (
        title: string,
        rawSeries: ChartSeries[],
        guides: { value: number; label: string }[] = [],
      ) => {
        // oldest date on the left, newest on the right
        const seriesList = rawSeries.map((s) => ({
          ...s,
          points: [...s.points].sort((a, b) => a.label.localeCompare(b.label)),
        }));
        if (!seriesList.length || seriesList[0].points.length < 2) return;

        const left = 14;
        const plotLeft = left + 20;
        const plotRight = pageWidth - 14;
        const height = 48;

        if (chartsEnd + height + 14 > doc.internal.pageSize.getHeight() - 16) {
          doc.addPage();
          chartsEnd = 20;
        }
        const top = chartsEnd + 5;
        const base = chartsEnd + height;

        doc.setFontSize(9);
        doc.setTextColor(60);
        doc.text(title, left, chartsEnd);

        const values = seriesList
          .flatMap((s) => s.points.map((p) => p.value))
          .concat(guides.map((g) => g.value));
        let min = values.reduce((m, v) => Math.min(m, v), Infinity);
        let max = values.reduce((m, v) => Math.max(m, v), -Infinity);
        if (min === max) {
          min -= 1;
          max += 1;
        }
        const spread = max - min;
        const decimals = spread < 20 ? 1 : 0;
        const toY = (value: number) =>
          base - ((value - min) / spread) * (base - top);

        // y axis: 5 gridlines + labels
        doc.setFontSize(7);
        for (let t = 0; t <= 4; t += 1) {
          const value = min + (spread * t) / 4;
          const y = toY(value);
          doc.setDrawColor(t === 0 ? 180 : 232);
          doc.setLineWidth(0.15);
          doc.line(plotLeft, y, plotRight, y);
          doc.setTextColor(150);
          doc.text(value.toFixed(decimals), left, y + 1);
        }

        // ideal boundary guides
        if (guides.length) {
          doc.setDrawColor(140);
          doc.setLineWidth(0.2);
          doc.setLineDashPattern([0.8, 0.8], 0);
          doc.setFontSize(6);
          doc.setTextColor(140);
          for (const guide of guides) {
            const y = toY(guide.value);
            doc.line(plotLeft, y, plotRight, y);
            const w = doc.getTextWidth(guide.label);
            doc.text(guide.label, plotRight - w, y - 0.8);
          }
          doc.setLineDashPattern([], 0);
        }

        // x axis: up to 7 date ticks
        const points = seriesList[0].points;
        const span = plotRight - plotLeft;
        const denom = points.length - 1;
        const tickEvery = Math.max(1, Math.ceil(points.length / 7));
        doc.setDrawColor(180);
        doc.setLineWidth(0.15);
        doc.setTextColor(150);
        for (let i = 0; i < points.length; i += 1) {
          if (i % tickEvery !== 0 && i !== points.length - 1) continue;
          const x = plotLeft + (span * i) / denom;
          doc.line(x, base, x, base + 1.6);
          const label = dayjs(points[i].label).format("M/D");
          const w = doc.getTextWidth(label);
          const tx = Math.min(Math.max(x - w / 2, plotLeft), plotRight - w);
          doc.text(label, tx, base + 5);
        }

        // series lines
        seriesList.forEach((s) => {
          if (s.points.length < 2) return;
          doc.setDrawColor(s.color[0], s.color[1], s.color[2]);
          doc.setLineWidth(0.5);
          for (let i = 1; i < s.points.length; i += 1) {
            doc.line(
              plotLeft + (span * (i - 1)) / denom,
              toY(s.points[i - 1].value),
              plotLeft + (span * i) / denom,
              toY(s.points[i].value),
            );
          }
        });

        doc.setTextColor(0);
        doc.setDrawColor(0);
        chartsEnd = base + 16;
      };

      const weightPoints: ChartPoint[] = rows
        .filter((entry) => entry.weight != null)
        .map((entry) => ({
          label: entry.date,
          value: Number(fromKg(entry.weight as number, units.weight).toFixed(1)),
        }));
      const waterPoints: ChartPoint[] = waterRows.map((day) => ({
        label: day.date,
        value: Number(volumeValue(day.ml, units.volume)),
      }));
      const sysPoints: ChartPoint[] = bpRows.map((day) => ({
        label: day.date,
        value: day.systolic,
      }));
      const diaPoints: ChartPoint[] = bpRows.map((day) => ({
        label: day.date,
        value: day.diastolic,
      }));

      const wantWeightChart = has("weight") && weightPoints.length >= 2;
      const wantWaterChart = has("water") && waterPoints.length >= 2;
      const wantBpChart = has("bp") && sysPoints.length >= 2;

      if (wantWeightChart || wantWaterChart || wantBpChart) {
        doc.addPage();
        chartsEnd = 20;
        doc.setFontSize(13);
        doc.setTextColor(0);
        doc.text("Trends", 14, chartsEnd);
        chartsEnd += 10;
        if (wantWeightChart)
          drawChart(
            `Weight (${weightUnit})`,
            [{ points: weightPoints, color: GREEN }],
            idealGuides(
              convertRange(ideals.weight, (v) => fromKg(v, units.weight)),
              "",
            ),
          );
        if (wantWaterChart)
          drawChart(
            `Water (${volumeUnit})`,
            [{ points: waterPoints, color: GREEN }],
            idealGuides(
              convertRange(ideals.water, (v) => fromMl(v, units.volume)),
              "",
            ),
          );
        if (wantBpChart)
          drawChart(
            "Blood pressure — systolic / diastolic (mmHg)",
            [
              { points: sysPoints, color: TERRA },
              { points: diaPoints, color: GREEN },
            ],
            [
              ...idealGuides(ideals.systolic, "sys "),
              ...idealGuides(ideals.diastolic, "dia "),
            ],
          );
      }

      const pageHeight = doc.internal.pageSize.getHeight();
      for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
        doc.setPage(page);
        doc.setFontSize(8);
        doc.setTextColor(140);
        doc.textWithLink(`Generate your own at ${siteUrl}`, 14, pageHeight - 8, {
          url: siteUrl,
        });
        doc.setTextColor(0);
      }

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
        A PDF summary plus a day-by-day table. Choose the range and the data to
        include.
      </Typography.Paragraph>
      <Segmented
        block
        options={RANGE_OPTIONS}
        value={range}
        onChange={(value) => setRange(value as Range)}
      />

      <Divider style={{ margin: "16px 0 10px" }} />

      <Typography.Text strong style={{ fontSize: 13 }}>
        Include
      </Typography.Text>
      <Checkbox.Group
        value={fields}
        onChange={(value) => setFields(value as FieldKey[])}
        options={FIELDS.map((field) => ({
          label: field.label,
          value: field.key,
        }))}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          rowGap: 8,
          marginTop: 10,
        }}
      />
    </Modal>
  );
}
