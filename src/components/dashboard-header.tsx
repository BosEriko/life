"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Dropdown, Flex, Grid, theme } from "antd";
import type { MenuProps } from "antd";
import {
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
        wrap
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: compact ? "12px 20px" : "16px 20px",
        }}
      >
        <Flex
          align="stretch"
          gap={compact ? 12 : 20}
          wrap
          style={{ minWidth: 0 }}
        >
          <Link
            href="/"
            aria-label="Life Tracker home"
            style={{
              display: "inline-flex",
              textDecoration: "none",
              color: "inherit",
              minWidth: 0,
            }}
          >
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
          </Link>

          {user && !compact ? (
            <Flex align="stretch" gap={4}>
              {NAV.map((item) => {
                const active = pathname === item.key;
                return (
                  <div
                    key={item.key}
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Button
                      type="text"
                      aria-current={active ? "page" : undefined}
                      onClick={() => router.push(item.key)}
                      style={{
                        fontWeight: active ? 600 : 400,
                        color: active ? token.colorPrimary : undefined,
                      }}
                    >
                      {item.label}
                    </Button>
                    {active ? (
                      <span
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: "50%",
                          bottom: -16,
                          transform: "translateX(-50%)",
                          width: 20,
                          height: 3,
                          borderRadius: "3px 3px 0 0",
                          background: token.colorPrimary,
                        }}
                      />
                    ) : null}
                  </div>
                );
              })}
            </Flex>
          ) : null}
        </Flex>

        {!user ? (
          <Flex gap={8} wrap justify="flex-end">
            <Button onClick={() => router.push("/login")}>Sign in</Button>
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
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{ items: accountItems }}
          >
            <Button size="small" icon={<UserOutlined />} aria-label="Account" />
          </Dropdown>
        )}
      </Flex>
    </header>
  );
}
