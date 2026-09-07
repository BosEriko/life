"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  App,
  Button,
  Flex,
  Grid,
  Segmented,
  Spin,
  theme,
  Typography,
} from "antd";
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
import { Tip } from "@/components/tip";
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
import {
  dailyIntake,
  watchIntake,
  type DailyIntake,
  type IntakeEntry,
} from "@/models/intake";
import { useUnits } from "@/components/units-provider";
import {
  convertRange,
  formatVolume,
  formatWeight,
  fromKg,
  fromMl,
  volumeDecimals,
  volumeSuffix,
  weightSuffix,
} from "@/lib/units";
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
const RAIL_GAP = 12;

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
  calories: number | null;
  sodium: number | null;
};

type DailyNutrition = DailyIntake & {
  hasCalories: boolean;
  hasSodium: boolean;
};

function withinRange<T extends { date: string }>(items: T[], range: Range): T[] {
  if (range === "all") return items;
  const cutoff = dayjs(todayKey()).subtract(Number(range) - 1, "day");
  return items.filter((item) => !dayjs(item.date).isBefore(cutoff, "day"));
}

function meanStats(
  entries: DailyEntry[],
  bp: DailyBp[],
  water: DailyWater[],
  intake: DailyNutrition[],
): WindowStats {
  return {
    weight: mean(
      entries
        .map((entry) => entry.weight)
        .filter((value): value is number => value != null),
    ),
    systolic: mean(bp.map((day) => day.systolic)),
    diastolic: mean(bp.map((day) => day.diastolic)),
    water: mean(water.map((day) => day.ml)),
    calories: mean(
      intake.filter((day) => day.hasCalories).map((day) => day.calories),
    ),
    sodium: mean(
      intake.filter((day) => day.hasSodium).map((day) => day.sodium),
    ),
  };
}

