"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Card, Flex, Result, Spin, Table, Typography, theme } from "antd";
import type { TableProps } from "antd";
import Link from "next/link";
import dayjs from "dayjs";
import { Icon } from "@/components/icon";
import { IdealTip, idealTipProps } from "@/components/ideal-tip";
import { EMPTY_IDEALS, evaluateIdeal, type Ideals } from "@/models/ideals";
import {
  convertRange,
  DEFAULT_UNITS,
  formatVolume,
  formatWeight,
  fromKg,
  fromMl,
  isVolumeUnit,
  isWeightUnit,
  volumeSuffix,
  weightSuffix,
  type VolumeUnit,
  type WeightUnit,
} from "@/lib/units";

type DailyRow = {
  date: string;
  weight: number | null;
  systolic: number | null;
  diastolic: number | null;
  water: number | null;
  calories: number;
  sodium: number;
  intakeCount: number;
  bath: boolean | null;
  brushTeeth: boolean | null;
  steps: boolean | null;
};

type InvitePayload = {
  ownerName: string;
  weightUnit: string | null;
  volumeUnit: string | null;
  count: number;
  dailies: DailyRow[];
  ideals: Ideals;
  link: {
    label: string | null;
    expiresAt: number | null;
    remainingUses: number | null;
  };
};

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; data: InvitePayload };

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function TipValue({
  text,
  isAbove,
  isBelow,
  message,
}: {
  text: string;
  isAbove: boolean;
  isBelow: boolean;
  message?: string;
}) {
  const { token } = theme.useToken();
  const off = isAbove || isBelow;
  return (
    <IdealTip isAbove={isAbove} isBelow={isBelow} message={message}>
      <span
        style={{
          color: off ? token.colorError : undefined,
          cursor: off ? "help" : undefined,
        }}
      >
        {text}
      </span>
    </IdealTip>
  );
}

function StatCard({ label, value }: { label: string; value: ReactNode }) {
  const { token } = theme.useToken();
  return (
    <Card
      size="small"
      style={{
        borderColor: token.colorBorderSecondary,
        borderRadius: token.borderRadiusLG,
      }}
    >
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {label}
      </Typography.Text>
      <div
        style={{
          fontSize: 20,
          fontWeight: 600,
          lineHeight: 1.3,
          marginTop: 4,
          color: token.colorText,
        }}
      >
        {value}
      </div>
    </Card>
  );
}

