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
import { Icon } from "@/components/icon";
import { useUnits } from "@/components/units-provider";
import { formatVolume, formatWeight } from "@/lib/units";

const DAYS = 7;

export function RecentEntries() {
  const units = useUnits();
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [bpReadings, setBpReadings] = useState<BpReading[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
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

  const dailyBp = useMemo(() => dailyBpAverages(bpReadings), [bpReadings]);
  const dailyWater = useMemo(() => dailyWaterTotals(waterLogs), [waterLogs]);

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
            return (
            <Flex
              key={entry.date}
              vertical
              gap={4}
              style={{
                padding: "12px 0",
                borderTop: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <Flex align="center" justify="space-between" gap={12}>
                <Typography.Text strong>
                  {relativeDate(entry.date)}
                </Typography.Text>
                <Flex gap={16} wrap justify="flex-end">
                  {entry.weight != null ? (
                    <Typography.Text type="secondary">
                      <Icon name="weight" style={{ marginRight: 4 }} />
                      <Typography.Text strong>
                        {formatWeight(entry.weight, units.weight)}
                      </Typography.Text>
                    </Typography.Text>
                  ) : null}
                  {bp ? (
                    <Typography.Text type="secondary">
                      <Icon name="bp" style={{ marginRight: 4 }} />
                      <Typography.Text strong>
                        {bp.systolic}/{bp.diastolic}
                      </Typography.Text>{" "}
                      mmHg
                    </Typography.Text>
                  ) : null}
                  {water ? (
                    <Typography.Text type="secondary">
                      <Icon name="water" style={{ marginRight: 4 }} />
                      <Typography.Text strong>
                        {formatVolume(water.ml, units.volume)}
                      </Typography.Text>
                    </Typography.Text>
                  ) : null}
                </Flex>
              </Flex>
            </Flex>
            );
          })}
        </Flex>
      )}
    </div>
  );
}
