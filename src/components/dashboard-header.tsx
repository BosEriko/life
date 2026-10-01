"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Dropdown, Flex, Grid, theme } from "antd";
import type { MenuProps } from "antd";
import {
  DownOutlined,
  IdcardOutlined,
  LogoutOutlined,
  MenuOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { NAV } from "@/components/nav-items";

export function DashboardHeader() {
  const { user, signOut } = useAuth();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const router = useRouter();
  const pathname = usePathname();
  const compact = screens.md === false;

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
                  const active = pathname === item.key;
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
    </header>
  );
}
