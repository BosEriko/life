"use client";

import { App, Card, Flex, Switch, Typography } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import {
  saveCommunityPrefs,
  type CommunityMetric,
} from "@/models/community";

const ROWS: { key: CommunityMetric; label: string }[] = [
  { key: "weight", label: "Weight" },
  { key: "bp", label: "Blood pressure" },
  { key: "water", label: "Water" },
  { key: "calories", label: "Calories" },
  { key: "sodium", label: "Sodium" },
  { key: "food", label: "Food & drink" },
  { key: "habits", label: "Habits" },
];

export function CommunitySharingCard() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { communityPrefs } = useHealthData();

  function toggle(key: CommunityMetric, on: boolean) {
    if (!user) return;
    saveCommunityPrefs(user.uid, { [key]: on }).catch(() =>
      message.error("Could not save. Try again."),
    );
  }

  return (
    <Card
      size="small"
      title={
        <>
          <TeamOutlined style={{ marginRight: 8 }} />
          Community
        </>
      }
    >
      <Typography.Paragraph
        type="secondary"
        style={{ fontSize: 13, marginTop: 0, marginBottom: 16 }}
      >
        When you log one of these, an activity line is posted to the group feed.
        Posts show your account display name (&ldquo;Someone&rdquo; if it&rsquo;s
        blank). Text posts are always your choice.
      </Typography.Paragraph>
      <Flex vertical gap={10}>
        {ROWS.map((row) => (
          <Flex key={row.key} align="center" justify="space-between" gap={12}>
            <Typography.Text>{row.label}</Typography.Text>
            <Switch
              checked={communityPrefs[row.key]}
              onChange={(on) => toggle(row.key, on)}
            />
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}
