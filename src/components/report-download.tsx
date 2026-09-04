"use client";

import { useEffect, useMemo, useState } from "react";
import { App, FloatButton, Grid, Modal, Segmented, Typography } from "antd";
import {
  CodeOutlined,
  DownloadOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { DeveloperModal } from "@/components/developer-modal";
import { ProfileModal } from "@/components/profile-modal";
import { todayKey, watchDailies, type DailyEntry } from "@/models/dailies";
import { EMPTY_PROFILE, watchProfile, type Profile } from "@/models/profile";

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
  const [open, setOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
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
    return watchProfile(user.uid, setProfile, () => {});
  }, [user]);

  const rows = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    if (range === "all") return sorted;
    const cutoff = dayjs(todayKey()).subtract(Number(range) - 1, "day");
    return sorted.filter((entry) => !dayjs(entry.date).isBefore(cutoff, "day"));
  }, [entries, range]);

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

      const pickNums = (key: "weight" | "systolic" | "diastolic" | "water") =>
        rows
          .map((entry) => entry[key])
          .filter((value): value is number => value != null);

      const avgWeight = mean(pickNums("weight"));
      const avgSystolic = mean(pickNums("systolic"));
      const avgDiastolic = mean(pickNums("diastolic"));
      const avgWater = mean(pickNums("water"));
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
            "Notes",
          ],
        ],
        body: rows.map((entry) => [
          entry.date,
          entry.weight != null ? String(entry.weight) : "",
          entry.systolic != null && entry.diastolic != null
            ? `${entry.systolic}/${entry.diastolic}${
                entry.bpTime ? ` ${entry.bpTime}` : ""
              }`
            : "",
          entry.water != null ? String(entry.water) : "",
          entry.junkFood ? "Y" : "",
          entry.junkDrink ? "Y" : "",
          entry.bath ? "Y" : "",
          entry.brushTeeth ? "Y" : "",
          entry.notes ?? "",
        ]),
        styles: { fontSize: 8, cellPadding: 1.5, overflow: "linebreak" },
        headStyles: { fillColor: [46, 125, 79] },
        columnStyles: { 8: { cellWidth: 45 } },
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
      <FloatButton.Group shape="circle">
        <FloatButton
          icon={<IdcardOutlined />}
          tooltip={screens.md === false ? undefined : "Profile"}
          onClick={() => setProfileOpen(true)}
        />
        <FloatButton
          icon={<CodeOutlined />}
          tooltip={screens.md === false ? undefined : "Developer / MCP"}
          onClick={() => setDevOpen(true)}
        />
        <FloatButton
          type="primary"
          icon={<DownloadOutlined />}
          tooltip={screens.md === false ? undefined : "Download report"}
          onClick={() => setOpen(true)}
        />
      </FloatButton.Group>

      <DeveloperModal open={devOpen} onClose={() => setDevOpen(false)} />

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={profile}
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
