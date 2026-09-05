"use client";

import { useState } from "react";
import { Button, Modal, Space, Table, Typography } from "antd";
import { relativeDate } from "@/models/dailies";
import type { DailyConflict } from "@/lib/daily-sync";

const FIELD_LABELS: Record<string, string> = {
  weight: "Weight",
  systolic: "Systolic",
  diastolic: "Diastolic",
  bpPosture: "BP posture",
  bpArm: "BP arm",
  water: "Water",
  notes: "Notes",
  junkFood: "Junk food",
  junkDrink: "Junk drink",
  bath: "Bath",
  brushTeeth: "Brush teeth",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function SyncConflictModal({
  conflicts,
  onResolve,
}: {
  conflicts: DailyConflict[];
  onResolve: (date: string, choice: "mine" | "cloud") => void;
}) {
  const [busyDate, setBusyDate] = useState<string | null>(null);
  const current = conflicts[0];

  if (!current) return null;

  const rows = Object.keys(current.mine)
    .filter((key) => key in FIELD_LABELS)
    .map((key) => ({
      key,
      label: FIELD_LABELS[key],
      cloud: formatValue(current.cloud?.[key]),
      mine: formatValue((current.mine as Record<string, unknown>)[key]),
    }));

  async function choose(choice: "mine" | "cloud") {
    setBusyDate(current.date);
    onResolve(current.date, choice);
  }

  return (
    <Modal
      open
      centered
      closable={false}
      maskClosable={false}
      title={`This entry changed while you were offline — ${relativeDate(current.date)}`}
      footer={
        <Space>
          <Button loading={busyDate === current.date} onClick={() => choose("cloud")}>
            Keep cloud
          </Button>
          <Button
            type="primary"
            loading={busyDate === current.date}
            onClick={() => choose("mine")}
          >
            Keep mine
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Both this device and the cloud have a save for this day. Pick which one to keep
        {conflicts.length > 1 ? ` (${conflicts.length} entries need this).` : "."}
      </Typography.Paragraph>
      <Table
        size="small"
        pagination={false}
        dataSource={rows}
        columns={[
          { title: "Field", dataIndex: "label" },
          { title: "Cloud", dataIndex: "cloud" },
          { title: "Yours (offline)", dataIndex: "mine" },
        ]}
      />
    </Modal>
  );
}