export function InviteViewer({ code }: { code: string }) {
  const { token } = theme.useToken();
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    fetch(`/api/invite/${code}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        } & Partial<InvitePayload>;
        if (!active) return;
        if (!res.ok) {
          setState({
            status: "error",
            message: body.error ?? "This link is no longer valid.",
          });
          return;
        }
        setState({ status: "ok", data: body as InvitePayload });
      })
      .catch(() => {
        if (active) {
          setState({
            status: "error",
            message: "Could not load this link. Check your connection.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [code]);

  const data = state.status === "ok" ? state.data : null;

  const weightUnit: WeightUnit =
    data && isWeightUnit(data.weightUnit) ? data.weightUnit : DEFAULT_UNITS.weight;
  const volumeUnit: VolumeUnit =
    data && isVolumeUnit(data.volumeUnit) ? data.volumeUnit : DEFAULT_UNITS.volume;
  const ideals: Ideals = data?.ideals ?? EMPTY_IDEALS;

  const rows = useMemo(() => {
    if (!data) return [];
    return [...data.dailies].sort((a, b) => b.date.localeCompare(a.date));
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return null;
    const withWeight = [...data.dailies]
      .filter((d) => d.weight != null)
      .sort((a, b) => b.date.localeCompare(a.date));
    const withBp = data.dailies.filter(
      (d) => d.systolic != null && d.diastolic != null,
    );
    const withWater = data.dailies.filter((d) => d.water != null);
    const withIntake = data.dailies.filter((d) => d.intakeCount > 0);
    return {
      latestWeight: withWeight.length > 0 ? withWeight[0].weight : null,
      avgSystolic: average(withBp.map((d) => d.systolic as number)),
      avgDiastolic: average(withBp.map((d) => d.diastolic as number)),
      avgWater: average(withWater.map((d) => d.water as number)),
      avgCalories: average(withIntake.map((d) => d.calories)),
      avgSodium: average(withIntake.map((d) => d.sodium)),
    };
  }, [data]);

  if (state.status === "loading") {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100dvh" }}>
        <Spin size="large" />
      </Flex>
    );
  }

  if (state.status === "error") {
    return (
      <Flex
        align="center"
        justify="center"
        style={{ minHeight: "100dvh", padding: 24 }}
      >
        <Result
          status="warning"
          title="This link isn't available"
          subTitle={state.message}
        />
      </Flex>
    );
  }

  const weightTip = idealTipProps(
    "Weight",
    evaluateIdeal(stats?.latestWeight ?? null, ideals.weight),
    convertRange(ideals.weight, (v) => fromKg(v, weightUnit)),
    weightSuffix(weightUnit),
  );
  const sysTip = idealTipProps(
    "Systolic",
    evaluateIdeal(stats?.avgSystolic ?? null, ideals.systolic),
    ideals.systolic,
    "mmHg",
  );
  const diaTip = idealTipProps(
    "Diastolic",
    evaluateIdeal(stats?.avgDiastolic ?? null, ideals.diastolic),
    ideals.diastolic,
    "mmHg",
  );
  const waterTip = idealTipProps(
    "Water",
    evaluateIdeal(stats?.avgWater ?? null, ideals.water),
    convertRange(ideals.water, (v) => fromMl(v, volumeUnit)),
    volumeSuffix(volumeUnit),
  );
  const caloriesTip = idealTipProps(
    "Calories",
    evaluateIdeal(stats?.avgCalories ?? null, ideals.calories),
    ideals.calories,
    "kcal",
  );
  const sodiumTip = idealTipProps(
    "Sodium",
    evaluateIdeal(stats?.avgSodium ?? null, ideals.sodium),
    ideals.sodium,
    "mg",
  );

  const columns: TableProps<DailyRow>["columns"] = [
    {
      title: "Date",
      dataIndex: "date",
      fixed: "left",
      width: 130,
      render: (value: string) => dayjs(value).format("MMM D, YYYY"),
    },
    {
      title: "Weight",
      dataIndex: "weight",
      render: (value: number | null) =>
        value != null ? formatWeight(value, weightUnit) : "—",
    },
    {
      title: "Blood pressure",
      key: "bp",
      render: (_value, row) =>
        row.systolic != null && row.diastolic != null
          ? `${row.systolic}/${row.diastolic} mmHg`
          : "—",
    },
    {
      title: "Water",
      dataIndex: "water",
      render: (value: number | null) =>
        value != null ? formatVolume(value, volumeUnit) : "—",
    },
    {
      title: "Calories",
      key: "calories",
      render: (_value, row) =>
        row.intakeCount > 0 ? `${row.calories} kcal` : "—",
    },
    {
      title: "Sodium",
      key: "sodium",
      render: (_value, row) =>
        row.intakeCount > 0 ? `${row.sodium} mg` : "—",
    },
    {
      title: "Bath",
      dataIndex: "bath",
      render: (value: boolean | null) => (value ? "✓" : ""),
    },
    {
      title: "Brush",
      dataIndex: "brushTeeth",
      render: (value: boolean | null) => (value ? "✓" : ""),
    },
    {
      title: "10k steps",
      dataIndex: "steps",
      render: (value: boolean | null) => (value ? "✓" : ""),
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
      <Flex align="center" gap={10} style={{ marginBottom: 8 }}>
        <div
          style={{
            width: 32,
            height: 32,
            flexShrink: 0,
            borderRadius: 9,
            background: token.colorPrimary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon
            name="brand"
            style={{
              margin: 0,
              opacity: 1,
              color: token.colorTextLightSolid,
              fontSize: 15,
            }}
          />
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Life Tracker · shared, read-only
        </Typography.Text>
      </Flex>

      <Typography.Title level={3} style={{ marginTop: 4, marginBottom: 4 }}>
        {state.data.ownerName}&apos;s last 7 days
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        {state.data.link.label ? `“${state.data.link.label}” · ` : ""}
        {state.data.count} day{state.data.count === 1 ? "" : "s"} with data
        {state.data.link.remainingUses != null
          ? ` · ${state.data.link.remainingUses} view${
              state.data.link.remainingUses === 1 ? "" : "s"
            } left`
          : ""}
        {state.data.link.expiresAt
          ? ` · expires ${dayjs(state.data.link.expiresAt).format(
              "MMM D, YYYY h:mm A",
            )}`
          : ""}
      </Typography.Paragraph>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Latest weight"
          value={
            stats?.latestWeight != null ? (
              <TipValue
                text={formatWeight(stats.latestWeight, weightUnit)}
                isAbove={weightTip.isAbove}
                isBelow={weightTip.isBelow}
                message={weightTip.message}
              />
            ) : (
              "—"
            )
          }
        />
        <StatCard
          label="Avg blood pressure"
          value={
            stats?.avgSystolic != null && stats?.avgDiastolic != null ? (
              <>
                <TipValue
                  text={`${Math.round(stats.avgSystolic)}`}
                  isAbove={sysTip.isAbove}
                  isBelow={sysTip.isBelow}
                  message={sysTip.message}
                />
                /
                <TipValue
                  text={`${Math.round(stats.avgDiastolic)}`}
                  isAbove={diaTip.isAbove}
                  isBelow={diaTip.isBelow}
                  message={diaTip.message}
                />{" "}
                mmHg
              </>
            ) : (
              "—"
            )
          }
        />
        <StatCard
          label="Avg water"
          value={
            stats?.avgWater != null ? (
              <TipValue
                text={formatVolume(stats.avgWater, volumeUnit)}
                isAbove={waterTip.isAbove}
                isBelow={waterTip.isBelow}
                message={waterTip.message}
              />
            ) : (
              "—"
            )
          }
        />
        <StatCard
          label="Avg calories"
          value={
            stats?.avgCalories != null ? (
              <>
                <TipValue
                  text={`${Math.round(stats.avgCalories)}`}
                  isAbove={caloriesTip.isAbove}
                  isBelow={caloriesTip.isBelow}
                  message={caloriesTip.message}
                />{" "}
                kcal
              </>
            ) : (
              "—"
            )
          }
        />
        <StatCard
          label="Avg sodium"
          value={
            stats?.avgSodium != null ? (
              <>
                <TipValue
                  text={`${Math.round(stats.avgSodium)}`}
                  isAbove={sodiumTip.isAbove}
                  isBelow={sodiumTip.isBelow}
                  message={sodiumTip.message}
                />{" "}
                mg
              </>
            ) : (
              "—"
            )
          }
        />
      </div>

      <Card
        size="small"
        styles={{ body: { padding: 0 } }}
        style={{ overflow: "hidden" }}
      >
        <div style={{ overflowX: "auto" }}>
          <Table<DailyRow>
            className="flush-table"
            rowKey="date"
            size="small"
            dataSource={rows}
            columns={columns}
            pagination={false}
            scroll={{ x: 760 }}
            locale={{ emptyText: "No data in this link yet." }}
          />
        </div>
      </Card>

      <Typography.Paragraph
        type="secondary"
        style={{ textAlign: "center", fontSize: 12, marginTop: 32 }}
      >
        <Link href="/">Life Tracker</Link> — track your own health, free.
      </Typography.Paragraph>
    </div>
  );
}
