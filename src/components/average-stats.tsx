"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Button, Flex, Segmented, Spin, theme, Tooltip, Typography } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  MinusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { Icon, type IconName } from "@/components/icon";
import { IdealBadge } from "@/components/ideal-badge";
import { IdealsModal } from "@/components/ideals-modal";
import { todayKey, watchDailies, type DailyEntry } from "@/models/dailies";
import {
  EMPTY_IDEALS,
  evaluateIdeal,
  rangeText,
  watchIdeals,
  worstStatus,
  type Ideals,
  type IdealStatus,
} from "@/models/ideals";

const HISTORY_LIMIT = 1000;
const RANGE_STORAGE_KEY = "averages-range";

const RANGE_VALUES = ["7", "30", "90", "365", "all"] as const;
type Range = (typeof RANGE_VALUES)[number];

const RANGE_OPTIONS = [
  { label: "7D", value: "7" },
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
  { label: "1Y", value: "365" },
  { label: "All", value: "all" },
];

const RANGE_CAPTION: Record<Range, string> = {
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
  "365": "Last 12 months",
  all: "All time",
};

function loadRange(): Range {
  try {
    const saved = window.localStorage.getItem(RANGE_STORAGE_KEY);
    if (saved && (RANGE_VALUES as readonly string[]).includes(saved)) {
      return saved as Range;
    }
  } catch {
    // localStorage unavailable
  }
  return "7";
}

