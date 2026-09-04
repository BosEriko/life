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
import { Icon } from "@/components/icon";

const DAYS = 7;

export function RecentEntries() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
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
          {recent.map((entry) => (
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
                      <Typography.Text strong>{entry.weight}</Typography.Text>{" "}
                      kg
                    </Typography.Text>
                  ) : null}
                  {entry.systolic != null && entry.diastolic != null ? (
                    <Typography.Text type="secondary">
                      <Icon name="bp" style={{ marginRight: 4 }} />
                      <Typography.Text strong>
                        {entry.systolic}/{entry.diastolic}
                      </Typography.Text>{" "}
                      mmHg
                    </Typography.Text>
                  ) : null}
                  {entry.water != null ? (
                    <Typography.Text type="secondary">
                      <Icon name="water" style={{ marginRight: 4 }} />
                      <Typography.Text strong>{entry.water}</Typography.Text>{" "}
                      ml
                    </Typography.Text>
                  ) : null}
                </Flex>
              </Flex>
              {entry.notes ? (
                <Typography.Text
                  type="secondary"
                  style={{ fontSize: 12, whiteSpace: "pre-wrap" }}
                >
                  {entry.notes}
                </Typography.Text>
              ) : null}
            </Flex>
          ))}
        </Flex>
      )}
    </div>
  );
}
