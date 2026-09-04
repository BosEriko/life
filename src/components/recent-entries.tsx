"use client";

import { useEffect, useState } from "react";
import { App, Empty, Flex, Spin, theme, Typography } from "antd";
import { useAuth } from "@/components/auth-provider";
import {
  formatBpTime,
  relativeDate,
  watchDailies,
  type DailyEntry,
} from "@/lib/dailies";

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
    );
  }, [user, message]);

  return (
    <div>
      <Typography.Title level={5}>Recent</Typography.Title>
      {!loaded ? (
        <Flex justify="center" style={{ padding: 24 }}>
          <Spin />
        </Flex>
      ) : entries.length === 0 ? (
        <Empty description="No entries yet." />
      ) : (
        <Flex
          vertical
          style={{
            border: `1px solid ${token.colorBorder}`,
            borderRadius: token.borderRadiusLG,
            overflow: "hidden",
            background: token.colorBgContainer,
          }}
        >
          {entries.map((entry, index) => (
            <Flex
              key={entry.date}
              align="center"
              justify="space-between"
              style={{
                padding: "12px 16px",
                borderTop:
                  index === 0
                    ? undefined
                    : `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <Typography.Text strong>
                {relativeDate(entry.date)}
              </Typography.Text>
              <Flex gap={16}>
                {entry.weight != null ? (
                  <Typography.Text type="secondary">
                    <Typography.Text strong>{entry.weight}</Typography.Text> kg
                  </Typography.Text>
                ) : null}
                {entry.systolic != null && entry.diastolic != null ? (
                  <Typography.Text type="secondary">
                    <Typography.Text strong>
                      {entry.systolic}/{entry.diastolic}
                    </Typography.Text>{" "}
                    mmHg
                    {entry.bpTime
                      ? ` · ${formatBpTime(entry.date, entry.bpTime)}`
                      : ""}
                  </Typography.Text>
                ) : null}
                {entry.water != null ? (
                  <Typography.Text type="secondary">
                    <Typography.Text strong>{entry.water}</Typography.Text> ml
                  </Typography.Text>
                ) : null}
              </Flex>
            </Flex>
          ))}
        </Flex>
      )}
    </div>
  );
}