function saveRange(range: Range) {
  try {
    window.localStorage.setItem(RANGE_STORAGE_KEY, range);
  } catch {
    // localStorage unavailable
  }
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function offBound(status: IdealStatus): string {
  return status === "high" ? "above" : "below";
}

type StatDelta = { dir: "up" | "down" | "flat"; text: string };

type StatItem = {
  label: string;
  icon: IconName;
  value: string;
  status: IdealStatus;
  tip?: string;
  delta?: StatDelta;
};

type WindowStats = {
  weight: number | null;
  systolic: number | null;
  diastolic: number | null;
  water: number | null;
};

function meanStats(entries: DailyEntry[]): WindowStats {
  const pick = (key: "weight" | "systolic" | "diastolic" | "water") =>
    mean(
      entries
        .map((entry) => entry[key])
        .filter((value): value is number => value != null),
    );
  return {
    weight: pick("weight"),
    systolic: pick("systolic"),
    diastolic: pick("diastolic"),
    water: pick("water"),
  };
}

export function AverageStats() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [range, setRange] = useState<Range>(loadRange);
  const [ideals, setIdeals] = useState<Ideals>(EMPTY_IDEALS);
  const [idealsOpen, setIdealsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    return watchDailies(
      user.uid,
      (next) => {
        setEntries(next);
        setLoaded(true);
      },
      () => {
        message.error("Could not load your averages.");
        setLoaded(true);
      },
      HISTORY_LIMIT,
    );
  }, [user, message]);

  useEffect(() => {
    if (!user) return;
    return watchIdeals(user.uid, setIdeals, () => {});
  }, [user]);

  const stats = useMemo(() => {
    const inRange =
      range === "all"
        ? entries
        : entries.filter(
            (entry) =>
              !dayjs(entry.date).isBefore(
                dayjs(todayKey()).subtract(Number(range) - 1, "day"),
                "day",
              ),
          );
    return meanStats(inRange);
  }, [entries, range]);

  const prevStats = useMemo<WindowStats | null>(() => {
    if (range === "all") return null;
    const span = Number(range);
    const end = dayjs(todayKey()).subtract(span, "day");
    const start = dayjs(todayKey()).subtract(span * 2 - 1, "day");
    const inRange = entries.filter((entry) => {
      const day = dayjs(entry.date);
      return !day.isBefore(start, "day") && !day.isAfter(end, "day");
    });
    return meanStats(inRange);
  }, [entries, range]);

  const items: StatItem[] = useMemo(() => {
    const weightStatus = evaluateIdeal(stats.weight, ideals.weight);
    const waterStatus = evaluateIdeal(stats.water, ideals.water);
    const sysStatus = evaluateIdeal(stats.systolic, ideals.systolic);
    const diaStatus = evaluateIdeal(stats.diastolic, ideals.diastolic);
    const bpStatus = worstStatus(sysStatus, diaStatus);

    const priorLabel = range === "7" ? "week" : "period";
    const deltaFor = (
      current: number | null,
      previous: number | null | undefined,
      unit: string,
      precision: number,
    ): StatDelta | undefined => {
      if (current == null || previous == null) return undefined;
      const change = Number((current - previous).toFixed(precision));
      const dir = change > 0 ? "up" : change < 0 ? "down" : "flat";
      const sign = change > 0 ? "+" : change < 0 ? "−" : "±";
      return {
        dir,
        text: `${sign}${Math.abs(change).toFixed(precision)} ${unit} vs prior ${priorLabel}`,
      };
    };

    const bpParts: string[] = [];
    if (sysStatus === "low" || sysStatus === "high") {
      bpParts.push(
        `systolic ${offBound(sysStatus)} ${rangeText(ideals.systolic)}`,
      );
    }
    if (diaStatus === "low" || diaStatus === "high") {
      bpParts.push(
        `diastolic ${offBound(diaStatus)} ${rangeText(ideals.diastolic)}`,
      );
    }

    return [
      {
        label: "Weight",
        icon: "weight",
        value: stats.weight != null ? `${stats.weight.toFixed(1)} kg` : "—",
        status: weightStatus,
        tip:
          weightStatus === "low" || weightStatus === "high"
            ? `${weightStatus === "high" ? "Above" : "Below"} ideal (${rangeText(ideals.weight)} kg)`
            : undefined,
        delta: deltaFor(stats.weight, prevStats?.weight, "kg", 1),
      },
      {
        label: "Blood pressure",
        icon: "bp",
        value:
          stats.systolic != null && stats.diastolic != null
            ? `${Math.round(stats.systolic)}/${Math.round(stats.diastolic)} mmHg`
            : "—",
        status: bpStatus,
        tip: bpParts.length
          ? `Outside ideal — ${bpParts.join(", ")}`
          : "systolic/diastolic",
        delta: deltaFor(stats.systolic, prevStats?.systolic, "mmHg", 0),
      },
      {
        label: "Water",
        icon: "water",
        value: stats.water != null ? `${Math.round(stats.water)} ml` : "—",
        status: waterStatus,
        tip:
          waterStatus === "low" || waterStatus === "high"
            ? `${waterStatus === "high" ? "Above" : "Below"} ideal (${rangeText(ideals.water)} ml)`
            : undefined,
        delta: deltaFor(stats.water, prevStats?.water, "ml", 0),
      },
    ];
  }, [stats, prevStats, ideals, range]);

  return (
    <div>
      <Flex
        align="center"
        justify="space-between"
        gap={12}
        wrap
        style={{ marginBottom: 4 }}
      >
        <Typography.Title level={5} style={{ margin: 0 }}>
          <Icon name="averages" />
          Averages
        </Typography.Title>
        <Segmented
          size="small"
          options={RANGE_OPTIONS}
          value={range}
          onChange={(value) => {
            const next = value as Range;
            setRange(next);
            saveRange(next);
          }}
        />
      </Flex>

      <Flex align="center" gap={12} wrap>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {RANGE_CAPTION[range]}
        </Typography.Text>
        <Button
          type="link"
          size="small"
          style={{ padding: 0, height: "auto" }}
          icon={<Icon name="target" style={{ marginRight: 0 }} />}
          onClick={() => setIdealsOpen(true)}
        >
          Set ideal ranges
        </Button>
      </Flex>

      {!loaded ? (
        <Flex justify="center" style={{ padding: 24 }}>
          <Spin />
        </Flex>
      ) : (
        <Flex gap={12} wrap style={{ marginTop: 12 }}>
          {items.map((item) => {
            const off = item.status === "low" || item.status === "high";
            return (
              <div
                key={item.label}
                style={{
                  flex: "1 1 220px",
                  padding: "12px 14px",
                  borderRadius: token.borderRadiusLG,
                  background: token.colorFillTertiary,
                }}
              >
                <Flex align="center" justify="space-between" gap={8}>
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 12 }}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </Typography.Text>
                  <IdealBadge status={item.status} />
                </Flex>
                <Tooltip title={item.tip} placement="bottom">
                  <Typography.Text
                    strong
                    style={{
                      display: "block",
                      marginTop: 4,
                      fontSize: 18,
                      cursor: item.tip ? "help" : undefined,
                      color: off ? token.colorError : undefined,
                    }}
                  >
                    {item.value}
                    {off ? (
                      <Icon
                        name="alert"
                        style={{
                          marginLeft: 6,
                          marginRight: 0,
                          color: token.colorError,
                        }}
                      />
                    ) : null}
                  </Typography.Text>
                </Tooltip>
                {item.delta ? (
                  (() => {
                    const deltaColor =
                      item.delta.dir === "up"
                        ? token.colorSuccess
                        : item.delta.dir === "down"
                          ? token.colorError
                          : token.colorTextTertiary;
                    return (
                      <Flex align="center" gap={4} style={{ marginTop: 4 }}>
                        {item.delta.dir === "up" ? (
                          <ArrowUpOutlined
                            style={{ fontSize: 11, color: deltaColor }}
                          />
                        ) : item.delta.dir === "down" ? (
                          <ArrowDownOutlined
                            style={{ fontSize: 11, color: deltaColor }}
                          />
                        ) : (
                          <MinusOutlined
                            style={{ fontSize: 11, color: deltaColor }}
                          />
                        )}
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {item.delta.text}
                        </Typography.Text>
                      </Flex>
                    );
                  })()
                ) : null}
              </div>
            );
          })}
        </Flex>
      )}

      <IdealsModal
        open={idealsOpen}
        onClose={() => setIdealsOpen(false)}
        ideals={ideals}
      />
    </div>
  );
}
