"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Dropdown, Flex, Grid, theme } from "antd";
import type { MenuProps } from "antd";
import {
  BarChartOutlined,
  DownOutlined,
  CheckSquareOutlined,
  DatabaseOutlined,
  UnorderedListOutlined,
  ProjectOutlined,
  FileTextOutlined,
  IdcardOutlined,
  LogoutOutlined,
  MenuOutlined,
  ScheduleOutlined,
  UserOutlined,
  DashboardOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { NAV } from "@/components/nav-items";

const SUBMENUS = {
  finance: {
    label: "Finance",
    tabs: [
      { href: "/finance/dashboard", label: "Dashboard", Icon: DashboardOutlined },
      { href: "/finance/accounts", label: "Accounts", Icon: WalletOutlined },
      { href: "/finance/records", label: "Records", Icon: UnorderedListOutlined },
      { href: "/finance/analytics", label: "Analytics", Icon: BarChartOutlined },
    ],
  },
  journal: {
    label: "Journal",
    tabs: [
      { href: "/journal/notes", label: "Notes", Icon: FileTextOutlined },
      { href: "/journal/tasks", label: "Tasks", Icon: ScheduleOutlined },
      { href: "/journal/todo", label: "To-do", Icon: CheckSquareOutlined },
      { href: "/journal/board", label: "Board", Icon: ProjectOutlined },
    ],
  },
  records: {
    label: "Records",
    tabs: [
      { href: "/records/database", label: "Database", Icon: DatabaseOutlined },
      { href: "/records/summary", label: "Summary", Icon: UnorderedListOutlined },
    ],
  },
};

export function DashboardHeader() {
  const { user, signOut } = useAuth();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const router = useRouter();
  const pathname = usePathname();
  const compact = screens.md === false;
  const submenu = SUBMENUS[pathname.split("/")[1] as keyof typeof SUBMENUS];

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
      onClick: () => router.push("/profile"),
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
      onClick: () => router.push("/profile"),
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
      href="/"
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
            color: token.colorTextLightSolid,
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
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{ items: mobileItems }}
          >
            <Button icon={<MenuOutlined />} aria-label="Menu" />
          </Dropdown>
        ) : (
          <Flex align="center" gap={28}>
            <nav aria-label="Primary">
              <Flex align="center" gap={28}>
                {NAV.map((item) => {
                  const active = pathname.split("/")[1] === item.key.split("/")[1];
                  return (
                    <Link
                      key={item.key}
                      href={item.key}
                      aria-current={active ? "page" : undefined}
                      style={{
                        fontSize: 13,
                        fontWeight: active ? 800 : 600,
                        color: active ? token.colorPrimary : token.colorTextSecondary,
                        textDecoration: "none",
                        padding: "12px 0",
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </Flex>
            </nav>
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              menu={{ items: accountItems }}
            >
              <button
                type="button"
                aria-label="Account"
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
      {user && submenu ? (
        <nav
          aria-label={submenu.label}
          style={{
            background: `color-mix(in srgb, ${token.colorBgContainer} 55%, ${token.colorBgLayout})`,
            borderTop: `1px solid ${token.colorSplit}`,
          }}
        >
          <Flex gap={screens.md === true ? 24 : 12} style={{ maxWidth: 1200, margin: "0 auto", paddingInline: screens.md === true ? 20 : 12 }}>
            {submenu.tabs.map(({ href, label, Icon: TabIcon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  style={{
                    display: "inline-flex",
                    flexShrink: 0,
                    alignItems: "center",
                    gap: screens.md === true ? 8 : 6,
                    minHeight: 44,
                    padding: "0 2px",
                    marginBottom: -1,
                    fontSize: screens.md === true ? 13 : 12,
                    fontWeight: active ? 800 : 600,
                    color: active ? token.colorPrimary : token.colorTextSecondary,
                    borderBottom: `2px solid ${active ? token.colorPrimary : "transparent"}`,
                    textDecoration: "none",
                  }}
                >
                  <TabIcon />
                  {label}
                </Link>
              );
            })}
          </Flex>
        </nav>
      ) : null}
    </header>
  );
}
