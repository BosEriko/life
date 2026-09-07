"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Empty, Flex, Spin, theme, Typography } from "antd";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import {
  relativeDate,
  todayKey,
  watchDailies,
  type DailyEntry,
} from "@/models/dailies";
import {
  dailyBpAverages,
  watchBpReadings,
  type BpReading,
} from "@/models/bp";
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
import { Icon } from "@/components/icon";
import { Tip } from "@/components/tip";
import { useUnits } from "@/components/units-provider";
import {
  convertRange,
  formatVolume,
  formatWeight,
  fromKg,
  fromMl,
  volumeSuffix,
  weightSuffix,
} from "@/lib/units";
import {
  EMPTY_IDEALS,
  evaluateIdeal,
  rangeText,
  watchIdeals,
  type IdealRange,
  type IdealStatus,
  type Ideals,
} from "@/models/ideals";

const DAYS = 7;

function idealTip(
  label: string,
  status: IdealStatus,
  range: IdealRange,
  unit: string,
) {
  if (status !== "low" && status !== "high") return undefined;
  return `${label} ${status === "high" ? "above" : "below"} your ideal (${rangeText(range)} ${unit}).`;
}

export function RecentEntries() {
  const units = useUnits();
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [bpReadings, setBpReadings] = useState<BpReading[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [intakeEntries, setIntakeEntries] = useState<IntakeEntry[]>([]);
  const [ideals, setIdeals] = useState<Ideals>(EMPTY_IDEALS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    return watchDailies(
      user.uid,
      (next) => {
        setEntries(next);
        setLoaded(true);
      },
      () => {
        message.error("Could not load your entries.");
        setLoaded(true);
      },
      DAYS,
    );
  }, [user, message]);

  useEffect(() => {
    if (!user) return;
    return watchBpReadings(user.uid, setBpReadings, () => {}, 200);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return watchWaterLogs(user.uid, setWaterLogs, () => {}, 400);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return watchIntake(user.uid, setIntakeEntries, () => {}, 800);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return watchIdeals(user.uid, setIdeals, () => {});
  }, [user]);

  const dailyBp = useMemo(() => dailyBpAverages(bpReadings), [bpReadings]);
  const dailyWater = useMemo(() => dailyWaterTotals(waterLogs), [waterLogs]);
  const dailyMeals = useMemo(
    () => dailyIntake(intakeEntries),
    [intakeEntries],
  );

  const recent = useMemo(() => {
    const cutoff = dayjs(todayKey()).subtract(DAYS - 1, "day");
    return entries.filter(
      (entry) => !dayjs(entry.date).isBefore(cutoff, "day"),
    );
  }, [entries]);

  return (
    <div>
      <Typography.Title level={5}>
        <Icon name="recent" />
        Recent
      </Typography.Title>
      {!loaded ? (
        <Flex justify="center" style={{ padding: 24 }}>
          <Spin />
        </Flex>
      ) : recent.length === 0 ? (
        <Empty description="Nothing logged in the last 7 days." />
      ) : (
        <Flex vertical>
          {recent.map((entry) => {
            const bp = dailyBp.get(entry.date);
            const water = dailyWater.get(entry.date);
            const meals = dailyMeals.get(entry.date);
            const calorieTip = idealTip(
              "Calories",
              evaluateIdeal(
                meals && meals.calories > 0 ? meals.calories : null,
                ideals.calories,
              ),
              ideals.calories,
              "kcal",
            );
            const sodiumTip = idealTip(
              "Sodium",
              evaluateIdeal(
                meals && meals.sodium > 0 ? meals.sodium : null,
                ideals.sodium,
              ),
              ideals.sodium,
              "mg",
            );
            const weightStatus = evaluateIdeal(entry.weight, ideals.weight);
            const weightTip = idealTip(
              "Weight",
              weightStatus,
              convertRange(ideals.weight, (value) =>
                fromKg(value, units.weight),
              ),
              weightSuffix(units.weight),
            );
            const waterStatus = evaluateIdeal(water?.ml ?? null, ideals.water);
            const waterTip = idealTip(
              "Water",
              waterStatus,
              convertRange(ideals.water, (value) =>
                fromMl(value, units.volume),
              ),
              volumeSuffix(units.volume),
            );
            const bpTips = bp
              ? [
                  idealTip(
                    "Systolic",
                    evaluateIdeal(bp.systolic, ideals.systolic),
                    ideals.systolic,
                    "mmHg",
                  ),
                  idealTip(
                    "Diastolic",
                    evaluateIdeal(bp.diastolic, ideals.diastolic),
                    ideals.diastolic,
                    "mmHg",
                  ),
                ].filter(Boolean)
              : [];
            const bpTip = bpTips.length ? bpTips.join(" ") : undefined;
            return (
            <Flex
              key={entry.date}
              align="flex-start"
              justify="space-between"
              gap={12}
              style={{
                padding: "12px 0",
                borderTop: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <Flex vertical gap={4} style={{ minWidth: 0 }}>
                {entry.weight != null ? (
                  <Typography.Text type="secondary">
                    <Icon name="weight" style={{ marginRight: 4 }} />
                    <Tip title={weightTip}>
                      <Typography.Text
                        strong
                        style={{
                          color: weightTip ? token.colorError : undefined,
                          cursor: weightTip ? "help" : undefined,
                        }}
                      >
                        {formatWeight(entry.weight, units.weight)}
                      </Typography.Text>
                    </Tip>
                  </Typography.Text>
                ) : null}
                {bp ? (
                  <Typography.Text type="secondary">
                    <Icon name="bp" style={{ marginRight: 4 }} />
                    <Tip title={bpTip}>
                      <Typography.Text
                        strong
                        style={{
                          color: bpTip ? token.colorError : undefined,
                          cursor: bpTip ? "help" : undefined,
                        }}
                      >
                        {bp.systolic}/{bp.diastolic} mmHg
                      </Typography.Text>
                    </Tip>
                  </Typography.Text>
                ) : null}
                {water ? (
                  <Typography.Text type="secondary">
                    <Icon name="water" style={{ marginRight: 4 }} />
                    <Tip title={waterTip}>
                      <Typography.Text
                        strong
                        style={{
                          color: waterTip ? token.colorError : undefined,
                          cursor: waterTip ? "help" : undefined,
                        }}
                      >
                        {formatVolume(water.ml, units.volume)}
                      </Typography.Text>
                    </Tip>
                  </Typography.Text>
                ) : null}
                {meals && meals.calories > 0 ? (
                  <Typography.Text type="secondary">
                    <Icon name="calories" style={{ marginRight: 4 }} />
                    <Tip title={calorieTip}>
                      <Typography.Text
                        strong
                        style={{
                          color: calorieTip ? token.colorError : undefined,
                          cursor: calorieTip ? "help" : undefined,
                        }}
                      >
                        {meals.calories} kcal
                      </Typography.Text>
                    </Tip>
                  </Typography.Text>
                ) : null}
                {meals && meals.sodium > 0 ? (
                  <Typography.Text type="secondary">
                    <Icon name="sodium" style={{ marginRight: 4 }} />
                    <Tip title={sodiumTip}>
                      <Typography.Text
                        strong
                        style={{
                          color: sodiumTip ? token.colorError : undefined,
                          cursor: sodiumTip ? "help" : undefined,
                        }}
                      >
                        {meals.sodium} mg
                      </Typography.Text>
                    </Tip>
                  </Typography.Text>
                ) : null}
              </Flex>
              <Typography.Text strong style={{ whiteSpace: "nowrap" }}>
                {relativeDate(entry.date)}
              </Typography.Text>
            </Flex>
            );
          })}
        </Flex>
      )}
    </div>
  );
}