export function AverageStats() {
  const units = useUnits();
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const compact = screens.md === false;
  const railRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [bpReadings, setBpReadings] = useState<BpReading[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [intakeEntries, setIntakeEntries] = useState<IntakeEntry[]>([]);
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
    return watchIdeals(user.uid, setIdeals, () => {});
  }, [user]);

  const dailyBp = useMemo(
    () => Array.from(dailyBpAverages(bpReadings).values()),
    [bpReadings],
  );

  const dailyWater = useMemo(
    () => Array.from(dailyWaterTotals(waterLogs).values()),
    [waterLogs],
  );

  const dailyNutrition = useMemo<DailyNutrition[]>(() => {
    const calorieDates = new Set(
      intakeEntries
        .filter((entry) => entry.calories != null)
        .map((entry) => entry.date),
    );
    const sodiumDates = new Set(
      intakeEntries
        .filter((entry) => entry.sodium != null)
        .map((entry) => entry.date),
    );
    return Array.from(dailyIntake(intakeEntries).values()).map((day) => ({
      ...day,
      hasCalories: calorieDates.has(day.date),
      hasSodium: sodiumDates.has(day.date),
    }));
  }, [intakeEntries]);

  const stats = useMemo(
    () =>
      meanStats(
        withinRange(entries, range),
        withinRange(dailyBp, range),
        withinRange(dailyWater, range),
        withinRange(dailyNutrition, range),
      ),
    [entries, dailyBp, dailyWater, dailyNutrition, range],
  );

  const prevStats = useMemo<WindowStats | null>(() => {
    if (range === "all") return null;
    const span = Number(range);
    const end = dayjs(todayKey()).subtract(span, "day");
    const start = dayjs(todayKey()).subtract(span * 2 - 1, "day");
    const inWindow = <T extends { date: string }>(items: T[]) =>
      items.filter((item) => {
        const day = dayjs(item.date);
        return !day.isBefore(start, "day") && !day.isAfter(end, "day");
      });
    return meanStats(
      inWindow(entries),
      inWindow(dailyBp),
      inWindow(dailyWater),
      inWindow(dailyNutrition),
    );
  }, [entries, dailyBp, dailyWater, dailyNutrition, range]);

  const items: StatItem[] = useMemo(() => {
    const weightStatus = evaluateIdeal(stats.weight, ideals.weight);
    const waterStatus = evaluateIdeal(stats.water, ideals.water);
    const sysStatus = evaluateIdeal(stats.systolic, ideals.systolic);
    const diaStatus = evaluateIdeal(stats.diastolic, ideals.diastolic);
    const calorieStatus = evaluateIdeal(stats.calories, ideals.calories);
    const sodiumStatus = evaluateIdeal(stats.sodium, ideals.sodium);
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

    const toWeight = (value: number) => fromKg(value, units.weight);
    const toVolume = (value: number) => fromMl(value, units.volume);

    return [
      {
        label: "Weight",
        icon: "weight",
        value:
          stats.weight != null ? formatWeight(stats.weight, units.weight) : "—",
        status: weightStatus,
        tip:
          weightStatus === "low" || weightStatus === "high"
            ? `${weightStatus === "high" ? "Above" : "Below"} ideal (${rangeText(
                convertRange(ideals.weight, toWeight),
              )} ${weightSuffix(units.weight)})`
            : undefined,
        delta: deltaFor(
          stats.weight != null ? toWeight(stats.weight) : null,
          prevStats?.weight != null ? toWeight(prevStats.weight) : null,
          weightSuffix(units.weight),
          1,
        ),
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
        value:
          stats.water != null ? formatVolume(stats.water, units.volume) : "—",
        status: waterStatus,
        tip:
          waterStatus === "low" || waterStatus === "high"
            ? `${waterStatus === "high" ? "Above" : "Below"} ideal (${rangeText(
                convertRange(ideals.water, toVolume),
              )} ${volumeSuffix(units.volume)})`
            : undefined,
        delta: deltaFor(
          stats.water != null ? toVolume(stats.water) : null,
          prevStats?.water != null ? toVolume(prevStats.water) : null,
          volumeSuffix(units.volume),
          volumeDecimals(units.volume),
        ),
      },
      {
        label: "Calories",
        icon: "calories",
        value:
          stats.calories != null
            ? `${Math.round(stats.calories)} kcal`
            : "—",
        status: calorieStatus,
        tip:
          calorieStatus === "low" || calorieStatus === "high"
            ? `${calorieStatus === "high" ? "Above" : "Below"} ideal (${rangeText(ideals.calories)} kcal)`
            : undefined,
        delta: deltaFor(stats.calories, prevStats?.calories, "kcal", 0),
      },
      {
        label: "Sodium",
        icon: "sodium",
        value:
          stats.sodium != null ? `${Math.round(stats.sodium)} mg` : "—",
        status: sodiumStatus,
        tip:
          sodiumStatus === "low" || sodiumStatus === "high"
            ? `${sodiumStatus === "high" ? "Above" : "Below"} ideal (${rangeText(ideals.sodium)} mg)`
            : undefined,
        delta: deltaFor(stats.sodium, prevStats?.sodium, "mg", 0),
      },
    ];
  }, [stats, prevStats, ideals, range, units]);

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
        <>
        <div
          ref={railRef}
          className="avg-rail"
          onScroll={
            compact
              ? (event) => {
                  const el = event.currentTarget;
                  const idx = Math.round(
                    el.scrollLeft / (el.clientWidth + RAIL_GAP),
                  );
                  setActiveIdx(Math.max(0, Math.min(items.length - 1, idx)));
                }
              : undefined
          }
          style={
            compact
              ? {
                  marginTop: 12,
                  display: "flex",
                  gap: RAIL_GAP,
                  overflowX: "auto",
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                }
              : {
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                  gap: RAIL_GAP,
                }
          }
        >
          {items.map((item, index) => {
            const off = item.status === "low" || item.status === "high";
            const tileStyle: CSSProperties = {
              padding: "12px 14px",
              borderRadius: token.borderRadiusLG,
              background: token.colorFillTertiary,
              ...(compact
                ? {
                    flex: "0 0 100%",
                    scrollSnapAlign: "start",
                    scrollSnapStop: "always",
                  }
                : { gridColumn: index < 2 ? "span 3" : "span 2" }),
            };
            return (
              <div key={item.label} style={tileStyle}>
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
                <Tip title={item.tip} placement="bottom">
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
                </Tip>
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
        </div>

        {compact ? (
          <Flex justify="center" gap={6} style={{ marginTop: 10 }}>
            {items.map((item, i) => (
              <button
                key={item.label}
                type="button"
                aria-label={`Show ${item.label}`}
                aria-current={i === activeIdx}
                onClick={() => {
                  const el = railRef.current;
                  if (el) {
                    el.scrollTo({
                      left: i * (el.clientWidth + RAIL_GAP),
                      behavior: "smooth",
                    });
                  }
                }}
                style={{
                  width: i === activeIdx ? 18 : 6,
                  height: 6,
                  padding: 0,
                  border: "none",
                  borderRadius: 999,
                  cursor: "pointer",
                  background:
                    i === activeIdx
                      ? token.colorPrimary
                      : token.colorFillSecondary,
                  transition: "width 0.2s, background 0.2s",
                }}
              />
            ))}
          </Flex>
        ) : null}
        </>
      )}

      <IdealsModal
        open={idealsOpen}
        onClose={() => setIdealsOpen(false)}
        ideals={ideals}
      />
    </div>
  );
}
