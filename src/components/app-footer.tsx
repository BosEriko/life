"use client";

import Link from "next/link";
import { Button, Flex, Grid, theme, Typography } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
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
      <div
        style={{
          display: compact ? "flex" : "grid",
          gridTemplateColumns: "1fr auto 1fr",
          flexDirection: "column",
          alignItems: "center",
          gap: compact ? 8 : 12,
          minHeight: 56,
          paddingInline: compact ? 16 : 32,
          paddingTop: 10,
          paddingBottom:
            compact && user ? "calc(10px + 72px + env(safe-area-inset-bottom))" : 10,
        }}
      >
        <Link
          href="/"
          aria-label="Life Tracker home"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, color: token.colorText, textDecoration: "none", justifySelf: "start" }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              flexShrink: 0,
              borderRadius: 7,
              background: token.colorPrimary,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="brand" style={{ margin: 0, opacity: 1, color: token.colorTextLightSolid, fontSize: 13 }} />
          </span>
          <span style={{ fontSize: 14, fontWeight: 800 }}>Life Tracker</span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            © {new Date().getFullYear()}
          </Typography.Text>
        </Link>

        <Flex align="center" justify="center" wrap style={{ fontSize: 12 }}>
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
          style={{ color: token.colorTextSecondary, fontWeight: 400, fontSize: 12, justifySelf: "end" }}
        >
          {isDark ? "Dark theme" : "Light theme"}
        </Button>
      </div>
    </footer>
  );
}
