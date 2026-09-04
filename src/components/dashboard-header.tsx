"use client";

import { Button, Flex, theme, Typography } from "antd";
import { BulbFilled, BulbOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { useSaveStatus } from "@/components/save-status";
import { useThemeMode } from "@/components/theme-provider";

export function DashboardHeader() {
  const { user, signOut } = useAuth();
  const { isDark, setMode } = useThemeMode();
  const { state: saveState } = useSaveStatus();
  const { token } = theme.useToken();

  const savePill = {
    idle: { text: "Auto-saving", color: token.colorSuccess },
    pending: { text: "Unsaved changes", color: token.colorWarning },
    saving: { text: "Saving…", color: token.colorInfo },
    error: { text: "Save failed", color: token.colorError },
  }[saveState];

  return (
    <Flex
      align="flex-start"
      justify="space-between"
      gap={16}
      wrap
      style={{ marginBottom: 36 }}
    >
      <div style={{ minWidth: 0 }}>
        <Typography.Text
          style={{
            display: "block",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontSize: 11,
            fontWeight: 600,
            color: token.colorPrimary,
          }}
        >
          Bos Eriko's
        </Typography.Text>
        <Typography.Title level={2} style={{ margin: "6px 0 0", fontWeight: 400 }}>
          Life Tracker
        </Typography.Title>
      </div>

      <Flex align="center" gap={12} wrap justify="flex-end">
        <Flex
          align="center"
          gap={6}
          style={{
            padding: "3px 10px",
            borderRadius: 999,
            background: token.colorFillSecondary,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: savePill.color,
            }}
          />
          <Typography.Text style={{ fontSize: 12 }}>
            {savePill.text}
          </Typography.Text>
        </Flex>

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs().format("dddd, MMMM D, YYYY")}
        </Typography.Text>

        {user?.email ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {user.email}
          </Typography.Text>
        ) : null}

        <Button
          type="text"
          size="small"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          icon={isDark ? <BulbFilled /> : <BulbOutlined />}
          onClick={() => setMode(isDark ? "light" : "dark")}
        />

        <Button size="small" onClick={() => signOut()}>
          Sign out
        </Button>
      </Flex>
    </Flex>
  );
}
