"use client";

import { useRouter } from "next/navigation";
import { Button, Flex, Grid, theme, Typography } from "antd";
import { BulbFilled, BulbOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useThemeMode } from "@/components/theme-provider";
import { Tip } from "@/components/tip";
import { isAdminEmail } from "@/lib/admin";

export function AppFooter() {
  const { token } = theme.useToken();
  const router = useRouter();
  const { user } = useAuth();
  const { isDark, setMode } = useThemeMode();
  const screens = Grid.useBreakpoint();
  const compact = screens.md === false;
  const admin = isAdminEmail(user?.email);
  const today = dayjs().format("dddd, MMMM D, YYYY");

  const links = user
    ? [
        { key: "/mcp", label: "MCP" },
        { key: "/share", label: "Share" },
        ...(admin ? [{ key: "/admin", label: "Admin" }] : []),
      ]
    : [
        { key: "/login", label: "Sign in" },
        { key: "/register", label: "Register" },
      ];

  return (
    <footer
      style={{
        background: token.colorBgContainer,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Flex
        align="center"
        justify="space-between"
        gap={compact ? 12 : 16}
        wrap
        vertical={compact}
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          paddingInline: 20,
          paddingTop: 24,
          paddingBottom:
            compact && user
              ? "calc(24px + 72px + env(safe-area-inset-bottom))"
              : 24,
        }}
      >
        <Flex align="center" gap={10}>
          <div
            style={{
              width: 26,
              height: 26,
              flexShrink: 0,
              borderRadius: 7,
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
                fontSize: 13,
              }}
            />
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Bos Eriko&apos;s Life Tracker © {new Date().getFullYear()}
          </Typography.Text>
        </Flex>

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {today}
        </Typography.Text>

        <Flex align="center" gap={4} wrap>
          {links.map((link) => (
            <Button
              key={link.key}
              type="text"
              size="small"
              onClick={() => router.push(link.key)}
            >
              {link.label}
            </Button>
          ))}
          <Tip title={isDark ? "Light mode" : "Dark mode"}>
            <Button
              type="text"
              size="small"
              aria-label={
                isDark ? "Switch to light mode" : "Switch to dark mode"
              }
              icon={isDark ? <BulbFilled /> : <BulbOutlined />}
              onClick={() => setMode(isDark ? "light" : "dark")}
            />
          </Tip>
        </Flex>
      </Flex>
    </footer>
  );
}
