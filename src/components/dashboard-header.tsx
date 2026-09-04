"use client";

import { Button, Flex, Grid, theme, Typography } from "antd";
import { BulbFilled, BulbOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useSaveStatus } from "@/components/save-status";
import { useThemeMode } from "@/components/theme-provider";

export function DashboardHeader() {
  const { user, signOut } = useAuth();
  const { isDark, setMode } = useThemeMode();
  const { state: saveState } = useSaveStatus();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const compact = screens.md === false;

  const savePill = {
    idle: { text: "Auto-saving", color: token.colorSuccess },
    pending: { text: "Unsaved changes", color: token.colorWarning },
    saving: { text: "Saving…", color: token.colorInfo },
    error: { text: "Save failed", color: token.colorError },
  }[saveState];

  return (
    <Flex
      vertical={compact}
      align={compact ? "stretch" : "center"}
      justify="space-between"
      gap={compact ? 14 : 16}
      wrap
      style={{ marginBottom: compact ? 28 : 36 }}
    >
      <Flex align="center" gap={12} style={{ minWidth: 0 }}>
        <div
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: 10,
            background: token.colorPrimary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon
            name="brand"
            style={{
              margin: 0,
              opacity: 1,
              color: token.colorTextLightSolid,
              fontSize: 17,
            }}
          />
        </div>
        <Typography.Title level={2} style={{ margin: 0, fontWeight: 400 }}>
          Life Tracker
        </Typography.Title>
      </Flex>

      <Flex
        align="center"
        gap={compact ? 10 : 12}
        wrap
        justify={compact ? "space-between" : "flex-end"}
      >
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

        {!compact ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs().format("dddd, MMMM D, YYYY")}
          </Typography.Text>
        ) : null}

        {!compact && user?.email ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {user.email}
          </Typography.Text>
        ) : null}

        <Flex align="center" gap={compact ? 10 : 12}>
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
    </Flex>
  );
}
