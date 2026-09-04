"use client";

import { Button, Dropdown, Flex, Grid, theme, Typography } from "antd";
import type { MenuProps } from "antd";
import {
  BulbFilled,
  BulbOutlined,
  LogoutOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useThemeMode } from "@/components/theme-provider";

export function DashboardHeader() {
  const { user, signOut } = useAuth();
  const { isDark, setMode } = useThemeMode();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const compact = screens.md === false;

  const today = dayjs().format("dddd, MMMM D, YYYY");

  const menuItems: MenuProps["items"] = [
    ...(user?.email
      ? [{ key: "email", label: user.email, disabled: true }]
      : []),
    { key: "date", label: today, disabled: true },
    { type: "divider" },
    {
      key: "theme",
      icon: isDark ? <BulbFilled /> : <BulbOutlined />,
      label: isDark ? "Light mode" : "Dark mode",
      onClick: () => setMode(isDark ? "light" : "dark"),
    },
    {
      key: "signout",
      icon: <LogoutOutlined />,
      label: "Sign out",
      onClick: () => signOut(),
    },
  ];

  return (
    <Flex
      align="center"
      justify="space-between"
      gap={12}
      wrap
      style={{ marginBottom: compact ? 24 : 36 }}
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

      {compact ? (
        <Dropdown
          trigger={["click"]}
          placement="bottomRight"
          menu={{ items: menuItems }}
        >
          <Button icon={<MenuOutlined />} aria-label="Menu" />
        </Dropdown>
      ) : (
        <Flex align="center" gap={12} wrap justify="flex-end">
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {today}
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
      )}
    </Flex>
  );
}
