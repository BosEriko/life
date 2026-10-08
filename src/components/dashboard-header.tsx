"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Dropdown, Flex, Grid, theme } from "antd";
import type { MenuProps } from "antd";
import {
  CompassOutlined,
  DownOutlined,
  IdcardOutlined,
  LogoutOutlined,
  MenuOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useIsDark } from "@/components/theme-provider";
import { accentColor } from "@/lib/accents";
import { useNav } from "@/components/use-nav";
import { SubmenuTabs } from "@/components/submenu-tabs";
import { useAppTour } from "@/components/app-tour";
import { NotificationBell } from "@/components/notification-bell";

export function DashboardHeader() {
  const { user, signOut } = useAuth();
  const { token } = theme.useToken();
  const dark = useIsDark();
  const screens = Grid.useBreakpoint();
  const router = useRouter();
  const pathname = usePathname();
  const { startTour } = useAppTour();
  const { items: navItems, home, submenuFor } = useNav();
  const compact = screens.md === false;
  const submenu = submenuFor(pathname);

  const emailItems: MenuProps["items"] = user?.email
    ? [
        { key: "email", label: user.email, disabled: true },
        { type: "divider" },
      ]
    : [];

  const accountItems: MenuProps["items"] = [
    ...emailItems,
    {
      key: "profile",
      icon: <IdcardOutlined />,
      label: "Profile",
      onClick: () => router.push("/personal/details"),
    },
    {
      key: "tour",
      icon: <CompassOutlined />,
      label: "Show tour",
      onClick: () => startTour("welcome"),
    },
    { type: "divider" },
    {
      key: "signout",
      icon: <LogoutOutlined />,
      label: "Sign out",
      onClick: () => signOut(),
    },
  ];

  const mobileItems: MenuProps["items"] = [
    ...emailItems,
    {
      key: "profile",
      icon: <IdcardOutlined />,
      label: "Profile",
      onClick: () => router.push("/personal/details"),
    },
    {
      key: "tour",
      icon: <CompassOutlined />,
      label: "Show tour",
      onClick: () => startTour("welcome"),
    },
    {
      key: "signout",
      icon: <LogoutOutlined />,
      label: "Sign out",
      onClick: () => signOut(),
    },
  ];

  const brand = (
    <Link
      href={user ? home : "/"}
      aria-label="Life Tracker home"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        textDecoration: "none",
        color: token.colorText,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
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
            color: token.colorBgContainer,
            fontSize: 17,
          }}
        />
      </div>
      <span style={{ fontSize: 17, fontWeight: 800, whiteSpace: "nowrap" }}>
        Life Tracker
      </span>
    </Link>
  );

  return (
    <header
      style={{
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Flex
        align="center"
        justify="space-between"
        gap={12}
        style={{
          minHeight: compact ? 60 : 72,
          padding: compact ? "10px 16px" : "12px 32px",
        }}
      >
        {brand}

        {!user ? (
          <Flex gap={8} align="center" justify="flex-end">
            <Button type="text" onClick={() => router.push("/login")}>
              Sign in
            </Button>
            <Button type="primary" onClick={() => router.push("/register")}>
              Get started
            </Button>
          </Flex>
        ) : compact ? (
          <Flex align="center" gap={8}>
            <NotificationBell />
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              menu={{ items: mobileItems }}
            >
              <Button icon={<MenuOutlined />} aria-label="Menu" data-tour="account" />
            </Dropdown>
          </Flex>
        ) : (
          <Flex align="center" gap={28}>
            <nav aria-label="Primary" data-tour="main-nav">
              <Flex align="center" gap={8}>
                {navItems.map((item) => {
                  const active = pathname.split("/")[1] === item.key.split("/")[1];
                  return (
                    <Link
                      key={item.key}
                      href={item.key}
                      aria-current={active ? "page" : undefined}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        boxSizing: "border-box",
                        height: 72,
                        marginBlock: -12,
                        paddingInline: 10,
                        fontSize: 13,
                        fontWeight: active ? 800 : 600,
                        color: active ? token.colorPrimary : token.colorTextSecondary,
                        textDecoration: "none",
                        borderTop: "2px solid transparent",
                        borderBottom: `2px solid ${active ? token.colorPrimary : "transparent"}`,
                      }}
                    >
                      <item.Icon aria-hidden style={{ color: accentColor(item.accent, dark), marginRight: 7 }} />
                      {item.label}
                    </Link>
                  );
                })}
              </Flex>
            </nav>
            <NotificationBell />
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              menu={{ items: accountItems }}
            >
              <button
                type="button"
                aria-label="Account"
                data-tour="account"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 0,
                  border: 0,
                  background: "none",
                  cursor: "pointer",
                  color: token.colorTextSecondary,
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: token.colorPrimaryBg,
                    color: token.colorPrimary,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <UserOutlined />
                </span>
                <DownOutlined style={{ fontSize: 10 }} />
              </button>
            </Dropdown>
          </Flex>
        )}
      </Flex>
      {user && submenu && screens.md !== false ? (
        <nav
          aria-label={submenu.label}
          style={{
            background: `color-mix(in srgb, ${token.colorBgContainer} 55%, ${token.colorBgLayout})`,
            borderTop: `1px solid ${token.colorSplit}`,
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto", paddingInline: screens.md === true ? 20 : 12 }}>
            <SubmenuTabs tabs={submenu.tabs} pathname={pathname} variant="header" />
          </div>
        </nav>
      ) : null}
    </header>
  );
}
