"use client";

import { useMemo } from "react";
import { Empty, Flex, Spin, theme, Typography } from "antd";
import dayjs from "dayjs";
import { useHealthData } from "@/components/health-data-provider";
import { relativeDate, todayKey } from "@/models/dailies";
import { dailyBpAverages } from "@/models/bp";
import { dailyWaterTotals } from "@/models/water";
import { dailyIntake } from "@/models/intake";
import { Icon } from "@/components/icon";
import { IdealTip, idealTipProps } from "@/components/ideal-tip";
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
import { evaluateIdeal } from "@/models/ideals";

const DAYS = 7;

export function RecentEntries() {
  const units = useUnits();
  const { token } = theme.useToken();
  const {
    dailies: entries,
    bpReadings,
    waterLogs,
    intake: intakeEntries,
    ideals,
    ready: loaded,
  } = useHealthData();

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
            const calorieTip = idealTipProps(
              "Calories",
              evaluateIdeal(
                meals && meals.calories > 0 ? meals.calories : null,
                ideals.calories,
              ),
              ideals.calories,
              "kcal",
            );
            const sodiumTip = idealTipProps(
              "Sodium",
              evaluateIdeal(
                meals && meals.sodium > 0 ? meals.sodium : null,
                ideals.sodium,
              ),
              ideals.sodium,
              "mg",
            );
            const weightTip = idealTipProps(
              "Weight",
              evaluateIdeal(entry.weight, ideals.weight),
              convertRange(ideals.weight, (value) =>
                fromKg(value, units.weight),
              ),
              weightSuffix(units.weight),
            );
            const waterTip = idealTipProps(
              "Water",
              evaluateIdeal(water?.ml ?? null, ideals.water),
              convertRange(ideals.water, (value) =>
                fromMl(value, units.volume),
              ),
              volumeSuffix(units.volume),
            );
            const sysTip = idealTipProps(
              "Systolic",
              bp ? evaluateIdeal(bp.systolic, ideals.systolic) : "unset",
              ideals.systolic,
              "mmHg",
            );
            const diaTip = idealTipProps(
              "Diastolic",
              bp ? evaluateIdeal(bp.diastolic, ideals.diastolic) : "unset",
              ideals.diastolic,
              "mmHg",
            );
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
                    <IdealTip {...weightTip}>
                      <Typography.Text
                        strong
                        style={{
                          color: weightTip.off ? token.colorError : undefined,
                          cursor: weightTip.off ? "help" : undefined,
                        }}
                      >
                        {formatWeight(entry.weight, units.weight)}
                      </Typography.Text>
                    </IdealTip>
                  </Typography.Text>
                ) : null}
                {bp ? (
                  <Typography.Text type="secondary">
                    <Icon name="bp" style={{ marginRight: 4 }} />
                    <IdealTip {...sysTip}>
                      <Typography.Text
                        strong
                        style={{
                          color: sysTip.off ? token.colorError : undefined,
                          cursor: sysTip.off ? "help" : undefined,
                        }}
                      >
                        {bp.systolic}
                      </Typography.Text>
                    </IdealTip>
                    /
                    <IdealTip {...diaTip}>
                      <Typography.Text
                        strong
                        style={{
                          color: diaTip.off ? token.colorError : undefined,
                          cursor: diaTip.off ? "help" : undefined,
                        }}
                      >
                        {bp.diastolic}
                      </Typography.Text>
                    </IdealTip>{" "}
                    <Typography.Text strong>mmHg</Typography.Text>
                  </Typography.Text>
                ) : null}
                {water ? (
                  <Typography.Text type="secondary">
                    <Icon name="water" style={{ marginRight: 4 }} />
                    <IdealTip {...waterTip}>
                      <Typography.Text
                        strong
                        style={{
                          color: waterTip.off ? token.colorError : undefined,
                          cursor: waterTip.off ? "help" : undefined,
                        }}
                      >
                        {formatVolume(water.ml, units.volume)}
                      </Typography.Text>
                    </IdealTip>
                  </Typography.Text>
                ) : null}
                {meals && meals.calories > 0 ? (
                  <Typography.Text type="secondary">
                    <Icon name="calories" style={{ marginRight: 4 }} />
                    <IdealTip {...calorieTip}>
                      <Typography.Text
                        strong
                        style={{
                          color: calorieTip.off ? token.colorError : undefined,
                          cursor: calorieTip.off ? "help" : undefined,
                        }}
                      >
                        {meals.calories} kcal
                      </Typography.Text>
                    </IdealTip>
                  </Typography.Text>
                ) : null}
                {meals && meals.sodium > 0 ? (
                  <Typography.Text type="secondary">
                    <Icon name="sodium" style={{ marginRight: 4 }} />
                    <IdealTip {...sodiumTip}>
                      <Typography.Text
                        strong
                        style={{
                          color: sodiumTip.off ? token.colorError : undefined,
                          cursor: sodiumTip.off ? "help" : undefined,
                        }}
                      >
                        {meals.sodium} mg
                      </Typography.Text>
                    </IdealTip>
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
