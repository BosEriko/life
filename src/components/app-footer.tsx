"use client";

import Link from "next/link";
import { Button, Flex, Grid, theme, Typography } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { useThemeMode } from "@/components/theme-provider";
import { isAdminEmail } from "@/lib/admin";

export function AppFooter() {
  const { token } = theme.useToken();
  const { user } = useAuth();
  const { isDark, setMode } = useThemeMode();
  const screens = Grid.useBreakpoint();
  const compact = screens.md === false;
  const admin = isAdminEmail(user?.email);

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
        gap={12}
        wrap
        style={{
          minHeight: 56,
          paddingInline: compact ? 16 : 32,
          paddingTop: 10,
          paddingBottom:
            compact && user ? "calc(10px + 72px + env(safe-area-inset-bottom))" : 10,
        }}
      >
        <Flex align="center" wrap style={{ fontSize: 12 }}>
          {links.map((link, index) => (
            <Flex key={link.key} align="center">
              {index > 0 ? (
                <Typography.Text type="secondary" aria-hidden style={{ paddingInline: 6, fontSize: 12 }}>
                  ·
                </Typography.Text>
              ) : null}
              <Link href={link.key} style={{ color: token.colorTextSecondary, fontSize: 12 }}>
                {link.label}
              </Link>
            </Flex>
          ))}
        </Flex>

        <Button
          type="text"
          size="small"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          icon={isDark ? <SunOutlined /> : <MoonOutlined />}
          onClick={() => setMode(isDark ? "light" : "dark")}
          style={{ color: token.colorTextSecondary, fontWeight: 400, fontSize: 12 }}
        >
          {isDark ? "Dark theme" : "Light theme"}
        </Button>
      </Flex>
    </footer>
  );
}
