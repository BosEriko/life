"use client";

import { useEffect, useState } from "react";
import { App, Empty, Flex, Spin, theme, Typography } from "antd";
import { useAuth } from "@/components/auth-provider";
import { relativeDate, watchDailies, type DailyEntry } from "@/models/dailies";
import { Icon } from "@/components/icon";

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
      <Typography.Title level={5}>
        <Icon name="recent" />
        Recent
      </Typography.Title>
      {!loaded ? (
        <Flex justify="center" style={{ padding: 24 }}>
          <Spin />
        </Flex>
      ) : entries.length === 0 ? (
        <Empty description="No entries yet." />
      ) : (
        <Flex vertical>
          {entries.map((entry) => (
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
