"use client";

import { Button, Flex, Typography } from "antd";
import { useAuth } from "@/components/auth-provider";
import { DailyTracker } from "@/components/daily-tracker";

export default function Home() {
  const { user, signOut } = useAuth();

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 20px" }}>
      <Flex
        align="center"
        justify="space-between"
        gap={16}
        style={{ marginBottom: 32 }}
      >
        <div style={{ minWidth: 0 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            life.boseriko.com
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {user?.email}
          </Typography.Text>
        </div>
        <Button onClick={() => signOut()}>Sign out</Button>
      </Flex>

      <DailyTracker />
    </div>
  );
}
