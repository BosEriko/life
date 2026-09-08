"use client";

import { useMemo, useState } from "react";
import { Button, Card, Flex, Table, Tabs, theme, Typography } from "antd";
import { DownloadOutlined, UnorderedListOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { TableProps } from "antd";
import { ReportModal } from "@/components/report-modal";
import { useHealthData } from "@/components/health-data-provider";
import { useHealthHistory } from "@/components/use-health-history";
import { mergeById, mergeByDate } from "@/lib/merge-records";
import { useUnits } from "@/components/units-provider";
import { formatVolume, formatWeight } from "@/lib/units";
import { type DailyEntry } from "@/models/dailies";
import { type HabitEntry } from "@/models/habits";
import { formatWaterTime, type WaterLog } from "@/models/water";
import { formatBpTime, type BpReading } from "@/models/bp";
import { formatIntakeTime, type IntakeEntry } from "@/models/intake";

const pagination = {
  defaultPageSize: 25,
  showSizeChanger: true,
  pageSizeOptions: ["25", "50", "100"],
  showTotal: (total: number) => `${total} records`,
};

function dateLabel(date: string) {
  return dayjs(date).format("MMM D, YYYY");
}

function doneLabel(value: boolean | null) {
  if (value == null) return "—";
  return value ? "Done" : "Not done";
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function SummaryPage() {
  const units = useUnits();
  const { token } = theme.useToken();
  const [reportOpen, setReportOpen] = useState(false);

  const {
    dailies,
    habits: habitsWindow,
    bpReadings,
    waterLogs,
    intake: intakeWindow,
    cutoff,
    ready,
  } = useHealthData();
  const history = useHealthHistory(true, cutoff);
  const dataReady = ready && history.ready;

  const daily = useMemo(
    () => mergeByDate(dailies, history.dailies),
    [dailies, history.dailies],
  );
  const habits = useMemo(
    () => mergeByDate(habitsWindow, history.habits),
    [habitsWindow, history.habits],
  );
  const water = useMemo(
    () => mergeById(waterLogs, history.waterLogs),
    [waterLogs, history.waterLogs],
  );
  const bp = useMemo(
    () => mergeById(bpReadings, history.bpReadings),
    [bpReadings, history.bpReadings],
  );
  const intake = useMemo(
    () => mergeById(intakeWindow, history.intake),
    [intakeWindow, history.intake],
  );

  const dailyColumns = useMemo<TableProps<DailyEntry>["columns"]>(
    () => [
      { title: "Date", dataIndex: "date", render: dateLabel, width: 150 },
      {
        title: "Weight",
        dataIndex: "weight",
        render: (value: number | null) =>
          value == null ? "—" : formatWeight(value, units.weight),
        width: 130,
      },
    ],
    [units.weight],
  );

  const habitColumns: TableProps<HabitEntry>["columns"] = [
    { title: "Date", dataIndex: "date", render: dateLabel, width: 150 },
    { title: "Bath", dataIndex: "bath", render: doneLabel, width: 120 },
    {
      title: "Brushed teeth",
      dataIndex: "brushTeeth",
      render: doneLabel,
      width: 150,
    },
  ];

  const waterColumns: TableProps<WaterLog>["columns"] = [
    { title: "Date", dataIndex: "date", render: dateLabel, width: 150 },
    {
      title: "Time",
      key: "time",
      render: (_, item) => formatWaterTime(item.date, item.time),
      width: 110,
    },
    {
      title: "Amount",
      dataIndex: "ml",
      render: (value: number) => formatVolume(value, units.volume),
      width: 130,
    },
    { title: "Label", dataIndex: "label", render: (value) => value || "—" },
  ];

  const bpColumns: TableProps<BpReading>["columns"] = [
    { title: "Date", dataIndex: "date", render: dateLabel, width: 150 },
    {
      title: "Time",
      key: "time",
      render: (_, item) => formatBpTime(item.date, item.time),
      width: 110,
    },
    {
      title: "Reading",
      key: "reading",
      render: (_, item) => `${item.systolic}/${item.diastolic} mmHg`,
      width: 150,
    },
    { title: "Posture", dataIndex: "posture", render: capitalize, width: 120 },
    { title: "Arm", dataIndex: "arm", render: capitalize, width: 100 },
  ];

  const intakeColumns: TableProps<IntakeEntry>["columns"] = [
    { title: "Date", dataIndex: "date", render: dateLabel, width: 150 },
    {
      title: "Time",
      key: "time",
      render: (_, item) => formatIntakeTime(item.date, item.time),
      width: 110,
    },
    { title: "Type", dataIndex: "kind", render: capitalize, width: 100 },
    {
      title: "Name",
      dataIndex: "name",
      render: (value) => value || "—",
      width: 180,
    },
    { title: "Category", dataIndex: "category", width: 150 },
    { title: "Amount", dataIndex: "amount", render: (value) => value || "—", width: 130 },
    { title: "Calories", dataIndex: "calories", render: (value) => value == null ? "—" : `${value} kcal`, width: 120 },
    { title: "Sodium", dataIndex: "sodium", render: (value) => value == null ? "—" : `${value} mg`, width: 120 },
    { title: "Junk", dataIndex: "junk", render: (value: boolean) => value ? "Yes" : "No", width: 90 },
    { title: "Note", dataIndex: "note", render: (value) => value || "—", width: 220 },
  ];

  const table = <T extends object,>(
    data: T[],
    columns: TableProps<T>["columns"],
    rowKey: string | ((record: T) => string),
    isLoaded: boolean,
    scrollWidth: number,
  ) => (
    <Table<T>
      className="flush-table"
      rowKey={rowKey}
      dataSource={data}
      columns={columns}
      loading={!isLoaded}
      pagination={pagination}
      size="middle"
      scroll={{ x: scrollWidth }}
      locale={{ emptyText: "No records yet." }}
    />
  );

  const tabs = [
    {
      key: "daily",
      label: "Daily",
      children: table(daily, dailyColumns, "date", dataReady, 300),
    },
    {
      key: "habits",
      label: "Habits",
      children: table(habits, habitColumns, "date", dataReady, 420),
    },
    {
      key: "water",
      label: "Water",
      children: table(water, waterColumns, "id", dataReady, 540),
    },
    {
      key: "bp",
      label: "Blood pressure",
      children: table(bp, bpColumns, "id", dataReady, 630),
    },
    {
      key: "intake",
      label: "Intake",
      children: table(intake, intakeColumns, "id", dataReady, 1370),
    },
  ];

  const total =
    daily.length + habits.length + water.length + bp.length + intake.length;

  return (
    <div>
      <Flex
        align="flex-start"
        justify="space-between"
        gap={16}
        wrap
        style={{ marginBottom: 24 }}
      >
        <div>
          <Flex align="center" gap={10} style={{ marginBottom: 4 }}>
            <UnorderedListOutlined
              style={{ color: token.colorPrimary, fontSize: 22 }}
            />
            <Typography.Title level={3} style={{ margin: 0 }}>
              Summary
            </Typography.Title>
          </Flex>
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            Browse your complete history across {total} records.
          </Typography.Paragraph>
        </div>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={() => setReportOpen(true)}
        >
          Download report
        </Button>
      </Flex>

      <style>{`
        .flush-tabs .ant-tabs-nav {
          border-bottom: 1px solid ${token.colorBorderSecondary} !important;
        }
        .flush-tabs .ant-tabs-nav::before { display: none !important; }
        .flush-tabs .ant-tabs-ink-bar {
          visibility: visible !important;
          background: ${token.colorPrimary} !important;
        }
        .flush-tabs .ant-tabs-tab {
          border: 0 !important;
          border-inline-end: 1px solid ${token.colorBorderSecondary} !important;
          background: transparent !important;
        }
      `}</style>

      <Card
        styles={{ body: { padding: 0 } }}
        style={{
          borderColor: token.colorBorderSecondary,
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowTertiary,
          overflow: "hidden",
        }}
      >
        <Tabs
          type="card"
          className="flush-tabs"
          items={tabs}
          tabBarStyle={{ margin: 0, padding: 0 }}
        />
      </Card>
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
